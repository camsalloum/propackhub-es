import { describe, it, expect } from 'vitest';
import { calculateEstimate } from './calculator';
import { GOLDEN_SCENARIOS, LARAVEL_REFERENCE_MATERIALS } from './golden-fixtures';

/**
 * Laravel parity gate — PRD acceptance #8, COSTING_NOTES.md §10 checklist.
 * Expected values derived from Excel/Laravel formulas documented in golden-fixtures.ts.
 */
describe('Laravel golden reference rows', () => {
  it.each(GOLDEN_SCENARIOS)('$name', ({ estimate, expected }) => {
    const materials = new Map(LARAVEL_REFERENCE_MATERIALS);
    const result = calculateEstimate(estimate, materials);
    const e = result.estimate;

    expect(e.totalGsm).toBeCloseTo(expected.totalGsm, 2);
    expect(e.totalMicron).toBeCloseTo(expected.totalMicron, 2);
    expect(e.filmDensity).toBeCloseTo(expected.filmDensity, 3);
    expect(e.materialCostPerKg).toBeCloseTo(expected.materialCostPerKg, 2);
    // Sale price now follows the final breakup (Total RM + M&O + PrePress + Transport + accessory),
    // not the legacy Laravel additive value. Assert the breakup identity instead of a hardcoded price.
    const breakup =
      (e.wasteAdjustedMaterialPerKg ?? e.materialCostPerKg ?? 0) +
      (e.operationCostPerKg ?? 0) +
      (e.profitMarginPerKg ?? 0) +
      (e.developmentCostPerKg ?? 0) +
      (e.logisticsCostPerKg ?? 0) +
      (e.accessoryCostPerKg ?? 0);
    expect(e.salePricePerKg).toBeCloseTo(breakup, 4);

    if (expected.solventMixCostPerKg !== undefined) {
      expect(e.solventMixCostPerKg ?? 0).toBeCloseTo(expected.solventMixCostPerKg, 3);
    }

    if (expected.piecesPerKg !== undefined) {
      expect(e.piecesPerKg).toBeCloseTo(expected.piecesPerKg, 1);
    }
    if (expected.linearMPerKgWeb !== undefined) {
      expect(e.linearMPerKgWeb).toBeCloseTo(expected.linearMPerKgWeb, 1);
    }
    if (expected.linearMPerKgReel !== undefined) {
      expect(e.linearMPerKgReel).toBeCloseTo(expected.linearMPerKgReel, 1);
    }
  });

  it('adhesive cost/m² uses micron not gsm (Laravel §3)', () => {
    const materials = new Map(LARAVEL_REFERENCE_MATERIALS);
    const estimate = {
      ...GOLDEN_SCENARIOS[0].estimate,
      layers: [{ id: 'a', materialId: 'adhesive-sb', micron: 3, position: 0 }],
    };
    const result = calculateEstimate(estimate, materials);
    const layer = result.estimate.layers[0];
    // gsm = 3 dry; cost = (3/1000) × HP binder solid $/kg
    expect(layer.gsm).toBeCloseTo(3, 2);
    expect(layer.costPerM2).toBeCloseTo(0.01765, 3);
  });

  it('sale price follows the final breakup — Total RM + M&O + PrePress + Transport (only one markup)', () => {
    const materials = new Map(LARAVEL_REFERENCE_MATERIALS);
    const scenario = GOLDEN_SCENARIOS.find((s) => s.name.includes('Operation cost'))!;
    const result = calculateEstimate(scenario.estimate, materials);
    const e = result.estimate;
    // Default method (no operatingCostMethod) is markup_over_rm → M&O = Total RM × markup%.
    const totalRm = e.wasteAdjustedMaterialPerKg!;
    const mo = totalRm * (scenario.estimate.markupPercent / 100);
    const expectedSale =
      totalRm + mo + (e.developmentCostPerKg ?? 0) + (e.logisticsCostPerKg ?? 0) + (e.accessoryCostPerKg ?? 0);
    expect(e.operationCostPerKg).toBeCloseTo(mo, 4);
    expect(e.salePricePerKg).toBeCloseTo(expectedSale, 4);
  });
});
