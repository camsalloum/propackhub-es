import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure the DOM is reset between tests to avoid cross-test leakage.
afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia. The Theme/Motion systems rely on it
// (prefers-color-scheme, prefers-reduced-motion), so provide a polyfill that
// returns a non-matching, fully-shaped MediaQueryList by default.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}
