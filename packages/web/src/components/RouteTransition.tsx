// Feature: es-ui-revamp — routed-content cross-fade wrapper.
//
// `RouteTransition` wraps the routed content (the React Router `<Outlet/>`) and
// cross-fades it whenever the active route changes, timed by the token-defined
// `--motion-page` duration and `--ease-page` easing (design.md → Motion System;
// Requirement 6.3). It is intended to wrap the routed content in the main area
// of `components/Layout.tsx` — that wiring happens in task 18.1; this task only
// provides the self-contained, exported primitive.
//
// Design constraints honoured here:
//   - Keyed on `location.pathname`: changing the key remounts the inner wrapper
//     on every navigation, so the entrance fade re-runs for the new page.
//   - Compositor-only: animates ONLY `opacity` (R8.2) so the transition stays on
//     the GPU compositor and never triggers layout.
//   - Reduced-motion aware: when `useReducedMotion()` reports true, the wrapper
//     renders the new content instantly with no animation (R6.6, R7.3). The CSS
//     token mechanism also zeroes `--motion-page`, but short-circuiting in JS
//     avoids scheduling a zero-duration WAAPI animation at all.
//   - jsdom / SSR safe: feature-detects `Element.prototype.animate`; when it is
//     unavailable the wrapper no-ops, leaving content in its final visible state.
//   - Failure safe: any error initialising the animation is swallowed and the
//     content is left fully visible and interactive (R6.7).
//   - Token-driven: reads `--motion-page` / `--ease-page` from the element's
//     computed style so a single CSS change re-times every page transition (R6.4).

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Fallback page-transition duration (ms) matching `--motion-page` in `index.css`. */
const DEFAULT_PAGE_DURATION_MS = 320;
/** Fallback easing matching `--ease-page` in `index.css`. */
const DEFAULT_PAGE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

export interface RouteTransitionProps {
  /**
   * Content to cross-fade on route change. Defaults to the React Router
   * `<Outlet/>`, which renders the matched child route. Accepting children
   * keeps the wrapper testable and reusable outside a router `<Outlet/>`.
   */
  children?: ReactNode;
}

/**
 * Reads a CSS time custom property (e.g. `--motion-page`) from an element's
 * computed style and returns it in milliseconds. Returns `fallback` when the
 * value is missing/unparseable or when `getComputedStyle` is unavailable
 * (jsdom / SSR).
 */
function readDurationMs(element: Element, property: string, fallback: number): number {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return fallback;
  }
  const raw = window.getComputedStyle(element).getPropertyValue(property).trim();
  if (!raw) {
    return fallback;
  }
  // Accept either `320ms` or `0.32s`.
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
 * Reads a CSS custom property string (e.g. `--ease-page`) from an element's
 * computed style, returning `fallback` when unavailable.
 */
function readString(element: Element, property: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return fallback;
  }
  const raw = window.getComputedStyle(element).getPropertyValue(property).trim();
  return raw || fallback;
}

/**
 * Cross-fades the routed content within the `--motion-page` token duration on
 * each route change, rendering instantly when reduced motion is active.
 *
 * @example
 * // In Layout's main area (wired in task 18.1):
 * <main>
 *   <RouteTransition />
 * </main>
 */
export function RouteTransition({ children }: RouteTransitionProps): JSX.Element {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // useLayoutEffect so the initial (opacity:0) frame is committed before the
  // browser paints the new page, avoiding a flash of fully-opaque content.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    // Reduced motion or no WAAPI (jsdom/SSR): leave the content fully visible
    // and interactive. Nothing to clean up.
    if (reducedMotion || typeof element.animate !== 'function') {
      return;
    }

    let animation: Animation | undefined;
    try {
      const duration = readDurationMs(element, '--motion-page', DEFAULT_PAGE_DURATION_MS);
      const easing = readString(element, '--ease-page', DEFAULT_PAGE_EASING);

      // A zero (or negative) duration means page motion is effectively disabled
      // (e.g. the reduced-motion CSS override). Skip animating.
      if (duration <= 0) {
        return;
      }

      animation = element.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration,
          easing,
          // `both` keeps the start (opacity:0) applied before the first frame
          // and the end state applied after finishing.
          fill: 'both',
        },
      );
    } catch {
      // R6.7: if the animation fails to initialise, render the final state with
      // interactivity preserved — there is nothing to undo.
      return;
    }

    return () => {
      // Cancel an in-flight fade on unmount/re-run so the element snaps to its
      // natural (fully visible) state rather than retaining a paused frame.
      animation?.cancel();
    };
  }, [location.pathname, reducedMotion]);

  return (
    // Keying on the pathname remounts this wrapper on every navigation so the
    // entrance fade re-runs for the freshly-matched route.
    <div ref={containerRef} key={location.pathname} data-route-transition="">
      {children ?? <Outlet />}
    </div>
  );
}

export default RouteTransition;
