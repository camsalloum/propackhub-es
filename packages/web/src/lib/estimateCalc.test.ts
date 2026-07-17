import { describe, expect, it } from 'vitest';
import { calculatePouchFlatSheetAreaM2 } from '@es/engine';
import { runClientCalculation } from './estimateCalc';

/** Minimal substrate so totalGsm > 0 and pouch metrics resolve. */
const PET = {
  id: 'pet-12',
  name: 'PET 12',
  type: 'substrate',
  solidPercent: 100,
  density: 1.4,
  costPerKgUsd: 3,
  wastePercent: 0,
};

describe('runClientCalculation — pouch productSubtype injection', () => {
  const baseDims = {
    openWidthMm: 150,
    openHeightMm: 200,
  };

  it('without productSubtype, pouch area cannot resolve (engine returns 0 → face fallback)', () => {
    const geom = calculatePouchFlatSheetAreaM2({
      productType: 'pouch',
      ...baseDims,
    });
    expect(geom.areaM2).toBe(0);
    expect(geom.type).toBeNull();
  });

  it('with productSubtype pouch_tss_flat, live preview uses 2-web flat area (not 1-face)', () => {
    const withSubtype = runClientCalculation({
      layers: [{ materialId: PET.id, micron: 12, position: 0 }],
      materials: [PET],
      productType: 'pouch',
      productSubtype: 'pouch_tss_flat',
      dimensions: { ...baseDims },
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      slabs: [{ quantityKg: 1000 }],
      displayCurrency: 'USD',
      exchangeRateUsdToDisplay: 1,
    });

    const withoutSubtype = runClientCalculation({
      layers: [{ materialId: PET.id, micron: 12, position: 0 }],
      materials: [PET],
      productType: 'pouch',
      dimensions: { ...baseDims },
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      slabs: [{ quantityKg: 1000 }],
      displayCurrency: 'USD',
      exchangeRateUsdToDisplay: 1,
    });

    // 2 webs: area = 2×W×L; face fallback = 1×W×L → grams/piece ~2× when subtype present
    expect(withSubtype.estimate.gramsPerPiece).toBeGreaterThan(0);
    expect(withoutSubtype.estimate.gramsPerPiece).toBeGreaterThan(0);
    expect(withSubtype.estimate.gramsPerPiece / withoutSubtype.estimate.gramsPerPiece).toBeCloseTo(
      2,
      1
    );

    const expectedAreaM2 = (150 * 200 * 2) / 1e6;
    const gsm = 12 * 1.4; // micron × density
    expect(withSubtype.estimate.gramsPerPiece).toBeCloseTo(expectedAreaM2 * gsm, 3);
  });
});
