import { describe, it, expect } from 'vitest';
import { convertOrderQuantityToKg, resolveUnitDef } from './unit-conversion';

const metrics = {
  piecesPerKg: 100, // 100 pieces per kg
  sqmPerKg: 20, // 20 m² per kg
  linearMPerKgWeb: 50, // 50 m per kg (web — MES only, not used for costing)
  linearMPerKgReel: 40, // 40 m per kg (reel — finished product width)
};

describe('unit-conversion — convertOrderQuantityToKg (legacy codes)', () => {
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

  it('lm: uses the finished (reel) width → kg = qty / linearMPerKgReel', () => {
    // 5000 lm / 40 (reel) = 125 kg  — NOT the web metric (50 → 100)
    expect(convertOrderQuantityToKg(5000, 'lm', metrics)).toBeCloseTo(125, 6);
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
    expect(convertOrderQuantityToKg(5000, 'lm', { ...metrics, linearMPerKgReel: 0 })).toBe(0);
    expect(convertOrderQuantityToKg(8, 'roll_500_lm', { ...metrics, linearMPerKgReel: 0 })).toBe(0);
  });

  it('unknown unit code: passthrough (does not zero the order)', () => {
    expect(convertOrderQuantityToKg(750, 'unknown_unit', metrics)).toBe(750);
  });
});

describe('unit-conversion — descriptor (basis + multiplier) units', () => {
  it('kg basis with multiplier (e.g. 1 MT = kg × 1000)', () => {
    // 5 MT × 1000 = 5000 kg
    expect(convertOrderQuantityToKg(5, { basis: 'kg', multiplier: 1000 }, metrics)).toBeCloseTo(5000, 6);
  });

  it('sqm basis with multiplier (e.g. "100 SQM" = sqm × 100)', () => {
    // 5 × 100 = 500 m² / 20 = 25 kg
    expect(convertOrderQuantityToKg(5, { basis: 'sqm', multiplier: 100 }, metrics)).toBeCloseTo(25, 6);
  });

  it('lm basis with multiplier (e.g. "Roll 400 M" = lm × 400) uses reel width', () => {
    // 2 × 400 = 800 m / 40 = 20 kg
    expect(convertOrderQuantityToKg(2, { basis: 'lm', multiplier: 400 }, metrics)).toBeCloseTo(20, 6);
  });

  it('pieces basis with multiplier 1 (e.g. "per 1 pc")', () => {
    // 250 pcs / 100 = 2.5 kg
    expect(convertOrderQuantityToKg(250, { basis: 'pieces', multiplier: 1 }, metrics)).toBeCloseTo(2.5, 6);
  });

  it('descriptor takes the same path as the equivalent legacy code', () => {
    // 'kpcs' === { basis: 'pieces', multiplier: 1000 }
    expect(convertOrderQuantityToKg(10, { basis: 'pieces', multiplier: 1000 }, metrics)).toBeCloseTo(
      convertOrderQuantityToKg(10, 'kpcs', metrics),
      6
    );
  });

  it('invalid descriptor (bad basis / non-positive multiplier) → passthrough', () => {
    // resolveUnitDef returns null → convert passthroughs the raw quantity
    expect(convertOrderQuantityToKg(750, { basis: 'bogus' as never, multiplier: 1 }, metrics)).toBe(750);
    expect(convertOrderQuantityToKg(750, { basis: 'sqm', multiplier: 0 }, metrics)).toBe(750);
  });
});

describe('unit-conversion — resolveUnitDef', () => {
  it('maps legacy codes to descriptors (lm → reel basis)', () => {
    expect(resolveUnitDef('kgs')).toEqual({ basis: 'kg', multiplier: 1 });
    expect(resolveUnitDef('kpcs')).toEqual({ basis: 'pieces', multiplier: 1000 });
    expect(resolveUnitDef('sqm')).toEqual({ basis: 'sqm', multiplier: 1 });
    expect(resolveUnitDef('lm')).toEqual({ basis: 'lm', multiplier: 1 });
    expect(resolveUnitDef('roll_500_lm')).toEqual({ basis: 'lm', multiplier: 500 });
  });

  it('empty/undefined → kg passthrough', () => {
    expect(resolveUnitDef(undefined)).toEqual({ basis: 'kg', multiplier: 1 });
    expect(resolveUnitDef('')).toEqual({ basis: 'kg', multiplier: 1 });
  });

  it('unknown code → null', () => {
    expect(resolveUnitDef('nope')).toBeNull();
  });
});
