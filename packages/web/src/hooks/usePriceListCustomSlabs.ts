import { useCallback, useEffect, useState } from 'react';
import type { PriceListUnit, SlabMode } from '../lib/priceListPricing';
import { usePersistedCustomSlabs } from './usePersistedCustomSlabs';

export function usePriceListCustomSlabs(
  userId: string | undefined,
  slabMode: SlabMode,
  unit: PriceListUnit | ''
) {
  const [customSlabs, setCustomSlabsState] = useState<number[]>([]);
  const { prefsLoaded, persistSlabs, hydrateCustomSlabs, resetHydration } =
    usePersistedCustomSlabs(userId);

  useEffect(() => {
    if (slabMode !== 'custom') {
      resetHydration();
      return;
    }
    if (!prefsLoaded || !unit) return;
    const hydrated = hydrateCustomSlabs(slabMode, unit, customSlabs);
    if (hydrated != null) setCustomSlabsState(hydrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on mode/unit/prefs only
  }, [slabMode, unit, prefsLoaded, hydrateCustomSlabs, resetHydration]);

  const setCustomSlabs = useCallback(
    (next: number[] | ((prev: number[]) => number[])) => {
      setCustomSlabsState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        if (slabMode === 'custom' && unit && userId) {
          void persistSlabs(unit, resolved);
        }
        return resolved;
      });
    },
    [slabMode, unit, userId, persistSlabs]
  );

  return { customSlabs, setCustomSlabs };
}
