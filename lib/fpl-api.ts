import {
  BootstrapData,
  EntryInfo,
  EntryHistory,
  TeamPicks,
  Fixture,
  Player,
  Team,
  Gameweek,
  PlayerWithDetails,
  FixtureWithDetails,
  POSITION_NAMES,
} from './types';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 300 }, // Cache for 5 minutes
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FantasyMate/1.0)',
        },
      });
      if (response.ok) return response;
      if (response.status === 404) throw new Error('Not found');
      if (response.status === 503 && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Failed to fetch after retries');
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const response = await fetchWithRetry(`${FPL_BASE_URL}/bootstrap-static/`);
  return response.json();
}

export async function getEntryInfo(teamId: number): Promise<EntryInfo> {
  const response = await fetchWithRetry(`${FPL_BASE_URL}/entry/${teamId}/`);
  return response.json();
}

export async function getEntryHistory(teamId: number): Promise<EntryHistory> {
  const response = await fetchWithRetry(`${FPL_BASE_URL}/entry/${teamId}/history/`);
  return response.json();
}

export async function getTeamPicks(teamId: number, gameweek: number): Promise<TeamPicks> {
  const response = await fetchWithRetry(
    `${FPL_BASE_URL}/entry/${teamId}/event/${gameweek}/picks/`
  );
  return response.json();
}

export async function getFixtures(): Promise<Fixture[]> {
  const response = await fetchWithRetry(`${FPL_BASE_URL}/fixtures/`);
  return response.json();
}

export function getCurrentGameweek(events: Gameweek[]): Gameweek | undefined {
  return events.find((e) => e.is_current) || events.find((e) => e.is_next);
}

export function getNextGameweeks(events: Gameweek[], count: number): Gameweek[] {
  const current = getCurrentGameweek(events);
  if (!current) return [];

  return events
    .filter((e) => e.id >= current.id && e.id < current.id + count)
    .sort((a, b) => a.id - b.id);
}

export function getPlayerById(players: Player[], id: number): Player | undefined {
  return players.find((p) => p.id === id);
}

export function getTeamById(teams: Team[], id: number): Team | undefined {
  return teams.find((t) => t.id === id);
}

export function getUpcomingFixtures(
  fixtures: Fixture[],
  teamId: number,
  teams: Team[],
  fromGameweek: number,
  count: number
): FixtureWithDetails[] {
  const teamFixtures = fixtures
    .filter(
      (f) =>
        (f.team_h === teamId || f.team_a === teamId) &&
        f.event !== null &&
        f.event >= fromGameweek &&
        f.event < fromGameweek + count
    )
    .sort((a, b) => (a.event || 0) - (b.event || 0));

  return teamFixtures.map((f) => {
    const isHome = f.team_h === teamId;
    const opponentId = isHome ? f.team_a : f.team_h;
    const opponent = getTeamById(teams, opponentId)!;
    return {
      ...f,
      opponent,
      isHome,
      difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
    };
  });
}

export function enrichPlayerData(
  player: Player,
  teams: Team[],
  fixtures: Fixture[],
  currentGameweek: number
): PlayerWithDetails {
  const teamData = getTeamById(teams, player.team)!;
  const upcomingFixtures = getUpcomingFixtures(
    fixtures,
    player.team,
    teams,
    currentGameweek,
    6
  );

  // Calculate player score
  const form = parseFloat(player.form) || 0;
  const ppg = parseFloat(player.points_per_game) || 0;
  const avgFixtureDifficulty =
    upcomingFixtures.length > 0
      ? upcomingFixtures.slice(0, 3).reduce((sum, f) => sum + f.difficulty, 0) /
        Math.min(3, upcomingFixtures.length)
      : 3;
  const fixtureEase = 5 - avgFixtureDifficulty;
  const injuryRisk = player.chance_of_playing_next_round !== null
    ? (100 - player.chance_of_playing_next_round) / 100
    : player.status !== 'a'
    ? 1
    : 0;

  const playerScore =
    form * 2 + ppg * 1.5 + fixtureEase * 1 - injuryRisk * 2;

  return {
    ...player,
    teamData,
    positionName: POSITION_NAMES[player.element_type],
    upcomingFixtures,
    playerScore,
  };
}

export function getSquadPlayers(
  picks: TeamPicks,
  players: Player[],
  teams: Team[],
  fixtures: Fixture[],
  currentGameweek: number
): { starting: PlayerWithDetails[]; bench: PlayerWithDetails[] } {
  const enrichedPicks = picks.picks.map((pick) => {
    const player = getPlayerById(players, pick.element)!;
    const enriched = enrichPlayerData(player, teams, fixtures, currentGameweek);
    return {
      ...enriched,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      multiplier: pick.multiplier,
      position: pick.position,
    };
  });

  return {
    starting: enrichedPicks.filter((p) => p.position <= 11),
    bench: enrichedPicks.filter((p) => p.position > 11),
  };
}

export function formatPrice(price: number): string {
  return `£${(price / 10).toFixed(1)}m`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'a':
      return 'text-green-500';
    case 'd':
      return 'text-yellow-500';
    case 'i':
    case 's':
    case 'u':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function getStatusText(status: string, chance: number | null): string {
  if (status === 'a') return 'Available';
  if (status === 'd') return chance !== null ? `${chance}% chance` : 'Doubtful';
  if (status === 'i') return 'Injured';
  if (status === 's') return 'Suspended';
  if (status === 'u') return 'Unavailable';
  return 'Unknown';
}

export function getDifficultyColor(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return 'bg-green-600';
    case 2:
      return 'bg-green-500';
    case 3:
      return 'bg-yellow-500';
    case 4:
      return 'bg-orange-500';
    case 5:
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}
