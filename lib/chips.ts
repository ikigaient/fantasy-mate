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
  const usedChips = history.chips.map((c) => c.name);
  const recommendations: ChipRecommendation[] = [];

  // Analyze next 6 gameweeks
  const upcomingGWs = gameweeks
    .filter((gw) => gw.id >= currentGameweek && gw.id < currentGameweek + 6)
    .sort((a, b) => a.id - b.id);

  // 1. Wildcard Analysis
  const wildcardCount = usedChips.filter((c) => c === 'wildcard').length;
  const wildcardAvailable = wildcardCount < 2;

  let wildcardReason = '';
  let wildcardPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let wildcardGW: number | null = null;

  if (wildcardAvailable) {
    // Check if team needs significant restructuring
    const poorFormCount = startingPlayers.filter(
      (p) => parseFloat(p.form) < 3
    ).length;
    const injuryCount = startingPlayers.filter(
      (p) => p.status !== 'a'
    ).length;

    if (poorFormCount >= 4 || injuryCount >= 3) {
      wildcardPriority = 'high';
      wildcardGW = currentGameweek;
      wildcardReason = `${poorFormCount} players in poor form and ${injuryCount} with availability issues. Consider rebuilding your squad.`;
    } else if (poorFormCount >= 3) {
      wildcardPriority = 'medium';
      wildcardGW = currentGameweek + 1;
      wildcardReason = 'Several underperforming players. May want to restructure soon.';
    } else {
      wildcardReason = 'Team is performing adequately. Save for fixture swings or emergencies.';
      wildcardPriority = 'low';
    }
  } else {
    wildcardReason = 'Both wildcards already used this season.';
  }

  recommendations.push({
    chip: 'wildcard',
    available: wildcardAvailable,
    alreadyUsed: !wildcardAvailable,
    recommendedGameweek: wildcardGW,
    reason: wildcardReason,
    priority: wildcardPriority,
  });

  // 2. Free Hit Analysis
  const freeHitUsed = usedChips.includes('freehit');
  let freeHitReason = '';
  let freeHitPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let freeHitGW: number | null = null;

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
      } else {
        freeHitReason = 'No immediate need. Save for blank gameweeks or emergency situations.';
        freeHitPriority = 'low';
      }
    }
  } else {
    freeHitReason = 'Free Hit already used this season.';
  }

  recommendations.push({
    chip: 'freehit',
    available: !freeHitUsed,
    alreadyUsed: freeHitUsed,
    recommendedGameweek: freeHitGW,
    reason: freeHitReason,
    priority: freeHitPriority,
  });

  // 3. Bench Boost Analysis
  const benchBoostUsed = usedChips.includes('bboost');
  let bbReason = '';
  let bbPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let bbGW: number | null = null;

  if (!benchBoostUsed) {
    // Check bench quality
    const benchAvgForm =
      benchPlayers.reduce((sum, p) => sum + parseFloat(p.form), 0) /
      benchPlayers.length;

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
    } else {
      bbReason = `Bench quality is low (${benchAvgForm.toFixed(1)} avg form). Improve bench before using.`;
      bbPriority = 'low';
    }
  } else {
    bbReason = 'Bench Boost already used this season.';
  }

  recommendations.push({
    chip: 'benchboost',
    available: !benchBoostUsed,
    alreadyUsed: benchBoostUsed,
    recommendedGameweek: bbGW,
    reason: bbReason,
    priority: bbPriority,
  });

  // 4. Triple Captain Analysis
  const tcUsed = usedChips.includes('3xc');
  let tcReason = '';
  let tcPriority: 'high' | 'medium' | 'low' | 'none' = 'none';
  let tcGW: number | null = null;

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
      } else {
        tcReason = 'No standout TC opportunity. Wait for better fixtures or double gameweek.';
        tcPriority = 'low';
      }
    } else {
      tcReason = 'No premium captaincy options identified.';
      tcPriority = 'low';
    }
  } else {
    tcReason = 'Triple Captain already used this season.';
  }

  recommendations.push({
    chip: 'triplecaptain',
    available: !tcUsed,
    alreadyUsed: tcUsed,
    recommendedGameweek: tcGW,
    reason: tcReason,
    priority: tcPriority,
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
