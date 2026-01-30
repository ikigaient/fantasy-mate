import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { TransferSuggestion, TransferCategory } from '@/lib/types';
import { formatPrice, getDifficultyColor } from '@/lib/fpl-api';
import { getCategoryBadgeColor, getCategoryLabel } from '@/lib/transfers';

interface TransferSuggestionsProps {
  suggestions: TransferSuggestion[];
}

export function TransferSuggestions({ suggestions }: TransferSuggestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Recommendations</CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Each gameweek focuses on a different strategy for varied suggestions
        </p>
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
  const { gameweek, playerOut, reasonOut, suggestions: options, takeHit, hitWorth, category } = suggestion;

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
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-white">Gameweek {gameweek}</h4>
          <CategoryBadge category={category} />
        </div>
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
          <TransferOptionCard
            key={option.player.id}
            option={option}
            isTopPick={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: TransferCategory }) {
  const bgColor = getCategoryBadgeColor(category);
  const label = getCategoryLabel(category);

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${bgColor}`}>
      {label}
    </span>
  );
}

function TransferOptionCard({
  option,
  isTopPick,
}: {
  option: TransferSuggestion['suggestions'][0];
  isTopPick: boolean;
}) {
  const { player, priceDiff, expectedPoints, reason, category, confidence, stats } = option;

  return (
    <div
      className={`p-3 rounded-lg border ${
        isTopPick
          ? 'bg-green-900/20 border-green-900/30'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isTopPick && (
              <Badge variant="success" size="sm">
                Best Pick
              </Badge>
            )}
            <CategoryBadge category={category} />
            <span className="font-medium text-white">{player.web_name}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {player.teamData.short_name} | {formatPrice(player.now_cost)}
            {priceDiff !== 0 && (
              <span className={priceDiff < 0 ? 'text-green-400' : 'text-red-400'}>
                {' '}({priceDiff > 0 ? '+' : ''}{formatPrice(priceDiff)})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-center">
            <div>
              <div className="text-xs text-gray-500">Own%</div>
              <div className={`text-sm font-medium ${
                stats.ownership < 10 ? 'text-purple-400' : 'text-gray-300'
              }`}>
                {stats.ownership.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">xGI</div>
              <div className="text-sm font-medium text-gray-300">
                {stats.xGI.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">ICT</div>
              <div className="text-sm font-medium text-gray-300">
                {stats.ict.toFixed(0)}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div
              className={`font-medium ${
                parseFloat(player.form) >= 5
                  ? 'text-green-400'
                  : parseFloat(player.form) >= 3
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {parseFloat(player.form).toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Form</div>
          </div>

          <div className="text-center">
            <div className="font-medium text-white">{expectedPoints.toFixed(1)}</div>
            <div className="text-xs text-gray-500">xPts (3GW)</div>
          </div>

          <div className="flex gap-1">
            {player.upcomingFixtures.slice(0, 3).map((f, fIdx) => (
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

      {/* Reason and Confidence */}
      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-gray-400 flex-1">{reason}</div>
        <div className="flex items-center gap-2 ml-2">
          <div className="text-[10px] text-gray-500">Confidence</div>
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                confidence >= 70 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400">{confidence}%</span>
        </div>
      </div>

      {/* Mobile Stats Row */}
      <div className="md:hidden flex items-center gap-4 mt-2 pt-2 border-t border-gray-700/50">
        <div className="text-xs">
          <span className="text-gray-500">Own: </span>
          <span className={stats.ownership < 10 ? 'text-purple-400' : 'text-gray-300'}>
            {stats.ownership.toFixed(1)}%
          </span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">xGI: </span>
          <span className="text-gray-300">{stats.xGI.toFixed(2)}</span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">ICT: </span>
          <span className="text-gray-300">{stats.ict.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
