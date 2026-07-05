import { useCallback, useEffect, useRef, useState } from 'react';
import type { PriceListUnit, SlabMode } from '../lib/priceListPricing';
import {
  loadPriceListSlabPrefs,
  saveSlabsForUnit,
  type PriceListSlabPrefs,
} from '../preferences/priceListSlabPrefs';

export function usePersistedCustomSlabs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<PriceListSlabPrefs | null>(null);
  const hydratedUnitRef = useRef<PriceListUnit | ''>('');

  useEffect(() => {
    if (!userId) {
      setPrefs(null);
      hydratedUnitRef.current = '';
      return;
    }
    let cancelled = false;
    void loadPriceListSlabPrefs(userId).then((loaded) => {
      if (!cancelled) setPrefs(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const slabsForUnit = useCallback(
    (unit: PriceListUnit): number[] => prefs?.byUnit[unit] ?? [],
    [prefs]
  );

  const persistSlabs = useCallback(
    async (unit: PriceListUnit, slabs: number[]) => {
      if (!userId) return;
      const next = await saveSlabsForUnit(userId, unit, slabs, prefs ?? undefined);
      setPrefs(next);
    },
    [userId, prefs]
  );

  const hydrateCustomSlabs = useCallback(
    (slabMode: SlabMode, unit: PriceListUnit | '', current: number[]): number[] | null => {
      if (slabMode !== 'custom' || !unit || !prefs) return null;
      if (hydratedUnitRef.current === unit) return null;
      hydratedUnitRef.current = unit;
      const saved = slabsForUnit(unit);
      return saved.length > 0 ? saved : current.length > 0 ? current : [];
    },
    [prefs, slabsForUnit]
  );

  const resetHydration = useCallback(() => {
    hydratedUnitRef.current = '';
  }, []);

  return {
    prefsLoaded: prefs != null,
    slabsForUnit,
    persistSlabs,
    hydrateCustomSlabs,
    resetHydration,
  };
}
