import { describe, expect, it } from 'vitest';
import {
  parseQuotePriceListDisplayPrefs,
  quotePriceListPrefsEqual,
  serializeQuotePriceListDisplayPrefs,
} from './quotePriceListPrefs';

describe('quotePriceListPrefs', () => {
  it('parses valid prefs', () => {
    const parsed = parseQuotePriceListDisplayPrefs({
      v: 1,
      unit: 'kpcs',
      currency: 'AED',
      slabMode: 'predefined',
      selectedBandKeys: ['1501:3000'],
      customSlabs: [5, 10],
    });
    expect(parsed?.unit).toBe('kpcs');
    expect(parsed?.currency).toBe('AED');
    expect(parsed?.selectedBandKeys).toEqual(['1501:3000']);
    expect(parsed?.customSlabs).toEqual([5, 10]);
  });

  it('rejects unknown version', () => {
    expect(parseQuotePriceListDisplayPrefs({ v: 2, unit: 'kg' })).toBeNull();
  });

  it('compares serialized prefs', () => {
    const a = serializeQuotePriceListDisplayPrefs({
      v: 1,
      unit: 'kg',
      slabMode: 'custom',
      customSlabs: [1000],
    });
    const b = serializeQuotePriceListDisplayPrefs({ ...a });
    expect(quotePriceListPrefsEqual(a, b)).toBe(true);
  });
});
