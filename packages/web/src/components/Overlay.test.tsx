// Feature: es-ui-revamp, Property 6: Open overlays confine keyboard focus.
//
// For an open overlay and any sequence of Tab / Shift+Tab key events, the active
// element remains one of the overlay's focusable descendants — focus never
// escapes behind the overlay — and every control stays keyboard-reachable.
// Plus unit coverage for return-focus on close (R25.9) and Escape close (R25.10).

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { Overlay } from './Overlay';

// jsdom does not compute layout, so `offsetParent` is always null — which makes
// the overlay's visibility filter treat every control as hidden. Shim it to the
// element's parent so the focus-trap behaves as it would in a real browser.
let offsetParentDescriptor: PropertyDescriptor | undefined;
beforeAll(() => {
  offsetParentDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent',
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.parentNode;
    },
  });
});
afterAll(() => {
  if (offsetParentDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParentDescriptor);
  }
});

function OverlayHarness({ onClose }: { onClose: () => void }) {
  return (
    <Overlay open onClose={onClose} variant="modal" labelledBy="t">
      <div>
        <h2 id="t">Title</h2>
        <button type="button">First</button>
        <button type="button">Second</button>
        <button type="button">Third</button>
      </div>
    </Overlay>
  );
}

describe('Overlay — Property 6: focus containment', () => {
  it('moves focus into the overlay on open', () => {
    const { getByText } = render(<OverlayHarness onClose={() => {}} />);
    const first = getByText('First');
    expect(document.activeElement).toBe(first);
  });

  it('keeps focus inside the overlay across many Tab / Shift+Tab events', () => {
    const { getByRole, getByText } = render(<OverlayHarness onClose={() => {}} />);
    const dialog = getByRole('dialog');
    const buttons = [getByText('First'), getByText('Second'), getByText('Third')];

    // Random-ish but deterministic sequence of Tab / Shift+Tab.
    const seq = [false, false, false, true, true, false, true, false, false, true];
    for (const shift of seq) {
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: shift });
      // After every event the active element must be one of the overlay's controls.
      expect(buttons).toContain(document.activeElement);
    }
  });

  it('wraps from last → first on Tab and first → last on Shift+Tab', () => {
    const { getByRole, getByText } = render(<OverlayHarness onClose={() => {}} />);
    const dialog = getByRole('dialog');
    const first = getByText('First');
    const last = getByText('Third');

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('Escape invokes the passed onClose (R25.10)', () => {
    const onClose = vi.fn();
    const { getByRole } = render(<OverlayHarness onClose={onClose} />);
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the previously focused trigger on close (R25.9)', () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Trigger
          </button>
          <Overlay open={open} onClose={() => setOpen(false)} variant="modal">
            <button type="button">Inside</button>
          </Overlay>
        </div>
      );
    }

    const { getByText } = render(<Wrapper />);
    const trigger = getByText('Trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    act(() => {
      fireEvent.click(trigger);
    });
    // Focus moved into the overlay.
    expect(document.activeElement).toBe(getByText('Inside'));

    // Close via Escape; with no WAAPI in jsdom the exit path restores focus synchronously.
    act(() => {
      fireEvent.keyDown(getByText('Inside'), { key: 'Escape' });
    });
    expect(document.activeElement).toBe(trigger);
  });
});
