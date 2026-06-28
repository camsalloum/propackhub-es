// Feature: es-ui-revamp — deterministic motion-duration resolution.
//
// `resolveMotionDurations` is the single, pure source of truth for the numeric
// duration (in MILLISECONDS) of every Motion_Token, given whether the app is in
// Reduced_Motion_Mode (design.md → Motion System, and Correctness Property 5).
//
// It mirrors, in JS, the CSS token mechanism described in the design: in normal
// mode each token resolves to its defined value (matching the `--motion-*` CSS
// custom properties in `index.css`); under reduced motion every NON-ESSENTIAL
// token collapses to exactly `0ms`, while the single ESSENTIAL feedback token
// (`motion-feedback`, used for the Skeleton shimmer / progress indication) is
// retained, capped at ≤ 200ms, in BOTH modes (R7.4).
//
// The function is total and side-effect free: no DOM access, no media-query
// reads. The caller owns reduced-motion detection (e.g. `useReducedMotion`) and
// passes the resolved boolean in.
//
// Correctness Property 5 — Reduced-motion mode zeroes all non-essential motion
// durations:
//   - reducedMotion = true  → every non-essential token resolves to exactly 0ms;
//                             `motion-feedback` resolves to ≤ 200ms (kept at 200).
//   - reducedMotion = false → every non-essential token resolves to its defined
//                             non-zero value within its specified range;
//                             `motion-feedback` resolves to ≤ 200ms (200).
//
// Validates: Requirements 6.4, 7.3, 7.4

/**
 * The set of named motion durations the app animates against. The first six are
 * NON-ESSENTIAL (suppressed under reduced motion); `motion-feedback` is the
 * single ESSENTIAL token retained in both modes (R7.4).
 */
export type MotionToken =
  | 'motion-micro'
  | 'motion-enter'
  | 'motion-stagger-step'
  | 'motion-overlay'
  | 'motion-page'
  | 'motion-theme-swap'
  | 'motion-feedback';

/**
 * Normal-mode duration of each Motion_Token, in milliseconds. These match the
 * `--motion-*` CSS custom-property values declared in `index.css` (design.md →
 * Motion token values table) and are exported so tests and callers can assert
 * against the canonical numbers rather than re-stating literals.
 */
export const NORMAL_MOTION_DURATIONS: Readonly<Record<MotionToken, number>> = {
  'motion-micro': 160,
  'motion-enter': 280,
  'motion-stagger-step': 60,
  'motion-overlay': 240,
  'motion-page': 320,
  'motion-theme-swap': 180,
  'motion-feedback': 200,
};

/**
 * The non-essential Motion_Tokens — every animation that conveys movement rather
 * than essential state feedback. These all resolve to `0ms` under reduced motion
 * (R7.3), rendering the affected content directly in its final state.
 */
export const NON_ESSENTIAL_MOTION_TOKENS: readonly MotionToken[] = [
  'motion-micro',
  'motion-enter',
  'motion-stagger-step',
  'motion-overlay',
  'motion-page',
  'motion-theme-swap',
];

/**
 * The single essential-feedback Motion_Token. It is retained in both modes and
 * capped at {@link ESSENTIAL_FEEDBACK_CAP_MS} (R7.4).
 */
export const ESSENTIAL_MOTION_TOKEN: MotionToken = 'motion-feedback';

/** The reduced-motion duration for every non-essential token. */
export const REDUCED_MOTION_DURATION_MS = 0;

/** Upper bound (inclusive) on the essential-feedback token's movement (R7.4). */
export const ESSENTIAL_FEEDBACK_CAP_MS = 200;

/**
 * Resolve the duration (in milliseconds) of every Motion_Token for the given
 * motion mode. Pure and total — see file header and Correctness Property 5.
 *
 * @param reducedMotion Whether the app is in Reduced_Motion_Mode. When `true`,
 *   all non-essential tokens resolve to `0ms` and the essential `motion-feedback`
 *   token is retained (≤ 200ms). When `false`, every token resolves to its
 *   defined normal-mode value.
 * @returns A complete map from each {@link MotionToken} to its duration in ms.
 */
export function resolveMotionDurations(
  reducedMotion: boolean,
): Record<MotionToken, number> {
  if (!reducedMotion) {
    // Normal mode: every token at its defined value (a fresh copy so callers
    // cannot mutate the canonical constant).
    return { ...NORMAL_MOTION_DURATIONS };
  }

  // Reduced-motion mode: zero every non-essential token; keep the essential
  // feedback token (capped at ≤ 200ms) so loading/progress feedback remains.
  return {
    'motion-micro': REDUCED_MOTION_DURATION_MS,
    'motion-enter': REDUCED_MOTION_DURATION_MS,
    'motion-stagger-step': REDUCED_MOTION_DURATION_MS,
    'motion-overlay': REDUCED_MOTION_DURATION_MS,
    'motion-page': REDUCED_MOTION_DURATION_MS,
    'motion-theme-swap': REDUCED_MOTION_DURATION_MS,
    'motion-feedback': NORMAL_MOTION_DURATIONS['motion-feedback'],
  };
}
