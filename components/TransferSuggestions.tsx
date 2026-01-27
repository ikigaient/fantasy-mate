import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { TransferSuggestion } from '@/lib/types';
import { formatPrice, getDifficultyColor } from '@/lib/fpl-api';

interface TransferSuggestionsProps {
  suggestions: TransferSuggestion[];
}

export function TransferSuggestions({ suggestions }: TransferSuggestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {suggestions.map((suggestion, idx) => (
            <GameweekSuggestion key={idx} suggestion={suggestion} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GameweekSuggestion({ suggestion }: { suggestion: TransferSuggestion }) {
  const { gameweek, playerOut, reasonOut, suggestions: options, takeHit, hitWorth } = suggestion;

  if (options.length === 0) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg">
        <h4 className="font-medium text-white mb-2">Gameweek {gameweek}</h4>
        <p className="text-gray-400 text-sm">No transfers recommended</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-white">Gameweek {gameweek}</h4>
        {takeHit && (
          <Badge variant={hitWorth ? 'warning' : 'danger'} size="sm">
            {hitWorth ? 'Hit Worth It' : 'Hit Not Recommended'}
          </Badge>
        )}
      </div>

      {/* Player Out */}
      <div className="mb-4 p-3 bg-red-900/20 border border-red-900/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-red-400 mb-1">Transfer Out</div>
            <div className="font-medium text-white">{playerOut.web_name}</div>
            <div className="text-xs text-gray-400">
              {playerOut.teamData.short_name} | {formatPrice(playerOut.now_cost)} |
              Form: {parseFloat(playerOut.form).toFixed(1)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Reason</div>
            <div className="text-xs text-red-300 max-w-[200px]">{reasonOut}</div>
          </div>
        </div>
      </div>

      {/* Replacement Options */}
      <div className="space-y-2">
        <div className="text-sm text-gray-400 mb-2">Top Replacements</div>
        {options.map((option, idx) => (
          <div
            key={option.player.id}
            className={`p-3 rounded-lg border ${
              idx === 0
                ? 'bg-green-900/20 border-green-900/30'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <Badge variant="success" size="sm">
                      Best Pick
                    </Badge>
                  )}
                  <span className="font-medium text-white">
                    {option.player.web_name}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {option.player.teamData.short_name} |{' '}
                  {formatPrice(option.player.now_cost)}
                  {option.priceDiff !== 0 && (
                    <span
                      className={
                        option.priceDiff < 0 ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {' '}
                      ({option.priceDiff > 0 ? '+' : ''}
                      {formatPrice(option.priceDiff)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div
                    className={`font-medium ${
                      parseFloat(option.player.form) >= 5
                        ? 'text-green-400'
                        : parseFloat(option.player.form) >= 3
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {parseFloat(option.player.form).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">Form</div>
                </div>

                <div className="text-center">
                  <div className="font-medium text-white">
                    {option.expectedPoints.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">xPts (3GW)</div>
                </div>

                <div className="flex gap-1">
                  {option.player.upcomingFixtures.slice(0, 3).map((f, fIdx) => (
                    <div
                      key={fIdx}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium text-white ${getDifficultyColor(
                        f.difficulty
                      )}`}
                      title={`${f.opponent.short_name} (${f.isHome ? 'H' : 'A'})`}
                    >
                      {f.difficulty}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-400">{option.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
