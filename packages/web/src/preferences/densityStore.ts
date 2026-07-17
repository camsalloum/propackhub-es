// Feature: es-ui-revamp (Phase 1.5) — density preference store + resolver.
//
// Density lets users tighten or loosen the entire UI's spacing/type scale by
// setting one CSS variable (`--density-scale`). Presets:
//   - auto         (default) — compact on narrow viewports, comfortable on wide
//   - comfortable  (1.00)
//   - compact      (0.82)
//   - spacious     (1.12)
//
// Persistence model mirrors the theme system:
//   - Web: localStorage at the key `es.density` so the pre-paint inline script
//     can read it synchronously before the first contentful paint.
//   - Native: the same PreferenceStore the theme system uses (Capacitor
//     Preferences) writes a synchronous localStorage mirror; the pre-paint
//     script reads the mirror.
//
// Keeping density resolution as a pure function (`resolveDensity`) means the
// inline script logic and the React provider use the same total function — an
// unknown / malformed value always resolves to the default and triggers a
// best-effort overwrite of the stored value to the applied one.

import { createPreferenceStore } from './PreferenceStore';

/** User-facing preference (includes Auto). */
export type DensityPreference = 'auto' | 'comfortable' | 'compact' | 'spacious';

/** Value written to `<html data-density>` (never `auto`). */
export type Density = 'comfortable' | 'compact' | 'spacious';

export const DENSITY_STORAGE_KEY = 'es.density';
export const DENSITY_PREFERENCES: DensityPreference[] = [
  'auto',
  'comfortable',
  'compact',
  'spacious',
];
/** @deprecated Use DENSITY_PREFERENCES — kept for callers that only need applied values. */
export const DENSITIES: Density[] = ['comfortable', 'compact', 'spacious'];
export const DEFAULT_DENSITY: DensityPreference = 'auto';

/** Laptop / mid-width: use compact when preference is Auto. */
export const NARROW_VIEWPORT_MQ = '(max-width: 1535px)';

/**
 * Resolve Auto → concrete density. Pure when `narrow` is passed; otherwise
 * reads `matchMedia` in the browser (defaults to comfortable on SSR).
 */
export function resolveEffectiveDensity(
  preference: DensityPreference,
  narrow?: boolean,
): Density {
  if (preference !== 'auto') return preference;
  if (typeof narrow === 'boolean') {
    return narrow ? 'compact' : 'comfortable';
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia(NARROW_VIEWPORT_MQ).matches ? 'compact' : 'comfortable';
  }
  return 'comfortable';
}

/**
 * Resolve a persisted density string (which may be `null`, an unknown value,
 * or a read-error sentinel) into a valid {@link DensityPreference}. Total
 * function — always returns a usable value.
 *
 * Returns `{ preference, overwrite }`. `overwrite = true` when the input was
 * invalid-but-present, so callers can rewrite the stored value.
 */
export function resolveDensity(
  persisted: string | null | { error: true },
): { preference: DensityPreference; overwrite: boolean } {
  if (persisted === null) {
    return { preference: DEFAULT_DENSITY, overwrite: false };
  }
  if (typeof persisted === 'object' && persisted && 'error' in persisted) {
    return { preference: DEFAULT_DENSITY, overwrite: false };
  }
  if (
    typeof persisted === 'string' &&
    (DENSITY_PREFERENCES as string[]).includes(persisted)
  ) {
    return { preference: persisted as DensityPreference, overwrite: false };
  }
  return { preference: DEFAULT_DENSITY, overwrite: true };
}

/** Apply a concrete density to the document root — toggles `data-density` on <html>. */
export function applyDensityAttribute(density: Density): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.density = density;
  }
}

/** Persist + apply a density preference (Auto resolves to effective). */
export async function persistDensity(preference: DensityPreference): Promise<void> {
  applyDensityAttribute(resolveEffectiveDensity(preference));
  const store = createPreferenceStore();
  try {
    await store.set(DENSITY_STORAGE_KEY, preference);
  } catch {
    // Best effort: density is applied for the session even if persistence fails.
  }
}
