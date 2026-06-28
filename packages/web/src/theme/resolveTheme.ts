// Feature: es-ui-revamp — deterministic theme resolution.
//
// `resolveTheme` is the single, pure resolution function shared by the pre-paint
// inline-script logic and `ThemeProvider` (design.md → Components/Interfaces and
// Correctness Property 1). Given a persisted preference (a valid `ThemeId`, an
// arbitrary/empty/missing string, `null`, or a simulated read error), the
// available theme registry, and the OS `prefers-color-scheme: dark` flag, it
// returns the theme to apply, a non-blocking status, and whether the stored
// value must be overwritten.
//
// It is total and side-effect free: no DOM access, no storage access. Callers
// own all I/O and pass the read result (or a {@link ReadError}) in.
//
// Correctness Property 1 — Theme resolution is total and valid:
//   - a valid persisted id present in the registry  → that id, status ok, no overwrite
//   - null / empty / malformed / unknown value       → default, fallback(invalid-value), overwrite
//   - a read error                                    → default, fallback(read-failed), no overwrite
//   - empty registry                                  → hardcoded default, fallback(no-themes), no overwrite
//   - default = Dark when `prefersDark`, else Light; always a member of the registry
//     (or the hardcoded default when the registry is empty).
//
// Validates: Requirements 2.5, 3.6, 3.7, 4.2, 4.3, 4.4, 4.5, 4.7

import type { ThemeId, ThemeMeta, ThemeStatus } from './types';
import { DEFAULT_DARK, DEFAULT_LIGHT } from './registry';

/**
 * Marker object a caller passes to {@link resolveTheme} when reading the
 * persisted preference threw / rejected (e.g. `localStorage` access denied or a
 * Capacitor Preferences failure). An `Error` instance is also accepted so callers
 * can forward a caught exception directly.
 *
 * @see readError for a convenience constructor.
 */
export interface ReadErrorObject {
  readonly kind: 'read-error';
  /** The underlying cause, if available (the caught exception). */
  readonly error?: unknown;
}

/** A persisted-read failure: either the {@link ReadErrorObject} sentinel shape or any `Error`. */
export type ReadError = ReadErrorObject | Error;

/** A ready-to-use {@link ReadError} sentinel for callers without a specific cause. */
export const READ_ERROR_SENTINEL: ReadErrorObject = { kind: 'read-error' };

/** Build a {@link ReadError} from a caught exception (or none). */
export function readError(error?: unknown): ReadErrorObject {
  return { kind: 'read-error', error };
}

/** The full input union accepted for the persisted preference. */
export type PersistedInput = string | null | ReadError;

/** The result of resolving a persisted preference. */
export interface ResolveThemeResult {
  /** The theme to apply. Always a member of `registry` (or the hardcoded default when empty). */
  theme: ThemeId;
  /** Non-blocking status describing how the value was resolved. */
  status: ThemeStatus;
  /** When `true`, the (invalid-but-present) stored value should be rewritten to `theme`. */
  overwrite: boolean;
}

/** Type guard: did the caller pass a read failure rather than a string / null? */
function isReadError(value: PersistedInput): value is ReadError {
  if (value instanceof Error) return true;
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ReadErrorObject).kind === 'read-error'
  );
}

/**
 * Derive the default theme from the OS color-scheme preference, constrained to a
 * member of the supplied registry (R4.3). Resolution order:
 *   1. the canonical id (`DEFAULT_DARK` when `prefersDark`, else `DEFAULT_LIGHT`)
 *      if it is present in the registry;
 *   2. otherwise the first registry theme whose `kind` matches the preference;
 *   3. otherwise the first registry theme.
 *
 * The caller guarantees `registry` is non-empty before invoking this.
 */
function deriveDefault(prefersDark: boolean, registry: ThemeMeta[]): ThemeId {
  const preferredKind = prefersDark ? 'dark' : 'light';
  const canonical = prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT;

  if (registry.some((t) => t.id === canonical)) return canonical;

  const byKind = registry.find((t) => t.kind === preferredKind);
  if (byKind) return byKind.id;

  return registry[0].id;
}

/**
 * Resolve which theme to apply from a persisted preference, the available theme
 * registry, and the OS dark-mode preference. Pure and total — see file header
 * and Correctness Property 1.
 *
 * @param persisted The persisted preference: a string (possibly invalid/empty),
 *   `null` when absent, or a {@link ReadError} when the read itself failed.
 * @param prefersDark Whether `prefers-color-scheme` reports `dark`.
 * @param registry The selectable themes; may be empty.
 */
export function resolveTheme(
  persisted: PersistedInput,
  prefersDark: boolean,
  registry: ThemeMeta[],
): ResolveThemeResult {
  // Empty registry: nothing selectable — apply the hardcoded default (R3.7).
  if (registry.length === 0) {
    return {
      theme: prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT,
      status: { state: 'fallback', reason: 'no-themes' },
      overwrite: false,
    };
  }

  const fallbackTheme = deriveDefault(prefersDark, registry);

  // Read failure: apply default, no overwrite (we never read a value to correct) (R4.4).
  if (isReadError(persisted)) {
    return {
      theme: fallbackTheme,
      status: { state: 'fallback', reason: 'read-failed' },
      overwrite: false,
    };
  }

  // Valid persisted id present in the registry → apply it as-is (R4.2).
  if (persisted !== null && registry.some((t) => t.id === persisted)) {
    return {
      theme: persisted as ThemeId,
      status: { state: 'ok' },
      overwrite: false,
    };
  }

  // null / empty / malformed / unknown value → default, and overwrite the stored
  // value with the applied theme (R4.5).
  return {
    theme: fallbackTheme,
    status: { state: 'fallback', reason: 'invalid-value' },
    overwrite: true,
  };
}
