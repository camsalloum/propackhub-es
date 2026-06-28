// Feature: es-ui-revamp — swipe-to-dismiss gesture for bottom sheets.
//
// `useSwipeToDismiss` wires pointer events on a target element to track vertical
// drag and either snap back to its resting state (via motion spring) or call
// `onDismiss` when the user drags past a threshold (default ~40% of the
// element's height, or velocity ≥ 0.5 px/ms).
//
// Compositor-friendly (only animates `transform`). Pointer Events API works
// across mouse/touch/pen seamlessly.

import { useCallback, useEffect, useRef } from 'react';
import { animate } from 'motion';
import { useReducedMotion } from './useReducedMotion';

export interface UseSwipeToDismissOptions {
  /** Threshold in pixels OR fraction of element height after which dismiss fires. */
  dismissThreshold?: number;
  /** Velocity (px/ms) above which dismiss fires regardless of distance. */
  velocityThreshold?: number;
  /** Called when the user drags past threshold or releases above velocity. */
  onDismiss: () => void;
}

export function useSwipeToDismiss<T extends HTMLElement = HTMLElement>(
  options: UseSwipeToDismissOptions,
): { ref: React.RefObject<T> } {
  const { dismissThreshold = 0.35, velocityThreshold = 0.5, onDismiss } = options;
  const ref = useRef<T>(null);
  const reducedMotion = useReducedMotion();

  const startY = useRef(0);
  const startT = useRef(0);
  const currentY = useRef(0);
  const dragging = useRef(false);
  const animationRef = useRef<{ stop: () => void } | null>(null);

  const settle = useCallback(
    (y: number) => {
      const el = ref.current;
      if (!el) return;
      if (reducedMotion) {
        el.style.transform = `translateY(${y}px)`;
        return;
      }
      animationRef.current?.stop();
      try {
        const a = animate(
          el,
          { transform: `translateY(${y}px)` },
          { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
        );
        animationRef.current = { stop: () => a.stop?.() ?? a.cancel?.() };
      } catch {
        el.style.transform = `translateY(${y}px)`;
      }
    },
    [reducedMotion],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      // Only react to primary button / single-touch.
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      startY.current = e.clientY;
      startT.current = performance.now();
      currentY.current = 0;
      dragging.current = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      animationRef.current?.stop();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dy = e.clientY - startY.current;
      // Only allow downward drag (positive dy). Upward drag clamps to 0.
      const y = Math.max(0, dy);
      currentY.current = y;
      // Apply transform directly during drag for snappy 1:1 feedback.
      el.style.transform = `translateY(${y}px)`;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}

      const dt = Math.max(1, performance.now() - startT.current);
      const velocity = currentY.current / dt; // px/ms
      const h = el.getBoundingClientRect().height;
      const distanceThreshold = dismissThreshold < 1 ? h * dismissThreshold : dismissThreshold;
      const shouldDismiss = currentY.current >= distanceThreshold || velocity >= velocityThreshold;

      if (shouldDismiss) {
        // Slide the rest of the way off-screen, then call onDismiss.
        if (reducedMotion) {
          onDismiss();
        } else {
          try {
            const a = animate(
              el,
              { transform: `translateY(${h + 40}px)` },
              { type: 'spring', stiffness: 220, damping: 30, mass: 0.7 },
            );
            animationRef.current = { stop: () => a.stop?.() ?? a.cancel?.() };
            const sub = a.finished?.then?.(() => onDismiss())
              ?? Promise.resolve().then(() => setTimeout(onDismiss, 240));
            void sub;
          } catch {
            onDismiss();
          }
        }
      } else {
        // Spring back to resting position.
        settle(0);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      animationRef.current?.stop();
    };
  }, [dismissThreshold, velocityThreshold, onDismiss, reducedMotion, settle]);

  return { ref };
}

export default useSwipeToDismiss;
