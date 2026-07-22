import { describe, expect, it } from 'vitest';
import {
  customSlabRangeLabels,
  formatCustomSlabRange,
  formatPredefinedSlabRange,
  predefinedSlabLabels,
  pickUnitConversionInput,
} from './priceListPricing';

describe('predefined slab labels in selected unit', () => {
  const conversion = {
    totalGsm: 50,
    piecesPerKg: 20,
    lmPerKgReel: 10,
    reelWidthMm: 800,
    rollLengthLm: 1000,
  };

  const band = { minKg: 1501, maxKg: 3000, wastePercent: 5 };

  it('formats kg bands as kpcs when unit is kpcs (rounded)', () => {
    const label = formatPredefinedSlabRange(band, 'kpcs', conversion);
    expect(label).toBe('30 – 60');
  });

  it('keeps kg ranges when unit is kg', () => {
    const label = formatPredefinedSlabRange(band, 'kg', conversion);
    expect(label).toBe('1,501 – 3,000');
  });

  it('predefinedSlabLabels falls back to kg suffix without unit', () => {
    const labels = predefinedSlabLabels([band], '', conversion);
    expect(labels[0]).toContain('kg');
  });

  it('rounds fractional slab ranges', () => {
    const label = formatPredefinedSlabRange(
      { minKg: 1000, maxKg: 2000, wastePercent: 3 },
      'kpcs',
      { totalGsm: 50, piecesPerKg: 21.37, lmPerKgReel: null, reelWidthMm: 800, rollLengthLm: 0 }
    );
    expect(label).not.toMatch(/\.\d/);
  });

  it('pickUnitConversionInput passes through structure fields', () => {
    expect(pickUnitConversionInput({ ...conversion, wasteBands: [] } as never)).toEqual(conversion);
  });
});

describe('custom slab range labels', () => {
  it('formats derived ranges with spaced en dash', () => {
    expect(formatCustomSlabRange(0, 1000)).toBe('0 – 1,000');
    expect(formatCustomSlabRange(1001, 2000)).toBe('1,001 – 2,000');
  });

  it('labels breakpoints as contiguous bands from 0', () => {
    expect(customSlabRangeLabels([1000, 2000, 3000, 4000, 5000])).toEqual([
      '0 – 1,000',
      '1,001 – 2,000',
      '2,001 – 3,000',
      '3,001 – 4,000',
      '4,001 – 5,000',
    ]);
  });
});
