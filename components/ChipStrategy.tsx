import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { ChipRecommendation, PlayerWithDetails, Player, Team, Fixture } from '@/lib/types';
import { getChipDisplayName, getChipIcon } from '@/lib/chips';
import { generateWildcardTemplate, generateFreeHitTemplate, ChipTemplate } from '@/lib/chip-templates';
import { formatPrice } from '@/lib/fpl-api';

interface ChipStrategyProps {
  recommendations: ChipRecommendation[];
  allPlayers?: Player[];
  teams?: Team[];
  fixtures?: Fixture[];
  currentGameweek?: number;
}

export function ChipStrategy({
  recommendations,
  allPlayers,
  teams,
  fixtures,
  currentGameweek = 1,
}: ChipStrategyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chip Strategy</CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Recommendations and squad templates for your chips
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <ChipCard
              key={rec.chip}
              recommendation={rec}
              allPlayers={allPlayers}
              teams={teams}
              fixtures={fixtures}
              currentGameweek={currentGameweek}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ChipCardProps {
  recommendation: ChipRecommendation;
  allPlayers?: Player[];
  teams?: Team[];
  fixtures?: Fixture[];
  currentGameweek?: number;
}

function ChipCard({ recommendation, allPlayers, teams, fixtures, currentGameweek = 1 }: ChipCardProps) {
  const [showTemplate, setShowTemplate] = useState(false);
  const { chip, available, alreadyUsed, usedInGameweek, recommendedGameweek, reason, priority, seasonContext } = recommendation;

  // Generate template when expanded (only for wildcard and freehit)
  const canShowTemplate = !alreadyUsed && available && (chip === 'wildcard' || chip === 'freehit') && allPlayers && teams && fixtures;
  const template = showTemplate && canShowTemplate
    ? chip === 'wildcard'
      ? generateWildcardTemplate(allPlayers!, teams!, fixtures!, currentGameweek)
      : generateFreeHitTemplate(allPlayers!, teams!, fixtures!, currentGameweek)
    : null;

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
              {alreadyUsed
                ? usedInGameweek
                  ? `Used in GW${usedInGameweek}`
                  : 'Used'
                : available
                ? 'Available'
                : 'Not Available'}
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

      {seasonContext && !alreadyUsed && (
        <p className="text-xs text-gray-500 mt-1">{seasonContext}</p>
      )}

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

      {/* Template toggle button */}
      {canShowTemplate && (
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className="mt-3 w-full py-2 px-3 bg-gray-700/50 hover:bg-gray-700 rounded text-sm text-gray-300 transition-colors flex items-center justify-center gap-2"
        >
          {showTemplate ? '▲ Hide Template' : '▼ View Squad Template'}
        </button>
      )}

      {/* Template content */}
      {template && showTemplate && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
          <div className="text-sm text-gray-400">{template.reasoning}</div>
          <div className="text-xs text-gray-500">
            Formation: {template.formation} | Est. Cost: {formatPrice(template.totalCost)}
          </div>

          {template.positions.map(pos => (
            <div key={pos.position} className="space-y-2">
              <div className="text-xs font-medium text-gray-400 uppercase">{pos.positionName}s</div>
              <div className="space-y-1">
                {pos.players.map((p, idx) => (
                  <div
                    key={p.player.id}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      p.priority === 'essential'
                        ? 'bg-green-900/30 border border-green-800/50'
                        : p.priority === 'recommended'
                        ? 'bg-yellow-900/20 border border-yellow-800/30'
                        : 'bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{p.player.web_name}</span>
                      <span className="text-gray-500 text-xs">{p.player.teamData.short_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{p.reason}</span>
                      <span className="text-gray-500">{formatPrice(p.player.now_cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
