import {
  PlayerWithDetails,
  TransferSuggestion,
  TransferOption,
  Player,
  Team,
  Fixture,
} from './types';
import { enrichPlayerData } from './fpl-api';

export function identifyTransferTargets(
  startingPlayers: PlayerWithDetails[],
  benchPlayers: PlayerWithDetails[],
  allPlayers: Player[],
  teams: Team[],
  fixtures: Fixture[],
  currentGameweek: number,
  bank: number,
  freeTransfers: number = 1
): TransferSuggestion[] {
  const suggestions: TransferSuggestion[] = [];
  const squadPlayerIds = new Set([
    ...startingPlayers.map((p) => p.id),
    ...benchPlayers.map((p) => p.id),
  ]);

  // Analyze for next 3 gameweeks
  for (let gw = 0; gw < 3; gw++) {
    const targetGameweek = currentGameweek + gw;

    // Find the worst performing player considering upcoming fixtures
    const rankedPlayers = [...startingPlayers].sort((a, b) => {
      const scoreA = calculateTransferOutScore(a, gw);
      const scoreB = calculateTransferOutScore(b, gw);
      return scoreA - scoreB; // Lower score = worse performer
    });

    const playerOut = rankedPlayers[0];
    const reasonOut = getTransferOutReason(playerOut);

    // Find best replacements
    const maxPrice = playerOut.now_cost + bank;
    const samePositionPlayers = allPlayers.filter(
      (p) =>
        p.element_type === playerOut.element_type &&
        p.now_cost <= maxPrice &&
        !squadPlayerIds.has(p.id) &&
        p.status === 'a' &&
        p.minutes > 90 // Must have played
    );

    // Enrich and rank replacements
    const enrichedReplacements = samePositionPlayers.map((p) =>
      enrichPlayerData(p, teams, fixtures, targetGameweek)
    );

    const rankedReplacements = enrichedReplacements
      .sort((a, b) => {
        const scoreA = calculateTransferInScore(a, gw);
        const scoreB = calculateTransferInScore(b, gw);
        return scoreB - scoreA; // Higher score = better replacement
      })
      .slice(0, 3);

    const transferOptions: TransferOption[] = rankedReplacements.map((player) => ({
      player,
      priceDiff: player.now_cost - playerOut.now_cost,
      formDiff: parseFloat(player.form) - parseFloat(playerOut.form),
      fixtureDifficulty: calculateAvgFixtureDifficulty(player, 3),
      expectedPoints: calculateExpectedPoints(player, 3),
      reason: getTransferInReason(player, playerOut),
    }));

    // Determine if taking a hit is worth it
    const topOption = transferOptions[0];
    const takeHit = gw > 0 && freeTransfers < gw + 1;
    const hitWorth =
      takeHit &&
      topOption &&
      topOption.expectedPoints - calculateExpectedPoints(playerOut, 3) > 4;

    suggestions.push({
      gameweek: targetGameweek,
      playerOut,
      reasonOut,
      suggestions: transferOptions,
      takeHit,
      hitWorth,
    });
  }

  return suggestions;
}

function calculateTransferOutScore(player: PlayerWithDetails, gwAhead: number): number {
  let score = 0;

  // Form factor (higher form = higher score = less likely to transfer out)
  const form = parseFloat(player.form);
  score += form * 2;

  // Fixture factor
  const fixtures = player.upcomingFixtures.slice(gwAhead, gwAhead + 3);
  if (fixtures.length > 0) {
    const avgDifficulty =
      fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
    score += (5 - avgDifficulty) * 1.5; // Easier fixtures = higher score
  }

  // Injury/availability factor
  if (player.status !== 'a') {
    score -= 5;
  } else if (player.chance_of_playing_next_round !== null) {
    score -= (100 - player.chance_of_playing_next_round) / 20;
  }

  // Points per game factor
  score += parseFloat(player.points_per_game) * 0.5;

  // Price factor (don't want to lose expensive players)
  score += (player.now_cost / 100) * 0.5;

  return score;
}

