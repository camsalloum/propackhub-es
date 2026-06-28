// Feature: es-ui-revamp — Theme registry and resolved token map.
//
// Nine deliberately distinct personalities. Two are base (Light, Dark) and the
// remaining seven are colorful themes — six adapted from the PEBI (`apps/pph`)
// ThemeContext palettes plus the in-house `lagoon` (dark blue + green mix the
// user requested to replace the orange sunset). PEBI's orange `sunset` and
// `gold` themes are intentionally NOT imported.
//
// Values mirror the CSS `:root` + `[data-theme=…]` blocks in index.css.

import type { ThemeId, ThemeMeta, TokenKey } from './types';

export const THEMES: ThemeMeta[] = [
  // Base
  { id: 'light',    name: 'Light',           kind: 'light', swatch: '#9333EA' },
  { id: 'dark',     name: 'Dark',            kind: 'dark',  swatch: '#B275F0' },
  // Colorful — in-house "dark blue + green of the layers" mix
  { id: 'lagoon',   name: 'Lagoon',          kind: 'dark',  swatch: '#22C55E' },
  // Colorful — from PEBI
  { id: 'ocean',    name: 'Ocean Depths',    kind: 'dark',  swatch: '#2DD4BF' },
  { id: 'aurora',   name: 'Aurora',          kind: 'light', swatch: '#8B5CF6' },
  { id: 'midnight', name: 'Midnight Purple', kind: 'dark',  swatch: '#A78BFA' },
  { id: 'forest',   name: 'Forest Green',    kind: 'light', swatch: '#059669' },
  { id: 'frost',    name: 'Frost',           kind: 'light', swatch: '#6366F1' },
  { id: 'classic',  name: 'Classic',         kind: 'light', swatch: '#374151' },
];

export const DEFAULT_LIGHT: ThemeId = 'light';
export const DEFAULT_DARK: ThemeId = 'dark';

export const REQUIRED_TOKEN_KEYS: TokenKey[] = [
  'surface-base',
  'surface-raised',
  'surface-overlay',
  'scrim',
  'text-primary',
  'text-secondary',
  'text-inverse',
  'text-on-accent',
  'brand',
  'accent',
  'accent-text',
  'focus-ring',
  'border',
  'border-strong',
  'success',
  'warning',
  'danger',
  'badge-draft-bg',
  'badge-draft-fg',
  'badge-quote-bg',
  'badge-quote-fg',
  'badge-sent-bg',
  'badge-sent-fg',
  'badge-won-bg',
  'badge-won-fg',
  'badge-lost-bg',
  'badge-lost-fg',
];

const LIGHT_TOKENS: Record<TokenKey, string> = {
  'surface-base': '#FAFAF9',
  'surface-raised': '#FFFFFF',
  'surface-overlay': '#FFFFFF',
  scrim: '#000000',
  'text-primary': '#0C0A09',
  'text-secondary': '#78716C',
  'text-inverse': '#FFFFFF',
  'text-on-accent': '#FFFFFF',
  brand: '#0C0A09',
  accent: '#9333EA',          // violet-600
  'accent-text': '#6B21A8',   // violet-800 (AA on white)
  'focus-ring': '#9333EA',
  border: '#E7E5E4',
  'border-strong': '#C2BFBC',
  success: '#15803D',
  warning: '#B45309',
  danger: '#B91C1C',
  'badge-draft-bg': '#FEF3C7',
  'badge-draft-fg': '#92400E',
  'badge-quote-bg': '#F5F5F4',
  'badge-quote-fg': '#0C0A09',
  'badge-sent-bg': '#DBEAFE',
  'badge-sent-fg': '#1D4ED8',
  'badge-won-bg': '#DCFCE7',
  'badge-won-fg': '#15803D',
  'badge-lost-bg': '#FEE2E2',
  'badge-lost-fg': '#B91C1C',
};

const DARK_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#09090B',
  'surface-raised': '#111114',
  'surface-overlay': '#18181B',
  'text-primary': '#F4F4F5',
  'text-secondary': '#A7A7AF',
  // Dark theme's accent (violet-400-ish), brand (near-white), and surface
  // tokens are all LIGHT, so any text painted on those surfaces must be DARK
  // (R5 contrast). Without these overrides the tokens fall back to
  // LIGHT_TOKENS' '#FFFFFF', producing white-on-light foreground (Layout
  // logo, .btn-primary, .badge-accent, TemplateBuilder numbered pill, etc.).
  'text-on-accent': '#0F0F12',
  'text-inverse': '#0F0F12',
  brand: '#F4F4F5',
  accent: '#B275F0',
  'accent-text': '#D8B4FE',
  'focus-ring': '#B275F0',
  border: '#27272A',
  'border-strong': '#3F3F46',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

