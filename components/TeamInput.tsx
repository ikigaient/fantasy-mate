'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';

export function TeamInput() {
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const id = teamId.trim();
    if (!id) {
      setError('Please enter a team ID');
      return;
    }

    if (!/^\d+$/.test(id)) {
      setError('Team ID must be a number');
      return;
    }

    setIsLoading(true);

    try {
      // Validate team exists
      const response = await fetch(`/api/team/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Team not found. Please check the ID.');
        } else {
          setError('Failed to fetch team. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Save team to user_teams if logged in
      if (user) {
        const supabase = createClient();
        await supabase.from('user_teams').insert({
          user_id: user.id,
          team_id: id,
        });
        // Ignore errors (unique constraint = already saved)
      }

      router.push(`/analysis/${id}`);
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="teamId"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Enter your FPL Team ID
          </label>
          <input
            type="text"
            id="teamId"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="e.g. 123456"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fpl-green focus:border-transparent transition-all"
            disabled={isLoading}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-fpl-green text-fpl-purple font-semibold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Analyze Team'}
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-500 text-center">
        Find your Team ID in the URL when viewing your team on the FPL website
        <br />
        (fantasy.premierleague.com/entry/<strong>XXXXXX</strong>/event/X)
      </p>
    </form>
  );
}
