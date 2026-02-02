import { PlayerWithDetails, Player, Team, Fixture } from './types';
import { enrichPlayerData } from './fpl-api';

export interface ChipTemplate {
  chip: 'wildcard' | 'benchboost' | 'freehit';
  formation: string;
  totalCost: number;
  reasoning: string;
  positions: {
    position: number;
    positionName: string;
    players: TemplatePlayer[];
  }[];
}

export interface TemplatePlayer {
  player: PlayerWithDetails;
  reason: string;
  priority: 'essential' | 'recommended' | 'option';
}

const POSITION_NAMES: Record<number, string> = {
  1: 'Goalkeeper',
  2: 'Defender',
  3: 'Midfielder',
  4: 'Forward',
};

/**
 * Generate a wildcard template - best 15-player squad to build
 */
export function generateWildcardTemplate(
  allPlayers: Player[],
  teams: Team[],
  fixtures: Fixture[],
  currentGameweek: number,
  budget: number = 1000 // 100.0m in 0.1m units
): ChipTemplate {
  // Filter available players
  const availablePlayers = allPlayers.filter(
    p => p.status === 'a' && p.minutes > 180
  );

  // Enrich with fixture data
  const enrichedPlayers = availablePlayers.map(p =>
    enrichPlayerData(p, teams, fixtures, currentGameweek)
  );

  // Score players based on form, fixtures, and value
  const scoredPlayers = enrichedPlayers.map(p => ({
    player: p,
    score: calculateWildcardScore(p),
  })).sort((a, b) => b.score - a.score);

  // Build optimal squad by position
  const positions: ChipTemplate['positions'] = [];

  // Goalkeepers (2)
  const gks = scoredPlayers.filter(p => p.player.element_type === 1);
  positions.push({
    position: 1,
    positionName: 'Goalkeeper',
    players: [
      { player: gks[0]?.player, reason: 'Best value starting keeper', priority: 'essential' },
      { player: gks.find(g => g.player.now_cost <= 45)?.player || gks[1]?.player, reason: 'Budget backup', priority: 'option' },
    ].filter(p => p.player) as TemplatePlayer[],
  });

  // Defenders (5)
  const defs = scoredPlayers.filter(p => p.player.element_type === 2);
  positions.push({
    position: 2,
    positionName: 'Defender',
    players: [
      { player: defs[0]?.player, reason: 'Best overall defender', priority: 'essential' },
      { player: defs[1]?.player, reason: 'Premium defensive asset', priority: 'essential' },
      { player: defs[2]?.player, reason: 'Good fixture run', priority: 'recommended' },
      { player: defs.find(d => d.player.now_cost <= 50)?.player || defs[3]?.player, reason: 'Value enabler', priority: 'option' },
      { player: defs.find(d => d.player.now_cost <= 45)?.player || defs[4]?.player, reason: 'Bench fodder', priority: 'option' },
    ].filter(p => p.player) as TemplatePlayer[],
  });

  // Midfielders (5)
  const mids = scoredPlayers.filter(p => p.player.element_type === 3);
  positions.push({
    position: 3,
    positionName: 'Midfielder',
    players: [
      { player: mids[0]?.player, reason: 'Premium midfielder', priority: 'essential' },
      { player: mids[1]?.player, reason: 'High ceiling pick', priority: 'essential' },
      { player: mids[2]?.player, reason: 'Great fixtures', priority: 'recommended' },
      { player: mids[3]?.player, reason: 'Differential option', priority: 'recommended' },
      { player: mids.find(m => m.player.now_cost <= 55)?.player || mids[4]?.player, reason: 'Value mid', priority: 'option' },
    ].filter(p => p.player) as TemplatePlayer[],
  });

  // Forwards (3)
  const fwds = scoredPlayers.filter(p => p.player.element_type === 4);
  positions.push({
    position: 4,
    positionName: 'Forward',
    players: [
      { player: fwds[0]?.player, reason: 'Premium striker', priority: 'essential' },
      { player: fwds[1]?.player, reason: 'Form pick', priority: 'recommended' },
      { player: fwds.find(f => f.player.now_cost <= 60)?.player || fwds[2]?.player, reason: 'Budget forward', priority: 'option' },
    ].filter(p => p.player) as TemplatePlayer[],
  });

  // Calculate total cost
  const totalCost = positions.reduce((sum, pos) =>
    sum + pos.players.slice(0, pos.position === 1 ? 2 : pos.position === 4 ? 3 : 5)
      .reduce((s, p) => s + (p.player?.now_cost || 0), 0), 0
  );

  return {
    chip: 'wildcard',
    formation: '3-5-2',
    totalCost,
    reasoning: 'Balanced template focusing on premium midfielders with good fixture runs and value enablers to free up funds.',
    positions,
  };
}

/**
 * Generate a bench boost template - optimize bench for a double gameweek
 */
