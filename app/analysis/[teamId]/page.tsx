'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingPage } from '@/components/ui/Loading';
import { PaywallOverlay } from '@/components/ui/PaywallOverlay';
import { TeamOverview } from '@/components/TeamOverview';
import { SquadAnalysis } from '@/components/SquadAnalysis';
import { StrengthsWeaknesses } from '@/components/StrengthsWeaknesses';
import { FixtureAnalysis } from '@/components/FixtureAnalysis';
import { TransferSuggestions } from '@/components/TransferSuggestions';
import { ChipStrategy } from '@/components/ChipStrategy';
import { DifferentialsAnalysis } from '@/components/DifferentialsAnalysis';
import { CaptaincyAnalysis } from '@/components/CaptaincyAnalysis';
import { PlayerDatabase } from '@/components/PlayerDatabase';
import { TeamStats } from '@/components/TeamStats';
import { usePremium, isTabPremium } from '@/lib/premium-context';
import { useRisk } from '@/lib/risk-context';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';
import {
  BootstrapData,
  EntryInfo,
  EntryHistory,
  TeamPicks,
  Fixture,
  PlayerWithDetails,
  AnalysisResult,
  ChipRecommendation,
} from '@/lib/types';
import { getCurrentGameweek, getPicksGameweek, getSquadPlayers, enrichPlayerData } from '@/lib/fpl-api';
import { analyzeTeam } from '@/lib/analysis';
import { identifyTransferTargetsByRisk, TransfersByRisk } from '@/lib/transfers';
import { analyzeChipStrategy } from '@/lib/chips';
import { analyzeCaptaincyByRisk, CaptaincyByRisk } from '@/lib/captaincy';

