/**
 * Preference_Store abstraction (ES UI Revamp — Theme persistence).
 *
 * A single async interface with two implementations selected at runtime via
 * Capacitor platform detection:
 *   - Web:    `localStorage`.
 *   - Native: `@capacitor/preferences` (the persisted source of truth).
 *
 * BOTH implementations also write a synchronous `localStorage` mirror on `set()`,
 * so the pre-paint inline script in `index.html` can read the active theme before
 * first paint — even on native, where Capacitor WebViews expose `localStorage`
 * but Capacitor Preferences is async and therefore unreadable pre-paint.
 *
 * On `get()`, native reads from Capacitor Preferences (source of truth) and falls
 * back to the `localStorage` mirror if Preferences yields no value.
 *
 * Failures surface as rejected promises (try/catch that rethrows) so the caller
 * (ThemeProvider) can apply fallback behavior — failures are never silently
 * swallowed.
 *
 * This mirrors the established Capacitor-vs-localStorage precedent in
 * `lib/tokenStore.ts`.
 */

import { Capacitor } from '@capacitor/core';

export interface PreferenceStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

// Lazy-import Preferences so the web bundle never loads the native plugin.
async function getPreferences() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

/**
 * Synchronous localStorage mirror write. Used by both web and native
 * implementations so the pre-paint inline script always has a value to read.
 * Rethrows on failure so the caller can surface it.
 */
function writeMirror(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

function readMirror(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Web implementation: localStorage is both the source of truth and the mirror.
 */
const webStore: PreferenceStore = {
  async get(key: string): Promise<string | null> {
    try {
      return readMirror(key);
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      // localStorage IS the mirror on web; a single synchronous write suffices.
      writeMirror(key, value);
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  },
};

/**
 * Native implementation: Capacitor Preferences is the source of truth, with a
 * synchronous localStorage mirror kept in sync for the pre-paint script.
 */
const nativeStore: PreferenceStore = {
  async get(key: string): Promise<string | null> {
    try {
      const Pref = await getPreferences();
      const { value } = await Pref.get({ key });
      if (value !== null && value !== undefined) return value;
      // Source of truth had nothing; fall back to the localStorage mirror.
      return readMirror(key);
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      // Mirror synchronously first so the pre-paint script can read it even
      // before the async native write resolves.
      writeMirror(key, value);
      const Pref = await getPreferences();
      await Pref.set({ key, value });
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  },
};

/**
 * Platform-detected factory. Mirrors the `Capacitor.isNativePlatform()`
 * detection used by `lib/tokenStore.ts`.
 */
export function createPreferenceStore(): PreferenceStore {
  return Capacitor.isNativePlatform() ? nativeStore : webStore;
}
