// Feature: es-ui-revamp — spring-physics hover for interactive cards.
//
// `useHoverSpring` returns a ref + event handlers that drive a card's transform
// via the `motion` library's `animate()` with a spring transition on hover and
// focus. The spring settles naturally instead of stepping through a fixed
// cubic-bezier — closer to physical materials.
//
// Returns `{ ref, hoverProps }`. Spread `hoverProps` onto an element to wire
// mouseenter/mouseleave/focus/blur in one go.

import { useCallback, useEffect, useRef } from 'react';
import { animate } from 'motion';
import { useReducedMotion } from './useReducedMotion';

export interface UseHoverSpringOptions {
  /** Vertical lift in pixels at peak hover. Default 4. */
  lift?: number;
  /** Scale at peak hover. Default 1 (no scale). */
  scale?: number;
}

export interface HoverSpringProps {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function useHoverSpring<T extends HTMLElement = HTMLElement>(
  options: UseHoverSpringOptions = {},
): { ref: React.RefObject<T>; hoverProps: HoverSpringProps } {
  const { lift = 4, scale = 1 } = options;
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();
  const currentAnimation = useRef<{ stop: () => void } | null>(null);

  // Cancel any in-flight spring on unmount.
  useEffect(() => {
    return () => {
      currentAnimation.current?.stop();
      currentAnimation.current = null;
    };
  }, []);

  const animateTo = useCallback(
    (y: number, s: number) => {
      const element = ref.current;
      if (!element) return;
      if (reducedMotion) {
        element.style.transform = `translateY(${y}px) scale(${s})`;
        return;
      }
      currentAnimation.current?.stop();
      try {
        const a = animate(
          element,
          { transform: `translateY(${y}px) scale(${s})` },
          { type: 'spring', stiffness: 320, damping: 26, mass: 0.7 },
        );
        currentAnimation.current = { stop: () => a.stop?.() ?? a.cancel?.() };
      } catch {
        element.style.transform = `translateY(${y}px) scale(${s})`;
      }
    },
    [reducedMotion],
  );

  const enter = useCallback(() => animateTo(-lift, scale), [animateTo, lift, scale]);
  const leave = useCallback(() => animateTo(0, 1), [animateTo]);

  return {
    ref,
    hoverProps: {
      onMouseEnter: enter,
      onMouseLeave: leave,
      onFocus: enter,
      onBlur: leave,
    },
  };
}

export default useHoverSpring;
