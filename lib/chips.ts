import {
  ChipRecommendation,
  PlayerWithDetails,
  Gameweek,
  Fixture,
  Team,
  EntryHistory,
} from './types';

export function analyzeChipStrategy(
  startingPlayers: PlayerWithDetails[],
  benchPlayers: PlayerWithDetails[],
  gameweeks: Gameweek[],
  fixtures: Fixture[],
  teams: Team[],
  history: EntryHistory,
  currentGameweek: number
): ChipRecommendation[] {
  // Defensive null checks for history.chips
  const usedChips = history?.chips?.map((c) => c.name) || [];
  const chipHistory = history?.chips || [];
  const recommendations: ChipRecommendation[] = [];

  // Season context - determine if we're in second half
  const isSecondHalf = currentGameweek >= 20;
  const gameweeksRemaining = 38 - currentGameweek;

  // Debug logging
  console.log('[Chip Strategy] Current GW:', currentGameweek);
  console.log('[Chip Strategy] Chips from history:', chipHistory);
  console.log('[Chip Strategy] Used chip names:', usedChips);

  // Analyze next 6 gameweeks
  const upcomingGWs = gameweeks
    .filter((gw) => gw.id >= currentGameweek && gw.id < currentGameweek + 6)
    .sort((a, b) => a.id - b.id);

  // 1. Wildcard Analysis
  const wildcardUsages = chipHistory.filter((c) => c.name === 'wildcard');
  const wildcardCount = wildcardUsages.length;
  // In second half, user gets a new wildcard regardless of first half usage
  const wildcardAvailable = isSecondHalf ? wildcardCount < 2 : wildcardCount < 1;
  const wildcardUsedGW = wildcardUsages.length > 0 ? wildcardUsages[wildcardUsages.length - 1].event : null;

  let wildcardReason = '';
  let wildcardPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let wildcardGW: number | null = null;
  let wildcardSeasonContext = '';

  if (wildcardAvailable) {
    // Check if team needs significant restructuring
    const poorFormCount = startingPlayers.filter(
      (p) => parseFloat(p.form) < 3
    ).length;
    const injuryCount = startingPlayers.filter(
      (p) => p.status !== 'a'
    ).length;

    // Season context affects urgency
    if (isSecondHalf && gameweeksRemaining <= 10) {
      wildcardSeasonContext = `${gameweeksRemaining} GWs remaining - consider using soon.`;
    } else if (isSecondHalf) {
      wildcardSeasonContext = 'Second half wildcard available for GW20-38.';
    } else {
      wildcardSeasonContext = 'First half wildcard expires after GW19.';
    }

    if (poorFormCount >= 4 || injuryCount >= 3) {
      wildcardPriority = 'high';
      wildcardGW = currentGameweek;
      wildcardReason = `${poorFormCount} players in poor form and ${injuryCount} with availability issues. Consider rebuilding your squad.`;
    } else if (poorFormCount >= 3) {
      wildcardPriority = 'medium';
      wildcardGW = currentGameweek + 1;
      wildcardReason = 'Several underperforming players. May want to restructure soon.';
    } else if (isSecondHalf && gameweeksRemaining <= 5) {
      wildcardPriority = 'medium';
      wildcardGW = currentGameweek;
      wildcardReason = 'Only a few gameweeks left. Use it or lose it!';
    } else {
      wildcardReason = 'Team is performing adequately. Save for fixture swings or emergencies.';
      wildcardPriority = 'low';
    }
  } else {
    wildcardReason = isSecondHalf
      ? 'Both wildcards already used this season.'
      : 'First half wildcard already used. Second available from GW20.';
  }

  recommendations.push({
    chip: 'wildcard',
    available: wildcardAvailable,
    alreadyUsed: !wildcardAvailable,
    usedInGameweek: wildcardUsedGW,
    recommendedGameweek: wildcardGW,
    reason: wildcardReason,
    priority: wildcardPriority,
    seasonContext: wildcardSeasonContext,
  });

  // 2. Free Hit Analysis
  const freeHitUsage = chipHistory.find((c) => c.name === 'freehit');
  const freeHitUsed = !!freeHitUsage;
  const freeHitUsedGW = freeHitUsage?.event || null;
  let freeHitReason = '';
  let freeHitPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let freeHitGW: number | null = null;
  let freeHitSeasonContext = freeHitUsed ? '' : `Available for GW${currentGameweek}-38`;

  if (!freeHitUsed) {
    // Check for blank gameweeks or extreme fixture swings
    const blankGWs = detectBlankGameweeks(upcomingGWs, fixtures, startingPlayers);

    if (blankGWs.length > 0) {
      freeHitPriority = 'high';
      freeHitGW = blankGWs[0];
      freeHitReason = `Blank Gameweek ${freeHitGW} detected. Perfect opportunity for Free Hit.`;
    } else {
      // Check for fixture difficulty swings
      const swingGW = findFixtureSwingGameweek(upcomingGWs, fixtures, startingPlayers, teams);
      if (swingGW) {
        freeHitPriority = 'medium';
        freeHitGW = swingGW;
        freeHitReason = `GW${swingGW} has significant fixture difficulty. Consider Free Hit.`;
      } else if (isSecondHalf && gameweeksRemaining <= 8) {
        freeHitPriority = 'medium';
        freeHitReason = `${gameweeksRemaining} GWs remaining. Look for upcoming DGW/BGW to maximize value.`;
      } else {
        freeHitReason = 'No immediate need. Save for blank gameweeks or emergency situations.';
        freeHitPriority = 'low';
      }
    }
  } else {
    freeHitReason = `Free Hit already used in GW${freeHitUsedGW}.`;
  }

  recommendations.push({
    chip: 'freehit',
    available: !freeHitUsed,
    alreadyUsed: freeHitUsed,
    usedInGameweek: freeHitUsedGW,
    recommendedGameweek: freeHitGW,
    reason: freeHitReason,
    priority: freeHitPriority,
    seasonContext: freeHitSeasonContext,
  });

  // 3. Bench Boost Analysis
  const bbUsage = chipHistory.find((c) => c.name === 'bboost');
  const benchBoostUsed = !!bbUsage;
  const bbUsedGW = bbUsage?.event || null;
  let bbReason = '';
  let bbPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let bbGW: number | null = null;
  let bbSeasonContext = benchBoostUsed ? '' : `Available for GW${currentGameweek}-38`;

  if (!benchBoostUsed) {
    // Check bench quality
    const benchAvgForm =
      benchPlayers.reduce((sum, p) => sum + parseFloat(p.form), 0) /
      (benchPlayers.length || 1);

    // Check for double gameweeks
    const dgwGW = detectDoubleGameweek(upcomingGWs, fixtures, benchPlayers);

    if (dgwGW && benchAvgForm > 3) {
      bbPriority = 'high';
      bbGW = dgwGW;
      bbReason = `Double Gameweek ${dgwGW} with decent bench (${benchAvgForm.toFixed(1)} avg form). Ideal for Bench Boost.`;
    } else if (benchAvgForm > 4) {
      bbPriority = 'medium';
      bbGW = currentGameweek;
      bbReason = `Strong bench with ${benchAvgForm.toFixed(1)} average form. Good opportunity.`;
    } else if (isSecondHalf && gameweeksRemaining <= 8) {
      bbPriority = 'medium';
      bbReason = `${gameweeksRemaining} GWs remaining. Look for DGW to use with a strong bench.`;
    } else {
      bbReason = `Bench quality is low (${benchAvgForm.toFixed(1)} avg form). Improve bench before using.`;
      bbPriority = 'low';
    }
  } else {
    bbReason = `Bench Boost already used in GW${bbUsedGW}.`;
  }

  recommendations.push({
    chip: 'benchboost',
    available: !benchBoostUsed,
    alreadyUsed: benchBoostUsed,
    usedInGameweek: bbUsedGW,
    recommendedGameweek: bbGW,
    reason: bbReason,
    priority: bbPriority,
    seasonContext: bbSeasonContext,
  });

  // 4. Triple Captain Analysis
  const tcUsage = chipHistory.find((c) => c.name === '3xc');
  const tcUsed = !!tcUsage;
  const tcUsedGW = tcUsage?.event || null;
  let tcReason = '';
  let tcPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let tcGW: number | null = null;
  let tcSeasonContext = tcUsed ? '' : `Available for GW${currentGameweek}-38`;

  if (!tcUsed) {
    // Find best TC candidate
    const tcCandidate = findBestTCCandidate(startingPlayers, fixtures, currentGameweek);

    if (tcCandidate) {
      const { player, gameweek, score } = tcCandidate;

      if (score > 15) {
        tcPriority = 'high';
        tcGW = gameweek;
        tcReason = `${player.web_name} in GW${gameweek} - excellent fixtures and form (${parseFloat(player.form).toFixed(1)}).`;
      } else if (score > 10) {
        tcPriority = 'medium';
        tcGW = gameweek;
        tcReason = `${player.web_name} in GW${gameweek} could be a good option.`;
      } else if (isSecondHalf && gameweeksRemaining <= 8) {
        tcPriority = 'medium';
        tcReason = `${gameweeksRemaining} GWs remaining. Look for DGW to maximize value.`;
      } else {
        tcReason = 'No standout TC opportunity. Wait for better fixtures or double gameweek.';
        tcPriority = 'low';
      }
    } else {
      tcReason = 'No premium captaincy options identified.';
      tcPriority = 'low';
    }
  } else {
    tcReason = `Triple Captain already used in GW${tcUsedGW}.`;
  }

  recommendations.push({
    chip: 'triplecaptain',
    available: !tcUsed,
    alreadyUsed: tcUsed,
    usedInGameweek: tcUsedGW,
    recommendedGameweek: tcGW,
    reason: tcReason,
    priority: tcPriority,
    seasonContext: tcSeasonContext,
  });

  return recommendations;
}

