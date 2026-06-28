// Feature: es-ui-revamp — mount entrance with motion library spring physics.
//
// `useEntrance` applies a one-shot entrance to an element on mount using the
// `motion` library's `animate()` with a spring transition (not a fixed-duration
// cubic-bezier). The result feels natural — the element settles into place
// instead of mechanically tweening. Compositor-only (only `transform` +
// `opacity`).
//
// Falls back to a no-op under reduced motion or when motion's `animate` is
// unavailable (jsdom / older environments).

import { useLayoutEffect, useRef } from 'react';
import { animate } from 'motion';
import { useReducedMotion } from './useReducedMotion';

export interface UseEntranceOptions {
  /** Delay before the entrance starts, in ms. Used for stagger. */
  delay?: number;
  /** Vertical distance (px) the element travels into place. */
  distance?: number;
  /** Disable the animation entirely (renders in final state). */
  enabled?: boolean;
}

export interface UseEntranceResult<T extends HTMLElement> {
  ref: React.RefObject<T>;
}

export function useEntrance<T extends HTMLElement = HTMLElement>(
  options: UseEntranceOptions = {},
): UseEntranceResult<T> {
  const { delay = 0, distance = 12, enabled = true } = options;
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    if (reducedMotion) {
      // Ensure final state is applied so styles don't linger from a previous render.
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      return;
    }

    // Set initial state immediately so first frame doesn't flash the final state.
    element.style.opacity = '0';
    element.style.transform = `translateY(${distance}px)`;

    let controls: { stop: () => void } | undefined;
    try {
      const startMs = delay > 0 ? delay : 0;
      // Schedule via a microtask so the initial styles paint first.
      const timer = setTimeout(() => {
        const a = animate(
          element,
          { opacity: [0, 1], transform: ['translateY(' + distance + 'px)', 'translateY(0px)'] },
          {
            type: 'spring',
            stiffness: 180,
            damping: 22,
            mass: 0.9,
          },
        );
        controls = { stop: () => a.stop?.() ?? a.cancel?.() };
      }, startMs);

      return () => {
        clearTimeout(timer);
        controls?.stop();
      };
    } catch {
      // Animation failed — leave the element in its final visible state.
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }
  }, [reducedMotion, delay, distance, enabled]);

  return { ref };
}

export default useEntrance;
