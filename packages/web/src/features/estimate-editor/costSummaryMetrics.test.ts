import { describe, expect, it } from 'vitest';
import { buildRmTotals } from './costSummaryMetrics';

describe('buildRmTotals', () => {
  it('uses waste-adjusted Total RM for Material cost card parity', () => {
    const rm = buildRmTotals({
      materialCostPerKg: 2.24,
      wasteAdjustedMaterialPerKg: 2.6432,
      wastePercentApplied: 18,
      rmCostPerM2: 0.1254,
      totalGsm: 56,
      packagingCostPerM2: 0.0029,
      consumablesCostPerM2: 0.0055,
    });
    expect(rm).not.toBeNull();
    expect(rm!.totalRmPerKg).toBeCloseTo(2.6432, 6);
    // Total RM /m² from kg × gsm/1000 — matches breakdown, includes pack/consumables+waste
    expect(rm!.totalRmPerM2).toBeCloseTo(2.6432 * 0.056, 6);
    expect(rm!.materialNoWastePerKg).toBeCloseTo(2.24, 6);
    expect(rm!.wastePerKg).toBeCloseTo(0.4032, 6);
  });

  it('falls back to material × (1+waste%) when wasteAdjusted missing', () => {
    const rm = buildRmTotals({
      materialCostPerKg: 8,
      wastePercentApplied: 10,
      rmCostPerM2: 0.4,
      totalGsm: 50,
    });
    expect(rm!.totalRmPerKg).toBeCloseTo(8.8, 6);
    expect(rm!.totalRmPerM2).toBeCloseTo(8.8 * 0.05, 6);
  });
});
