import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { PlayerWithDetails, POSITION_MAP } from '@/lib/types';
import { formatPrice, getStatusColor, getStatusText, getDifficultyColor } from '@/lib/fpl-api';

interface SquadAnalysisProps {
  starting: PlayerWithDetails[];
  bench: PlayerWithDetails[];
}

export function SquadAnalysis({ starting, bench }: SquadAnalysisProps) {
  // Group players by position
  const goalkeepers = starting.filter((p) => p.element_type === 1);
  const defenders = starting.filter((p) => p.element_type === 2);
  const midfielders = starting.filter((p) => p.element_type === 3);
  const forwards = starting.filter((p) => p.element_type === 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Squad Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <PositionGroup title="Goalkeepers" players={goalkeepers} />
          <PositionGroup title="Defenders" players={defenders} />
          <PositionGroup title="Midfielders" players={midfielders} />
          <PositionGroup title="Forwards" players={forwards} />
          <PositionGroup title="Bench" players={bench} isBench />
        </div>
      </CardContent>
    </Card>
  );
}

function PositionGroup({
  title,
  players,
  isBench = false,
}: {
  title: string;
  players: PlayerWithDetails[];
  isBench?: boolean;
}) {
  if (players.length === 0) return null;

  return (
    <div>
      <h4 className={`text-sm font-medium mb-3 ${isBench ? 'text-gray-500' : 'text-gray-300'}`}>
        {title}
      </h4>
      <div className="space-y-2">
        {players.map((player) => (
          <PlayerRow key={player.id} player={player} isBench={isBench} />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  isBench,
}: {
  player: PlayerWithDetails;
  isBench: boolean;
}) {
  const form = parseFloat(player.form);
  const formColor =
    form >= 5 ? 'text-green-400' : form >= 3 ? 'text-yellow-400' : 'text-red-400';

  const statusColor = getStatusColor(player.status);
  const statusText = getStatusText(player.status, player.chance_of_playing_next_round);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isBench ? 'bg-gray-900/50' : 'bg-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
          {POSITION_MAP[player.element_type]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{player.web_name}</span>
            {player.status !== 'a' && (
              <Badge
                variant={player.status === 'd' ? 'warning' : 'danger'}
                size="sm"
              >
                {statusText}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {player.teamData.short_name} | {formatPrice(player.now_cost)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className={`font-medium ${formColor}`}>{form.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Form</div>
        </div>

        <div className="text-right">
          <div className="font-medium text-white">{player.total_points}</div>
          <div className="text-xs text-gray-500">Points</div>
        </div>

        <div className="flex gap-1">
          {player.upcomingFixtures.slice(0, 3).map((fixture, idx) => (
            <div
              key={idx}
              className={`w-7 h-7 rounded flex items-center justify-center text-xs font-medium text-white ${getDifficultyColor(
                fixture.difficulty
              )}`}
              title={`${fixture.opponent.short_name} (${fixture.isHome ? 'H' : 'A'})`}
            >
              {fixture.opponent.short_name.substring(0, 3)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
