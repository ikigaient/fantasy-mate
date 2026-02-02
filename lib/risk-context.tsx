'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type RiskLevel = 'safe' | 'balanced' | 'aggressive';

interface RiskContextType {
  riskLevel: RiskLevel;
  setRiskLevel: (level: RiskLevel) => void;
}

const RiskContext = createContext<RiskContextType | undefined>(undefined);

const RISK_STORAGE_KEY = 'fantasy-mate-risk-level';

export function RiskProvider({ children }: { children: ReactNode }) {
  const [riskLevel, setRiskLevelState] = useState<RiskLevel>('balanced');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(RISK_STORAGE_KEY) as RiskLevel | null;
    if (stored && ['safe', 'balanced', 'aggressive'].includes(stored)) {
      setRiskLevelState(stored);
    }
    setIsLoaded(true);
  }, []);

  const setRiskLevel = (level: RiskLevel) => {
    setRiskLevelState(level);
    localStorage.setItem(RISK_STORAGE_KEY, level);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <RiskContext.Provider value={{ riskLevel, setRiskLevel }}>
      {children}
    </RiskContext.Provider>
  );
}

export function useRisk(): RiskContextType {
  const context = useContext(RiskContext);
  if (context === undefined) {
    throw new Error('useRisk must be used within a RiskProvider');
  }
  return context;
}
