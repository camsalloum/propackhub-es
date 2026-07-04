/**
 * Token storage:
 * - Web access token: sessionStorage (tab-scoped; survives reload, not shared across tabs).
 *   Not localStorage — reduces persistent XSS exfil window vs long-lived storage.
 * - Web refresh token: localStorage (needed to restore the tab after access expiry).
 * - Native: both in @capacitor/preferences (Keychain / EncryptedSharedPreferences).
 */

import { Capacitor } from '@capacitor/core';

async function getPreferences() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

const KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

const isNative = Capacitor.isNativePlatform();

function webGet(key: string, store: Storage): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function webSet(key: string, value: string, store: Storage): void {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function webRemove(key: string, store: Storage): void {
  try {
    store.removeItem(key);
  } catch {
    /* private mode */
  }
}

export const tokenStore = {
  async getAccessToken(): Promise<string | null> {
    if (!isNative) {
      // Migrate: drop any legacy localStorage access token.
      webRemove(KEYS.ACCESS_TOKEN, localStorage);
      return webGet(KEYS.ACCESS_TOKEN, sessionStorage);
    }
    const Pref = await getPreferences();
    return (await Pref.get({ key: KEYS.ACCESS_TOKEN })).value;
  },

  async setAccessToken(token: string): Promise<void> {
    if (!isNative) {
      webRemove(KEYS.ACCESS_TOKEN, localStorage);
      webSet(KEYS.ACCESS_TOKEN, token, sessionStorage);
      return;
    }
    const Pref = await getPreferences();
    await Pref.set({ key: KEYS.ACCESS_TOKEN, value: token });
  },

  async getRefreshToken(): Promise<string | null> {
    if (!isNative) return webGet(KEYS.REFRESH_TOKEN, localStorage);
    const Pref = await getPreferences();
    return (await Pref.get({ key: KEYS.REFRESH_TOKEN })).value;
  },

  async setRefreshToken(token: string): Promise<void> {
    if (!isNative) {
      webSet(KEYS.REFRESH_TOKEN, token, localStorage);
      return;
    }
    const Pref = await getPreferences();
    await Pref.set({ key: KEYS.REFRESH_TOKEN, value: token });
  },

  async clear(): Promise<void> {
    if (!isNative) {
      webRemove(KEYS.ACCESS_TOKEN, localStorage);
      webRemove(KEYS.ACCESS_TOKEN, sessionStorage);
      webRemove(KEYS.REFRESH_TOKEN, localStorage);
      return;
    }
    const Pref = await getPreferences();
    await Promise.all([
      Pref.remove({ key: KEYS.ACCESS_TOKEN }),
      Pref.remove({ key: KEYS.REFRESH_TOKEN }),
    ]);
  },
};
