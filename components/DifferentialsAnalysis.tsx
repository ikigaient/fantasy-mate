'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { PlayerWithDetails, Player, Team, Fixture } from '@/lib/types';
import { formatPrice, enrichPlayerData, getDifficultyColor } from '@/lib/fpl-api';

interface DifferentialsAnalysisProps {
  starting: PlayerWithDetails[];
  bench: PlayerWithDetails[];
  allPlayers: Player[];
  teams: Team[];
  fixtures: Fixture[];
  currentGameweek: number;
  bank: number;
}

interface DifferentialOption {
  player: PlayerWithDetails;
  score: number;
  category: 'value' | 'moderate' | 'low' | 'ultra';
  keyReason: string;
}

interface PlayerEdgeInfo {
  ownership: number;
  ownershipCategory: 'template' | 'popular' | 'moderate' | 'differential';
  hasEdge: boolean;
}

type PositionFilter = 1 | 2 | 3 | 4;
type OwnershipFilter = 30 | 20 | 10;

const POSITION_NAMES: Record<PositionFilter, string> = {
  1: 'Goalkeepers',
  2: 'Defenders',
  3: 'Midfielders',
  4: 'Forwards',
};

const POSITION_SHORT: Record<PositionFilter, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export function DifferentialsAnalysis({
  starting,
  bench,
  allPlayers,
  teams,
  fixtures,
  currentGameweek,
  bank,
}: DifferentialsAnalysisProps) {
  const [activePosition, setActivePosition] = useState<PositionFilter>(3);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>(30);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const allSquad = useMemo(() => [...starting, ...bench], [starting, bench]);
  const squadIds = useMemo(() => allSquad.map((p) => p.id), [allSquad]);

  // Group players by position
  const positionGroups = {
    1: starting.filter((p) => p.element_type === 1),
    2: starting.filter((p) => p.element_type === 2),
    3: starting.filter((p) => p.element_type === 3),
    4: starting.filter((p) => p.element_type === 4),
  };

  // Calculate edge info for squad players
  const playerEdgeInfo = useMemo(() => {
    const info = new Map<number, PlayerEdgeInfo>();
    allSquad.forEach((player) => {
      const ownership = parseFloat(player.selected_by_percent);
      const form = parseFloat(player.form);

      let ownershipCategory: PlayerEdgeInfo['ownershipCategory'];
      if (ownership > 25) ownershipCategory = 'template';
      else if (ownership > 15) ownershipCategory = 'popular';
      else if (ownership > 8) ownershipCategory = 'moderate';
      else ownershipCategory = 'differential';

      // Has edge if high ownership + poor form
      const hasEdge = (ownership > 20 && form < 4) || (ownership > 15 && form < 3);

      info.set(player.id, { ownership, ownershipCategory, hasEdge });
    });
    return info;
  }, [allSquad]);

  // Squad stats
  const squadStats = useMemo(() => {
    const ownerships = allSquad.map((p) => parseFloat(p.selected_by_percent));
    const avgOwnership = ownerships.reduce((a, b) => a + b, 0) / ownerships.length;
    const highOwned = allSquad.filter((p) => parseFloat(p.selected_by_percent) > 25).length;
    return { avgOwnership, highOwned };
  }, [allSquad]);

  // Get differentials for position with ownership filter
  const differentials = useMemo(() => {
    const currentPlayers = allSquad.filter((p) => p.element_type === activePosition);
    const maxCurrentPrice = Math.max(...currentPlayers.map((p) => p.now_cost), 40);

    return findDifferentials(
      activePosition,
      ownershipFilter,
      allPlayers,
      teams,
      fixtures,
      currentGameweek,
      bank,
      squadIds,
      maxCurrentPrice
    );
  }, [activePosition, ownershipFilter, allPlayers, teams, fixtures, currentGameweek, bank, squadIds, allSquad]);

  // Current position players
  const currentPositionPlayers = allSquad.filter((p) => p.element_type === activePosition);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Find Your Edge</h3>
              <p className="text-sm text-gray-400">
                Discover lower-owned alternatives to gain rank on your rivals
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{squadStats.avgOwnership.toFixed(0)}%</div>
                <div className="text-xs text-gray-500">Squad Avg</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${squadStats.highOwned > 6 ? 'text-orange-400' : 'text-green-400'}`}>
                  {squadStats.highOwned}
                </div>
                <div className="text-xs text-gray-500">High Owned</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Squad Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Squad</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mini Pitch */}
            <div className="bg-gradient-to-b from-green-900/30 to-green-800/30 rounded-lg p-2 mb-3">
              <div className="flex flex-col gap-1.5">
                {([4, 3, 2, 1] as PositionFilter[]).map((pos) => (
                  <div key={pos} className="flex justify-center gap-1">
                    {positionGroups[pos].map((player) => {
                      const info = playerEdgeInfo.get(player.id)!;
                      const isSelected = selectedPlayerId === player.id;
                      return (
                        <button
                          key={player.id}
                          onClick={() => {
                            setSelectedPlayerId(isSelected ? null : player.id);
                            setActivePosition(pos);
                          }}
                          className={`relative px-1.5 py-1 rounded text-[10px] transition-all ${
                            getOwnershipBg(info.ownershipCategory)
                          } ${isSelected ? 'ring-2 ring-white scale-105' : 'hover:scale-105'}`}
                        >
                          {info.hasEdge && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                          )}
                          <div className="text-white font-medium truncate max-w-[45px]">
                            {player.web_name.substring(0, 6)}
                          </div>
                          <div className="text-gray-300 text-[9px]">{info.ownership.toFixed(0)}%</div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Bench */}
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 mb-1">Bench</div>
              <div className="flex gap-1">
                {bench.map((player) => {
                  const info = playerEdgeInfo.get(player.id)!;
                  return (
                    <button
                      key={player.id}
                      onClick={() => {
                        setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id);
                        setActivePosition(player.element_type as PositionFilter);
                      }}
                      className={`px-1.5 py-1 rounded text-[10px] opacity-60 ${
                        getOwnershipBg(info.ownershipCategory)
                      } ${selectedPlayerId === player.id ? 'ring-1 ring-white' : ''}`}
                    >
                      <div className="text-white font-medium truncate max-w-[40px]">
                        {player.web_name.substring(0, 5)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 pt-2 border-t border-gray-800">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-red-600" /> &gt;25%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-orange-600" /> 15-25%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-yellow-600" /> 8-15%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-green-600" /> &lt;8%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Differentials List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Position Tabs */}
              <div className="flex gap-1">
                {([1, 2, 3, 4] as PositionFilter[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setActivePosition(pos)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      activePosition === pos
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {POSITION_SHORT[pos]}
                  </button>
                ))}
              </div>

              {/* Ownership Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Max ownership:</span>
                <div className="flex gap-1">
                  {([30, 20, 10] as OwnershipFilter[]).map((threshold) => (
                    <button
                      key={threshold}
                      onClick={() => setOwnershipFilter(threshold)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        ownershipFilter === threshold
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {threshold}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Your Current Players */}
            <div className="mb-4 pb-3 border-b border-gray-800">
              <div className="text-xs text-gray-500 mb-2">Your {POSITION_NAMES[activePosition]}</div>
              <div className="flex flex-wrap gap-2">
                {currentPositionPlayers.map((player) => {
                  const info = playerEdgeInfo.get(player.id)!;
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-2 px-2 py-1 rounded bg-gray-800 ${
                        selectedPlayerId === player.id ? 'ring-1 ring-purple-400' : ''
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${getOwnershipDot(info.ownershipCategory)}`} />
                      <span className="text-sm text-white">{player.web_name}</span>
                      <span className="text-xs text-gray-400">{info.ownership.toFixed(0)}%</span>
                      {info.hasEdge && (
                        <span className="text-[10px] px-1 py-0.5 bg-yellow-900/50 text-yellow-400 rounded">
                          consider
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Differentials List */}
            <div className="space-y-2">
              {differentials.length > 0 ? (
                differentials.map((option, idx) => (
                  <DifferentialRow
                    key={option.player.id}
                    option={option}
                    rank={idx + 1}
                    maxAffordable={bank + Math.max(...currentPositionPlayers.map((p) => p.now_cost))}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No differentials found under {ownershipFilter}% ownership.</p>
                  <p className="text-sm mt-1">Try increasing the ownership filter.</p>
                </div>
              )}
            </div>

            {differentials.length > 0 && (
              <p className="text-[11px] text-gray-500 mt-4 pt-3 border-t border-gray-800">
                Showing {POSITION_NAMES[activePosition].toLowerCase()} under {ownershipFilter}% ownership,
                sorted by form, fixtures, and value.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DifferentialRow({
  option,
  rank,
  maxAffordable,
}: {
  option: DifferentialOption;
  rank: number;
  maxAffordable: number;
}) {
  const { player, category, keyReason } = option;
  const ownership = parseFloat(player.selected_by_percent);
  const form = parseFloat(player.form);
  const isAffordable = player.now_cost <= maxAffordable;

  const categoryStyles = {
    value: { bg: 'bg-blue-900/20', border: 'border-blue-800/50', label: 'Value Pick', labelBg: 'bg-blue-900/50 text-blue-300' },
    moderate: { bg: 'bg-purple-900/20', border: 'border-purple-800/50', label: 'Moderate', labelBg: 'bg-purple-900/50 text-purple-300' },
    low: { bg: 'bg-green-900/20', border: 'border-green-800/50', label: 'Low Owned', labelBg: 'bg-green-900/50 text-green-300' },
    ultra: { bg: 'bg-emerald-900/20', border: 'border-emerald-800/50', label: 'Ultra Diff', labelBg: 'bg-emerald-900/50 text-emerald-300' },
  };

  const style = categoryStyles[category];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg} ${style.border} ${!isAffordable ? 'opacity-60' : ''}`}>
      {/* Rank */}
      <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
        {rank}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white">{player.web_name}</span>
          <span className="text-xs text-gray-400">{player.teamData.short_name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${style.labelBg}`}>
            {style.label}
          </span>
          {!isAffordable && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              over budget
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{keyReason}</div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-center">
        <div>
          <div className="text-sm font-bold text-purple-400">{ownership.toFixed(1)}%</div>
          <div className="text-[10px] text-gray-500">owned</div>
        </div>
        <div>
          <div className={`text-sm font-bold ${form >= 5 ? 'text-green-400' : form >= 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {form.toFixed(1)}
          </div>
          <div className="text-[10px] text-gray-500">form</div>
        </div>
        <div>
          <div className="text-sm font-bold text-white">{formatPrice(player.now_cost)}</div>
          <div className="text-[10px] text-gray-500">price</div>
        </div>
      </div>

      {/* Fixtures */}
      <div className="flex gap-0.5">
        {player.upcomingFixtures.slice(0, 3).map((f, idx) => (
          <div
            key={idx}
            className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-medium text-white ${getDifficultyColor(f.difficulty)}`}
            title={`${f.opponent.name} (${f.isHome ? 'H' : 'A'})`}
          >
            {f.opponent.short_name.substring(0, 3)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getOwnershipBg(category: PlayerEdgeInfo['ownershipCategory']): string {
  switch (category) {
    case 'template': return 'bg-red-900/70';
    case 'popular': return 'bg-orange-900/70';
    case 'moderate': return 'bg-yellow-900/70';
    case 'differential': return 'bg-green-900/70';
  }
}

function getOwnershipDot(category: PlayerEdgeInfo['ownershipCategory']): string {
  switch (category) {
    case 'template': return 'bg-red-500';
    case 'popular': return 'bg-orange-500';
    case 'moderate': return 'bg-yellow-500';
    case 'differential': return 'bg-green-500';
  }
}

function findDifferentials(
  position: PositionFilter,
  maxOwnership: OwnershipFilter,
  allPlayers: Player[],
  teams: Team[],
  fixtures: Fixture[],
  currentGameweek: number,
  bank: number,
  squadIds: number[],
  maxCurrentPrice: number
): DifferentialOption[] {
  // Allow slightly over budget for visibility
  const priceLimit = maxCurrentPrice + bank + 10;

  const candidates = allPlayers.filter(
    (p) =>
      p.element_type === position &&
      p.now_cost <= priceLimit &&
      !squadIds.includes(p.id) &&
      p.status === 'a' &&
      p.minutes > 180 &&
      parseFloat(p.selected_by_percent) <= maxOwnership
  );

  const enrichedCandidates = candidates.map((p) => {
    const enriched = enrichPlayerData(p, teams, fixtures, currentGameweek);
    const ownership = parseFloat(p.selected_by_percent);
    const form = parseFloat(p.form);
    const ppg = parseFloat(p.points_per_game || '0');
    const xGI = parseFloat(p.expected_goal_involvements || '0');

    // Determine category
    let category: DifferentialOption['category'];
    if (ownership <= 5) category = 'ultra';
    else if (ownership <= 10) category = 'low';
    else if (ownership <= 20) category = 'moderate';
    else category = 'value';

    // Calculate score (balanced approach)
    let score = 0;

    // Form is king (weighted heavily)
    score += form * 15;

    // PPG matters
    score += ppg * 8;

    // Fixtures
    const upcomingFixtures = enriched.upcomingFixtures.slice(0, 3);
    const avgDiff = upcomingFixtures.length > 0
      ? upcomingFixtures.reduce((sum, f) => sum + f.difficulty, 0) / upcomingFixtures.length
      : 3;
    score += (5 - avgDiff) * 10;

    // Slight bonus for lower ownership (but not dominant)
    score += (maxOwnership - ownership) * 0.3;

    // xGI for attackers
    if (position >= 3) {
      score += xGI * 5;
    }

    // Generate key reason
    let keyReason = '';
    if (form >= 6) keyReason = 'Excellent form';
    else if (form >= 5) keyReason = 'Strong form';
    else if (avgDiff <= 2.5) keyReason = 'Great fixtures ahead';
    else if (ppg >= 5) keyReason = 'Reliable points';
    else if (xGI > 3) keyReason = `High xGI (${xGI.toFixed(1)})`;
    else if (ownership < 5) keyReason = 'Under the radar';
    else keyReason = 'Balanced option';

    return {
      player: enriched,
      score,
      category,
      keyReason,
    };
  });

  // Sort by score and return top 10
  return enrichedCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
