// Feature: es-ui-revamp — WCAG 2.1 relative-luminance contrast.
//
// A pure, dependency-free implementation of the standard WCAG contrast-ratio
// formula. It is the unit under test for Property 4 ("Every theme meets WCAG AA
// contrast thresholds", Requirements 5.1–5.6, 9.4): for every theme the
// resolved token pairings must clear the AA thresholds (≥ 4.5:1 for body/accent
// text, ≥ 3.0:1 for large text, interactive controls, and focus indicators).
//
// The THEME_TOKENS map (see ./registry.ts) stores colors as hex strings, so hex
// is the primary input. Space-separated RGB channel triplets (e.g. the
// "244 245 247" form used by the CSS Token Layer) are also accepted so the same
// function can be fed either representation.
//
// References:
//   - WCAG 2.1 relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
//   - WCAG 2.1 contrast ratio:     https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

/** An sRGB color as 8-bit channels, each in the integer range [0, 255]. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clampChannel = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

/** Expand a 3-digit hex (#RGB) into its 6-digit (#RRGGBB) equivalent. */
const expandShortHex = (hex: string): string =>
  hex
    .split('')
    .map((c) => c + c)
    .join('');

/**
 * Parse a color string into 8-bit `{ r, g, b }` channels.
 *
 * Accepts:
 *   - Hex: `#RGB`, `#RRGGBB`, or the same without the leading `#`.
 *   - Channel triplets: three whitespace- or comma-separated integers in
 *     [0, 255], e.g. `"244 245 247"` or `"244, 245, 247"` (the CSS Token Layer
 *     form). This lets the function consume the `var(--token)` channel strings
 *     directly as well as the registry's hex values.
 *
 * @throws if the input is not a recognized color format or a channel is out of range.
 */
export function parseColor(input: string): Rgb {
  const value = input.trim();

  // Channel-triplet form: "r g b" or "r, g, b".
  if (/[\s,]/.test(value)) {
    const parts = value.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
      const [r, g, b] = parts.map((p) => Number.parseInt(p, 10));
      if ([r, g, b].every((c) => c >= 0 && c <= 255)) {
        return { r, g, b };
      }
    }
    throw new Error(`Invalid channel-triplet color: "${input}"`);
  }

  // Hex form (with or without leading '#').
  let hex = value.startsWith('#') ? value.slice(1) : value;
  if (hex.length === 3 && /^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = expandShortHex(hex);
  }
  if (hex.length === 6 && /^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  throw new Error(`Invalid hex color: "${input}"`);
}

/**
 * Convert a single 8-bit sRGB channel to its linear-light value using the WCAG
 * piecewise transfer function: `c ≤ 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`.
 */
function channelToLinear(channel8bit: number): number {
  const c = clampChannel(channel8bit) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Compute the WCAG relative luminance of a color:
 * `L = 0.2126 * R + 0.7152 * G + 0.0722 * B` over the linearized channels.
 * Result is in [0, 1] (0 = black, 1 = white).
 */
export function relativeLuminance(color: string | Rgb): number {
  const { r, g, b } = typeof color === 'string' ? parseColor(color) : color;
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/**
 * Compute the WCAG 2.1 contrast ratio between a foreground and background color:
 * `(L_lighter + 0.05) / (L_darker + 0.05)`. The result is symmetric in its
 * arguments and always falls in the range [1, 21].
 *
 * @param fg foreground color (hex `#RGB`/`#RRGGBB` or channel triplet).
 * @param bg background color (hex `#RGB`/`#RRGGBB` or channel triplet).
 */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Cheap inline sanity assertions (stripped in production builds; the formal
// property and unit tests live in tasks 3.5 / 3.6). Anchored on the canonical
// black-on-white extreme: exactly 21:1.
if (import.meta.env?.DEV) {
  const blackOnWhite = contrastRatio('#000000', '#FFFFFF');
  console.assert(
    Math.abs(blackOnWhite - 21) < 1e-6,
    `contrastRatio(#000,#FFF) should be 21, got ${blackOnWhite}`,
  );
  const sameColor = contrastRatio('#1A1D23', '#1A1D23');
  console.assert(
    Math.abs(sameColor - 1) < 1e-6,
    `contrastRatio of identical colors should be 1, got ${sameColor}`,
  );
}