function detectBlankGameweeks(
  gameweeks: Gameweek[],
  fixtures: Fixture[],
  players: PlayerWithDetails[]
): number[] {
  const blankGWs: number[] = [];
  const teamIds = [...new Set(players.map((p) => p.team))];

  for (const gw of gameweeks) {
    const gwFixtures = fixtures.filter((f) => f.event === gw.id);
    const teamsWithFixtures = new Set([
      ...gwFixtures.map((f) => f.team_h),
      ...gwFixtures.map((f) => f.team_a),
    ]);

    // Count how many of our teams have no fixture
    const blanks = teamIds.filter((id) => !teamsWithFixtures.has(id)).length;

    if (blanks >= 3) {
      blankGWs.push(gw.id);
    }
  }

  return blankGWs;
}

function findFixtureSwingGameweek(
  gameweeks: Gameweek[],
  fixtures: Fixture[],
  players: PlayerWithDetails[],
  teams: Team[]
): number | null {
  for (const gw of gameweeks) {
    let totalDifficulty = 0;
    let fixtureCount = 0;

    for (const player of players) {
      const playerFixture = fixtures.find(
        (f) =>
          f.event === gw.id &&
          (f.team_h === player.team || f.team_a === player.team)
      );

      if (playerFixture) {
        const difficulty =
          playerFixture.team_h === player.team
            ? playerFixture.team_h_difficulty
            : playerFixture.team_a_difficulty;
        totalDifficulty += difficulty;
        fixtureCount++;
      }
    }

    const avgDifficulty = fixtureCount > 0 ? totalDifficulty / fixtureCount : 3;

    if (avgDifficulty >= 4) {
      return gw.id;
    }
  }

  return null;
}