// Ocean Depths — teal/cyan on deep teal (dark, PEBI "Ocean Depths").
const OCEAN_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#042F2E',
  'surface-raised': '#0C403D',
  'surface-overlay': '#134E4A',
  'text-primary': '#F0FDFA',
  'text-secondary': '#99F6E4',
  'text-inverse': '#042F2E',
  'text-on-accent': '#042F2E',
  brand: '#5EEAD4',
  accent: '#2DD4BF',
  'accent-text': '#99F6E4',
  'focus-ring': '#2DD4BF',
  border: '#0F766E',
  'border-strong': '#14B8A6',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#FB7185',
  'badge-draft-bg': '#422006',
  'badge-draft-fg': '#FBBF24',
  'badge-quote-bg': '#134E4A',
  'badge-quote-fg': '#99F6E4',
  'badge-sent-bg': '#0C4A6E',
  'badge-sent-fg': '#7DD3FC',
  'badge-won-bg': '#064E3B',
  'badge-won-fg': '#6EE7B7',
  'badge-lost-bg': '#881337',
  'badge-lost-fg': '#FDA4AF',
};

// Lagoon — dark blue + emerald-green mix (in-house). Deep navy base with a
// vibrant emerald accent — inspired by the dark-blue + green layer pills in the
// estimation editor cards. Dark kind.
const LAGOON_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#0F2540',
  'surface-raised': '#143C5C',
  'surface-overlay': '#1A5078',
  'text-primary': '#ECFDF5',
  'text-secondary': '#86EFAC',
  'text-inverse': '#0F2540',
  'text-on-accent': '#0F2540',
  brand: '#86EFAC',
  accent: '#22C55E',
  'accent-text': '#86EFAC',
  'focus-ring': '#22C55E',
  border: '#1B4D6E',
  'border-strong': '#2563EB',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#FB7185',
  'badge-draft-bg': '#422006',
  'badge-draft-fg': '#FBBF24',
  'badge-quote-bg': '#143C5C',
  'badge-quote-fg': '#86EFAC',
  'badge-sent-bg': '#0C4A6E',
  'badge-sent-fg': '#7DD3FC',
  'badge-won-bg': '#064E3B',
  'badge-won-fg': '#6EE7B7',
  'badge-lost-bg': '#881337',
  'badge-lost-fg': '#FDA4AF',
};

// Aurora — vibrant violet + pink on lavender white (light, PEBI).
const AURORA_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#FAF5FF',
  'surface-raised': '#FFFFFF',
  'text-primary': '#3B0764',
  'text-secondary': '#6D28D9',
  brand: '#6D28D9',
  accent: '#8B5CF6',
  'accent-text': '#6D28D9',
  'focus-ring': '#8B5CF6',
  border: '#D8B4FE',
  'border-strong': '#A855F7',
};

// Midnight Purple — deep indigo with violet accents (dark, PEBI).
const MIDNIGHT_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#1E1B4B',
  'surface-raised': '#312E81',
  'surface-overlay': '#3730A3',
  'text-primary': '#F5F3FF',
  'text-secondary': '#C4B5FD',
  'text-inverse': '#1E1B4B',
  'text-on-accent': '#1E1B4B',
  brand: '#C4B5FD',
  accent: '#A78BFA',
  'accent-text': '#C4B5FD',
  'focus-ring': '#A78BFA',
  border: '#4C1D95',
  'border-strong': '#7C3AED',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#FB7185',
};

// Forest Green — natural emerald & green (light, PEBI).
const FOREST_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#F0FDF4',
  'surface-raised': '#FFFFFF',
  'text-primary': '#14532D',
  'text-secondary': '#166534',
  brand: '#14532D',
  accent: '#059669',
  'accent-text': '#047857',
  'focus-ring': '#059669',
  border: '#A7F3D0',
  'border-strong': '#34D399',
  success: '#16A34A',
};

// Frost — indigo glassmorphism (light, PEBI).
const FROST_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#F5F7FF',
  'surface-raised': '#FFFFFF',
  'text-primary': '#1E1B4B',
  'text-secondary': '#4338CA',
  brand: '#4338CA',
  accent: '#6366F1',
  'accent-text': '#4338CA',
  'focus-ring': '#6366F1',
  border: '#E0E7FF',
  'border-strong': '#A5B4FC',
};

// Classic — neutral gray professional (light, PEBI).
const CLASSIC_OVERRIDES: Partial<Record<TokenKey, string>> = {
  'surface-base': '#F9FAFB',
  'surface-raised': '#FFFFFF',
  'text-primary': '#111827',
  'text-secondary': '#4B5563',
  brand: '#111827',
  accent: '#374151',
  'accent-text': '#1F2937',
  'focus-ring': '#374151',
  border: '#D1D5DB',
  'border-strong': '#6B7280',
  success: '#15803D',
  warning: '#B45309',
  danger: '#DC2626',
};

const withOverrides = (
  overrides: Partial<Record<TokenKey, string>>,
): Record<TokenKey, string> => ({ ...LIGHT_TOKENS, ...overrides });

export const THEME_TOKENS: Record<ThemeId, Record<TokenKey, string>> = {
  light:    LIGHT_TOKENS,
  dark:     withOverrides(DARK_OVERRIDES),
  lagoon:   withOverrides(LAGOON_OVERRIDES),
  ocean:    withOverrides(OCEAN_OVERRIDES),
  aurora:   withOverrides(AURORA_OVERRIDES),
  midnight: withOverrides(MIDNIGHT_OVERRIDES),
  forest:   withOverrides(FOREST_OVERRIDES),
  frost:    withOverrides(FROST_OVERRIDES),
  classic:  withOverrides(CLASSIC_OVERRIDES),
};
