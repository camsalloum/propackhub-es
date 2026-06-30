import type { FocusEvent } from 'react';

/**
 * Select the entire contents of a number/text input when it receives focus.
 *
 * RULE (app-wide UX): numeric inputs that carry a default value (often `0`)
 * MUST select-on-focus so the user can type a value immediately instead of
 * manually deleting the default first. Attach via `onFocus={selectOnFocus}`.
 *
 * Uses requestAnimationFrame because some browsers (and the number spinner)
 * place the caret after the native focus handler runs; selecting on the next
 * frame makes the highlight reliable.
 */
export function selectOnFocus(e: FocusEvent<HTMLInputElement>): void {
  const el = e.currentTarget;
  // `select()` is unsupported on some input types (e.g. number in older engines);
  // guard so we never throw inside an event handler.
  if (typeof el.select !== 'function') return;
  requestAnimationFrame(() => {
    try {
      el.select();
    } catch {
      /* no-op — selection is a nice-to-have, never fatal */
    }
  });
}
