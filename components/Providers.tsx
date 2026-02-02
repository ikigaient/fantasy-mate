'use client';

import { PremiumProvider } from '@/lib/premium-context';
import { RiskProvider } from '@/lib/risk-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PremiumProvider>
      <RiskProvider>{children}</RiskProvider>
    </PremiumProvider>
  );
}
