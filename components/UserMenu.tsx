'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from './AuthModal';

export function UserMenu() {
  const { user, isLoading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 text-sm font-medium text-fpl-purple bg-fpl-green rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Sign In
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fpl-green to-fpl-cyan flex items-center justify-center text-sm font-bold text-fpl-purple">
          {user.email?.[0].toUpperCase() ?? '?'}
        </div>
        <span className="text-sm text-gray-300 hidden sm:inline">
          {user.email}
        </span>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
            <button
              onClick={async () => {
                await signOut();
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