type TabType = 'overview' | 'squad' | 'captaincy' | 'fixtures' | 'transfers' | 'differentials' | 'chips' | 'players' | 'season';

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { isPremium } = usePremium();
  const { riskLevel } = useRisk();
  const { user } = useAuth();
  const [hasLockedTeam, setHasLockedTeam] = useState(false);

  // Data state
  const [entry, setEntry] = useState<EntryInfo | null>(null);
  const [history, setHistory] = useState<EntryHistory | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [picks, setPicks] = useState<TeamPicks | null>(null);

  // Computed state
  const [startingPlayers, setStartingPlayers] = useState<PlayerWithDetails[]>([]);
  const [benchPlayers, setBenchPlayers] = useState<PlayerWithDetails[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [transfersByRisk, setTransfersByRisk] = useState<TransfersByRisk | null>(null);
  const [chipRecommendations, setChipRecommendations] = useState<ChipRecommendation[]>([]);
  const [captaincyByRisk, setCaptaincyByRisk] = useState<CaptaincyByRisk | null>(null);
  const [currentCaptain, setCurrentCaptain] = useState<number | undefined>();
  const [currentViceCaptain, setCurrentViceCaptain] = useState<number | undefined>();
  const [currentGameweek, setCurrentGameweek] = useState<number>(1);

  // Enforce team lock for logged-in users
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from('user_teams')
      .select('team_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.team_id) {
          setHasLockedTeam(true);
          if (data.team_id !== teamId) {
            router.replace(`/analysis/${data.team_id}`);
          }
        } else {
          // First time analyzing — lock this team
          supabase.from('user_teams').insert({
            user_id: user.id,
            team_id: teamId,
          }).then(() => setHasLockedTeam(true));
        }
      });
  }, [user, teamId, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [bootstrapRes, fixturesRes, teamRes] = await Promise.all([
          fetch('/api/bootstrap'),
          fetch('/api/fixtures'),
          fetch(`/api/team/${teamId}`),
        ]);

        if (!teamRes.ok) {
          if (teamRes.status === 404) {
            setError('Team not found. Please check the ID and try again.');
          } else {
            setError('Failed to load team data. Please try again.');
          }
          setIsLoading(false);
          return;
        }

        if (!bootstrapRes.ok || !fixturesRes.ok) {
          setError('Failed to load FPL data. Please try again.');
          setIsLoading(false);
          return;
        }

        const bootstrapData: BootstrapData = await bootstrapRes.json();
        const fixturesData: Fixture[] = await fixturesRes.json();
        const teamData = await teamRes.json();

        console.log('Bootstrap events:', bootstrapData.events?.length);
        console.log('Fixtures:', fixturesData?.length);
        console.log('Team entry:', teamData.entry?.id);

        setBootstrap(bootstrapData);
        setFixtures(fixturesData);
        setEntry(teamData.entry);
        setHistory(teamData.history);

        // Get current gameweek (for display and planning)
        const currentGW = getCurrentGameweek(bootstrapData.events);
        const gwId = currentGW?.id || 1;
        setCurrentGameweek(gwId);

        // Get picks gameweek (last available picks - may differ from planning GW)
        const picksGW = getPicksGameweek(bootstrapData.events);
        const picksGwId = picksGW?.id || 1;

        // Fetch picks for the picks gameweek
        console.log('Fetching picks for GW:', picksGwId);
        const picksRes = await fetch(`/api/team/${teamId}?gw=${picksGwId}`);
        const picksData = await picksRes.json();
        console.log('Picks data:', picksData.picks ? 'exists' : 'null', picksData.picks?.picks?.length);

        if (picksData.picks) {
          setPicks(picksData.picks);

          // Process squad
          const { starting, bench } = getSquadPlayers(
            picksData.picks,
            bootstrapData.elements,
            bootstrapData.teams,
            fixturesData,
            gwId
          );
          setStartingPlayers(starting);
          setBenchPlayers(bench);

          // Run analysis
          const analysisResult = analyzeTeam(
            starting,
            bench,
            bootstrapData.teams,
            picksData.picks.entry_history.bank,
            picksData.picks.entry_history.value
          );
          setAnalysis(analysisResult);

          // Generate transfer suggestions for all risk levels
          const transfers = identifyTransferTargetsByRisk(
            starting,
            bench,
            bootstrapData.elements,
            bootstrapData.teams,
            fixturesData,
            gwId,
            picksData.picks.entry_history.bank,
            teamData.history?.current?.length > 0
              ? teamData.history.current[teamData.history.current.length - 1].event_transfers === 0
                ? 2
                : 1
              : 1
          );
          setTransfersByRisk(transfers);

          // Analyze chip strategy
          const chips = analyzeChipStrategy(
            starting,
            bench,
            bootstrapData.events,
            fixturesData,
            bootstrapData.teams,
            teamData.history,
            gwId
          );
          setChipRecommendations(chips);

          // Analyze captaincy for all risk levels
          const captaincy = analyzeCaptaincyByRisk(starting);
          setCaptaincyByRisk(captaincy);

          // Get current captain/VC from picks
          const captain = picksData.picks.picks.find((p: { is_captain: boolean }) => p.is_captain);
          const viceCaptain = picksData.picks.picks.find((p: { is_vice_captain: boolean }) => p.is_vice_captain);
          setCurrentCaptain(captain?.element);
          setCurrentViceCaptain(viceCaptain?.element);
        } else {
          console.error('No picks data available for GW', picksGwId);
          setError(`No picks data available for gameweek ${picksGwId}. Please try again later.`);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred. Please try again.');
        setIsLoading(false);
      }
    }

    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-fpl-green text-fpl-purple rounded-lg font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!entry || !analysis || !bootstrap) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'squad', label: 'Squad' },
    { id: 'captaincy', label: 'Captaincy' },
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'transfers', label: 'Transfers' },
    { id: 'differentials', label: 'Differentials' },
    { id: 'players', label: 'Players' },
    { id: 'chips', label: 'Chips' },
    { id: 'season', label: 'Season Review' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 bg-gray-900/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-fpl-green to-fpl-cyan flex items-center justify-center font-bold text-fpl-purple text-sm">
                FM
              </div>
              <span className="font-semibold text-white">Fantasy Mate</span>
            </Link>
            {!(user && hasLockedTeam) && (
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Analyze Another Team
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Team Overview */}
        <TeamOverview
          entry={entry}
          analysis={analysis}
          currentGameweek={currentGameweek}
          startingPlayers={startingPlayers}
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const tabIsPremium = isTabPremium(tab.id);
            const showLock = tabIsPremium && !isPremium;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-fpl-green text-fpl-purple'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
                {showLock && (
                  <svg
                    className="w-3.5 h-3.5 opacity-60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <StrengthsWeaknesses
              strengths={analysis.strengths}
              weaknesses={analysis.weaknesses}
            />
          )}

          {activeTab === 'squad' && (
            isPremium ? (
              <SquadAnalysis starting={startingPlayers} bench={benchPlayers} />
            ) : (
              <PaywallOverlay featureName="Squad Analysis">
                <SquadAnalysis starting={startingPlayers} bench={benchPlayers} />
              </PaywallOverlay>
            )
          )}

          {activeTab === 'captaincy' && captaincyByRisk && (
            isPremium ? (
              <CaptaincyAnalysis
                analysisByRisk={captaincyByRisk}
                currentCaptain={currentCaptain}
                currentViceCaptain={currentViceCaptain}
              />
            ) : (
              <PaywallOverlay featureName="Captaincy Analysis">
                <CaptaincyAnalysis
                  analysisByRisk={captaincyByRisk}
                  currentCaptain={currentCaptain}
                  currentViceCaptain={currentViceCaptain}
                />
              </PaywallOverlay>
            )
          )}

          {activeTab === 'fixtures' && (
            isPremium ? (
              <FixtureAnalysis
                players={startingPlayers}
                gameweeks={bootstrap.events}
                currentGameweek={currentGameweek}
                fixtures={fixtures}
                teams={bootstrap.teams}
              />
            ) : (
              <PaywallOverlay featureName="Fixture Analysis">
                <FixtureAnalysis
                  players={startingPlayers}
                  gameweeks={bootstrap.events}
                  currentGameweek={currentGameweek}
                  fixtures={fixtures}
                  teams={bootstrap.teams}
                />
              </PaywallOverlay>
            )
          )}

          {activeTab === 'transfers' && transfersByRisk && (
            isPremium ? (
              <TransferSuggestions suggestionsByRisk={transfersByRisk} />
            ) : (
              <PaywallOverlay featureName="Transfer Suggestions">
                <TransferSuggestions suggestionsByRisk={transfersByRisk} />
              </PaywallOverlay>
            )
          )}

          {activeTab === 'differentials' && (
            isPremium ? (
              <DifferentialsAnalysis
                starting={startingPlayers}
                bench={benchPlayers}
                allPlayers={bootstrap.elements}
                teams={bootstrap.teams}
                fixtures={fixtures}
                currentGameweek={currentGameweek}
                bank={picks?.entry_history.bank || 0}
              />
            ) : (
              <PaywallOverlay featureName="Differentials Analysis">
                <DifferentialsAnalysis
                  starting={startingPlayers}
                  bench={benchPlayers}
                  allPlayers={bootstrap.elements}
                  teams={bootstrap.teams}
                  fixtures={fixtures}
                  currentGameweek={currentGameweek}
                  bank={picks?.entry_history.bank || 0}
                />
              </PaywallOverlay>
            )
          )}

          {activeTab === 'players' && bootstrap && (
            isPremium ? (
              <PlayerDatabase
                players={bootstrap.elements}
                teams={bootstrap.teams}
                fixtures={fixtures}
                currentGameweek={currentGameweek}
              />
            ) : (
              <PaywallOverlay featureName="Player Database">
                <PlayerDatabase
                  players={bootstrap.elements}
                  teams={bootstrap.teams}
                  fixtures={fixtures}
                  currentGameweek={currentGameweek}
                />
              </PaywallOverlay>
            )
          )}

          {activeTab === 'chips' && (
            isPremium ? (
              <ChipStrategy
                recommendations={chipRecommendations}
                allPlayers={bootstrap.elements}
                teams={bootstrap.teams}
                fixtures={fixtures}
                currentGameweek={currentGameweek}
              />
            ) : (
              <PaywallOverlay featureName="Chip Strategy">
                <ChipStrategy
                  recommendations={chipRecommendations}
                  allPlayers={bootstrap.elements}
                  teams={bootstrap.teams}
                  fixtures={fixtures}
                  currentGameweek={currentGameweek}
                />
              </PaywallOverlay>
            )
          )}

          {activeTab === 'season' && history && (
            isPremium ? (
              <TeamStats
                entry={entry}
                history={history}
                bootstrap={bootstrap}
                startingPlayers={startingPlayers}
                benchPlayers={benchPlayers}
              />
            ) : (
              <PaywallOverlay featureName="Season Review">
                <TeamStats
                  entry={entry}
                  history={history}
                  bootstrap={bootstrap}
                  startingPlayers={startingPlayers}
                  benchPlayers={benchPlayers}
                />
              </PaywallOverlay>
            )
          )}
        </div>
      </main>
    </div>
  );
}
