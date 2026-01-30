'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { PlayerWithDetails, Gameweek, Fixture, Team, TeamPerformance } from '@/lib/types';
import {
  getDifficultyColor,
  calculateTeamPerformance,
  calculateAdjustedFDR,
  getFDRDifferenceIndicator,
} from '@/lib/fpl-api';

interface FixtureAnalysisProps {
  players: PlayerWithDetails[];
  gameweeks: Gameweek[];
  currentGameweek: number;
  fixtures: Fixture[];
  teams: Team[];
}

export function FixtureAnalysis({
  players,
  gameweeks,
  currentGameweek,
  fixtures,
  teams,
}: FixtureAnalysisProps) {
  const [useAdjustedFDR, setUseAdjustedFDR] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const upcomingGWs = gameweeks
    .filter((gw) => gw.id >= currentGameweek && gw.id < currentGameweek + 6)
    .sort((a, b) => a.id - b.id);

  // Calculate team performance from historical data
  const teamPerformance = calculateTeamPerformance(fixtures, teams);

  const getDifficulty = (
    baseDifficulty: number,
    opponentId: number
  ): { difficulty: number; indicator: { indicator: string; color: string } | null } => {
    if (!useAdjustedFDR) {
      return { difficulty: baseDifficulty, indicator: null };
    }
    const opponentPerf = teamPerformance.get(opponentId);
    const adjusted = calculateAdjustedFDR(baseDifficulty, opponentPerf);
    const indicator = getFDRDifferenceIndicator(baseDifficulty, adjusted);
    return { difficulty: adjusted, indicator };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fixture Difficulty - Next 6 Gameweeks</CardTitle>
          <div className="flex items-center gap-3">
            {/* Toggle Button */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setUseAdjustedFDR(false)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  !useAdjustedFDR
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                FPL FDR
              </button>
              <button
                onClick={() => setUseAdjustedFDR(true)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  useAdjustedFDR
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Adjusted FDR
              </button>
            </div>
            {/* Info Icon with Tooltip */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white flex items-center justify-center text-xs"
              >
                ℹ
              </button>
              {showTooltip && (
                <div className="absolute right-0 top-7 z-10 w-72 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-xs text-gray-300">
                  <p className="font-medium text-white mb-2">About Adjusted FDR</p>
                  <p>
                    Adjusted FDR uses actual GW1-{currentGameweek - 1} results to modify FPL ratings.
                    Teams performing better than expected get harder ratings (↑);
                    underperforming teams get easier ratings (↓).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-400">
                  Player
                </th>
                {upcomingGWs.map((gw) => (
                  <th
                    key={gw.id}
                    className="text-center py-2 px-2 text-sm font-medium text-gray-400 min-w-[60px]"
                  >
                    GW{gw.id}
                  </th>
                ))}
                <th className="text-center py-2 px-3 text-sm font-medium text-gray-400">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const avgDifficulty = calculateAvgDifficulty(
                  player,
                  6,
                  useAdjustedFDR,
                  teamPerformance
                );
                return (
                  <tr
                    key={player.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="py-2 px-3">
                      <div className="font-medium text-white text-sm">
                        {player.web_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {player.teamData.short_name}
                      </div>
                    </td>
                    {upcomingGWs.map((gw) => {
                      const fixture = player.upcomingFixtures.find(
                        (f) => f.event === gw.id
                      );
                      if (!fixture) {
                        return (
                          <td key={gw.id} className="py-2 px-2">
                            <div className="text-center py-1 px-1 rounded text-xs bg-gray-700 text-gray-400">
                              -
                            </div>
                          </td>
                        );
                      }
                      const { difficulty, indicator } = getDifficulty(
                        fixture.difficulty,
                        fixture.opponent.id
                      );
                      return (
                        <td key={gw.id} className="py-2 px-2">
                          <div
                            className={`text-center py-1 px-1 rounded text-xs font-medium text-white ${getDifficultyColor(
                              difficulty
                            )} relative`}
                            title={`${fixture.opponent.name} (${fixture.isHome ? 'Home' : 'Away'})${
                              useAdjustedFDR ? ` - Adjusted: ${difficulty.toFixed(1)}` : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              {fixture.opponent.short_name}
                              {indicator && (
                                <span className={`text-[9px] ${indicator.color}`}>
                                  {indicator.indicator}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] opacity-75">
                              {fixture.isHome ? 'H' : 'A'}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`font-medium ${
                          avgDifficulty <= 2.5
                            ? 'text-green-400'
                            : avgDifficulty <= 3.5
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        {avgDifficulty.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-700">
          <span className="text-xs text-gray-400">Difficulty:</span>
          {[1, 2, 3, 4, 5].map((d) => (
            <div key={d} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${getDifficultyColor(d)}`} />
              <span className="text-xs text-gray-400">{d}</span>
            </div>
          ))}
          {useAdjustedFDR && (
            <>
              <span className="text-xs text-gray-600">|</span>
              <span className="text-xs text-green-400">↓ Easier</span>
              <span className="text-xs text-red-400">↑ Harder</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function calculateAvgDifficulty(
  player: PlayerWithDetails,
  count: number,
  useAdjusted: boolean = false,
  teamPerformance?: Map<number, TeamPerformance>
): number {
  const fixtures = player.upcomingFixtures.slice(0, count);
  if (fixtures.length === 0) return 3;

  if (useAdjusted && teamPerformance) {
    return (
      fixtures.reduce((sum, f) => {
        const opponentPerf = teamPerformance.get(f.opponent.id);
        return sum + calculateAdjustedFDR(f.difficulty, opponentPerf);
      }, 0) / fixtures.length
    );
  }

  return fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
}
