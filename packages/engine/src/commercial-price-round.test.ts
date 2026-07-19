import { describe, expect, it } from 'vitest';
import {
  formatCommercialPrice,
  quotationPageOrientation,
  roundCommercialPrice,
  roundToHalf,
  roundToStep,
} from './commercial-price-round';

describe('roundToStep 0.05', () => {
  it('rounds to nearest 0.05 (nickel)', () => {
    expect(roundToStep(5.73, 0.05)).toBe(5.75);
    expect(roundToStep(5.38, 0.05)).toBe(5.4);
    expect(roundToStep(5.03, 0.05)).toBe(5.05);
    expect(roundToStep(4.61, 0.05)).toBe(4.6);
    expect(roundToStep(4.63, 0.05)).toBe(4.65);
    expect(roundToStep(4.625, 0.05)).toBe(4.65);
  });
});

describe('roundToHalf', () => {
  it('rounds to nearest 0 or 0.5', () => {
    expect(roundToHalf(12.24)).toBe(12);
    expect(roundToHalf(12.26)).toBe(12.5);
    expect(roundToHalf(12.74)).toBe(12.5);
    expect(roundToHalf(12.76)).toBe(13);
  });
});

describe('roundCommercialPrice', () => {
  it('passes through when disabled', () => {
    expect(
      roundCommercialPrice(12.345, { enabled: false, mode: 'step', step: 0.05 })
    ).toBe(12.345);
  });

  it('applies 0.05 step', () => {
    expect(
      roundCommercialPrice(5.73, { enabled: true, mode: 'step', step: 0.05 })
    ).toBe(5.75);
    expect(
      roundCommercialPrice(4.61, { enabled: true, mode: 'step', step: 0.05 })
    ).toBe(4.6);
  });

  it('maps legacy half mode', () => {
    expect(roundCommercialPrice(12.26, { enabled: true, mode: 'half' })).toBe(12.5);
  });
});

describe('formatCommercialPrice', () => {
  it('formats 0.05 step with 2 decimals', () => {
    expect(
      formatCommercialPrice(5.73, { enabled: true, mode: 'step', step: 0.05 })
    ).toBe('5.75');
    expect(
      formatCommercialPrice(4.61, { enabled: true, mode: 'step', step: 0.05 })
    ).toBe('4.60');
    expect(
      formatCommercialPrice(5.38, { enabled: true, mode: 'step', step: 0.05 })
    ).toBe('5.40');
  });
});

describe('quotationPageOrientation', () => {
  it('portrait for 1–4 columns, landscape for 5+', () => {
    expect(quotationPageOrientation(1)).toBe('portrait');
    expect(quotationPageOrientation(4)).toBe('portrait');
    expect(quotationPageOrientation(5)).toBe('landscape');
    expect(quotationPageOrientation(6)).toBe('landscape');
  });
});
