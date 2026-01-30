'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingPage } from '@/components/ui/Loading';
import { TeamOverview } from '@/components/TeamOverview';
import { SquadAnalysis } from '@/components/SquadAnalysis';
import { StrengthsWeaknesses } from '@/components/StrengthsWeaknesses';
import { FixtureAnalysis } from '@/components/FixtureAnalysis';
import { TransferSuggestions } from '@/components/TransferSuggestions';
import { ChipStrategy } from '@/components/ChipStrategy';
import { DifferentialsAnalysis } from '@/components/DifferentialsAnalysis';
import {
  BootstrapData,
  EntryInfo,
  EntryHistory,
  TeamPicks,
  Fixture,
  PlayerWithDetails,
  AnalysisResult,
  TransferSuggestion,
  ChipRecommendation,
} from '@/lib/types';
import { getCurrentGameweek, getSquadPlayers, enrichPlayerData } from '@/lib/fpl-api';
import { analyzeTeam } from '@/lib/analysis';
import { identifyTransferTargets } from '@/lib/transfers';
import { analyzeChipStrategy } from '@/lib/chips';

type TabType = 'overview' | 'squad' | 'fixtures' | 'transfers' | 'differentials' | 'chips';

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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
  const [transferSuggestions, setTransferSuggestions] = useState<TransferSuggestion[]>([]);
  const [chipRecommendations, setChipRecommendations] = useState<ChipRecommendation[]>([]);
  const [currentGameweek, setCurrentGameweek] = useState<number>(1);

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

        const bootstrapData: BootstrapData = await bootstrapRes.json();
        const fixturesData: Fixture[] = await fixturesRes.json();
        const teamData = await teamRes.json();

        setBootstrap(bootstrapData);
        setFixtures(fixturesData);
        setEntry(teamData.entry);
        setHistory(teamData.history);

        // Get current gameweek
        const currentGW = getCurrentGameweek(bootstrapData.events);
        const gwId = currentGW?.id || 1;
        setCurrentGameweek(gwId);

        // Fetch picks for current gameweek
        const picksRes = await fetch(`/api/team/${teamId}?gw=${gwId}`);
        const picksData = await picksRes.json();

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

          // Generate transfer suggestions
          const transfers = identifyTransferTargets(
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
          setTransferSuggestions(transfers);

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
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'transfers', label: 'Transfers' },
    { id: 'differentials', label: 'Differentials' },
    { id: 'chips', label: 'Chips' },
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
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Analyze Another Team
            </Link>
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
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-fpl-green text-fpl-purple'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
            <SquadAnalysis starting={startingPlayers} bench={benchPlayers} />
          )}

          {activeTab === 'fixtures' && (
            <FixtureAnalysis
              players={startingPlayers}
              gameweeks={bootstrap.events}
              currentGameweek={currentGameweek}
              fixtures={fixtures}
              teams={bootstrap.teams}
            />
          )}

          {activeTab === 'transfers' && (
            <TransferSuggestions suggestions={transferSuggestions} />
          )}

          {activeTab === 'differentials' && (
            <DifferentialsAnalysis
              starting={startingPlayers}
              bench={benchPlayers}
              allPlayers={bootstrap.elements}
              teams={bootstrap.teams}
              fixtures={fixtures}
              currentGameweek={currentGameweek}
              bank={picks?.entry_history.bank || 0}
            />
          )}

          {activeTab === 'chips' && (
            <ChipStrategy recommendations={chipRecommendations} />
          )}
        </div>
      </main>
    </div>
  );
}
