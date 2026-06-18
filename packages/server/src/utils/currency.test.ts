import { describe, it, expect } from 'vitest';
import { usdToDisplay } from './currency';

describe('currency utils', () => {
  it('converts USD to display currency using rate', () => {
    expect(usdToDisplay(1, 3.6725)).toBeCloseTo(3.6725, 4);
    expect(usdToDisplay(10, 3.6725)).toBeCloseTo(36.725, 3);
  });

  it('falls back to 1 when rate is invalid', () => {
    expect(usdToDisplay(5, 0)).toBe(5);
    expect(usdToDisplay(5, -1)).toBe(5);
  });
});
