import { Card, CardContent } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { AnalysisResult, EntryInfo, PlayerWithDetails } from '@/lib/types';
import { getRatingGrade, getRatingColor, getFDRColor, getFDRBgColor } from '@/lib/analysis';
import { formatPrice } from '@/lib/fpl-api';

interface TeamOverviewProps {
  entry: EntryInfo;
  analysis: AnalysisResult;
  currentGameweek: number;
  startingPlayers?: PlayerWithDetails[];
}

export function TeamOverview({
  entry,
  analysis,
  currentGameweek,
  startingPlayers = [],
}: TeamOverviewProps) {
  // Calculate average ownership
  const avgOwnership = startingPlayers.length > 0
    ? startingPlayers.reduce((sum, p) => sum + parseFloat(p.selected_by_percent), 0) / startingPlayers.length
    : 0;
  const ratingColor = getRatingColor(analysis.overallRating);
  const grade = getRatingGrade(analysis.overallRating);

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{entry.name}</h2>
            <p className="text-gray-400">
              {entry.player_first_name} {entry.player_last_name}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <span>GW{currentGameweek}</span>
              <span>|</span>
              <span>Rank: {entry.summary_overall_rank?.toLocaleString() || 'N/A'}</span>
              <span>|</span>
              <span>Points: {entry.summary_overall_points?.toLocaleString() || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${ratingColor}`}>
                {grade}
              </div>
              <div className="text-xs text-gray-400 mt-1">Team Rating</div>
            </div>

            <div className="w-32">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Score</span>
                <span className={ratingColor}>{analysis.overallRating}/100</span>
              </div>
              <ProgressBar value={analysis.overallRating} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6 pt-4 border-t border-gray-700">
          <StatBox
            label="Squad Value"
            value={formatPrice(analysis.squadValue)}
          />
          <StatBox label="Bank" value={formatPrice(analysis.bank)} />
          <StatBox
            label="Total Value"
            value={formatPrice(analysis.teamValue)}
          />
          <StatBox label="Avg Form" value={analysis.averageForm.toFixed(1)} />
          <FDRStatBox fdr={analysis.averageFDR} />
          <OwnershipStatBox ownership={avgOwnership} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-gray-900 rounded-lg">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function FDRStatBox({ fdr }: { fdr: number }) {
  const colorClass = getFDRColor(fdr);
  const bgClass = getFDRBgColor(fdr);
  const label = fdr < 2.5 ? 'Easy' : fdr <= 3.5 ? 'Moderate' : 'Tough';

  return (
    <div className={`text-center p-3 rounded-lg ${bgClass}`}>
      <div className={`text-lg font-semibold ${colorClass}`}>{fdr.toFixed(2)}</div>
      <div className="text-xs text-gray-400">Avg FDR (3GW)</div>
      <div className={`text-[10px] ${colorClass}`}>{label} run</div>
    </div>
  );
}

function OwnershipStatBox({ ownership }: { ownership: number }) {
  const isTemplate = ownership > 25;
  const isDifferential = ownership < 15;
  const bgClass = isDifferential
    ? 'bg-purple-900/30'
    : isTemplate
    ? 'bg-blue-900/30'
    : 'bg-gray-900';
  const colorClass = isDifferential
    ? 'text-purple-400'
    : isTemplate
    ? 'text-blue-400'
    : 'text-white';
  const label = isDifferential ? 'Differential' : isTemplate ? 'Template' : 'Balanced';

  return (
    <div className={`text-center p-3 rounded-lg ${bgClass}`}>
      <div className={`text-lg font-semibold ${colorClass}`}>{ownership.toFixed(1)}%</div>
      <div className="text-xs text-gray-400">Avg Ownership</div>
      <div className={`text-[10px] ${colorClass}`}>{label}</div>
    </div>
  );
}
