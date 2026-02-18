'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { createClient } from './supabase';

interface PremiumContextType {
  isPremium: boolean;
  refreshPremium: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

const CURRENT_SEASON = '2024-25';

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const checkPurchase = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setIsLoaded(true);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('season', CURRENT_SEASON)
      .limit(1)
      .single();

    setIsPremium(!!data);
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkPurchase();
    }
  }, [authLoading, checkPurchase]);

  // After returning from Stripe checkout, poll briefly for the webhook to process
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success' || !user) return;

    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname);

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await checkPurchase();
      if (isPremium || attempts >= 10) {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [user, checkPurchase, isPremium]);

  // Don't render children until we've loaded the premium status
  if (!isLoaded) {
    return null;
  }

  return (
    <PremiumContext.Provider value={{ isPremium, refreshPremium: checkPurchase }}>
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
