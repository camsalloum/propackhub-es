// Feature: es-ui-revamp, Property 2: Preference persistence round-trips.
//
// For any valid ThemeId, writing the value with set() and reading it back with
// get() yields exactly the value written (web localStorage implementation under
// jsdom); and feeding the read-back value into resolveTheme resolves to the
// same ThemeId.

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createPreferenceStore } from './PreferenceStore';
import { resolveTheme } from '../theme/resolveTheme';
import { THEMES } from '../theme/registry';
import type { ThemeId } from '../theme/types';

const IDS = THEMES.map((t) => t.id) as ThemeId[];

describe('PreferenceStore — Property 2: persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('get(set(v)) === v and resolveTheme(get()) === v for any theme id', async () => {
    const store = createPreferenceStore();
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<ThemeId>(...IDS),
        fc.boolean(),
        async (id, prefersDark) => {
          await store.set('es.theme', id);
          const readBack = await store.get('es.theme');
          expect(readBack).toBe(id);
          expect(resolveTheme(readBack, prefersDark, THEMES).theme).toBe(id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('round-trips arbitrary string preference values under any key', async () => {
    const store = createPreferenceStore();
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (key, value) => {
          await store.set(key, value);
          expect(await store.get(key)).toBe(value);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null for an unset key', async () => {
    const store = createPreferenceStore();
    expect(await store.get('es.theme')).toBeNull();
  });
});
