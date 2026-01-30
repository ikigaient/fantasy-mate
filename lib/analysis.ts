import {
  PlayerWithDetails,
  AnalysisResult,
  Strength,
  Weakness,
  Team,
  EntryHistory,
} from './types';

export function calculateTeamAverageFDR(
  startingPlayers: PlayerWithDetails[],
  gameweeksAhead: number = 3
): number {
  let totalDifficulty = 0;
  let fixtureCount = 0;

  for (const player of startingPlayers) {
    const fixtures = player.upcomingFixtures.slice(0, gameweeksAhead);
    for (const fixture of fixtures) {
      totalDifficulty += fixture.difficulty;
      fixtureCount++;
    }
  }

  if (fixtureCount === 0) return 3; // Default to medium difficulty
  return totalDifficulty / fixtureCount;
}

export function getFDRColor(fdr: number): string {
  if (fdr < 2.5) return 'text-green-400';
  if (fdr <= 3.5) return 'text-yellow-400';
  return 'text-red-400';
}

export function getFDRBgColor(fdr: number): string {
  if (fdr < 2.5) return 'bg-green-900/30';
  if (fdr <= 3.5) return 'bg-yellow-900/30';
  return 'bg-red-900/30';
}

export function analyzeTeam(
  startingPlayers: PlayerWithDetails[],
  benchPlayers: PlayerWithDetails[],
  teams: Team[],
  bank: number,
  squadValue: number
): AnalysisResult {
  const allPlayers = [...startingPlayers, ...benchPlayers];
  const strengths: Strength[] = [];
  const weaknesses: Weakness[] = [];

  // Calculate average form
  const averageForm =
    startingPlayers.reduce((sum, p) => sum + parseFloat(p.form), 0) /
    startingPlayers.length;

  // 1. High-form players
  const highFormPlayers = startingPlayers.filter(
    (p) => parseFloat(p.form) >= 5.0
  );
  if (highFormPlayers.length >= 3) {
    strengths.push({
      type: 'form',
      title: 'Strong Form',
      description: `${highFormPlayers.length} players with form 5.0+`,
      players: highFormPlayers,
    });
  }

  // 2. Good fixtures
  const playersWithGoodFixtures = startingPlayers.filter((p) => {
    const avgDifficulty =
      p.upcomingFixtures.slice(0, 3).reduce((sum, f) => sum + f.difficulty, 0) /
      Math.min(3, p.upcomingFixtures.length || 1);
    return avgDifficulty < 3;
  });
  if (playersWithGoodFixtures.length >= 5) {
    strengths.push({
      type: 'fixtures',
      title: 'Favorable Fixtures',
      description: `${playersWithGoodFixtures.length} players with easy upcoming fixtures`,
      players: playersWithGoodFixtures,
    });
  }

  // 3. Premium assets performing
  const premiumPlayers = startingPlayers.filter(
    (p) => p.now_cost >= 100 && parseFloat(p.form) >= 4.0
  );
  if (premiumPlayers.length >= 2) {
    strengths.push({
      type: 'premium',
      title: 'Premium Assets Firing',
      description: `${premiumPlayers.length} expensive players delivering returns`,
      players: premiumPlayers,
    });
  }

  // 4. Balanced squad composition
  const positionCounts: Record<number, number> = {};
  startingPlayers.forEach((p) => {
    positionCounts[p.element_type] = (positionCounts[p.element_type] || 0) + 1;
  });
  const hasBalancedSquad =
    positionCounts[2] >= 3 && positionCounts[3] >= 3 && positionCounts[4] >= 1;
  if (hasBalancedSquad) {
    strengths.push({
      type: 'composition',
      title: 'Balanced Formation',
      description: 'Good distribution across positions',
    });
  }

  // 5. Value efficiency
  const avgPointsPerMillion =
    startingPlayers.reduce(
      (sum, p) => sum + p.total_points / (p.now_cost / 10),
      0
    ) / startingPlayers.length;
  if (avgPointsPerMillion > 10) {
    strengths.push({
      type: 'value',
      title: 'Good Value',
      description: `Strong points-per-million efficiency (${avgPointsPerMillion.toFixed(1)})`,
    });
  }

  // WEAKNESSES

  // 1. Underperforming players
  const underperformers = startingPlayers.filter(
    (p) => parseFloat(p.form) < 3.0 && p.minutes > 180
  );
  if (underperformers.length > 0) {
    weaknesses.push({
      type: 'underperforming',
      title: 'Underperforming Players',
      description: `${underperformers.length} players with form below 3.0`,
      severity: underperformers.length >= 3 ? 'high' : 'medium',
      players: underperformers,
    });
  }

  // 2. Tough fixtures
  const playersWithToughFixtures = startingPlayers.filter((p) => {
    if (p.upcomingFixtures.length === 0) return false;
    const avgDifficulty =
      p.upcomingFixtures.slice(0, 3).reduce((sum, f) => sum + f.difficulty, 0) /
      Math.min(3, p.upcomingFixtures.length);
    return avgDifficulty >= 4;
  });
  if (playersWithToughFixtures.length >= 4) {
    weaknesses.push({
      type: 'fixtures',
      title: 'Difficult Fixtures Ahead',
      description: `${playersWithToughFixtures.length} players facing tough opponents`,
      severity: 'medium',
      players: playersWithToughFixtures,
    });
  }

  // 3. Injured/Doubtful players
  const injuredPlayers = startingPlayers.filter(
    (p) => p.status !== 'a' || (p.chance_of_playing_next_round !== null && p.chance_of_playing_next_round < 75)
  );
  if (injuredPlayers.length > 0) {
    weaknesses.push({
      type: 'injury',
      title: 'Injury Concerns',
      description: `${injuredPlayers.length} players with availability doubts`,
      severity: injuredPlayers.length >= 2 ? 'high' : 'medium',
      players: injuredPlayers,
    });
  }

  // 4. Over-reliance on single team
  const teamCounts: Record<number, PlayerWithDetails[]> = {};
  startingPlayers.forEach((p) => {
    if (!teamCounts[p.team]) teamCounts[p.team] = [];
    teamCounts[p.team].push(p);
  });
  const overloadedTeams = Object.entries(teamCounts).filter(
    ([, players]) => players.length >= 3
  );
  if (overloadedTeams.length > 0) {
    const [teamId, players] = overloadedTeams[0];
    const team = teams.find((t) => t.id === parseInt(teamId));
    weaknesses.push({
      type: 'concentration',
      title: 'Team Concentration Risk',
      description: `${players.length} players from ${team?.short_name || 'one team'}`,
      severity: players.length >= 4 ? 'high' : 'low',
      players,
    });
  }

  // 5. Poor bench
  const benchForm =
    benchPlayers.reduce((sum, p) => sum + parseFloat(p.form), 0) /
    benchPlayers.length;
  if (benchForm < 2.0) {
    weaknesses.push({
      type: 'bench',
      title: 'Weak Bench',
      description: 'Bench players have poor form',
      severity: 'low',
      players: benchPlayers,
    });
  }

  // Calculate overall rating (0-100)
  let overallRating = 50;

  // Add points for strengths
  overallRating += strengths.length * 8;

  // Subtract for weaknesses
  weaknesses.forEach((w) => {
    if (w.severity === 'high') overallRating -= 12;
    else if (w.severity === 'medium') overallRating -= 8;
    else overallRating -= 4;
  });

  // Adjust for form
  if (averageForm > 5) overallRating += 10;
  else if (averageForm > 4) overallRating += 5;
  else if (averageForm < 3) overallRating -= 10;

  // Cap between 0 and 100
  overallRating = Math.max(0, Math.min(100, overallRating));

  // Calculate average FDR for next 3 gameweeks
  const averageFDR = calculateTeamAverageFDR(startingPlayers, 3);

  return {
    overallRating: Math.round(overallRating),
    teamValue: squadValue,
    squadValue: squadValue - bank,
    bank,
    averageForm: parseFloat(averageForm.toFixed(1)),
    averageFDR: parseFloat(averageFDR.toFixed(2)),
    strengths,
    weaknesses,
  };
}

export function getRatingColor(rating: number): string {
  if (rating >= 80) return 'text-green-500';
  if (rating >= 60) return 'text-yellow-500';
  if (rating >= 40) return 'text-orange-500';
  return 'text-red-500';
}

export function getRatingGrade(rating: number): string {
  if (rating >= 90) return 'A+';
  if (rating >= 80) return 'A';
  if (rating >= 70) return 'B+';
  if (rating >= 60) return 'B';
  if (rating >= 50) return 'C+';
  if (rating >= 40) return 'C';
  if (rating >= 30) return 'D';
  return 'F';
}

export function calculateChipsUsed(history: EntryHistory): string[] {
  return history.chips.map((c) => c.name);
}

export function getAvailableChips(history: EntryHistory): string[] {
  const allChips = ['wildcard', 'freehit', 'bboost', '3xc'];
  const usedChips = history.chips.map((c) => c.name);

  // Wildcard can be used twice per season (one before GW20, one after)
  const wildcardCount = usedChips.filter((c) => c === 'wildcard').length;

  return allChips.filter((chip) => {
    if (chip === 'wildcard') return wildcardCount < 2;
    return !usedChips.includes(chip);
  });
}