export function generateBenchBoostTemplate(
  currentSquad: PlayerWithDetails[],
  allPlayers: Player[],
  teams: Team[],
  fixtures: Fixture[],
  currentGameweek: number,
  bank: number
): ChipTemplate {
  // Filter current bench players
  const currentIds = new Set(currentSquad.map(p => p.id));

  // Find best bench options by position
  const availablePlayers = allPlayers
    .filter(p => !currentIds.has(p.id) && p.status === 'a' && p.minutes > 90)
    .map(p => enrichPlayerData(p, teams, fixtures, currentGameweek));

  const positions: ChipTemplate['positions'] = [];

  // Recommend bench upgrades for each position
  [1, 2, 3, 4].forEach(pos => {
    const currentInPos = currentSquad.filter(p => p.element_type === pos);
    const optionsInPos = availablePlayers
      .filter(p => p.element_type === pos)
      .map(p => ({ player: p, score: calculateBenchBoostScore(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    positions.push({
      position: pos,
      positionName: POSITION_NAMES[pos],
      players: optionsInPos.map((o, i) => ({
        player: o.player,
        reason: i === 0 ? 'Best double gameweek pick' : 'Alternative option',
        priority: i === 0 ? 'essential' : 'option',
      })) as TemplatePlayer[],
    });
  });

  return {
    chip: 'benchboost',
    formation: 'N/A',
    totalCost: 0,
    reasoning: 'Focus on players with double gameweek fixtures and high expected minutes. Prioritize nailed starters.',
    positions,
  };
}

/**
 * Generate a free hit template - one-week punt squad
 */
export function generateFreeHitTemplate(
  allPlayers: Player[],
  teams: Team[],
  fixtures: Fixture[],
  targetGameweek: number
): ChipTemplate {
  // Filter available players
  const availablePlayers = allPlayers
    .filter(p => p.status === 'a' && p.minutes > 90)
    .map(p => enrichPlayerData(p, teams, fixtures, targetGameweek));

  // Score based on single gameweek potential
  const scoredPlayers = availablePlayers.map(p => ({
    player: p,
    score: calculateFreeHitScore(p),
  })).sort((a, b) => b.score - a.score);

  const positions: ChipTemplate['positions'] = [];

  // Build aggressive one-week squad
  [1, 2, 3, 4].forEach(pos => {
    const inPos = scoredPlayers.filter(p => p.player.element_type === pos);
    const count = pos === 1 ? 2 : pos === 4 ? 3 : 5;

    positions.push({
      position: pos,
      positionName: POSITION_NAMES[pos],
      players: inPos.slice(0, count).map((p, i) => ({
        player: p.player,
        reason: getOneWeekReason(p.player, i),
        priority: i < 2 ? 'essential' : 'recommended',
      })) as TemplatePlayer[],
    });
  });

  const totalCost = positions.reduce((sum, pos) =>
    sum + pos.players.reduce((s, p) => s + (p.player?.now_cost || 0), 0), 0
  );

  return {
    chip: 'freehit',
    formation: '3-4-3',
    totalCost,
    reasoning: 'Aggressive picks targeting the easiest fixtures this gameweek. Maximum attacking potential.',
    positions,
  };
}

// Helper scoring functions
function calculateWildcardScore(player: PlayerWithDetails): number {
  let score = 0;
  const form = parseFloat(player.form) || 0;
  const ppg = parseFloat(player.points_per_game) || 0;
  const xGI = parseFloat(player.expected_goal_involvements || '0');

  score += form * 2;
  score += ppg * 1.5;
  score += xGI * 3;

  // Fixture difficulty for next 6 GWs
  const fixtures = player.upcomingFixtures.slice(0, 6);
  if (fixtures.length > 0) {
    const avgDiff = fixtures.reduce((s, f) => s + f.difficulty, 0) / fixtures.length;
    score += (5 - avgDiff) * 4;
  }

  // Value consideration
  const valueRatio = (form + ppg) / (player.now_cost / 10);
  score += valueRatio * 5;

  return score;
}

function calculateBenchBoostScore(player: PlayerWithDetails): number {
  let score = 0;
  const form = parseFloat(player.form) || 0;

  score += form * 3;

  // Check for double gameweek (multiple fixtures)
  const nextFixture = player.upcomingFixtures[0];
  if (nextFixture && nextFixture.difficulty <= 2) {
    score += 10;
  }

  // Minutes guarantee
  if (player.minutes > 450) score += 5;

  return score;
}

function calculateFreeHitScore(player: PlayerWithDetails): number {
  let score = 0;
  const form = parseFloat(player.form) || 0;
  const xGI = parseFloat(player.expected_goal_involvements || '0');

  score += form * 4;
  score += xGI * 5;

  // Focus on immediate fixture
  const nextFixture = player.upcomingFixtures[0];
  if (nextFixture) {
    score += (5 - nextFixture.difficulty) * 8;
    if (nextFixture.isHome) score += 3;
  }

  return score;
}

function getOneWeekReason(player: PlayerWithDetails, index: number): string {
  const fixture = player.upcomingFixtures[0];
  if (!fixture) return 'Form pick';

  if (fixture.difficulty <= 2) {
    return `Easy fixture vs ${fixture.opponent.short_name} (${fixture.isHome ? 'H' : 'A'})`;
  }
  return index === 0 ? 'Best in-form option' : 'High ceiling pick';
}
