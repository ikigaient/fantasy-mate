import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Strength, Weakness } from '@/lib/types';

interface StrengthsWeaknessesProps {
  strengths: Strength[];
  weaknesses: Weakness[];
}

export function StrengthsWeaknesses({
  strengths,
  weaknesses,
}: StrengthsWeaknessesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-green-500">+</span> Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          {strengths.length === 0 ? (
            <p className="text-gray-500 text-sm">No significant strengths identified</p>
          ) : (
            <ul className="space-y-3">
              {strengths.map((strength, idx) => (
                <StrengthItem key={idx} strength={strength} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-red-500">-</span> Weaknesses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weaknesses.length === 0 ? (
            <p className="text-gray-500 text-sm">No significant weaknesses identified</p>
          ) : (
            <ul className="space-y-3">
              {weaknesses.map((weakness, idx) => (
                <WeaknessItem key={idx} weakness={weakness} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StrengthItem({ strength }: { strength: Strength }) {
  return (
    <li className="flex items-start gap-3 p-3 bg-green-900/20 rounded-lg border border-green-900/30">
      <div className="mt-0.5 w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
        <span className="text-green-400 text-sm">+</span>
      </div>
      <div>
        <div className="font-medium text-white">{strength.title}</div>
        <div className="text-sm text-gray-400 mt-0.5">{strength.description}</div>
        {strength.players && strength.players.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {strength.players.slice(0, 5).map((player) => (
              <Badge key={player.id} variant="success" size="sm">
                {player.web_name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function WeaknessItem({ weakness }: { weakness: Weakness }) {
  const severityColor = {
    low: 'border-yellow-900/30 bg-yellow-900/10',
    medium: 'border-orange-900/30 bg-orange-900/10',
    high: 'border-red-900/30 bg-red-900/20',
  };

  const severityBadge = {
    low: 'warning',
    medium: 'warning',
    high: 'danger',
  } as const;

  return (
    <li
      className={`flex items-start gap-3 p-3 rounded-lg border ${severityColor[weakness.severity]}`}
    >
      <div className="mt-0.5 w-5 h-5 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
        <span className="text-red-400 text-sm">!</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{weakness.title}</span>
          <Badge variant={severityBadge[weakness.severity]} size="sm">
            {weakness.severity}
          </Badge>
        </div>
        <div className="text-sm text-gray-400 mt-0.5">{weakness.description}</div>
        {weakness.players && weakness.players.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {weakness.players.slice(0, 5).map((player) => (
              <Badge key={player.id} variant="danger" size="sm">
                {player.web_name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
