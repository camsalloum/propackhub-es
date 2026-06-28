// Feature: es-ui-revamp — Theme System runtime provider.
//
// `ThemeProvider` is the React context that owns the Active_Theme at runtime. It
// reconciles the persisted preference (read through the Preference_Store) against
// the pre-paint `data-theme` attribute, applies a theme by toggling a single
// `data-theme` attribute on `<html>` (one DOM mutation re-resolves every CSS
// variable on every route — see design "Theme application data flow"), and
// persists user selections.
//
// Responsibilities (design → "Theme System" → ThemeProvider responsibilities):
//   - On mount, read the persisted theme via Preference_Store inside try/catch;
//     forward the read result (string | null) or a READ_ERROR sentinel to the
//     pure `resolveTheme`. Apply the resolved theme, overwrite the stored value
//     when `resolveTheme` reports an invalid stored value, and set status (R4.2,
//     R4.3, R4.4, R4.5).
//   - `setTheme(id)`: validate against the registry; if not applicable, retain
//     the current theme and surface `apply-error` (R2.5, R3.6). On success, set
//     `data-theme` on `<html>` (visible update within motion-theme-swap, R3.2/
//     R3.4), update state, then persist (≤ 500ms, R4.1); on persist rejection,
//     keep the theme for the session and surface `persist-error` (R4.6).
//   - Track OS `prefers-color-scheme` changes to update the *default* only while
//     no explicit user choice is stored (best-effort; never overrides a
//     selection) (R4.3).
//
// Persistence key is `es.theme`, matching the pre-paint inline script.
//
// _Requirements: 2.3, 2.4, 2.5, 3.2, 3.4, 3.5, 4.1, 4.6_

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeId, ThemeMeta, ThemeStatus } from './types';
import { THEMES } from './registry';
import { resolveTheme, readError, type PersistedInput } from './resolveTheme';
import { createPreferenceStore } from '../preferences/PreferenceStore';

/** The persistence key. MUST match the pre-paint inline script in `index.html`. */
export const THEME_STORAGE_KEY = 'es.theme';

/** The value exposed by {@link useTheme}. */
export interface ThemeContextValue {
  /** The currently applied theme. */
  activeTheme: ThemeId;
  /** All selectable themes (registry order). */
  themes: ThemeMeta[];
  /** Non-blocking status of the most recent resolution / selection. */
  status: ThemeStatus;
  /** Select and apply a theme; resolves once persistence has settled. */
  setTheme: (id: ThemeId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Set the `data-theme` attribute on `<html>` — the single DOM mutation that re-themes the app. */
function applyThemeAttribute(theme: ThemeId): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

/** Read the OS `prefers-color-scheme: dark` flag, guarding non-DOM environments. */
function readPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Best-effort initial theme from the pre-paint attribute, so first render matches the painted theme. */
function initialThemeFromDom(): ThemeId {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.theme;
    if (current && THEMES.some((t) => t.id === current)) {
      return current as ThemeId;
    }
  }
  return THEMES[0]?.id ?? 'light';
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const store = useMemo(() => createPreferenceStore(), []);

  const [activeTheme, setActiveTheme] = useState<ThemeId>(initialThemeFromDom);
  const [status, setStatus] = useState<ThemeStatus>({ state: 'ok' });

  // Tracks whether the user has an explicit, valid stored selection. While false,
  // the provider follows OS `prefers-color-scheme` changes for the default; once
  // true, an OS change never overrides the user's choice (R4.3).
  const hasExplicitChoice = useRef(false);

  // --- On mount: read persisted preference and resolve the active theme. -----
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let persisted: PersistedInput;
      try {
        persisted = await store.get(THEME_STORAGE_KEY);
      } catch (err) {
        // Read failure → forward a read-error sentinel so resolveTheme applies
        // the default without overwriting (R4.4).
        persisted = readError(err);
      }

      if (cancelled) return;

      const result = resolveTheme(persisted, readPrefersDark(), THEMES);
      applyThemeAttribute(result.theme);
      setActiveTheme(result.theme);
      setStatus(result.status);

      // A valid stored value resolves to `ok`; that is the only "explicit choice".
      hasExplicitChoice.current = result.status.state === 'ok';

      // Overwrite an invalid/missing stored value with the applied theme (R4.5).
      if (result.overwrite) {
        try {
          await store.set(THEME_STORAGE_KEY, result.theme);
        } catch {
          // Correcting the stored value is best-effort; the theme is already
          // applied for the session, so a write failure must not block startup.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store]);

  // --- Follow OS color-scheme changes for the default (no explicit choice). --
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const onChange = () => {
      // Best-effort: never override an explicit user selection.
      if (hasExplicitChoice.current) return;
      const result = resolveTheme(null, mql.matches, THEMES);
      applyThemeAttribute(result.theme);
      setActiveTheme(result.theme);
    };

    // addEventListener is the modern API; older Safari exposes addListener.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  // --- User selects a theme. -------------------------------------------------
  const setTheme = useCallback(
    async (id: ThemeId): Promise<void> => {
      const isKnown = THEMES.some((t) => t.id === id);
      if (!isKnown) {
        // Not applicable: retain the current theme, surface apply-error (R2.5/R3.6).
        setStatus({ state: 'apply-error', attempted: id });
        return;
      }

      // Apply immediately so visible components re-theme within motion-theme-swap
      // (R3.2/R3.4). This is the explicit user choice from now on.
      applyThemeAttribute(id);
      setActiveTheme(id);
      hasExplicitChoice.current = true;
      setStatus({ state: 'ok' });

      // Persist asynchronously (≤ 500ms target, R4.1). On rejection, keep the
      // theme for the session and surface persist-error (R4.6).
      try {
        await store.set(THEME_STORAGE_KEY, id);
      } catch {
        setStatus({ state: 'persist-error' });
      }
    },
    [store],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ activeTheme, themes: THEMES, status, setTheme }),
    [activeTheme, status, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the Theme System context. Must be called within a {@link ThemeProvider}. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
