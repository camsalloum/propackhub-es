import { describe, expect, it } from 'vitest';
import {
  parseQuotePriceListDisplayPrefs,
  quotePriceListPrefsEqual,
  serializeQuotePriceListDisplayPrefs,
} from './quotePriceListPrefs';

describe('quotePriceListPrefs', () => {
  it('parses v1 prefs as v2', () => {
    const parsed = parseQuotePriceListDisplayPrefs({
      v: 1,
      unit: 'kpcs',
      currency: 'AED',
      slabMode: 'predefined',
      selectedBandKeys: ['1501:3000'],
      customSlabs: [5, 10],
    });
    expect(parsed?.v).toBe(2);
    expect(parsed?.unit).toBe('kpcs');
    expect(parsed?.currency).toBe('AED');
    expect(parsed?.selectedBandKeys).toEqual(['1501:3000']);
    expect(parsed?.customSlabs).toEqual([5, 10]);
  });

  it('normalizes legacy half rounding to step 0.5', () => {
    const parsed = parseQuotePriceListDisplayPrefs({
      v: 2,
      unit: 'kg',
      rounding: { enabled: true, mode: 'half', decimals: 2 },
    });
    expect(parsed?.rounding).toEqual({ enabled: true, mode: 'step', step: 0.5 });
  });

  it('parses step 0.05 rounding', () => {
    const parsed = parseQuotePriceListDisplayPrefs({
      v: 2,
      unit: 'kg',
      rounding: { enabled: true, mode: 'step', step: 0.05 },
    });
    expect(parsed?.rounding).toEqual({ enabled: true, mode: 'step', step: 0.05 });
  });

  it('rejects unknown version', () => {
    expect(parseQuotePriceListDisplayPrefs({ v: 99, unit: 'kg' })).toBeNull();
  });

  it('compares serialized prefs', () => {
    const a = serializeQuotePriceListDisplayPrefs({
      v: 2,
      unit: 'kg',
      slabMode: 'custom',
      customSlabs: [1000],
      rounding: { enabled: true, mode: 'step', step: 0.05 },
    });
    const b = serializeQuotePriceListDisplayPrefs({ ...a });
    expect(quotePriceListPrefsEqual(a, b)).toBe(true);
  });
});
