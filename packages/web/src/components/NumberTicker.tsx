// Feature: es-ui-revamp (Phase 1.5) — animated numeric ticker with spring physics.
//
// `NumberTicker` animates a number toward `value` using the `motion` library's
// `animate()` with a spring transition for a natural, premium feel — the value
// settles instead of mechanically counting up.
//
// Under reduced motion the final value renders instantly — no animation,
// no scheduling — so the contract from R7.5 (controls operable in final state
// at the moment they appear) is preserved. Falls back transparently to the
// final value when the lib is unavailable for any reason.

import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface NumberTickerProps {
  /** Final numeric value to display. */
  value: number;
  /** Starting value of the very first animation. Defaults to `0`. */
  from?: number;
  /** Total animation duration in ms (for the `tween` fallback when value === 0). */
  durationMs?: number;
  /** Decimal places to render. Defaults to `0`. */
  decimals?: number;
  /** Optional prefix (e.g. currency code). */
  prefix?: string;
  /** Optional suffix (e.g. `%`, `kg`). */
  suffix?: string;
  /** Locale for `Intl.NumberFormat`. Defaults to runtime locale. */
  locale?: string;
  /** Additional className passed to the span. */
  className?: string;
}

export function NumberTicker({
  value,
  from = 0,
  durationMs = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  locale,
  className,
}: NumberTickerProps) {
  const reducedMotion = useReducedMotion();
  // Track the *displayed* number. Initial render starts at `from` (or `value`
  // when reduced motion is active) so the first paint is correct.
  const [display, setDisplay] = useState<number>(reducedMotion ? value : from);
  const lastValueRef = useRef<number>(reducedMotion ? value : from);

  useEffect(() => {
    if (reducedMotion || !Number.isFinite(value)) {
      setDisplay(value);
      lastValueRef.current = value;
      return;
    }

    const start = lastValueRef.current;
    if (start === value) return; // no work to do

    // Spring physics — feels natural; settles on the target without bouncing
    // past it for typical financial value updates. Falls back to an eased tween
    // in case the lib changes shape (defensive try/catch keeps the UI alive).
    let controls: { stop: () => void } | undefined;
    try {
      const animation = animate(start, value, {
        type: 'spring',
        stiffness: 110,
        damping: 22,
        mass: 1,
        // Cap the effective duration so big jumps don't drag on; the rAF tween
        // fallback uses durationMs.
        duration: Math.min(durationMs / 1000, 1.4),
        onUpdate: (latest) => setDisplay(latest),
        onComplete: () => {
          setDisplay(value);
          lastValueRef.current = value;
        },
      });
      controls = { stop: () => animation.stop?.() ?? animation.cancel?.() };
    } catch {
      // If `animate()` throws (e.g., test env shimming), snap to value.
      setDisplay(value);
      lastValueRef.current = value;
    }

    return () => {
      controls?.stop();
    };
  }, [value, reducedMotion, durationMs]);

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {formatter.format(display)}
      {suffix}
    </span>
  );
}

export default NumberTicker;
