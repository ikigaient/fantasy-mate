import { EntryInfo, EntryHistory, BootstrapData, PlayerWithDetails } from './types';

export interface TeamStat {
  id: string;
  label: string;
  value: string | number;
  comparison?: string;
  icon: string;
  type: 'achievement' | 'record' | 'comparison' | 'fun';
  isPositive?: boolean;
}

/**
 * Calculate interesting stats about the team's season
 */
export function calculateTeamStats(
  entry: EntryInfo,
  history: EntryHistory,
  bootstrap: BootstrapData,
  startingPlayers: PlayerWithDetails[],
  benchPlayers: PlayerWithDetails[]
): TeamStat[] {
  const stats: TeamStat[] = [];
  const current = history.current || [];
  const allPlayers = [...startingPlayers, ...benchPlayers];

  if (current.length === 0) {
    return stats;
  }

  // Best gameweek
  const bestGw = current.reduce((best, gw) => gw.points > best.points ? gw : best, current[0]);
  stats.push({
    id: 'best_gw',
    label: 'Best Gameweek',
    value: `${bestGw.points} pts`,
    comparison: `GW${bestGw.event} - Ranked ${bestGw.rank?.toLocaleString() || 'N/A'}`,
    icon: '🏆',
    type: 'record',
    isPositive: true,
  });

  // Worst gameweek
  const worstGw = current.reduce((worst, gw) => gw.points < worst.points ? gw : worst, current[0]);
  stats.push({
    id: 'worst_gw',
    label: 'Worst Gameweek',
    value: `${worstGw.points} pts`,
    comparison: `GW${worstGw.event}`,
    icon: '😅',
    type: 'record',
    isPositive: false,
  });

  // Total points on bench
  const totalBenchPoints = current.reduce((sum, gw) => sum + (gw.points_on_bench || 0), 0);
  stats.push({
    id: 'bench_points',
    label: 'Points Left on Bench',
    value: `${totalBenchPoints} pts`,
    comparison: totalBenchPoints > 50 ? 'Ouch! Consider bench boost' : 'Good bench management',
    icon: '🪑',
    type: 'fun',
    isPositive: totalBenchPoints < 30,
  });

  // Transfer hits taken
  const totalHits = current.reduce((sum, gw) => sum + (gw.event_transfers_cost || 0), 0);
  stats.push({
    id: 'hits_taken',
    label: 'Transfer Hits Taken',
    value: `-${totalHits} pts`,
    comparison: totalHits === 0 ? 'Perfect patience!' : `${Math.abs(totalHits) / 4} extra transfers`,
    icon: '💥',
    type: 'comparison',
    isPositive: totalHits <= 8,
  });

  // Total transfers made
  const totalTransfers = current.reduce((sum, gw) => sum + (gw.event_transfers || 0), 0);
  stats.push({
    id: 'total_transfers',
    label: 'Transfers Made',
    value: totalTransfers,
    comparison: `${(totalTransfers / current.length).toFixed(1)} per GW average`,
    icon: '🔄',
    type: 'comparison',
  });

  // Rank progression
  const firstRank = current[0]?.overall_rank || 0;
  const currentRank = current[current.length - 1]?.overall_rank || 0;
  const rankChange = firstRank - currentRank;
  stats.push({
    id: 'rank_progress',
    label: 'Rank Progression',
    value: rankChange > 0 ? `+${rankChange.toLocaleString()}` : rankChange.toLocaleString(),
    comparison: `From ${firstRank.toLocaleString()} to ${currentRank.toLocaleString()}`,
    icon: rankChange > 0 ? '📈' : '📉',
    type: 'comparison',
    isPositive: rankChange > 0,
  });

  // Best rank achieved
  const bestRank = current.reduce((best, gw) =>
    (gw.overall_rank && gw.overall_rank < best) ? gw.overall_rank : best,
    current[0]?.overall_rank || Infinity
  );
  stats.push({
    id: 'best_rank',
    label: 'Best Overall Rank',
    value: bestRank.toLocaleString(),
    comparison: 'Season high',
    icon: '🎯',
    type: 'achievement',
    isPositive: true,
  });

  // Green arrows (rank improvements)
  let greenArrows = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  for (let i = 1; i < current.length; i++) {
    const prevRank = current[i - 1]?.overall_rank || 0;
    const currRank = current[i]?.overall_rank || 0;
    if (currRank < prevRank) {
      greenArrows++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  stats.push({
    id: 'green_arrows',
    label: 'Green Arrows',
    value: greenArrows,
    comparison: `Longest streak: ${longestStreak} GWs`,
    icon: '🟢',
    type: 'achievement',
    isPositive: greenArrows > current.length / 2,
  });

  // Team value
  const teamValue = entry.last_deadline_value / 10;
  stats.push({
    id: 'team_value',
    label: 'Team Value',
    value: `£${teamValue.toFixed(1)}m`,
    comparison: teamValue > 102 ? 'Above starting budget!' : `${((teamValue - 100) * 10).toFixed(0)} profit`,
    icon: '💰',
    type: 'comparison',
    isPositive: teamValue > 100,
  });

  // Chips used
  const chipsUsed = history.chips || [];
  const chipNames = chipsUsed.map(c => {
    switch(c.name) {
      case 'wildcard': return 'WC';
      case 'freehit': return 'FH';
      case 'bboost': return 'BB';
      case '3xc': return 'TC';
      default: return c.name;
    }
  });
  stats.push({
    id: 'chips_used',
    label: 'Chips Used',
    value: chipsUsed.length > 0 ? chipNames.join(', ') : 'None',
    comparison: `${4 - chipsUsed.length} chips remaining`,
    icon: '🎮',
    type: 'fun',
  });

  // Average ownership of squad
  const avgOwnership = allPlayers.reduce((sum, p) => sum + parseFloat(p.selected_by_percent), 0) / allPlayers.length;
  stats.push({
    id: 'avg_ownership',
    label: 'Squad Avg Ownership',
    value: `${avgOwnership.toFixed(1)}%`,
    comparison: avgOwnership > 25 ? 'Template squad' : avgOwnership < 15 ? 'Differential heavy' : 'Balanced mix',
    icon: '👥',
    type: 'comparison',
  });

  // Most owned player in squad
  const mostOwned = allPlayers.reduce((most, p) =>
    parseFloat(p.selected_by_percent) > parseFloat(most.selected_by_percent) ? p : most,
    allPlayers[0]
  );
  if (mostOwned) {
    stats.push({
      id: 'most_owned',
      label: 'Most Owned Player',
      value: mostOwned.web_name,
      comparison: `${parseFloat(mostOwned.selected_by_percent).toFixed(1)}% ownership`,
      icon: '📊',
      type: 'fun',
    });
  }

  // Biggest differential in squad
  const biggestDiff = allPlayers.reduce((diff, p) =>
    parseFloat(p.selected_by_percent) < parseFloat(diff.selected_by_percent) ? p : diff,
    allPlayers[0]
  );
  if (biggestDiff) {
    stats.push({
      id: 'biggest_diff',
      label: 'Biggest Differential',
      value: biggestDiff.web_name,
      comparison: `Only ${parseFloat(biggestDiff.selected_by_percent).toFixed(1)}% own`,
      icon: '💎',
      type: 'fun',
    });
  }

  // Points above/below average
  const totalPoints = entry.summary_overall_points;
  const avgGameweekPoints = bootstrap.events
    .filter(e => e.finished)
    .reduce((sum, e) => sum + (e.average_entry_score || 0), 0);
  const pointsDiff = totalPoints - avgGameweekPoints;
  stats.push({
    id: 'vs_average',
    label: 'vs Average Manager',
    value: pointsDiff > 0 ? `+${pointsDiff}` : pointsDiff.toString(),
    comparison: pointsDiff > 0 ? 'Above average!' : 'Below average',
    icon: pointsDiff > 0 ? '⬆️' : '⬇️',
    type: 'comparison',
    isPositive: pointsDiff > 0,
  });

  return stats;
}
