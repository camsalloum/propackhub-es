// Feature: es-ui-revamp, Property 1: Theme resolution is total and valid.
//
// For any persisted preference input (valid id, arbitrary string, empty, null,
// or a read error) and any prefers-color-scheme value, resolveTheme returns a
// theme that is always a member of the registry; a valid id resolves to itself;
// null/malformed/unknown/read-error resolves to the OS-derived default; and an
// invalid-but-present value flags overwrite = true.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveTheme, readError, READ_ERROR_SENTINEL } from './resolveTheme';
import { THEMES, DEFAULT_DARK, DEFAULT_LIGHT } from './registry';
import type { ThemeId } from './types';

const VALID_IDS = THEMES.map((t) => t.id);

describe('resolveTheme — Property 1: total and valid', () => {
  it('always returns a theme in the registry', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom<ThemeId>(...VALID_IDS),
          fc.string(),
          fc.constant<null>(null),
          fc.constant(READ_ERROR_SENTINEL),
        ),
        fc.boolean(),
        (persisted, prefersDark) => {
          const { theme } = resolveTheme(persisted, prefersDark, THEMES);
          expect(VALID_IDS).toContain(theme);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('a valid persisted id resolves to itself with status ok and no overwrite', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeId>(...VALID_IDS),
        fc.boolean(),
        (id, prefersDark) => {
          const r = resolveTheme(id, prefersDark, THEMES);
          expect(r.theme).toBe(id);
          expect(r.status).toEqual({ state: 'ok' });
          expect(r.overwrite).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('invalid-but-present values resolve to the OS default and flag overwrite', () => {
    fc.assert(
      fc.property(
        // Strings that are NOT valid theme ids.
        fc.string().filter((s) => !VALID_IDS.includes(s as ThemeId)),
        fc.boolean(),
        (bogus, prefersDark) => {
          const r = resolveTheme(bogus, prefersDark, THEMES);
          expect(r.theme).toBe(prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT);
          expect(r.overwrite).toBe(true);
          expect(r.status).toEqual({ state: 'fallback', reason: 'invalid-value' });
        },
      ),
      { numRuns: 200 },
    );
  });

  it('null resolves to the OS default and flags overwrite', () => {
    fc.assert(
      fc.property(fc.boolean(), (prefersDark) => {
        const r = resolveTheme(null, prefersDark, THEMES);
        expect(r.theme).toBe(prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT);
        expect(r.overwrite).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('a read error resolves to the OS default without overwrite', () => {
    fc.assert(
      fc.property(fc.boolean(), (prefersDark) => {
        const r = resolveTheme(readError(new Error('denied')), prefersDark, THEMES);
        expect(r.theme).toBe(prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT);
        expect(r.overwrite).toBe(false);
        expect(r.status).toEqual({ state: 'fallback', reason: 'read-failed' });
      }),
      { numRuns: 100 },
    );
  });

  it('an empty registry falls back to the hardcoded default and surfaces no-themes', () => {
    fc.assert(
      fc.property(fc.boolean(), (prefersDark) => {
        const r = resolveTheme('light', prefersDark, []);
        expect(r.theme).toBe(prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT);
        expect(r.status).toEqual({ state: 'fallback', reason: 'no-themes' });
      }),
      { numRuns: 100 },
    );
  });

  it('legacy Phase-1 ids (indigo / emerald / sunset) are now treated as invalid and overwritten', () => {
    for (const legacy of ['indigo', 'emerald', 'sunset']) {
      const r = resolveTheme(legacy, false, THEMES);
      expect(r.theme).toBe(DEFAULT_LIGHT);
      expect(r.overwrite).toBe(true);
    }
  });
});
