// Feature: es-ui-revamp — staggered-entrance helper hook.
//
// `useStagger` provides the per-item timing a grid/list uses to cascade its
// children's entrance animations (design.md → Motion System → useStagger;
// Requirements 6.1, 9.2, 15.3, 19.4). It exposes two complementary mechanisms,
// both sourced from the token-defined `--motion-stagger-step` duration:
//
//   1. `getStyle(index)` — returns a `style` object carrying the per-item
//      `--stagger-index` custom property. CSS can then derive a delay with
//      `calc(var(--stagger-index) * var(--motion-stagger-step))`, keeping the
//      stagger fully token-driven and zeroed automatically under reduced motion
//      (the CSS override sets `--motion-stagger-step: 0ms`).
//   2. `getDelay(index)` — returns the per-item delay in milliseconds, ready to
//      feed `useEntrance({ delay })` for JS/WAAPI-driven entrances.
//
// Design constraints honoured here:
//   - Reduced-motion aware: when `useReducedMotion()` reports true, `getDelay`
//     returns `0` so every item enters simultaneously (in practice instantly,
//     since `useEntrance` is itself a no-op under reduced motion) (R6.6, R7.3).
//   - Token-driven: the step is read from `--motion-stagger-step` on the root
//     element so a single CSS change re-times every stagger (R6.4). A literal
//     fallback matches `index.css`.
//   - jsdom / SSR safe: feature-detects `getComputedStyle`; falls back to the
//     literal step when unavailable.

import { useCallback, useMemo } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** Fallback per-item step (ms) matching `--motion-stagger-step` in `index.css`. */
const DEFAULT_STAGGER_STEP_MS = 60;

/**
 * Custom-property style payload for a staggered item. Spreading this onto an
 * element's `style` exposes `--stagger-index` to CSS.
 */
export type StaggerStyle = React.CSSProperties & {
  '--stagger-index': number;
};

export interface UseStaggerOptions {
  /**
   * Override the per-item step (ms). When omitted, the value is read from the
   * `--motion-stagger-step` token (falling back to {@link DEFAULT_STAGGER_STEP_MS}).
   */
  step?: number;
}

export interface UseStaggerResult {
  /** Resolved per-item step in milliseconds (0 under reduced motion). */
  stepMs: number;
  /**
   * Delay in milliseconds for the item at `index`. Feed this to
   * `useEntrance({ delay })`. Returns `0` under reduced motion.
   */
  getDelay: (index: number) => number;
  /**
   * Inline style carrying the `--stagger-index` custom property for the item at
   * `index`, for CSS-driven stagger via
   * `calc(var(--stagger-index) * var(--motion-stagger-step))`.
   */
  getStyle: (index: number) => StaggerStyle;
}

/**
 * Reads the `--motion-stagger-step` token (in ms) from the document root,
 * returning `fallback` when unavailable (jsdom/SSR) or unparseable.
 */
function readStaggerStepMs(fallback: number): number {
  if (
    typeof window === 'undefined' ||
    typeof window.getComputedStyle !== 'function' ||
    typeof document === 'undefined' ||
    !document.documentElement
  ) {
    return fallback;
  }
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--motion-stagger-step')
    .trim();
  if (!raw) {
    return fallback;
  }
  // Accept either `60ms` or `0.06s`.
  const match = /^(-?[\d.]+)\s*(ms|s)?$/.exec(raw);
  if (!match) {
    return fallback;
  }
  const value = Number.parseFloat(match[1]);
  if (Number.isNaN(value)) {
    return fallback;
  }
  return match[2] === 's' ? value * 1000 : value;
}

/**
 * Compute per-item stagger timing for a grid/list entrance.
 *
 * @example // CSS-driven stagger
 * function Grid({ items }: { items: Item[] }) {
 *   const { getStyle } = useStagger();
 *   return (
 *     <ul>
 *       {items.map((item, i) => (
 *         <li key={item.id} className="stagger-item" style={getStyle(i)}>…</li>
 *       ))}
 *     </ul>
 *   );
 * }
 *
 * @example // JS-driven stagger via useEntrance
 * function Card({ index }: { index: number }) {
 *   const { getDelay } = useStagger();
 *   const { ref } = useEntrance<HTMLDivElement>({ delay: getDelay(index) });
 *   return <div ref={ref}>…</div>;
 * }
 */
export function useStagger(options: UseStaggerOptions = {}): UseStaggerResult {
  const { step } = options;
  const reducedMotion = useReducedMotion();

  const stepMs = useMemo(() => {
    if (reducedMotion) {
      return 0;
    }
    const resolved = step ?? readStaggerStepMs(DEFAULT_STAGGER_STEP_MS);
    // Negative/NaN steps are meaningless; clamp to 0.
    return Number.isFinite(resolved) && resolved > 0 ? resolved : 0;
  }, [reducedMotion, step]);

  const getDelay = useCallback(
    (index: number): number => {
      if (!Number.isFinite(index) || index <= 0) {
        return 0;
      }
      return Math.floor(index) * stepMs;
    },
    [stepMs],
  );

  const getStyle = useCallback(
    (index: number): StaggerStyle => ({
      '--stagger-index': Number.isFinite(index) && index > 0 ? Math.floor(index) : 0,
    }),
    [],
  );

  return { stepMs, getDelay, getStyle };
}

export default useStagger;
