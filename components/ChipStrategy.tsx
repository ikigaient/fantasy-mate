import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { ChipRecommendation } from '@/lib/types';
import { getChipDisplayName, getChipIcon } from '@/lib/chips';

interface ChipStrategyProps {
  recommendations: ChipRecommendation[];
}

export function ChipStrategy({ recommendations }: ChipStrategyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chip Strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <ChipCard key={rec.chip} recommendation={rec} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChipCard({ recommendation }: { recommendation: ChipRecommendation }) {
  const { chip, available, alreadyUsed, recommendedGameweek, reason, priority } = recommendation;

  const priorityColors = {
    high: 'border-green-600 bg-green-900/20',
    medium: 'border-yellow-600 bg-yellow-900/20',
    low: 'border-gray-600 bg-gray-800',
    none: 'border-gray-700 bg-gray-800/50',
  };

  const priorityBadge = {
    high: 'success',
    medium: 'warning',
    low: 'default',
    none: 'default',
  } as const;

  const chipColors: Record<string, string> = {
    wildcard: 'from-purple-600 to-pink-600',
    freehit: 'from-blue-600 to-cyan-600',
    benchboost: 'from-green-600 to-emerald-600',
    triplecaptain: 'from-orange-600 to-yellow-600',
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        alreadyUsed ? 'border-gray-700 bg-gray-800/30 opacity-60' : priorityColors[priority]
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${chipColors[chip]} flex items-center justify-center font-bold text-white text-sm`}
          >
            {getChipIcon(chip)}
          </div>
          <div>
            <div className="font-medium text-white">{getChipDisplayName(chip)}</div>
            <div className="text-xs text-gray-400">
              {alreadyUsed ? 'Used' : available ? 'Available' : 'Not Available'}
            </div>
          </div>
        </div>

        {!alreadyUsed && priority !== 'none' && (
          <Badge variant={priorityBadge[priority]} size="sm">
            {priority === 'high' ? 'Recommended' : priority === 'medium' ? 'Consider' : 'Save'}
          </Badge>
        )}

        {alreadyUsed && (
          <Badge variant="default" size="sm">
            Used
          </Badge>
        )}
      </div>

      <p className="text-sm text-gray-300">{reason}</p>

      {recommendedGameweek && !alreadyUsed && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Best Gameweek:</span>
            <Badge variant="info" size="sm">
              GW{recommendedGameweek}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
