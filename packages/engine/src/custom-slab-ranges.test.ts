import { describe, expect, it } from 'vitest';
import { customSlabRangesFromBreakpoints } from './custom-slab-ranges';

describe('customSlabRangesFromBreakpoints', () => {
  it('derives ranges from sorted breakpoints (first from 0)', () => {
    expect(customSlabRangesFromBreakpoints([1000, 2000, 3000, 4000, 5000])).toEqual([
      { qty: 1000, from: 0, to: 1000 },
      { qty: 2000, from: 1001, to: 2000 },
      { qty: 3000, from: 2001, to: 3000 },
      { qty: 4000, from: 3001, to: 4000 },
      { qty: 5000, from: 4001, to: 5000 },
    ]);
  });

  it('matches predefined band shape when filled from band maxKg', () => {
    expect(customSlabRangesFromBreakpoints([80, 150, 300, 600, 1500])).toEqual([
      { qty: 80, from: 0, to: 80 },
      { qty: 150, from: 81, to: 150 },
      { qty: 300, from: 151, to: 300 },
      { qty: 600, from: 301, to: 600 },
      { qty: 1500, from: 601, to: 1500 },
    ]);
  });

  it('dedupes, sorts, and drops non-positive', () => {
    expect(customSlabRangesFromBreakpoints([2000, 1000, 1000, 0, -5, NaN])).toEqual([
      { qty: 1000, from: 0, to: 1000 },
      { qty: 2000, from: 1001, to: 2000 },
    ]);
  });

  it('single breakpoint is 0–qty', () => {
    expect(customSlabRangesFromBreakpoints([500])).toEqual([
      { qty: 500, from: 0, to: 500 },
    ]);
  });
});
