import {
  PlayerWithDetails,
  TransferSuggestion,
  TransferOption,
  TransferCategory,
  Player,
  Team,
  Fixture,
} from './types';
import { enrichPlayerData } from './fpl-api';

interface TransferContext {
  gwIndex: number; // 0 = current GW, 1 = next GW, 2 = GW after
  targetGameweek: number;
  category: TransferCategory;
  previousSuggestedOut: Set<number>; // Player IDs already suggested out
}

/**
 * Main entry point for transfer suggestions
 * Implements varied suggestions per gameweek
 */
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

  // Track which players have been suggested out to ensure variety
  const previousSuggestedOut = new Set<number>();

  // Define category focus for each gameweek
  const gwCategories: TransferCategory[] = [
    'form_pick', // GW1: Focus on immediate poor performers
    'fixture_swing', // GW2: Focus on fixture swings
    'differential', // GW3: Focus on differentials
  ];

  for (let gwIndex = 0; gwIndex < 3; gwIndex++) {
    const targetGameweek = currentGameweek + gwIndex;
    const category = gwCategories[gwIndex];

    const context: TransferContext = {
      gwIndex,
      targetGameweek,
      category,
      previousSuggestedOut,
    };

    // Find the best player to transfer out based on category
    const { playerOut, reasonOut } = findPlayerOut(
      startingPlayers,
      context
    );

    if (!playerOut) {
      continue;
    }

    // Add to tracking set
    previousSuggestedOut.add(playerOut.id);

    // Find best replacements
    const maxPrice = playerOut.now_cost + bank;
    const samePositionPlayers = allPlayers.filter(
      (p) =>
        p.element_type === playerOut.element_type &&
        p.now_cost <= maxPrice &&
        !squadPlayerIds.has(p.id) &&
        p.status === 'a' &&
        p.minutes > 90
    );

    // Enrich and rank replacements
    const enrichedReplacements = samePositionPlayers.map((p) =>
      enrichPlayerData(p, teams, fixtures, targetGameweek)
    );

    const rankedReplacements = rankReplacements(
      enrichedReplacements,
      playerOut,
      context
    ).slice(0, 3);

    const transferOptions: TransferOption[] = rankedReplacements.map(
      ({ player, score, category: optionCategory }) => ({
        player,
        priceDiff: player.now_cost - playerOut.now_cost,
        formDiff: parseFloat(player.form) - parseFloat(playerOut.form),
        fixtureDifficulty: calculateAvgFixtureDifficulty(player, 3),
        expectedPoints: calculateExpectedPoints(player, 3),
        reason: getTransferInReason(player, playerOut, optionCategory),
        category: optionCategory,
        confidence: Math.min(100, Math.round(score * 5)),
        stats: {
          ownership: parseFloat(player.selected_by_percent),
          xGI: parseFloat(player.expected_goal_involvements || '0'),
          ict: parseFloat(player.ict_index || '0'),
        },
      })
    );

    // Determine if taking a hit is worth it
    const topOption = transferOptions[0];
    const takeHit = gwIndex > 0 && freeTransfers < gwIndex + 1;
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
      category,
    });
  }

  return suggestions;
}

/**
 * Find the best player to transfer out based on the GW category
 */
