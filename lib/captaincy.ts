import { PlayerWithDetails, CaptainCandidate, CaptaincyAnalysis } from './types';

/**
 * Calculate captain score for a player
 * Higher score = better captain pick
 */
function calculateCaptainScore(player: PlayerWithDetails): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  const form = parseFloat(player.form) || 0;
  const ppg = parseFloat(player.points_per_game) || 0;
  const xGI = parseFloat(player.expected_goal_involvements) || 0;
  const ict = parseFloat(player.ict_index) || 0;

  // Form weight (40% of score) - max 40 points
  const formScore = Math.min(form * 4, 40);
  score += formScore;
  if (form >= 7) {
    reasons.push('Exceptional form');
  } else if (form >= 5) {
    reasons.push('Strong form');
  }

  // Points per game (20% of score) - max 20 points
  const ppgScore = Math.min(ppg * 2.5, 20);
  score += ppgScore;
  if (ppg >= 6) {
    reasons.push('High PPG');
  }

  // Expected goal involvement (20% of score) - max 20 points
  const xGIScore = Math.min(xGI * 2, 20);
  score += xGIScore;
  if (xGI >= 6) {
    reasons.push('High xGI');
  }

  // ICT index (10% of score) - max 10 points
  const ictScore = Math.min(ict / 10, 10);
  score += ictScore;

  // Fixture difficulty bonus (10% of score) - max 10 points
  const nextFixture = player.upcomingFixtures[0];
  if (nextFixture) {
    const fixtureBonus = (5 - nextFixture.difficulty) * 2.5;
    score += fixtureBonus;

    if (nextFixture.difficulty <= 2) {
      reasons.push(`Easy fixture (${nextFixture.opponent.short_name} ${nextFixture.isHome ? 'H' : 'A'})`);
    }

    // Home advantage bonus
    if (nextFixture.isHome) {
      score += 3;
      if (!reasons.some(r => r.includes('H)'))) {
        reasons.push('Home advantage');
      }
    }
  }

  // Position bonus - attackers score more points per involvement
  if (player.element_type === 4) {
    // Forward
    score += 5;
    reasons.push('Forward (high ceiling)');
  } else if (player.element_type === 3) {
    // Midfielder
    score += 3;
  }

  // Penalty for injury risk
  if (player.status !== 'a') {
    score -= 30;
    reasons.push('Fitness doubt');
  } else if (
    player.chance_of_playing_next_round !== null &&
    player.chance_of_playing_next_round < 100
  ) {
    score -= (100 - player.chance_of_playing_next_round) / 5;
    if (player.chance_of_playing_next_round < 75) {
      reasons.push(`Only ${player.chance_of_playing_next_round}% chance`);
    }
  }

  // Minutes played consideration
  if (player.minutes < 270) {
    score -= 10;
    reasons.push('Limited minutes');
  }

  return { score: Math.max(0, score), reasons };
}

/**
 * Calculate expected points for a player for the upcoming gameweek
 */
function calculateExpectedPoints(player: PlayerWithDetails): number {
  const form = parseFloat(player.form) || 0;
  const ppg = parseFloat(player.points_per_game) || 0;
  const nextFixture = player.upcomingFixtures[0];

  // Base expected points from form and PPG
  let expected = (form + ppg) / 2;

  // Adjust for fixture difficulty
  if (nextFixture) {
    const difficultyMultiplier = 1 + (3 - nextFixture.difficulty) * 0.1;
    expected *= difficultyMultiplier;

    // Home bonus
    if (nextFixture.isHome) {
      expected *= 1.1;
    }
  }

  // Captain doubles points
  return expected * 2;
}

/**
 * Analyze squad for captaincy picks
 */
export function analyzeCaptaincy(
  startingPlayers: PlayerWithDetails[]
): CaptaincyAnalysis {
  // Calculate scores for all eligible players
  const candidates: CaptainCandidate[] = startingPlayers
    .filter((p) => p.status === 'a' || p.chance_of_playing_next_round === null || p.chance_of_playing_next_round >= 75)
    .map((player) => {
      const { score, reasons } = calculateCaptainScore(player);
      const ownership = parseFloat(player.selected_by_percent) || 0;
      const nextFixture = player.upcomingFixtures[0];

      return {
        player,
        captainScore: score,
        reasons,
        ownership,
        expectedPoints: calculateExpectedPoints(player),
        isDifferential: ownership < 15,
        fixtureInfo: nextFixture
          ? {
              opponent: nextFixture.opponent.short_name,
              isHome: nextFixture.isHome,
              difficulty: nextFixture.difficulty,
            }
          : { opponent: 'TBD', isHome: true, difficulty: 3 },
        stats: {
          form: parseFloat(player.form) || 0,
          xGI: parseFloat(player.expected_goal_involvements) || 0,
          ict: parseFloat(player.ict_index) || 0,
          ppg: parseFloat(player.points_per_game) || 0,
        },
      };
    })
    .sort((a, b) => b.captainScore - a.captainScore);

  // Top pick is highest score
  const topPick = candidates[0];

  // Safe pick is highest owned player in top 5
  const safePick =
    candidates
      .slice(0, 5)
      .sort((a, b) => b.ownership - a.ownership)[0] || topPick;

  // Differential pick is best option under 15% ownership
  const differentials = candidates.filter((c) => c.ownership < 15);
  const differentialPick = differentials[0] || null;

  return {
    topPick,
    safePick,
    differentialPick,
    allCandidates: candidates,
  };
}

/**
 * Get color based on captain score
 */
export function getCaptainScoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-orange-400';
}

/**
 * Get background color for captain pick type
 */
export function getCaptainPickBg(type: 'top' | 'safe' | 'differential'): string {
  switch (type) {
    case 'top':
      return 'bg-green-900/30 border-green-700/50';
    case 'safe':
      return 'bg-blue-900/30 border-blue-700/50';
    case 'differential':
      return 'bg-purple-900/30 border-purple-700/50';
  }
}
