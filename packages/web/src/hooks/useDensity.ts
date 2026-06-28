// Feature: es-ui-revamp (Phase 1.5) — density preference React hook.
//
// `useDensity` reads the density preference from the same PreferenceStore the
// theme system uses, exposes the current value, and provides a setter that
// applies + persists the new value. The pre-paint inline script in `index.html`
// already wrote the persisted (or default) density to `<html data-density>`
// before React mounted, so the initial render is flicker-free.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPreferenceStore } from '../preferences/PreferenceStore';
import {
  applyDensityAttribute,
  DEFAULT_DENSITY,
  DENSITIES,
  DENSITY_STORAGE_KEY,
  resolveDensity,
  type Density,
} from '../preferences/densityStore';

function initialFromDom(): Density {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.density;
    if (current && (DENSITIES as string[]).includes(current)) {
      return current as Density;
    }
  }
  return DEFAULT_DENSITY;
}

export interface UseDensityResult {
  density: Density;
  densities: Density[];
  setDensity: (next: Density) => Promise<void>;
}

export function useDensity(): UseDensityResult {
  const storeRef = useRef(createPreferenceStore());
  const [density, setDensityState] = useState<Density>(initialFromDom);

  // Reconcile against persisted value on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let persisted: string | null | { error: true } = null;
      try {
        persisted = await storeRef.current.get(DENSITY_STORAGE_KEY);
      } catch (err) {
        persisted = { error: true } as const;
        void err;
      }
      if (cancelled) return;
      const result = resolveDensity(persisted);
      applyDensityAttribute(result.density);
      setDensityState(result.density);
      if (result.overwrite) {
        try {
          await storeRef.current.set(DENSITY_STORAGE_KEY, result.density);
        } catch {
          // best effort
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDensity = useCallback(async (next: Density) => {
    if (!(DENSITIES as string[]).includes(next)) return;
    applyDensityAttribute(next);
    setDensityState(next);
    try {
      await storeRef.current.set(DENSITY_STORAGE_KEY, next);
    } catch {
      // session-only on persist failure
    }
  }, []);

  return { density, densities: DENSITIES, setDensity };
}

export default useDensity;