function findPlayerOut(
  startingPlayers: PlayerWithDetails[],
  context: TransferContext
): { playerOut: PlayerWithDetails | null; reasonOut: string } {
  const { category, previousSuggestedOut, gwIndex } = context;

  // Filter out players already suggested in previous GWs
  const availablePlayers = startingPlayers.filter(
    (p) => !previousSuggestedOut.has(p.id)
  );

  if (availablePlayers.length === 0) {
    return { playerOut: null, reasonOut: '' };
  }

  let rankedPlayers: PlayerWithDetails[];
  let reasonOut: string;

  switch (category) {
    case 'form_pick':
      // Prioritize injured/unavailable, then lowest form
      rankedPlayers = [...availablePlayers].sort((a, b) => {
        // First priority: unavailability
        const aUnavailable = a.status !== 'a' ? 1 : 0;
        const bUnavailable = b.status !== 'a' ? 1 : 0;
        if (aUnavailable !== bUnavailable) return bUnavailable - aUnavailable;

        // Second priority: low chance of playing
        const aChance = a.chance_of_playing_next_round ?? 100;
        const bChance = b.chance_of_playing_next_round ?? 100;
        if (aChance < 75 || bChance < 75) return aChance - bChance;

        // Third priority: lowest form
        return parseFloat(a.form) - parseFloat(b.form);
      });
      reasonOut = getFormBasedReason(rankedPlayers[0]);
      break;

    case 'fixture_swing':
      // Prioritize players with tough upcoming fixtures
      rankedPlayers = [...availablePlayers].sort((a, b) => {
        const aFixtures = a.upcomingFixtures.slice(gwIndex, gwIndex + 3);
        const bFixtures = b.upcomingFixtures.slice(gwIndex, gwIndex + 3);
        const aAvgDiff = aFixtures.length > 0
          ? aFixtures.reduce((sum, f) => sum + f.difficulty, 0) / aFixtures.length
          : 3;
        const bAvgDiff = bFixtures.length > 0
          ? bFixtures.reduce((sum, f) => sum + f.difficulty, 0) / bFixtures.length
          : 3;
        // Higher difficulty = more likely to transfer out
        return bAvgDiff - aAvgDiff;
      });
      reasonOut = getFixtureBasedReason(rankedPlayers[0], gwIndex);
      break;

    case 'differential':
      // Consider high ownership players that aren't performing well
      rankedPlayers = [...availablePlayers].sort((a, b) => {
        const aOwnership = parseFloat(a.selected_by_percent);
        const bOwnership = parseFloat(b.selected_by_percent);
        const aForm = parseFloat(a.form);
        const bForm = parseFloat(b.form);

        // High ownership + poor form = prime transfer out candidate
        const aScore = (aOwnership / 10) - (aForm * 0.5);
        const bScore = (bOwnership / 10) - (bForm * 0.5);
        return bScore - aScore;
      });
      reasonOut = getDifferentialReason(rankedPlayers[0]);
      break;

    default:
      rankedPlayers = [...availablePlayers].sort((a, b) => {
        return calculateTransferOutScore(a, gwIndex) - calculateTransferOutScore(b, gwIndex);
      });
      reasonOut = getGenericReason(rankedPlayers[0]);
  }

  return { playerOut: rankedPlayers[0], reasonOut };
}

/**
 * Rank replacement options based on category and metrics
 */
function rankReplacements(
  players: PlayerWithDetails[],
  playerOut: PlayerWithDetails,
  context: TransferContext
): { player: PlayerWithDetails; score: number; category: TransferCategory }[] {
  const { category } = context;

  return players
    .map((player) => {
      let score = 0;
      let assignedCategory = category;

      // Base metrics (always considered)
      const form = parseFloat(player.form) || 0;
      const ppg = parseFloat(player.points_per_game) || 0;
      const ownership = parseFloat(player.selected_by_percent) || 0;
      const xGI = parseFloat(player.expected_goal_involvements || '0');
      const ict = parseFloat(player.ict_index || '0');

      // Calculate BPS per 90
      const minutes = player.minutes || 1;
      const bpsPer90 = (player.bps / minutes) * 90;

      // Fixture difficulty for next 3 GWs
      const fixtures = player.upcomingFixtures.slice(0, 3);
      const avgFixtureDifficulty = fixtures.length > 0
        ? fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length
        : 3;

      switch (category) {
        case 'form_pick':
          // Weight form and immediate performance heavily
          score += form * 3;
          score += ppg * 2;
          score += (parseFloat(player.ep_next || '0')) * 2;
          score += ict / 30;
          score += (5 - avgFixtureDifficulty) * 1.5;
          break;

        case 'fixture_swing':
          // Weight fixture difficulty heavily
          score += (5 - avgFixtureDifficulty) * 5;
          score += form * 1.5;
          score += ppg * 1;
          // Bonus for home fixtures
          const homeCount = fixtures.filter(f => f.isHome).length;
          score += homeCount * 2;
          break;

        case 'differential':
          // Heavily weight low ownership
          if (ownership < 5) score += 30;
          else if (ownership < 10) score += 20;
          else if (ownership < 15) score += 10;
          else if (ownership < 20) score += 5;

          // Use advanced metrics
          score += xGI * 10;
          score += ict / 20;
          score += bpsPer90 / 10;
          score += (5 - avgFixtureDifficulty) * 3;
          score += form * 1.5;
          break;

        default:
          score = calculateTransferInScore(player, context.gwIndex);
      }

      // Determine best category label for this player
      if (ownership < 10 && score > 15) {
        assignedCategory = 'differential';
      } else if (avgFixtureDifficulty < 2.5) {
        assignedCategory = 'fixture_swing';
      } else if (form > 5) {
        assignedCategory = 'form_pick';
      } else if (player.now_cost < playerOut.now_cost - 10) {
        assignedCategory = 'value_pick';
      } else if (player.now_cost >= 100 && form >= 4) {
        assignedCategory = 'premium_upgrade';
      }

      return { player, score, category: assignedCategory };
    })
    .sort((a, b) => b.score - a.score);
}

