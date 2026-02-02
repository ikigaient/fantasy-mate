import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { RiskSelector } from './ui/RiskSelector';
import { CaptaincyAnalysis as CaptaincyAnalysisType, CaptainCandidate } from '@/lib/types';
import { formatPrice, getDifficultyColor } from '@/lib/fpl-api';
import { getCaptainScoreColor, getCaptainPickBg, CaptaincyByRisk } from '@/lib/captaincy';
import { useRisk } from '@/lib/risk-context';

interface CaptaincyAnalysisProps {
  analysisByRisk: CaptaincyByRisk;
  currentCaptain?: number;
  currentViceCaptain?: number;
}

export function CaptaincyAnalysis({
  analysisByRisk,
  currentCaptain,
  currentViceCaptain,
}: CaptaincyAnalysisProps) {
  const { riskLevel } = useRisk();
  const analysis = analysisByRisk[riskLevel];
  const { topPick, safePick, differentialPick, allCandidates } = analysis;

  return (
    <div className="space-y-6">
      {/* Risk Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Captain Recommendations</h2>
          <p className="text-sm text-gray-400">
            Adjust your risk tolerance to see different captain picks
          </p>
        </div>
        <RiskSelector />
      </div>

      {/* Recommended Picks */}
      <Card>
        <CardHeader>
          <CardTitle>Top Picks for {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Strategy</CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Based on form, fixtures, xG/xA, and team performance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <RecommendedPick
              title="Top Pick"
              subtitle="Highest expected return"
              candidate={topPick}
              type="top"
              isCurrentCaptain={currentCaptain === topPick.player.id}
            />
            <RecommendedPick
              title="Safe Pick"
              subtitle="Template / high ownership"
              candidate={safePick}
              type="safe"
              isCurrentCaptain={currentCaptain === safePick.player.id}
            />
            {differentialPick && (
              <RecommendedPick
                title="Differential"
                subtitle="Under 15% ownership"
                candidate={differentialPick}
                type="differential"
                isCurrentCaptain={currentCaptain === differentialPick.player.id}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Candidates Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Captain Rankings</CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            All eligible players ranked by captain potential
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allCandidates.slice(0, 8).map((candidate, idx) => (
              <CandidateRow
                key={candidate.player.id}
                candidate={candidate}
                rank={idx + 1}
                isCurrentCaptain={currentCaptain === candidate.player.id}
                isCurrentVC={currentViceCaptain === candidate.player.id}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendedPick({
  title,
  subtitle,
  candidate,
  type,
  isCurrentCaptain,
}: {
  title: string;
  subtitle: string;
  candidate: CaptainCandidate;
  type: 'top' | 'safe' | 'differential';
  isCurrentCaptain: boolean;
}) {
  const bgClass = getCaptainPickBg(type);
  const { player, captainScore, reasons, fixtureInfo, stats, expectedPoints, ownership } =
    candidate;

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-gray-400">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
        {isCurrentCaptain && (
          <Badge variant="success" size="sm">
            Current (C)
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${getDifficultyColor(
            fixtureInfo.difficulty
          )}`}
        >
          {player.web_name.substring(0, 1)}
        </div>
        <div>
          <div className="font-medium text-white">{player.web_name}</div>
          <div className="text-xs text-gray-400">
            {player.teamData.short_name} | {formatPrice(player.now_cost)}
          </div>
        </div>
      </div>

      {/* Fixture */}
      <div className="flex items-center gap-2 mb-3 p-2 bg-gray-900/50 rounded">
        <div
          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${getDifficultyColor(
            fixtureInfo.difficulty
          )}`}
        >
          {fixtureInfo.difficulty}
        </div>
        <div className="text-sm">
          <span className="text-gray-300">{fixtureInfo.opponent}</span>
          <span className="text-gray-500 ml-1">({fixtureInfo.isHome ? 'H' : 'A'})</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        <div>
          <div className="text-xs text-gray-500">Form</div>
          <div
            className={`text-sm font-medium ${
              stats.form >= 5
                ? 'text-green-400'
                : stats.form >= 3
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {stats.form.toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">PPG</div>
          <div className="text-sm font-medium text-gray-300">{stats.ppg.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">xGI</div>
          <div className="text-sm font-medium text-gray-300">{stats.xGI.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Own%</div>
          <div
            className={`text-sm font-medium ${
              ownership < 15 ? 'text-purple-400' : 'text-gray-300'
            }`}
          >
            {ownership.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Expected Points */}
      <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded mb-2">
        <span className="text-sm text-gray-400">Expected (2x)</span>
        <span className="font-medium text-fpl-green">{expectedPoints.toFixed(1)} pts</span>
      </div>

      {/* Reasons */}
      <div className="flex flex-wrap gap-1">
        {reasons.slice(0, 3).map((reason, idx) => (
          <span
            key={idx}
            className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-300 rounded"
          >
            {reason}
          </span>
        ))}
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  rank,
  isCurrentCaptain,
  isCurrentVC,
}: {
  candidate: CaptainCandidate;
  rank: number;
  isCurrentCaptain: boolean;
  isCurrentVC: boolean;
}) {
  const { player, captainScore, fixtureInfo, stats, expectedPoints, ownership, isDifferential } =
    candidate;

  const rankColor =
    rank === 1
      ? 'text-yellow-400'
      : rank === 2
      ? 'text-gray-300'
      : rank === 3
      ? 'text-orange-400'
      : 'text-gray-500';

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        isCurrentCaptain
          ? 'bg-green-900/20 border border-green-900/30'
          : 'bg-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-6 text-center font-bold ${rankColor}`}>{rank}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{player.web_name}</span>
            {isCurrentCaptain && (
              <Badge variant="success" size="sm">
                C
              </Badge>
            )}
            {isCurrentVC && (
              <Badge variant="default" size="sm">
                VC
              </Badge>
            )}
            {isDifferential && (
              <Badge variant="info" size="sm">
                Diff
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {player.teamData.short_name} | vs {fixtureInfo.opponent} ({fixtureInfo.isHome ? 'H' : 'A'})
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-center">
          <div>
            <div className="text-xs text-gray-500">Form</div>
            <div
              className={`text-sm font-medium ${
                stats.form >= 5
                  ? 'text-green-400'
                  : stats.form >= 3
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {stats.form.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">xGI</div>
            <div className="text-sm font-medium text-gray-300">{stats.xGI.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Own%</div>
            <div
              className={`text-sm font-medium ${
                ownership < 15 ? 'text-purple-400' : 'text-gray-300'
              }`}
            >
              {ownership.toFixed(0)}%
            </div>
          </div>
        </div>

        <div
          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${getDifficultyColor(
            fixtureInfo.difficulty
          )}`}
        >
          {fixtureInfo.difficulty}
        </div>

        <div className="text-right w-16">
          <div className={`font-medium ${getCaptainScoreColor(captainScore)}`}>
            {captainScore.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">Score</div>
        </div>

        <div className="text-right w-16">
          <div className="font-medium text-white">{expectedPoints.toFixed(1)}</div>
          <div className="text-xs text-gray-500">xPts</div>
        </div>
      </div>
    </div>
  );
}
