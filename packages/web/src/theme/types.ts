// Feature: es-ui-revamp — Theme System type definitions.
//
// These types are the TypeScript source of truth for the theme registry and the
// per-theme resolved token map (see ./registry.ts). They mirror the "Theme
// System" and "Data Models" sections of the design document.

/**
 * The set of selectable themes (R2.1): nine deliberately distinct personalities,
 * with one base Light, one base Dark, and seven colorful themes — five adapted
 * from the PEBI (`apps/pph`) palettes plus the in-house `lagoon` mix.
 *
 *   `light`    — clean editorial near-black + violet on warm white (base light)
 *   `dark`     — Linear-esque deep ink + violet (base dark)
 *   `lagoon`   — dark blue + emerald-green mix on deep navy (dark, NEW in-house)
 *   `ocean`    — teal/cyan on deep teal (dark, PEBI-derived)
 *   `aurora`   — vibrant violet + pink on lavender white (light, PEBI)
 *   `midnight` — deep purple with violet accents (dark, PEBI)
 *   `forest`   — natural emerald & green tones (light, PEBI)
 *   `frost`    — modern indigo glassmorphism (light, PEBI)
 *   `classic`  — professional neutral gray & minimal (light, PEBI)
 *   `industrial` — technical steel-grey + blue on industrial white (light,
 *                  from the ProPackHub "Technical Component Library" design)
 *
 * PEBI's orange `sunset` and gold `gold` themes are intentionally NOT imported
 * — the user explicitly dislikes orange/gold accents.
 */
export type ThemeId =
  | 'light'
  | 'dark'
  | 'lagoon'
  | 'ocean'
  | 'aurora'
  | 'midnight'
  | 'forest'
  | 'frost'
  | 'classic'
  | 'industrial';

/** Display metadata for a theme, consumed by the theme switchers. */
export interface ThemeMeta {
  /** Stable identifier used as the `data-theme` attribute value and persistence key. */
  id: ThemeId;
  /** Human-readable display name shown in the switcher. */
  name: string;
  /** Drives swatch styling and default-theme selection from `prefers-color-scheme`. */
  kind: 'light' | 'dark';
  /** Small preview color (any valid CSS color) shown next to the theme name. */
  swatch: string;
}

/**
 * Non-blocking status of the Theme System, surfaced to the UI as a toast / inline
 * indication. Covers the happy path plus the fallback, apply-error, and
 * persist-error conditions from Requirements 2.5, 3.6, 3.7, 4.4, 4.6.
 */
export type ThemeStatus =
  | { state: 'ok' }
  | { state: 'fallback'; reason: 'read-failed' | 'invalid-value' | 'no-themes' }
  /** A selected theme could not be applied; the previous theme is retained. */
  | { state: 'apply-error'; attempted: ThemeId }
  /** The theme was applied for the session but could not be persisted. */
  | { state: 'persist-error' };

/**
 * Every themeable color token key. Each theme in {@link ThemeId} defines a value
 * for every one of these keys (see THEME_TOKENS / REQUIRED_TOKEN_KEYS).
 */
export type TokenKey =
  // surfaces
  | 'surface-base'
  | 'surface-raised'
  | 'surface-overlay'
  | 'scrim'
  // text
  | 'text-primary'
  | 'text-secondary'
  | 'text-inverse'
  | 'text-on-accent'
  // brand + accent
  | 'brand'
  | 'accent'
  | 'accent-text'
  | 'focus-ring'
  // borders
  | 'border'
  | 'border-strong'
  // state
  | 'success'
  | 'warning'
  | 'danger'
  // badge surfaces (per status): background + foreground pairs
  | 'badge-draft-bg'
  | 'badge-draft-fg'
  | 'badge-quote-bg'
  | 'badge-quote-fg'
  | 'badge-sent-bg'
  | 'badge-sent-fg'
  | 'badge-won-bg'
  | 'badge-won-fg'
  | 'badge-lost-bg'
  | 'badge-lost-fg';