// Helper functions for reasons
function getFormBasedReason(player: PlayerWithDetails): string {
  const reasons: string[] = [];

  if (player.status !== 'a') {
    if (player.status === 'i') reasons.push('Injured');
    else if (player.status === 's') reasons.push('Suspended');
    else if (player.status === 'd') reasons.push('Doubtful');
    else reasons.push('Unavailable');
  }

  const form = parseFloat(player.form);
  if (form < 2) reasons.push('Very poor form');
  else if (form < 3) reasons.push('Below average form');

  if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 75) {
    reasons.push(`Only ${player.chance_of_playing_next_round}% chance of playing`);
  }

  return reasons.length > 0 ? reasons.join('. ') : 'Underperforming';
}

function getFixtureBasedReason(player: PlayerWithDetails, gwAhead: number): string {
  const fixtures = player.upcomingFixtures.slice(gwAhead, gwAhead + 3);
  if (fixtures.length === 0) return 'No upcoming fixtures';

  const avgDiff = fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
  const opponents = fixtures.slice(0, 2).map(f => f.opponent.short_name).join(', ');

  if (avgDiff >= 4.5) return `Very tough run: ${opponents}`;
  if (avgDiff >= 4) return `Difficult fixtures ahead: ${opponents}`;
  return `Challenging fixture run: ${opponents}`;
}

function getDifferentialReason(player: PlayerWithDetails): string {
  const ownership = parseFloat(player.selected_by_percent);
  const form = parseFloat(player.form);

  if (ownership > 30 && form < 4) {
    return `High ownership (${ownership.toFixed(1)}%) but underperforming`;
  }
  if (ownership > 20) {
    return `Template player - consider differential`;
  }
  return 'Space for a differential pick';
}

function getGenericReason(player: PlayerWithDetails): string {
  const reasons: string[] = [];
  const form = parseFloat(player.form);
  const avgDiff = calculateAvgFixtureDifficulty(player, 3);

  if (form < 3) reasons.push('Poor form');
  if (avgDiff >= 4) reasons.push('Tough fixtures');
  if (player.status !== 'a') reasons.push('Availability concern');

  return reasons.length > 0 ? reasons.join('. ') : 'Lowest expected returns';
}

function calculateTransferOutScore(player: PlayerWithDetails, gwAhead: number): number {
  let score = 0;

  const form = parseFloat(player.form);
  score += form * 2;

  const fixtures = player.upcomingFixtures.slice(gwAhead, gwAhead + 3);
  if (fixtures.length > 0) {
    const avgDifficulty = fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
    score += (5 - avgDifficulty) * 1.5;
  }

  if (player.status !== 'a') {
    score -= 5;
  } else if (player.chance_of_playing_next_round !== null) {
    score -= (100 - player.chance_of_playing_next_round) / 20;
  }

  score += parseFloat(player.points_per_game) * 0.5;
  score += (player.now_cost / 100) * 0.5;

  return score;
}

