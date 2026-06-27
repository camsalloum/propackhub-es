import { describe, it, expect } from 'vitest';
import { convertOrderQuantityToKg } from './unit-conversion';

const metrics = {
  piecesPerKg: 100, // 100 pieces per kg
  sqmPerKg: 20, // 20 m² per kg
  linearMPerKgWeb: 50, // 50 m per kg (web)
  linearMPerKgReel: 40, // 40 m per kg (reel)
};

describe('unit-conversion — convertOrderQuantityToKg', () => {
  it('kgs: passthrough', () => {
    expect(convertOrderQuantityToKg(1000, 'kgs', metrics)).toBe(1000);
  });

  it('undefined/empty unit: passthrough (defaults to kgs)', () => {
    expect(convertOrderQuantityToKg(1000, undefined, metrics)).toBe(1000);
    expect(convertOrderQuantityToKg(1000, '', metrics)).toBe(1000);
    expect(convertOrderQuantityToKg(1000, null, metrics)).toBe(1000);
  });

  it('kpcs: kg = (qty × 1000) / piecesPerKg', () => {
    // 10 kpcs = 10,000 pieces; at 100 pcs/kg → 100 kg
    expect(convertOrderQuantityToKg(10, 'kpcs', metrics)).toBeCloseTo(100, 6);
  });

  it('sqm: kg = qty / sqmPerKg', () => {
    // 2000 sqm / 20 = 100 kg
    expect(convertOrderQuantityToKg(2000, 'sqm', metrics)).toBeCloseTo(100, 6);
  });

  it('lm: kg = qty / linearMPerKgWeb', () => {
    // 5000 lm / 50 = 100 kg
    expect(convertOrderQuantityToKg(5000, 'lm', metrics)).toBeCloseTo(100, 6);
  });

  it('roll_500_lm: kg = (qty × 500) / linearMPerKgReel', () => {
    // 8 rolls × 500 = 4000 m; 4000 / 40 = 100 kg
    expect(convertOrderQuantityToKg(8, 'roll_500_lm', metrics)).toBeCloseTo(100, 6);
  });

  it('returns 0 for non-positive quantity', () => {
    expect(convertOrderQuantityToKg(0, 'kgs', metrics)).toBe(0);
    expect(convertOrderQuantityToKg(-5, 'kgs', metrics)).toBe(0);
    expect(convertOrderQuantityToKg(NaN, 'kgs', metrics)).toBe(0);
  });

  it('returns 0 when required metric is zero (avoid div-by-zero)', () => {
    expect(convertOrderQuantityToKg(10, 'kpcs', { ...metrics, piecesPerKg: 0 })).toBe(0);
    expect(convertOrderQuantityToKg(2000, 'sqm', { ...metrics, sqmPerKg: 0 })).toBe(0);
    expect(convertOrderQuantityToKg(5000, 'lm', { ...metrics, linearMPerKgWeb: 0 })).toBe(0);
    expect(convertOrderQuantityToKg(8, 'roll_500_lm', { ...metrics, linearMPerKgReel: 0 })).toBe(0);
  });

  it('unknown unit: passthrough (does not zero the order)', () => {
    expect(convertOrderQuantityToKg(750, 'unknown_unit', metrics)).toBe(750);
  });
});