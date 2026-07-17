// App-wide density preference (Auto / Compact / Comfortable / Spacious).
import { createContext, useContext, type ReactNode } from 'react';
import { useDensity as useDensityState, type UseDensityResult } from '../hooks/useDensity';

const DensityContext = createContext<UseDensityResult | null>(null);

export function DensityProvider({ children }: { children: ReactNode }) {
  const value = useDensityState();
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity(): UseDensityResult {
  const ctx = useContext(DensityContext);
  if (!ctx) {
    throw new Error('useDensity must be used within DensityProvider');
  }
  return ctx;
}
