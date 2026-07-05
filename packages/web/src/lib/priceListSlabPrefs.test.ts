import { describe, expect, it } from 'vitest';
import { isQuantityBelowMoq } from '../lib/priceListPricing';
import {
  emptyPriceListSlabPrefs,
  parsePriceListSlabPrefs,
  serializePriceListSlabPrefs,
} from '../preferences/priceListSlabPrefs';

describe('isQuantityBelowMoq', () => {
  it('flags qty below MOQ without blocking math', () => {
    expect(isQuantityBelowMoq(50, 100)).toBe(true);
    expect(isQuantityBelowMoq(100, 100)).toBe(false);
    expect(isQuantityBelowMoq(150, 100)).toBe(false);
  });

  it('ignores missing MOQ', () => {
    expect(isQuantityBelowMoq(50, null)).toBe(false);
    expect(isQuantityBelowMoq(null, 100)).toBe(false);
  });
});

describe('priceListSlabPrefs', () => {
  it('round-trips by unit', () => {
    const prefs = {
      ...emptyPriceListSlabPrefs(),
      byUnit: { kpcs: [5, 10, 25], kg: [500, 1000] },
    };
    const raw = serializePriceListSlabPrefs(prefs);
    expect(parsePriceListSlabPrefs(raw)).toEqual(prefs);
  });

  it('rejects invalid payload', () => {
    expect(parsePriceListSlabPrefs('not-json')).toBeNull();
    expect(parsePriceListSlabPrefs(JSON.stringify({ v: 99 }))).toBeNull();
  });
});
