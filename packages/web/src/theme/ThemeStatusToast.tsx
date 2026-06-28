// Feature: es-ui-revamp — non-blocking Theme System status surface (Task 10.3).
//
// Surfaces the Theme System `ThemeStatus` (from the ThemeProvider context) as a
// lightweight, theme-aware, NON-BLOCKING transient toast. It never blocks
// interaction: the fixed positioning layer is `pointer-events-none`, and only the
// toast card itself re-enables pointer events for its dismiss button. The toast
// auto-dismisses after a few seconds and can also be dismissed manually.
//
// All styling is token-backed (surface/border/text/state tokens + radius +
// elevation + motion duration/easing tokens), so it re-themes on a theme swap and
// honors reduced-motion automatically (the motion-* duration tokens are zeroed by
// the global reduced-motion CSS — no JS branch required).
//
// The pure `describeThemeStatus` helper is exported so the same wording/tone can
// drive an inline indicator (e.g. in the Settings switcher) — see `ThemeStatusInline`.
//
// Statuses surfaced (per design "Error Handling"):
//   - fallback (read-failed / invalid-value / no-themes) → R4.4, R4.5, R3.7
//   - apply-error                                        → R2.5, R3.6
//   - persist-error                                      → R4.6, R23.8
//   - ok                                                 → nothing shown
//
// _Requirements: 2.5, 3.6, 4.6, 23.8_

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ThemeStatus } from './types';
import { useTheme } from './ThemeProvider';

/** How long a status toast stays on screen before auto-dismissing (ms). */
const AUTO_DISMISS_MS = 6000;

/** Tone drives the accent color (state token) used for the toast/indicator. */
export type ThemeStatusTone = 'warning' | 'error';

/** A user-facing description of a non-ok {@link ThemeStatus}. */
export interface ThemeStatusDescription {
  tone: ThemeStatusTone;
  title: string;
  message: string;
}

/**
 * Map a {@link ThemeStatus} to user-facing copy + tone, or `null` when there is
 * nothing to surface (the happy path / `ok`). Pure and side-effect free so it can
 * back both the transient toast and an inline indicator.
 */
export function describeThemeStatus(status: ThemeStatus): ThemeStatusDescription | null {
  switch (status.state) {
    case 'ok':
      return null;
    case 'fallback':
      switch (status.reason) {
        case 'read-failed':
          return {
            tone: 'warning',
            title: 'Using the default theme',
            message: "We couldn't load your saved theme, so the default is applied for now.",
          };
        case 'invalid-value':
          return {
            tone: 'warning',
            title: 'Using the default theme',
            message: "Your saved theme wasn't recognized, so we switched to the default.",
          };
        case 'no-themes':
          return {
            tone: 'warning',
            title: 'No selectable themes',
            message: 'No themes are available to choose from, so the default is applied.',
          };
        default:
          return null;
      }
    case 'apply-error':
      return {
        tone: 'error',
        title: "Theme couldn't be applied",
        message: 'Your current theme was kept. Please try a different theme.',
      };
    case 'persist-error':
      return {
        tone: 'error',
        title: 'Selection not saved',
        message: "Your theme changed for this session but couldn't be saved for next time.",
      };
    default:
      return null;
  }
}

/** The state token (RGB-triplet CSS var) used to accent a given tone. */
function toneColorVar(tone: ThemeStatusTone): string {
  return tone === 'error' ? 'var(--color-danger, 192 57 43)' : 'var(--color-warning, 184 130 10)';
}

interface ToastEntry extends ThemeStatusDescription {
  /** Monotonic id so a repeated status (new object identity) re-triggers the toast. */
  id: number;
}

/**
 * App-wide, non-blocking Theme System status toast. Mount once near the top of the
 * tree, inside `ThemeProvider`. Renders nothing while the status is `ok`.
 */
export function ThemeStatusToast() {
  const { status } = useTheme();

  const [entry, setEntry] = useState<ToastEntry | null>(null);
  const [visible, setVisible] = useState(false);

  const idRef = useRef(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    dismissTimer.current = null;
    unmountTimer.current = null;
  };

  // React to status changes. The provider creates a fresh status object on every
  // update, so a repeated condition (e.g. two persist failures) re-runs this.
  useEffect(() => {
    const description = describeThemeStatus(status);

    clearTimers();

    if (!description) {
      // Status returned to ok → dismiss any visible toast.
      setVisible(false);
      return;
    }

    idRef.current += 1;
    setEntry({ ...description, id: idRef.current });
    setVisible(true);

    dismissTimer.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);

    return clearTimers;
  }, [status]);

  // When hidden, keep the node mounted briefly so the exit transition can play,
  // then unmount. A fixed cleanup window works in both normal and reduced-motion
  // modes (durations are token-zeroed under reduced motion).
  useEffect(() => {
    if (visible || entry === null) return;
    unmountTimer.current = setTimeout(() => setEntry(null), 300);
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, [visible, entry]);

  if (entry === null) return null;

  const accent = toneColorVar(entry.tone);

  // Token-backed styling. Motion uses the enter duration/easing tokens so it is
  // instant under reduced motion. The transform/opacity transition is compositor-
  // friendly per the Motion System rules.
  const cardStyle: CSSProperties = {
    backgroundColor: 'rgb(var(--color-surface-overlay, 255 255 255))',
    color: 'rgb(var(--color-text-primary, 26 29 35))',
    border: '1px solid rgb(var(--color-border, 226 228 232))',
    borderLeft: `4px solid rgb(${accent})`,
    borderRadius: 'var(--radius-lg, 0.75rem)',
    boxShadow: 'var(--elevation-3, 0 10px 25px rgba(0,0,0,0.15))',
    transition:
      'opacity var(--motion-enter, 280ms) var(--ease-enter, ease-out), transform var(--motion-enter, 280ms) var(--ease-enter, ease-out)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
  };

  return (
    // Non-blocking layer: it spans a corner region but ignores pointer events so it
    // can never intercept interaction with the app underneath.
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      aria-live={entry.tone === 'error' ? 'assertive' : 'polite'}
    >
      <div
        key={entry.id}
        role={entry.tone === 'error' ? 'alert' : 'status'}
        style={cardStyle}
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 px-4 py-3 font-sans"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 inline-block h-2.5 w-2.5 flex-none rounded-full"
          style={{ backgroundColor: `rgb(${accent})` }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{entry.title}</p>
          <p className="mt-0.5 text-sm" style={{ color: 'rgb(var(--color-text-secondary, 138 142 151))' }}>
            {entry.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-md text-lg leading-none focus:outline-none focus-visible:ring-2"
          style={{
            color: 'rgb(var(--color-text-secondary, 138 142 151))',
            // @ts-expect-error -- CSS custom prop for the focus ring color.
            '--tw-ring-color': 'rgb(var(--color-focus-ring, 200 150 42))',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Compact, inline Theme System status indicator. Suitable for placing next to the
 * Settings Theme_Switcher (R23.8 / R3.6). Renders nothing while the status is `ok`.
 */
export function ThemeStatusInline() {
  const { status } = useTheme();
  const description = describeThemeStatus(status);
  if (!description) return null;

  const accent = toneColorVar(description.tone);

  return (
    <p
      role={description.tone === 'error' ? 'alert' : 'status'}
      className="inline-flex items-center gap-2 text-sm font-sans"
      style={{ color: `rgb(${accent})` }}
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 flex-none rounded-full" style={{ backgroundColor: `rgb(${accent})` }} />
      <span>{description.message}</span>
    </p>
  );
}
