// Feature: es-ui-revamp (Phase 1.5) — View Transitions API navigation wrapper.
//
// React Router 6 doesn't yet expose `unstable_viewTransition` on <Link>, so we
// wrap `useNavigate` with `document.startViewTransition` directly. This gives
// us the browser-native cross-fade between routes — handled on the compositor
// by the browser — with the actual animation styled in `index.css` under the
// `::view-transition-old(root)` / `::view-transition-new(root)` pseudos.
//
// Behaviour:
//   - When the API is unavailable (older browsers, jsdom): falls back to a
//     plain navigation. No throw, no flash.
//   - Under reduced motion: the CSS already disables the pseudo-element
//     animations, so the transition is instant.
//   - For shared-element transitions (list row → detail header), components
//     can opt-in by setting `style={{ viewTransitionName: 'estimate-{id}' }}`
//     on the source and the destination; the browser handles the morph.

import { useCallback } from 'react';
import { type NavigateOptions, type To, useNavigate } from 'react-router-dom';

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
};

/**
 * Navigate with a View Transition when the browser supports it; otherwise
 * fall back to plain navigation. Same signature as `useNavigate()` for drop-in
 * replacement on links that should animate (lists → detail, etc.).
 */
export function useViewTransition() {
  const navigate = useNavigate();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      const doc =
        typeof document !== 'undefined' ? (document as DocumentWithViewTransition) : null;
      if (doc && typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => {
          navigate(to, options);
        });
        return;
      }
      navigate(to, options);
    },
    [navigate],
  );
}

export default useViewTransition;