function calculateTransferInScore(player: PlayerWithDetails, gwAhead: number): number {
  let score = 0;

  const form = parseFloat(player.form);
  score += form * 2.5;

  const fixtures = player.upcomingFixtures.slice(0, 3);
  if (fixtures.length > 0) {
    const avgDifficulty = fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
    score += (5 - avgDifficulty) * 2;
  }

  const epNext = parseFloat(player.ep_next || '0');
  score += epNext * 1.5;
  score += parseFloat(player.points_per_game) * 1;

  const ownership = parseFloat(player.selected_by_percent);
  if (ownership < 5) score += 5;
  else if (ownership < 10) score += 3;
  else if (ownership < 15) score += 1;

  score += parseFloat(player.ict_index) / 50;

  return score;
}

function calculateAvgFixtureDifficulty(player: PlayerWithDetails, count: number): number {
  const fixtures = player.upcomingFixtures.slice(0, count);
  if (fixtures.length === 0) return 3;
  return fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
}

function calculateExpectedPoints(player: PlayerWithDetails, gameweeks: number): number {
  const ppg = parseFloat(player.points_per_game) || 0;
  const form = parseFloat(player.form) || 0;

  const basePoints = (form * 0.6 + ppg * 0.4) * gameweeks;

  const fixtures = player.upcomingFixtures.slice(0, gameweeks);
  if (fixtures.length > 0) {
    const avgDifficulty = fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
    const difficultyModifier = 1 + (3 - avgDifficulty) * 0.1;
    return Math.round(basePoints * difficultyModifier * 10) / 10;
  }

  return Math.round(basePoints * 10) / 10;
}

function getTransferInReason(
  playerIn: PlayerWithDetails,
  playerOut: PlayerWithDetails,
  category: TransferCategory
): string {
  const reasons: string[] = [];

  // Add category-specific header
  const categoryLabels: Record<TransferCategory, string> = {
    form_pick: 'Form Pick',
    fixture_swing: 'Fixture Swing',
    differential: 'Differential',
    premium_upgrade: 'Premium Upgrade',
    value_pick: 'Value Pick',
  };

  const formDiff = parseFloat(playerIn.form) - parseFloat(playerOut.form);
  if (formDiff > 2) reasons.push('Much better form');
  else if (formDiff > 1) reasons.push('Better form');

  const avgDifficulty = calculateAvgFixtureDifficulty(playerIn, 3);
  if (avgDifficulty <= 2) reasons.push('Excellent fixtures');
  else if (avgDifficulty <= 2.5) reasons.push('Good fixtures');

  const ownership = parseFloat(playerIn.selected_by_percent);
  if (ownership < 5) reasons.push(`Low ownership (${ownership.toFixed(1)}%)`);
  else if (ownership < 10) reasons.push(`Differential (${ownership.toFixed(1)}%)`);

  const xGI = parseFloat(playerIn.expected_goal_involvements || '0');
  if (xGI > 3) reasons.push(`High xGI (${xGI.toFixed(2)})`);

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

export function getCategoryBadgeColor(category: TransferCategory): string {
  switch (category) {
    case 'form_pick':
      return 'bg-orange-600';
    case 'fixture_swing':
      return 'bg-blue-600';
    case 'differential':
      return 'bg-purple-600';
    case 'premium_upgrade':
      return 'bg-yellow-600';
    case 'value_pick':
      return 'bg-green-600';
    default:
      return 'bg-gray-600';
  }
}

export function getCategoryLabel(category: TransferCategory): string {
  switch (category) {
    case 'form_pick':
      return 'Form Pick';
    case 'fixture_swing':
      return 'Fixture Swing';
    case 'differential':
      return 'Differential';
    case 'premium_upgrade':
      return 'Premium';
    case 'value_pick':
      return 'Value';
    default:
      return category;
  }
}