function calculateTransferInScore(player: PlayerWithDetails, gwAhead: number): number {
  let score = 0;

  // Form factor
  const form = parseFloat(player.form);
  score += form * 2.5;

  // Fixture factor
  const fixtures = player.upcomingFixtures.slice(0, 3);
  if (fixtures.length > 0) {
    const avgDifficulty =
      fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
    score += (5 - avgDifficulty) * 2;
  }

  // Expected points
  const epNext = parseFloat(player.ep_next || '0');
  score += epNext * 1.5;

  // Points per game
  score += parseFloat(player.points_per_game) * 1;

  // Selection percentage (differential bonus for low ownership)
  const ownership = parseFloat(player.selected_by_percent);
  if (ownership < 10) score += 2;
  else if (ownership < 20) score += 1;

  // ICT index
  score += parseFloat(player.ict_index) / 50;

  return score;
}

function calculateAvgFixtureDifficulty(
  player: PlayerWithDetails,
  count: number
): number {
  const fixtures = player.upcomingFixtures.slice(0, count);
  if (fixtures.length === 0) return 3;
  return fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
}

function calculateExpectedPoints(
  player: PlayerWithDetails,
  gameweeks: number
): number {
  const ppg = parseFloat(player.points_per_game) || 0;
  const form = parseFloat(player.form) || 0;
  const epNext = parseFloat(player.ep_next || '0');

  // Weight recent form more heavily
  const basePoints = (form * 0.6 + ppg * 0.4) * gameweeks;

  // Adjust for fixture difficulty
  const fixtures = player.upcomingFixtures.slice(0, gameweeks);
  if (fixtures.length > 0) {
    const avgDifficulty =
      fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
    const difficultyModifier = 1 + (3 - avgDifficulty) * 0.1;
    return Math.round(basePoints * difficultyModifier * 10) / 10;
  }

  return Math.round(basePoints * 10) / 10;
}

function getTransferOutReason(player: PlayerWithDetails): string {
  const reasons: string[] = [];

  if (player.status !== 'a') {
    if (player.status === 'i') reasons.push('Injured');
    else if (player.status === 's') reasons.push('Suspended');
    else if (player.status === 'd') reasons.push('Doubtful');
    else reasons.push('Unavailable');
  }

  const form = parseFloat(player.form);
  if (form < 2) reasons.push('Very poor form');
  else if (form < 3) reasons.push('Poor form');

  const avgDifficulty = calculateAvgFixtureDifficulty(player, 3);
  if (avgDifficulty >= 4) reasons.push('Tough upcoming fixtures');

  if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 75) {
    reasons.push(`Only ${player.chance_of_playing_next_round}% chance of playing`);
  }

  if (reasons.length === 0) {
    reasons.push('Lowest performing in squad');
  }

  return reasons.join('. ');
}

function getTransferInReason(
  playerIn: PlayerWithDetails,
  playerOut: PlayerWithDetails
): string {
  const reasons: string[] = [];

  const formDiff = parseFloat(playerIn.form) - parseFloat(playerOut.form);
  if (formDiff > 2) reasons.push('Much better form');
  else if (formDiff > 1) reasons.push('Better form');

  const avgDifficulty = calculateAvgFixtureDifficulty(playerIn, 3);
  if (avgDifficulty <= 2) reasons.push('Excellent fixtures');
  else if (avgDifficulty <= 2.5) reasons.push('Good fixtures');

  const ownership = parseFloat(playerIn.selected_by_percent);
  if (ownership < 5) reasons.push('Low ownership differential');

  const ppgDiff = parseFloat(playerIn.points_per_game) - parseFloat(playerOut.points_per_game);
  if (ppgDiff > 1) reasons.push('Higher points per game');

  if (reasons.length === 0) {
    reasons.push('Best available option');
  }

  return reasons.join('. ');
}

export function formatTransferSummary(suggestion: TransferSuggestion): string {
  const { playerOut, suggestions, takeHit, hitWorth } = suggestion;
  if (suggestions.length === 0) return 'No suitable replacements found';

  const topPick = suggestions[0];
  let summary = `${playerOut.web_name} -> ${topPick.player.web_name}`;

  if (takeHit) {
    summary += hitWorth ? ' (hit recommended)' : ' (hit not recommended)';
  }

  return summary;
}
