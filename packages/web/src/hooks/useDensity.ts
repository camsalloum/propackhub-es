// Feature: es-ui-revamp (Phase 1.5) — density preference React hook.
//
// `useDensity` reads the density preference from the same PreferenceStore the
// theme system uses, exposes the current value, and provides a setter that
// applies + persists the new value. The pre-paint inline script in `index.html`
// already wrote the effective density to `<html data-density>` before React
// mounted, so the initial render is flicker-free.
//
// Preference `auto` tracks viewport width and switches compact ↔ comfortable.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPreferenceStore } from '../preferences/PreferenceStore';
import {
  applyDensityAttribute,
  DEFAULT_DENSITY,
  DENSITY_PREFERENCES,
  DENSITY_STORAGE_KEY,
  NARROW_VIEWPORT_MQ,
  resolveDensity,
  resolveEffectiveDensity,
  type Density,
  type DensityPreference,
} from '../preferences/densityStore';

function initialPreferenceFromStorage(): DensityPreference {
  if (typeof localStorage === 'undefined') return DEFAULT_DENSITY;
  try {
    const raw = localStorage.getItem(DENSITY_STORAGE_KEY);
    return resolveDensity(raw).preference;
  } catch {
    return DEFAULT_DENSITY;
  }
}

function initialAppliedFromDom(): Density {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.density;
    if (current === 'comfortable' || current === 'compact' || current === 'spacious') {
      return current;
    }
  }
  return resolveEffectiveDensity(initialPreferenceFromStorage());
}

export interface UseDensityResult {
  /** Persisted preference (may be `auto`). */
  density: DensityPreference;
  /** Concrete density currently on `<html>`. */
  appliedDensity: Density;
  densities: DensityPreference[];
  setDensity: (next: DensityPreference) => Promise<void>;
}

export function useDensity(): UseDensityResult {
  const storeRef = useRef(createPreferenceStore());
  const [density, setDensityState] = useState<DensityPreference>(initialPreferenceFromStorage);
  const [appliedDensity, setAppliedDensity] = useState<Density>(initialAppliedFromDom);

  const applyPreference = useCallback((preference: DensityPreference) => {
    const effective = resolveEffectiveDensity(preference);
    applyDensityAttribute(effective);
    setAppliedDensity(effective);
  }, []);

  // Also migrate PreferenceStore once so Auto wins over a stale Comfortable default.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof localStorage !== 'undefined' && !localStorage.getItem('es.density.v2')) {
          localStorage.setItem(DENSITY_STORAGE_KEY, 'auto');
          localStorage.setItem('es.density.v2', '1');
        }
      } catch {
        // ignore
      }
      let persisted: string | null | { error: true } = null;
      try {
        persisted = await storeRef.current.get(DENSITY_STORAGE_KEY);
      } catch (err) {
        persisted = { error: true } as const;
        void err;
      }
      if (cancelled) return;
      // After v2 migration flag, prefer Auto when store still has old comfortable
      // but localStorage was just reset — re-read localStorage preference.
      const fromLs =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(DENSITY_STORAGE_KEY)
          : null;
      const result = resolveDensity(fromLs ?? persisted);
      setDensityState(result.preference);
      applyPreference(result.preference);
      if (result.overwrite || fromLs === 'auto') {
        try {
          await storeRef.current.set(DENSITY_STORAGE_KEY, result.preference);
        } catch {
          // best effort
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyPreference]);

  // When preference is Auto, re-resolve on viewport breakpoint changes.
  useEffect(() => {
    if (density !== 'auto' || typeof window === 'undefined') return;
    const mql = window.matchMedia(NARROW_VIEWPORT_MQ);
    const onChange = () => applyPreference('auto');
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [density, applyPreference]);

  const setDensity = useCallback(
    async (next: DensityPreference) => {
      if (!(DENSITY_PREFERENCES as string[]).includes(next)) return;
      setDensityState(next);
      applyPreference(next);
      try {
        await storeRef.current.set(DENSITY_STORAGE_KEY, next);
      } catch {
        // session-only on persist failure
      }
    },
    [applyPreference],
  );

  return {
    density,
    appliedDensity,
    densities: DENSITY_PREFERENCES,
    setDensity,
  };
}

export default useDensity;
