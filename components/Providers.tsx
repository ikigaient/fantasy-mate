'use client';

import { AuthProvider } from '@/lib/auth-context';
import { PremiumProvider } from '@/lib/premium-context';
import { RiskProvider } from '@/lib/risk-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PremiumProvider>
        <RiskProvider>{children}</RiskProvider>
      </PremiumProvider>
    </AuthProvider>
  );
}
