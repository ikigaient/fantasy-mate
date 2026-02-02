// FPL API Types

export interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  team_code: number;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  now_cost: number; // in 0.1m units
  cost_change_start: number;
  selected_by_percent: string;
  form: string;
  points_per_game: string;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  news: string;
  news_added: string | null;
  chance_of_playing_this_round: number | null;
  chance_of_playing_next_round: number | null;
  status: string; // 'a' = available, 'i' = injured, 'd' = doubtful, 's' = suspended, 'u' = unavailable
  photo: string;
  ep_this: string | null;
  ep_next: string | null;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  code: number;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface Gameweek {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  average_entry_score: number;
  highest_score: number;
  chip_plays: { chip_name: string; num_played: number }[];
}

export interface BootstrapData {
  elements: Player[];
  teams: Team[];
  events: Gameweek[];
  element_types: { id: number; singular_name: string; plural_name: string }[];
}

export interface Fixture {
  id: number;
  event: number | null; // gameweek, null if not scheduled
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
  kickoff_time: string | null;
  team_h_score: number | null;
  team_a_score: number | null;
}

export interface Pick {
  element: number;
  position: number;
  multiplier: number; // 0=benched, 1=playing, 2=captain, 3=triple captain
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface TeamPicks {
  active_chip: string | null;
  automatic_subs: { element_in: number; element_out: number }[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: Pick[];
}

export interface EntryInfo {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string; // team name
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  current_event: number;
  started_event: number;
  favourite_team: number | null;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
}

export interface EntryHistory {
  current: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  }[];
  past: {
    season_name: string;
    total_points: number;
    rank: number;
  }[];
  chips: {
    name: string;
    event: number;
    time: string;
  }[];
}

export interface PlayerWithDetails extends Player {
  teamData: Team;
  positionName: string;
  upcomingFixtures: FixtureWithDetails[];
  playerScore: number;
}

export interface FixtureWithDetails extends Fixture {
  opponent: Team;
  isHome: boolean;
  difficulty: number;
  adjustedDifficulty?: number;
}

export interface TeamPerformance {
  teamId: number;
  goalsScored: number;
  goalsConceded: number;
  homeGoalsScored: number;
  homeGoalsConceded: number;
  awayGoalsScored: number;
  awayGoalsConceded: number;
  matchesPlayed: number;
  homeMatches: number;
  awayMatches: number;
  expectedPerformance: number;
  actualPerformance: number;
  performanceDelta: number;
}

export interface AnalysisResult {
  overallRating: number;
  teamValue: number;
  squadValue: number;
  bank: number;
  averageForm: number;
  averageFDR: number;
  strengths: Strength[];
  weaknesses: Weakness[];
}

export interface Strength {
  type: 'form' | 'fixtures' | 'value' | 'composition' | 'premium';
  title: string;
  description: string;
  players?: PlayerWithDetails[];
}

export interface Weakness {
  type: 'underperforming' | 'fixtures' | 'injury' | 'concentration' | 'bench';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  players?: PlayerWithDetails[];
}

export type TransferCategory = 'form_pick' | 'fixture_swing' | 'differential' | 'premium_upgrade' | 'value_pick';

export interface TransferSuggestion {
  gameweek: number;
  playerOut: PlayerWithDetails;
  reasonOut: string;
  suggestions: TransferOption[];
  takeHit: boolean;
  hitWorth: boolean;
  category: TransferCategory;
}

export interface TransferOption {
  player: PlayerWithDetails;
  priceDiff: number;
  formDiff: number;
  fixtureDifficulty: number;
  expectedPoints: number;
  reason: string;
  category: TransferCategory;
  confidence: number;
  stats: {
    ownership: number;
    xGI: number;
    ict: number;
  };
}

export interface ChipRecommendation {
  chip: 'wildcard' | 'freehit' | 'benchboost' | 'triplecaptain';
  available: boolean;
  alreadyUsed: boolean;
  usedInGameweek: number | null;
  recommendedGameweek: number | null;
  reason: string;
  priority: 'high' | 'medium' | 'low' | 'none';
  seasonContext?: string;
}

export type PositionType = 'GKP' | 'DEF' | 'MID' | 'FWD';

export const POSITION_MAP: Record<number, PositionType> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export const POSITION_NAMES: Record<number, string> = {
  1: 'Goalkeeper',
  2: 'Defender',
  3: 'Midfielder',
  4: 'Forward',
};

export interface CaptainCandidate {
  player: PlayerWithDetails;
  captainScore: number;
  reasons: string[];
  ownership: number;
  expectedPoints: number;
  isDifferential: boolean;
  fixtureInfo: {
    opponent: string;
    isHome: boolean;
    difficulty: number;
  };
  stats: {
    form: number;
    xGI: number;
    ict: number;
    ppg: number;
  };
}

export interface CaptaincyAnalysis {
  topPick: CaptainCandidate;
  safePick: CaptainCandidate;
  differentialPick: CaptainCandidate | null;
  allCandidates: CaptainCandidate[];
}
