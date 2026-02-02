'use client';

import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { TeamStat, calculateTeamStats } from '@/lib/team-stats';
import { EntryInfo, EntryHistory, BootstrapData, PlayerWithDetails } from '@/lib/types';

interface TeamStatsProps {
  entry: EntryInfo;
  history: EntryHistory;
  bootstrap: BootstrapData;
  startingPlayers: PlayerWithDetails[];
  benchPlayers: PlayerWithDetails[];
}

export function TeamStats({
  entry,
  history,
  bootstrap,
  startingPlayers,
  benchPlayers,
}: TeamStatsProps) {
  const stats = calculateTeamStats(entry, history, bootstrap, startingPlayers, benchPlayers);

  // Group stats by type
  const records = stats.filter(s => s.type === 'record');
  const achievements = stats.filter(s => s.type === 'achievement');
  const comparisons = stats.filter(s => s.type === 'comparison');
  const funStats = stats.filter(s => s.type === 'fun');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Season Review</h2>
        <p className="text-sm text-gray-400">
          Interesting facts and stats about your FPL journey this season
        </p>
      </div>

      {/* Records Section */}
      <Card>
        <CardHeader>
          <CardTitle>Season Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map(stat => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map(stat => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparisons Section */}
      <Card>
        <CardHeader>
          <CardTitle>How You Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisons.map(stat => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fun Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle>Fun Facts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funStats.map(stat => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ stat }: { stat: TeamStat }) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        stat.isPositive === true
          ? 'bg-green-900/20 border-green-800/50'
          : stat.isPositive === false
          ? 'bg-red-900/20 border-red-800/50'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{stat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-400">{stat.label}</div>
          <div className="text-xl font-bold text-white truncate">{stat.value}</div>
          {stat.comparison && (
            <div className="text-xs text-gray-500 mt-1">{stat.comparison}</div>
          )}
        </div>
      </div>
    </div>
  );
}
