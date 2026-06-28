// Feature: es-ui-revamp (Phase 1.5) — density preference store + resolver.
//
// Density lets users tighten or loosen the entire UI's spacing/type scale by
// setting one CSS variable (`--density-scale`). Three discrete presets:
//   - comfortable (default, 1.00)
//   - compact     (0.88)
//   - spacious    (1.12)
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

export type Density = 'comfortable' | 'compact' | 'spacious';

export const DENSITY_STORAGE_KEY = 'es.density';
export const DENSITIES: Density[] = ['comfortable', 'compact', 'spacious'];
export const DEFAULT_DENSITY: Density = 'comfortable';

/**
 * Resolve a persisted density string (which may be `null`, an unknown value,
 * or a read-error sentinel) into a valid {@link Density}. Total function —
 * always returns a usable value.
 *
 * Returns `{ density, overwrite }`. `overwrite = true` when the input was
 * invalid-but-present, so callers can rewrite the stored value.
 */
export function resolveDensity(
  persisted: string | null | { error: true },
): { density: Density; overwrite: boolean } {
  if (persisted === null) {
    return { density: DEFAULT_DENSITY, overwrite: false };
  }
  if (typeof persisted === 'object' && persisted && 'error' in persisted) {
    return { density: DEFAULT_DENSITY, overwrite: false };
  }
  if (typeof persisted === 'string' && (DENSITIES as string[]).includes(persisted)) {
    return { density: persisted as Density, overwrite: false };
  }
  return { density: DEFAULT_DENSITY, overwrite: true };
}

/** Apply a density to the document root — toggles `data-density` on <html>. */
export function applyDensityAttribute(density: Density): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.density = density;
  }
}

/** Persist + apply a density choice. Resolves once async persistence settles. */
export async function persistDensity(density: Density): Promise<void> {
  applyDensityAttribute(density);
  const store = createPreferenceStore();
  try {
    await store.set(DENSITY_STORAGE_KEY, density);
  } catch {
    // Best effort: density is applied for the session even if persistence fails.
  }
}
