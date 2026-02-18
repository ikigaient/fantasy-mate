'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeamInput } from '@/components/TeamInput';
import { UserMenu } from '@/components/UserMenu';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase';

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setChecking(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from('user_teams')
      .select('team_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.team_id) {
          router.replace(`/analysis/${data.team_id}`);
        } else {
          setChecking(false);
        }
      });
  }, [user, authLoading, router]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fpl-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-fpl-green to-fpl-cyan flex items-center justify-center font-bold text-fpl-purple text-sm">
                FM
              </div>
              <span className="font-semibold text-white">Fantasy Mate</span>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            FPL Team{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpl-green to-fpl-cyan">
              Analyzer
            </span>
          </h1>
          <p className="text-lg text-gray-400 mb-2">
            Get detailed analysis of your Fantasy Premier League team
          </p>
          <p className="text-gray-500">
            Identify strengths, weaknesses, and get smart transfer recommendations
          </p>
        </div>

        <TeamInput />

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
          <FeatureCard
            icon="+"
            iconColor="text-green-400"
            title="Strengths & Weaknesses"
            description="Identify what's working and what needs improvement in your squad"
          />
          <FeatureCard
            icon="~"
            iconColor="text-blue-400"
            title="Transfer Suggestions"
            description="Get smart transfer recommendations for the next 3 gameweeks"
          />
          <FeatureCard
            icon="*"
            iconColor="text-yellow-400"
            title="Chip Strategy"
            description="Know when to play your Wildcard, Free Hit, Bench Boost, or Triple Captain"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Data from the official{' '}
            <a
              href="https://fantasy.premierleague.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fpl-green hover:underline"
            >
              Fantasy Premier League
            </a>{' '}
            API
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  iconColor,
  title,
  description,
}: {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div
        className={`w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center ${iconColor} text-xl font-bold mb-4`}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
