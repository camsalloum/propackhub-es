import { useEffect, useState } from 'react';

/**
 * Media query that reports whether the user has requested reduced motion at
 * the operating-system level.
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Safely reads the current `prefers-reduced-motion` value.
 *
 * Guards for SSR / jsdom environments where `window` or `matchMedia` may be
 * unavailable, defaulting to `false` (no reduced motion) so the app renders
 * with full motion rather than crashing (Requirement 7.1).
 */
function getReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Keeps `document.documentElement.dataset.reducedMotion` in sync with the
 * resolved preference so the CSS mechanism
 * (`:root[data-reduced-motion="true"]`) zeroes the motion tokens.
 *
 * Setting/removing the attribute lets a runtime change apply within 1s without
 * a reload (Requirement 7.2).
 */
function syncReducedMotionAttribute(reduced: boolean): void {
  if (typeof document === 'undefined' || !document.documentElement) {
    return;
  }
  if (reduced) {
    document.documentElement.dataset.reducedMotion = 'true';
  } else {
    delete document.documentElement.dataset.reducedMotion;
  }
}

/**
 * Subscribes to the operating-system `prefers-reduced-motion` setting and
 * returns whether reduced motion is currently requested.
 *
 * On mount and on every change it also toggles
 * `document.documentElement.dataset.reducedMotion`, keeping the CSS-driven
 * motion-token zeroing in sync so a runtime preference change applies within
 * 1 second without a page reload (Requirements 7.1, 7.2).
 *
 * Safe to call in SSR / jsdom environments: when `window.matchMedia` is
 * unavailable it defaults to `false`.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(getReducedMotionPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    // Reconcile in case the preference changed between the initial render and
    // the effect running, then keep the DOM attribute in sync on mount.
    setReducedMotion(mediaQuery.matches);
    syncReducedMotionAttribute(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = event.matches;
      setReducedMotion(matches);
      syncReducedMotionAttribute(matches);
    };

    // Modern engines expose addEventListener; older ones (and some WebViews)
    // only expose the deprecated addListener/removeListener pair.
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return reducedMotion;
}

export default useReducedMotion;
