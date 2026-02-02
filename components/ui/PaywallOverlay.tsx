'use client';

import { usePremium } from '@/lib/premium-context';

interface PaywallOverlayProps {
  children: React.ReactNode;
  featureName: string;
}

export function PaywallOverlay({ children, featureName }: PaywallOverlayProps) {
  const { setPremium } = usePremium();
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
            className="w-full px-6 py-3 bg-gradient-to-r from-fpl-green to-fpl-cyan text-fpl-purple font-semibold rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => {
              setPremium(true);
            }}
          >
            Upgrade to Premium
          </button>

          {/* Price hint */}
          <p className="mt-3 text-xs text-gray-500">
            Test mode - click to unlock instantly
          </p>
        </div>
      </div>
    </div>
  );
}
