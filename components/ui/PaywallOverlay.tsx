'use client';

import { useState } from 'react';
import { usePremium } from '@/lib/premium-context';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/AuthModal';

interface PaywallOverlayProps {
  children: React.ReactNode;
  featureName: string;
}

export function PaywallOverlay({ children, featureName }: PaywallOverlayProps) {
  const { user, session } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleBuy = async () => {
    if (!user || !session) {
      setShowAuthModal(true);
      return;
    }

    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay with CTA */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
          {/* Lock icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-fpl-green/20 to-fpl-cyan/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-fpl-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h3 className="text-xl font-bold text-white mb-2">
            Unlock {featureName}
          </h3>

          {/* Description */}
          <p className="text-gray-400 mb-6">
            Get access to advanced analysis tools, detailed insights, and personalized recommendations to dominate your FPL mini-league.
          </p>

          {/* Features list */}
          <ul className="text-left text-sm text-gray-300 mb-6 space-y-2">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-fpl-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Deep squad analysis & captain picks</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-fpl-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Smart transfer recommendations</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-fpl-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Fixture & chip strategy planning</span>
            </li>
          </ul>

          {/* CTA Button */}
          <button
            className="w-full px-6 py-3 bg-gradient-to-r from-fpl-green to-fpl-cyan text-fpl-purple font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            onClick={handleBuy}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? 'Redirecting...' : 'Buy Season Pass — £5'}
          </button>

          {/* Price hint */}
          <p className="mt-3 text-xs text-gray-500">
            One-time payment for the full season
          </p>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
