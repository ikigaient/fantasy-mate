'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PremiumContextType {
  isPremium: boolean;
  setPremium: (value: boolean) => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

const PREMIUM_STORAGE_KEY = 'fantasy-mate-premium';

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load premium status from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PREMIUM_STORAGE_KEY);
    if (stored === 'true') {
      setIsPremium(true);
    }
    setIsLoaded(true);
  }, []);

  const setPremium = (value: boolean) => {
    setIsPremium(value);
    localStorage.setItem(PREMIUM_STORAGE_KEY, value.toString());
  };

  // Don't render children until we've loaded the premium status
  // This prevents flash of locked content for premium users
  if (!isLoaded) {
    return null;
  }

  return (
    <PremiumContext.Provider value={{ isPremium, setPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}

// Define which tabs are free vs premium
export const FREE_TABS = ['overview'] as const;
export const PREMIUM_TABS = ['squad', 'captaincy', 'fixtures', 'transfers', 'differentials', 'players', 'chips', 'season'] as const;

export function isTabPremium(tabId: string): boolean {
  return PREMIUM_TABS.includes(tabId as typeof PREMIUM_TABS[number]);
}
