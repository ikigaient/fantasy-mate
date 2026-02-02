'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Player, Team, Fixture, POSITION_MAP } from '@/lib/types';
import { formatPrice, getDifficultyColor, getUpcomingFixtures } from '@/lib/fpl-api';

interface PlayerDatabaseProps {
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  currentGameweek: number;
}

type SortField =
  | 'total_points'
  | 'ppg'
  | 'form'
  | 'price'
  | 'xgi'
  | 'xg'
  | 'xa'
  | 'ict'
  | 'ownership'
  | 'goals'
  | 'assists'
  | 'cs'
  | 'bonus'
  | 'minutes';

type SortDirection = 'asc' | 'desc';

const POSITION_FILTERS = [
  { id: 0, label: 'All' },
  { id: 1, label: 'GKP' },
  { id: 2, label: 'DEF' },
  { id: 3, label: 'MID' },
  { id: 4, label: 'FWD' },
];

export function PlayerDatabase({
  players,
  teams,
  fixtures,
  currentGameweek,
}: PlayerDatabaseProps) {
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState(0);
  const [teamFilter, setTeamFilter] = useState(0);
  const [sortField, setSortField] = useState<SortField>('total_points');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [minMinutes, setMinMinutes] = useState(90);

  const getTeamById = (id: number) => teams.find((t) => t.id === id);

  const filteredAndSortedPlayers = useMemo(() => {
    let result = players.filter((p) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName =
          p.web_name.toLowerCase().includes(searchLower) ||
          p.first_name.toLowerCase().includes(searchLower) ||
          p.second_name.toLowerCase().includes(searchLower);
        const team = getTeamById(p.team);
        const matchesTeam = team?.name.toLowerCase().includes(searchLower) ||
          team?.short_name.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesTeam) return false;
      }

      // Position filter
      if (positionFilter !== 0 && p.element_type !== positionFilter) return false;

      // Team filter
      if (teamFilter !== 0 && p.team !== teamFilter) return false;

      // Minutes filter
      if (p.minutes < minMinutes) return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: number, bVal: number;

      switch (sortField) {
        case 'total_points':
          aVal = a.total_points;
          bVal = b.total_points;
          break;
        case 'ppg':
          aVal = parseFloat(a.points_per_game) || 0;
          bVal = parseFloat(b.points_per_game) || 0;
          break;
        case 'form':
          aVal = parseFloat(a.form) || 0;
          bVal = parseFloat(b.form) || 0;
          break;
        case 'price':
          aVal = a.now_cost;
          bVal = b.now_cost;
          break;
        case 'xgi':
          aVal = parseFloat(a.expected_goal_involvements) || 0;
          bVal = parseFloat(b.expected_goal_involvements) || 0;
          break;
        case 'xg':
          aVal = parseFloat(a.expected_goals) || 0;
          bVal = parseFloat(b.expected_goals) || 0;
          break;
        case 'xa':
          aVal = parseFloat(a.expected_assists) || 0;
          bVal = parseFloat(b.expected_assists) || 0;
          break;
        case 'ict':
          aVal = parseFloat(a.ict_index) || 0;
          bVal = parseFloat(b.ict_index) || 0;
          break;
        case 'ownership':
          aVal = parseFloat(a.selected_by_percent) || 0;
          bVal = parseFloat(b.selected_by_percent) || 0;
          break;
        case 'goals':
          aVal = a.goals_scored;
          bVal = b.goals_scored;
          break;
        case 'assists':
          aVal = a.assists;
          bVal = b.assists;
          break;
        case 'cs':
          aVal = a.clean_sheets;
          bVal = b.clean_sheets;
          break;
        case 'bonus':
          aVal = a.bonus;
          bVal = b.bonus;
          break;
        case 'minutes':
          aVal = a.minutes;
          bVal = b.minutes;
          break;
        default:
          aVal = a.total_points;
          bVal = b.total_points;
      }

      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [players, search, positionFilter, teamFilter, sortField, sortDirection, minMinutes]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortHeader = ({
    field,
    label,
    className = '',
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) => (
    <th
      className={`px-2 py-2 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-fpl-green">{sortDirection === 'desc' ? '↓' : '↑'}</span>
        )}
      </div>
    </th>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Database</CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Search and compare all {players.length} players
        </p>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search player or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-fpl-green"
            />
          </div>

          {/* Position Filter */}
          <div className="flex gap-1">
            {POSITION_FILTERS.map((pos) => (
              <button
                key={pos.id}
                onClick={() => setPositionFilter(pos.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  positionFilter === pos.id
                    ? 'bg-fpl-green text-fpl-purple'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-fpl-green"
          >
            <option value={0}>All Teams</option>
            {teams
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </select>

          {/* Min Minutes Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Min mins:</label>
            <input
              type="number"
              value={minMinutes}
              onChange={(e) => setMinMinutes(parseInt(e.target.value) || 0)}
              className="w-20 px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-fpl-green"
              min={0}
              step={90}
            />
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-400 mb-3">
          Showing {filteredAndSortedPlayers.length} players
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-400 sticky left-0 bg-gray-800 z-10">
                  Player
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Team</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Pos</th>
                <SortHeader field="price" label="Price" />
                <SortHeader field="total_points" label="Pts" />
                <SortHeader field="ppg" label="PPG" />
                <SortHeader field="form" label="Form" />
                <SortHeader field="xgi" label="xGI" />
                <SortHeader field="xg" label="xG" />
                <SortHeader field="xa" label="xA" />
                <SortHeader field="goals" label="G" />
                <SortHeader field="assists" label="A" />
                <SortHeader field="cs" label="CS" />
                <SortHeader field="bonus" label="Bonus" />
                <SortHeader field="ict" label="ICT" />
                <SortHeader field="ownership" label="Own%" />
                <SortHeader field="minutes" label="Mins" />
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Next 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredAndSortedPlayers.slice(0, 100).map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  team={getTeamById(player.team)}
                  fixtures={fixtures}
                  teams={teams}
                  currentGameweek={currentGameweek}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedPlayers.length > 100 && (
          <div className="text-center text-sm text-gray-500 mt-4">
            Showing first 100 results. Refine your search to see more.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlayerRow({
  player,
  team,
  fixtures,
  teams,
  currentGameweek,
}: {
  player: Player;
  team: Team | undefined;
  fixtures: Fixture[];
  teams: Team[];
  currentGameweek: number;
}) {
  const form = parseFloat(player.form) || 0;
  const ppg = parseFloat(player.points_per_game) || 0;
  const xgi = parseFloat(player.expected_goal_involvements) || 0;
  const xg = parseFloat(player.expected_goals) || 0;
  const xa = parseFloat(player.expected_assists) || 0;
  const ict = parseFloat(player.ict_index) || 0;
  const ownership = parseFloat(player.selected_by_percent) || 0;

  const upcomingFixtures = team
    ? getUpcomingFixtures(fixtures, team.id, teams, currentGameweek, 3)
    : [];

  const formColor =
    form >= 6 ? 'text-green-400' : form >= 4 ? 'text-yellow-400' : form >= 2 ? 'text-orange-400' : 'text-red-400';

  const ppgColor =
    ppg >= 5 ? 'text-green-400' : ppg >= 4 ? 'text-yellow-400' : 'text-gray-300';

  return (
    <tr className="hover:bg-gray-800/50">
      <td className="px-2 py-2 sticky left-0 bg-gray-800/95 z-10">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{player.web_name}</span>
          {player.status !== 'a' && (
            <Badge
              variant={player.status === 'd' ? 'warning' : 'danger'}
              size="sm"
            >
              {player.status === 'i' ? 'Inj' : player.status === 'd' ? 'Doubt' : player.status === 's' ? 'Sus' : 'N/A'}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-2 py-2 text-sm text-gray-400">{team?.short_name}</td>
      <td className="px-2 py-2 text-sm text-gray-400">{POSITION_MAP[player.element_type]}</td>
      <td className="px-2 py-2 text-sm text-white">{formatPrice(player.now_cost)}</td>
      <td className="px-2 py-2 text-sm font-medium text-white">{player.total_points}</td>
      <td className={`px-2 py-2 text-sm font-medium ${ppgColor}`}>{ppg.toFixed(1)}</td>
      <td className={`px-2 py-2 text-sm font-medium ${formColor}`}>{form.toFixed(1)}</td>
      <td className="px-2 py-2 text-sm text-cyan-400">{xgi.toFixed(2)}</td>
      <td className="px-2 py-2 text-sm text-gray-300">{xg.toFixed(2)}</td>
      <td className="px-2 py-2 text-sm text-gray-300">{xa.toFixed(2)}</td>
      <td className="px-2 py-2 text-sm text-gray-300">{player.goals_scored}</td>
      <td className="px-2 py-2 text-sm text-gray-300">{player.assists}</td>
      <td className="px-2 py-2 text-sm text-gray-300">{player.clean_sheets}</td>
      <td className="px-2 py-2 text-sm text-yellow-400">{player.bonus}</td>
      <td className="px-2 py-2 text-sm text-gray-300">{ict.toFixed(0)}</td>
      <td className={`px-2 py-2 text-sm ${ownership < 10 ? 'text-purple-400' : 'text-gray-300'}`}>
        {ownership.toFixed(1)}%
      </td>
      <td className="px-2 py-2 text-sm text-gray-400">{player.minutes}</td>
      <td className="px-2 py-2">
        <div className="flex gap-1">
          {upcomingFixtures.map((f, idx) => (
            <div
              key={idx}
              className={`w-7 h-6 rounded flex items-center justify-center text-[10px] font-medium text-white ${getDifficultyColor(
                f.difficulty
              )}`}
              title={`${f.opponent.short_name} (${f.isHome ? 'H' : 'A'})`}
            >
              {f.opponent.short_name.substring(0, 3)}
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}
