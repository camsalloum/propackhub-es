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
    expect(e.salePricePerKg).toBeCloseTo(expected.salePricePerKg, 2);

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
    if (expected.operationCostPerKg !== undefined) {
      expect(e.operationCostPerKg).toBeCloseTo(expected.operationCostPerKg, 2);
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

  it('sale price is additive — operation is not folded into markup % (Laravel §5)', () => {
    const materials = new Map(LARAVEL_REFERENCE_MATERIALS);
    const scenario = GOLDEN_SCENARIOS.find((s) => s.name.includes('Operation cost'))!;
    const result = calculateEstimate(scenario.estimate, materials);
    const mat = result.estimate.materialCostPerKg!;
    const op = result.estimate.operationCostPerKg!;
    const markup = mat * (scenario.estimate.markupPercent / 100);
    const correct =
      mat + markup + scenario.estimate.platesPerKg + scenario.estimate.deliveryPerKg + op;
    const wrongMarginOnAll = (mat + op) * (1 + scenario.estimate.markupPercent / 100) +
      scenario.estimate.platesPerKg + scenario.estimate.deliveryPerKg;
    expect(result.estimate.salePricePerKg).toBeCloseTo(correct, 4);
    expect(result.estimate.salePricePerKg).not.toBeCloseTo(wrongMarginOnAll, 2);
  });
});
