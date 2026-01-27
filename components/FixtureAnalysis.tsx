import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { PlayerWithDetails, Gameweek } from '@/lib/types';
import { getDifficultyColor } from '@/lib/fpl-api';

interface FixtureAnalysisProps {
  players: PlayerWithDetails[];
  gameweeks: Gameweek[];
  currentGameweek: number;
}

export function FixtureAnalysis({
  players,
  gameweeks,
  currentGameweek,
}: FixtureAnalysisProps) {
  const upcomingGWs = gameweeks
    .filter((gw) => gw.id >= currentGameweek && gw.id < currentGameweek + 6)
    .sort((a, b) => a.id - b.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixture Difficulty - Next 6 Gameweeks</CardTitle>
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
                const avgDifficulty = calculateAvgDifficulty(player, 6);
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
                      return (
                        <td key={gw.id} className="py-2 px-2">
                          {fixture ? (
                            <div
                              className={`text-center py-1 px-1 rounded text-xs font-medium text-white ${getDifficultyColor(
                                fixture.difficulty
                              )}`}
                              title={`${fixture.opponent.name} (${fixture.isHome ? 'Home' : 'Away'})`}
                            >
                              <div>{fixture.opponent.short_name}</div>
                              <div className="text-[10px] opacity-75">
                                {fixture.isHome ? 'H' : 'A'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1 px-1 rounded text-xs bg-gray-700 text-gray-400">
                              -
                            </div>
                          )}
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
        </div>
      </CardContent>
    </Card>
  );
}

function calculateAvgDifficulty(player: PlayerWithDetails, count: number): number {
  const fixtures = player.upcomingFixtures.slice(0, count);
  if (fixtures.length === 0) return 3;
  return fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
}
