/**
 * Secure token storage abstraction (Phase 4 / M4).
 *
 * On web: localStorage (existing behaviour — no change).
 * On native (Capacitor iOS/Android): @capacitor/preferences (encrypted native storage).
 *
 * This indirection is critical before shipping a mobile build — a 30-min access token
 * in plain localStorage on a real device could be extracted from app data backups.
 * @capacitor/preferences uses the platform's secure keystore (Keychain / EncryptedSharedPreferences).
 */

import { Capacitor } from '@capacitor/core';

// Lazy-import Preferences so the web bundle never loads the native plugin
async function getPreferences() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

const KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

const isNative = Capacitor.isNativePlatform();

export const tokenStore = {
  async getAccessToken(): Promise<string | null> {
    if (!isNative) return localStorage.getItem(KEYS.ACCESS_TOKEN);
    const Pref = await getPreferences();
    return (await Pref.get({ key: KEYS.ACCESS_TOKEN })).value;
  },

  async setAccessToken(token: string): Promise<void> {
    if (!isNative) { localStorage.setItem(KEYS.ACCESS_TOKEN, token); return; }
    const Pref = await getPreferences();
    await Pref.set({ key: KEYS.ACCESS_TOKEN, value: token });
  },

  async getRefreshToken(): Promise<string | null> {
    if (!isNative) return localStorage.getItem(KEYS.REFRESH_TOKEN);
    const Pref = await getPreferences();
    return (await Pref.get({ key: KEYS.REFRESH_TOKEN })).value;
  },

  async setRefreshToken(token: string): Promise<void> {
    if (!isNative) { localStorage.setItem(KEYS.REFRESH_TOKEN, token); return; }
    const Pref = await getPreferences();
    await Pref.set({ key: KEYS.REFRESH_TOKEN, value: token });
  },

  async clear(): Promise<void> {
    if (!isNative) {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
      localStorage.removeItem(KEYS.REFRESH_TOKEN);
      return;
    }
    const Pref = await getPreferences();
    await Promise.all([
      Pref.remove({ key: KEYS.ACCESS_TOKEN }),
      Pref.remove({ key: KEYS.REFRESH_TOKEN }),
    ]);
  },
};
