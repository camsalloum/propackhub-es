import { describe, it, expect } from 'vitest';
import { buildCostBreakdownRows } from './costBreakdownRows';

describe('buildCostBreakdownRows', () => {
  const base = {
    layers: [] as [],
    materials: [] as [],
    solventTotalPerM2Usd: 0,
    packagingTotalPerKgUsd: 0,
    packagingTotalPerM2Usd: 0,
    consumablesTotalPerKgUsd: 0,
    consumablesTotalPerM2Usd: 0,
  };

  it('labels Fixed CoRM as Margin Over Raw Material', () => {
    const rows = buildCostBreakdownRows({
      ...base,
      operatingCostMethod: 'fixed_per_group',
      estimate: {
        totalGsm: 100,
        materialCostPerKg: 2,
        wasteAdjustedMaterialPerKg: 2.14,
        operationCostPerKg: 0.8,
        salePricePerKg: 3,
      },
    });
    expect(rows.some((r) => r.label === 'Margin Over Raw Material')).toBe(true);
    expect(rows.some((r) => r.label === 'Manufacturing & Operating')).toBe(false);
    expect(rows.some((r) => r.label === 'Profit margin')).toBe(false);
  });

  it('labels markup method as Markup Over Material', () => {
    const rows = buildCostBreakdownRows({
      ...base,
      operatingCostMethod: 'markup_over_rm',
      estimate: {
        totalGsm: 100,
        materialCostPerKg: 2,
        wasteAdjustedMaterialPerKg: 2.14,
        operationCostPerKg: 0.428,
        salePricePerKg: 2.5,
      },
    });
    expect(rows.some((r) => r.label === 'Markup Over Material')).toBe(true);
  });

  it('adds Profit margin row for process method', () => {
    const rows = buildCostBreakdownRows({
      ...base,
      operatingCostMethod: 'process_per_kg',
      estimate: {
        totalGsm: 100,
        materialCostPerKg: 2,
        wasteAdjustedMaterialPerKg: 2.14,
        operationCostPerKg: 1,
        profitMarginPerKg: 0.2,
        salePricePerKg: 4,
      },
    });
    expect(rows.some((r) => r.label === 'Manufacturing & Operating')).toBe(true);
    expect(rows.some((r) => r.label === 'Profit margin' && r.kgVal === 0.2)).toBe(true);
  });
});
