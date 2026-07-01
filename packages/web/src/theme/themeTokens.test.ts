// Feature: es-ui-revamp, Property 3 + Property 4.
//
// Property 3 — Every theme exposes a complete, well-defined token set: for every
// theme the resolved token map defines a non-empty value for every key in
// REQUIRED_TOKEN_KEYS, with no key missing.
//
// Property 4 — Every theme meets WCAG AA contrast thresholds: for every theme,
// contrastRatio(text-primary, surface-raised) ≥ 4.5, contrastRatio(accent-text,
// surface-raised) ≥ 4.5, contrastRatio(text-secondary, surface-raised) ≥ 3.0,
// and contrastRatio(focus-ring, surface-raised) ≥ 3.0.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { THEMES, THEME_TOKENS, REQUIRED_TOKEN_KEYS } from './registry';
import { contrastRatio } from './contrast';
import type { ThemeId } from './types';

const IDS = THEMES.map((t) => t.id) as ThemeId[];

describe('THEME_TOKENS — Property 3: token completeness', () => {
  it('every theme defines a non-empty value for every required key', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const tokens = THEME_TOKENS[id];
        for (const key of REQUIRED_TOKEN_KEYS) {
          expect(tokens[key], `${id}.${key}`).toBeTruthy();
          expect(typeof tokens[key]).toBe('string');
          expect(tokens[key].trim().length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('has no keys beyond REQUIRED_TOKEN_KEYS', () => {
    for (const id of IDS) {
      const keys = Object.keys(THEME_TOKENS[id]).sort();
      const required = [...REQUIRED_TOKEN_KEYS].sort();
      expect(keys).toEqual(required);
    }
  });
});

describe('THEME_TOKENS — Property 4: WCAG AA contrast', () => {
  it('text-primary on surface-raised ≥ 4.5:1 for every theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const t = THEME_TOKENS[id];
        expect(contrastRatio(t['text-primary'], t['surface-raised'])).toBeGreaterThanOrEqual(4.5);
      }),
      { numRuns: 100 },
    );
  });

  it('accent-text on surface-raised ≥ 4.5:1 for every theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const t = THEME_TOKENS[id];
        expect(contrastRatio(t['accent-text'], t['surface-raised'])).toBeGreaterThanOrEqual(4.5);
      }),
      { numRuns: 100 },
    );
  });

  it('text-secondary on surface-raised ≥ 3.0:1 (large text/UI) for every theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const t = THEME_TOKENS[id];
        expect(contrastRatio(t['text-secondary'], t['surface-raised'])).toBeGreaterThanOrEqual(3.0);
      }),
      { numRuns: 100 },
    );
  });

  it('focus-ring on surface-raised ≥ 3.0:1 (non-text) for every theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const t = THEME_TOKENS[id];
        expect(contrastRatio(t['focus-ring'], t['surface-raised'])).toBeGreaterThanOrEqual(3.0);
      }),
      { numRuns: 100 },
    );
  });

  // The text-on-accent token is painted on accent-colored AND brand-colored
  // surfaces (logo tile, .btn-primary, .badge-*, selected nav pills, focus
  // pills). Every consumer paints it as BOLD / large UI text (font-display
  // font-semibold buttons, font-medium badges, large logo letters), so WCAG
  // 2.1 §1.4.11 (UI components, 3:1) and §1.4.3 large-text exception apply.
  // We assert the 3:1 threshold here; any consumer painting small body text
  // in text-on-accent must override locally.
  //
  // This pairing also catches the regression where Dark theme didn't override
  // text-on-accent → inherited LIGHT's '#FFFFFF' → white-on-light bug across
  // the logo, .btn-primary, and accent badges.
  it('text-on-accent on accent ≥ 3.0:1 (UI / large text) for every theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const t = THEME_TOKENS[id];
        expect(contrastRatio(t['text-on-accent'], t.accent)).toBeGreaterThanOrEqual(3.0);
      }),
      { numRuns: 100 },
    );
  });

  it('text-on-accent on brand ≥ 3.0:1 (UI / large text) for every theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const t = THEME_TOKENS[id];
        expect(contrastRatio(t['text-on-accent'], t.brand)).toBeGreaterThanOrEqual(3.0);
      }),
      { numRuns: 100 },
    );
  });

  // text-inverse is text painted on the brand-colored surface (e.g.
  // TemplateBuilder numbered pills `text-text-inverse bg-brand`). Brand and
  // text-inverse invert together across themes by design: when brand is dark
  // (light themes), text-inverse is white; when brand is light (dark themes),
  // text-inverse is dark. The pair must always read.
  it('text-inverse on brand ≥ 4.5:1 for every theme', () => {
    fc.assert(
      fc.property(fc.constantFrom<ThemeId>(...IDS), (id) => {
        const t = THEME_TOKENS[id];
        expect(contrastRatio(t['text-inverse'], t.brand)).toBeGreaterThanOrEqual(4.5);
      }),
      { numRuns: 100 },
    );
  });
});

describe('THEMES registry — R2.1 shape', () => {
  it('provides 10 themes — 2 base (light, dark) + 8 distinct colorful', () => {
    expect(THEMES).toHaveLength(10);
    expect(THEMES.map((t) => t.id)).toEqual([
      'light',
      'dark',
      'lagoon',
      'ocean',
      'aurora',
      'midnight',
      'forest',
      'frost',
      'classic',
      'industrial',
    ]);
    // At least one Light and one Dark kind (R2.1).
    expect(THEMES.some((t) => t.kind === 'light')).toBe(true);
    expect(THEMES.some((t) => t.kind === 'dark')).toBe(true);
    // The dark-kind subset.
    expect(THEMES.filter((t) => t.kind === 'dark').map((t) => t.id)).toEqual([
      'dark',
      'lagoon',
      'ocean',
      'midnight',
    ]);
  });
});