function detectDoubleGameweek(
  gameweeks: Gameweek[],
  fixtures: Fixture[],
  players: PlayerWithDetails[]
): number | null {
  const teamIds = [...new Set(players.map((p) => p.team))];

  for (const gw of gameweeks) {
    const gwFixtures = fixtures.filter((f) => f.event === gw.id);

    // Check if any team has 2 fixtures
    for (const teamId of teamIds) {
      const teamFixtureCount = gwFixtures.filter(
        (f) => f.team_h === teamId || f.team_a === teamId
      ).length;

      if (teamFixtureCount >= 2) {
        return gw.id;
      }
    }
  }

  return null;
}

function findBestTCCandidate(
  players: PlayerWithDetails[],
  fixtures: Fixture[],
  currentGameweek: number
): { player: PlayerWithDetails; gameweek: number; score: number } | null {
  // Only consider premium attacking players
  const premiumPlayers = players.filter(
    (p) =>
      (p.element_type === 3 || p.element_type === 4) && // MID or FWD
      p.now_cost >= 90 && // 9.0m+
      parseFloat(p.form) >= 4
  );

  if (premiumPlayers.length === 0) return null;

  let bestCandidate = null;
  let bestScore = 0;
  let bestGW = currentGameweek;

  for (const player of premiumPlayers) {
    for (let gw = currentGameweek; gw < currentGameweek + 6; gw++) {
      const gwFixtures = player.upcomingFixtures.filter((f) => f.event === gw);

      if (gwFixtures.length === 0) continue;

      // Calculate TC score
      let score = 0;
      score += parseFloat(player.form) * 2;
      score += parseFloat(player.points_per_game) * 1.5;

      // Fixture difficulty bonus
      for (const fixture of gwFixtures) {
        score += (5 - fixture.difficulty) * 2;
        if (fixture.isHome) score += 1;
      }

      // Double gameweek bonus
      if (gwFixtures.length >= 2) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = player;
        bestGW = gw;
      }
    }
  }

  if (bestCandidate) {
    return { player: bestCandidate, gameweek: bestGW, score: bestScore };
  }

  return null;
}

export function getChipDisplayName(chip: string): string {
  switch (chip) {
    case 'wildcard':
      return 'Wildcard';
    case 'freehit':
      return 'Free Hit';
    case 'benchboost':
      return 'Bench Boost';
    case 'triplecaptain':
      return 'Triple Captain';
    case 'bboost':
      return 'Bench Boost';
    case '3xc':
      return 'Triple Captain';
    default:
      return chip;
  }
}

export function getChipIcon(chip: string): string {
  switch (chip) {
    case 'wildcard':
      return 'WC';
    case 'freehit':
      return 'FH';
    case 'benchboost':
    case 'bboost':
      return 'BB';
    case 'triplecaptain':
    case '3xc':
      return 'TC';
    default:
      return '?';
  }
}
