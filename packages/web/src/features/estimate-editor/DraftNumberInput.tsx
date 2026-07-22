import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { selectOnFocus } from '../../lib/inputs';

export const DRAFT_NUMBER_LIVE_DEBOUNCE_MS = 250;

type DraftNumberInputProps = {
  value: number;
  onCommit: (n: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** Override debounce for tests. */
  liveDebounceMs?: number;
};

/** Round to 2 decimal places for commit + display. */
export function roundDraftNumber(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatDraftNumberDisplay(value: number): string {
  return Number.isFinite(value) ? roundDraftNumber(value).toFixed(2) : '';
}

/** Parse a draft string; returns null when incomplete / non-numeric (e.g. "" or "."). */
export function tryParseDraftNumber(
  raw: string,
  min?: number,
  max?: number,
): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return null;
  }
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) return null;
  let out = roundDraftNumber(n);
  if (min != null && out < min) out = min;
  if (max != null && out > max) out = max;
  return out;
}

export function parseDraftNumber(
  raw: string,
  fallback: number,
  min?: number,
  max?: number,
): number {
  return tryParseDraftNumber(raw, min, max) ?? roundDraftNumber(fallback);
}

/**
 * Controlled numeric field with local draft while focused.
 * - Live: debounced onCommit once the draft parses as a number (keeps cursor free).
 * - Blur / Enter: flush immediately from the DOM value, then clear draft (display x.xx).
 * - Native steppers via type=number step=0.01.
 */
export function DraftNumberInput({
  value,
  onCommit,
  className,
  min,
  max,
  step = 0.01,
  disabled,
  liveDebounceMs = DRAFT_NUMBER_LIVE_DEBOUNCE_MS,
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const valueRef = useRef(value);
  const onCommitRef = useRef(onCommit);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  valueRef.current = value;
  onCommitRef.current = onCommit;

  const clearTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const emitIfChanged = (n: number) => {
    const next = roundDraftNumber(n);
    if (next !== roundDraftNumber(valueRef.current)) onCommitRef.current(next);
  };

  const scheduleLive = (raw: string) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const parsed = tryParseDraftNumber(raw, min, max);
      if (parsed != null) emitIfChanged(parsed);
    }, liveDebounceMs);
  };

  const commitNow = (raw: string) => {
    clearTimer();
    const next = parseDraftNumber(raw, valueRef.current, min, max);
    setDraft(null);
    emitIfChanged(next);
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      className={`draft-number-input ${className ?? ''}`.trim()}
      disabled={disabled}
      value={draft ?? formatDraftNumberDisplay(value)}
      onFocus={(e: FocusEvent<HTMLInputElement>) => {
        setDraft(formatDraftNumberDisplay(value));
        selectOnFocus(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        scheduleLive(raw);
      }}
      onBlur={(e) => commitNow(e.currentTarget.value)}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
