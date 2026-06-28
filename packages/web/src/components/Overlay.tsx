import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Variant of the overlay, controlling its enter/exit animation geometry:
 * - `modal`  — centered dialog, fade + scale.
 * - `sheet`  — bottom sheet, translateY slide.
 * - `drawer` — side drawer, translateX slide.
 */
export type OverlayVariant = 'modal' | 'sheet' | 'drawer';

export interface OverlayProps {
  /** Whether the overlay is open. */
  open: boolean;
  /** Existing close behavior, invoked on scrim click and Escape (R25.10). */
  onClose: () => void;
  /** Visual + motion variant. */
  variant: OverlayVariant;
  /** id of the element labelling the dialog (aria-labelledby). */
  labelledBy?: string;
  children: React.ReactNode;
}

/** Selector matching elements that can receive keyboard focus. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  'audio[controls]',
  'video[controls]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Reads the numeric value of a `--motion-*` CSS token in milliseconds. */
function readMotionDurationMs(token: string): number {
  if (typeof window === 'undefined' || !document.documentElement) {
    return 0;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw) return 0;
  if (raw.endsWith('ms')) return parseFloat(raw) || 0;
  if (raw.endsWith('s')) return (parseFloat(raw) || 0) * 1000;
  return parseFloat(raw) || 0;
}

/** Reads a CSS easing token, falling back to a sensible default. */
function readEasing(token: string, fallback: string): string {
  if (typeof window === 'undefined' || !document.documentElement) {
    return fallback;
  }
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

/**
 * Per-variant enter keyframes (from hidden → visible). Exit reverses these.
 * Compositor-friendly: only `transform` and `opacity` are animated (R8.2).
 */
function enterKeyframes(variant: OverlayVariant): Keyframe[] {
  switch (variant) {
    case 'modal':
      return [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'scale(1)' },
      ];
    case 'sheet':
      return [
        { opacity: 0, transform: 'translateY(100%)' },
        { opacity: 1, transform: 'translateY(0)' },
      ];
    case 'drawer':
      return [
        { opacity: 0, transform: 'translateX(-100%)' },
        { opacity: 1, transform: 'translateX(0)' },
      ];
  }
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Accessible overlay primitive backing modals, bottom sheets, and drawers.
 *
 * Responsibilities (design.md "Overlay / focus-trap primitive"):
 * - Portal render + scrim using `--color-scrim` at low alpha.
 * - WAAPI enter/exit on transform/opacity within `--motion-overlay`
 *   (modal: fade+scale; sheet: translateY; drawer: translateX). Instant under
 *   reduced motion, with focus behavior unchanged (R25.3, R25.4, R25.5, R24.2).
 * - Focus management: capture the previously focused element on open, move
 *   focus into the overlay, trap Tab/Shift+Tab while open, and return focus on
 *   close (R25.8, R25.9, R25.11).
 * - Escape calls the passed `onClose` (R25.10).
 */
export function Overlay({ open, onClose, variant, labelledBy, children }: OverlayProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const closingAnimation = useRef<Animation | null>(null);

  // `mounted` keeps the overlay in the DOM through its exit animation so the
  // close transition can play before unmount.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  // --- Enter: animate in + capture/move focus -----------------------------
  useLayoutEffect(() => {
    if (!open || !mounted) return;
    const container = containerRef.current;
    const scrim = scrimRef.current;
    if (!container) return;

    // Cancel any in-flight closing animation if reopened mid-exit.
    closingAnimation.current?.cancel();
    closingAnimation.current = null;

    // Capture the element to restore focus to on close (R25.9).
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const duration = reducedMotion ? 0 : readMotionDurationMs('--motion-overlay');
    const easing = readEasing('--ease-overlay', 'cubic-bezier(0.32, 0.72, 0, 1)');

    if (duration > 0 && typeof container.animate === 'function') {
      container.animate(enterKeyframes(variant), { duration, easing, fill: 'none' });
      scrim?.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing, fill: 'none' });
    }

    // Move focus into the overlay: first focusable, else the container (R25.8).
    const focusables = getFocusable(container);
    const target = focusables[0] ?? container;
    target.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  // --- Exit: animate out, then unmount + restore focus --------------------
  useEffect(() => {
    if (open || !mounted) return;
    const container = containerRef.current;
    const scrim = scrimRef.current;

    const restoreFocus = () => {
      previouslyFocused.current?.focus?.();
      previouslyFocused.current = null;
    };

    const duration = reducedMotion ? 0 : readMotionDurationMs('--motion-overlay');
    const easing = readEasing('--ease-overlay', 'cubic-bezier(0.32, 0.72, 0, 1)');

    if (container && duration > 0 && typeof container.animate === 'function') {
      const anim = container.animate(enterKeyframes(variant), {
        duration,
        easing,
        fill: 'none',
        direction: 'reverse',
      });
      scrim?.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing, fill: 'none' });
      closingAnimation.current = anim;
      anim.onfinish = () => {
        closingAnimation.current = null;
        setMounted(false);
        restoreFocus();
      };
      anim.oncancel = () => {
        closingAnimation.current = null;
      };
    } else {
      setMounted(false);
      restoreFocus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  // --- Body scroll lock while open ----------------------------------------
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // --- Keyboard: Escape to close + Tab focus trap (R25.10, R25.11) --------
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;
      const focusables = getFocusable(container);

      // Nothing focusable: keep focus on the container.
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === container || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const positionClass =
    variant === 'sheet'
      ? 'absolute left-0 right-0 bottom-0'
      : variant === 'drawer'
        ? 'absolute left-0 top-0 bottom-0'
        : 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';

  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={scrimRef}
        className="absolute inset-0"
        style={{ backgroundColor: 'rgb(var(--color-scrim) / 0.45)' }}
        aria-hidden="true"
        onClick={onClose}
      />
      <div ref={containerRef} className={positionClass} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Overlay;
