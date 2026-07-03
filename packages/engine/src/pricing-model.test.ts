import { describe, it, expect } from 'vitest';
import { calculateEstimate } from './calculator';
import { Estimate, Material } from './types';
import { wastePercentForQuantity, DEFAULT_WASTE_BANDS, type WasteBand } from './waste-bands';

/**
 * Tests for the new quantity-band waste + lump-sum tooling/delivery + margin
 * pricing model. Numbers are chosen so the per-kg build-up is hand-verifiable.
 *
 * Single substrate: PE 100µ, density 1.0, $2/kg → material cost = $2/kg.
 *   gsm = 100 × 1.0 = 100 ; cost/m² = (100/1000)×2 = 0.2 ; /kg = 0.2/100×1000 = 2
 */
const materials = new Map<string, Material>([
  ['pe', { id: 'pe', name: 'PE', type: 'substrate', solidPercent: 100, density: 1.0, costPerKgUsd: 2.0, wastePercent: 0 }],
]);

function baseEstimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    id: 't', tenantId: 't', jobName: 'job', status: 'draft',
    layers: [{ id: 'l1', materialId: 'pe', micron: 100, position: 0 }],
    slabs: [],
    processes: [],
    markupPercent: 20,
    platesPerKg: 0,
    deliveryPerKg: 0,
    orderQuantityKg: 1000,
    orderQuantityUnit: 'kgs',
    displayCurrencyCode: 'USD',
    exchangeRateUsdToDisplay: 1,
    dimensions: { productType: 'roll', reelWidthMm: 800, cutoffMm: 600, piecesPerCut: 1 },
    ...overrides,
  };
}

describe('wastePercentForQuantity', () => {
  it('maps quantities to the correct default band', () => {
    expect(wastePercentForQuantity(50)).toBe(30);     // 0–80
    expect(wastePercentForQuantity(80)).toBe(30);     // boundary
    expect(wastePercentForQuantity(81)).toBe(22);     // 81–150
    expect(wastePercentForQuantity(1000)).toBe(7);    // 601–1500
    expect(wastePercentForQuantity(5000)).toBe(4);    // 3001–5000
    expect(wastePercentForQuantity(100000)).toBe(1.5); // 50001–100000
    expect(wastePercentForQuantity(250000)).toBe(1);  // open-ended top band
  });

  it('handles fractional quantities without gaps', () => {
    expect(wastePercentForQuantity(80.5)).toBe(22); // falls into 81–150 band (maxKg 150)
  });

  it('handles zero / invalid quantity as the lowest band', () => {
    expect(wastePercentForQuantity(0)).toBe(30);
    expect(wastePercentForQuantity(-5)).toBe(30);
    expect(wastePercentForQuantity(NaN)).toBe(30);
  });

  it('returns 0 when no bands are defined', () => {
    expect(wastePercentForQuantity(1000, [])).toBe(0);
  });

  it('uses custom bands when provided', () => {
    const custom: WasteBand[] = [
      { minKg: 0, maxKg: 100, wastePercent: 10 },
      { minKg: 101, maxKg: null, wastePercent: 2 },
    ];
    expect(wastePercentForQuantity(50, custom)).toBe(10);
    expect(wastePercentForQuantity(500, custom)).toBe(2);
  });
});

describe('final price breakup — markup over RM (M&O = markup)', () => {
  it('sale = Total RM + (RM × markup%) + PrePress + Transport', () => {
    // order 1000kg → band waste 7% → Total RM = 2 × 1.07 = 2.14
    // M&O (markup over RM) = 2.14 × 20% = 0.428
    // PrePress (tooling $500 billed / 1000) = 0.5 ; Transport (delivery $200 / 1000) = 0.2
    // sale = 2.14 + 0.428 + 0.5 + 0.2 = 3.268
    const result = calculateEstimate(
      baseEstimate({
        operatingCostMethod: 'markup_over_rm',
        markupPercent: 20,
        toolingChargeUsd: 500,
        toolingBilledToCustomer: true,
        deliveryChargeUsd: 200,
        deliveryTerm: 'CIF',
      }),
      materials
    );
    const e = result.estimate;
    expect(e.wastePercentApplied).toBe(7);
    expect(e.wasteAdjustedMaterialPerKg).toBeCloseTo(2.14, 6);
    expect(e.developmentCostPerKg).toBeCloseTo(0.5, 6); // PrePress
    expect(e.logisticsCostPerKg).toBeCloseTo(0.2, 6);   // Transport
    expect(e.operationCostPerKg).toBeCloseTo(0.428, 6); // M&O
    expect(e.marginPerKg).toBeCloseTo(0.428, 6);
    expect(e.salePricePerKg).toBeCloseTo(3.268, 6);
    expect(e.operatingCostMethodResolved).toBe('markup_over_rm');
  });

  it('excludes tooling when not billed; EXW gives zero transport', () => {
    // Total RM 2.14 + M&O 0.428 + 0 + 0 = 2.568
    const result = calculateEstimate(
      baseEstimate({
        operatingCostMethod: 'markup_over_rm',
        markupPercent: 20,
        toolingChargeUsd: 500,
        toolingBilledToCustomer: false,
        deliveryChargeUsd: 0,
        deliveryTerm: 'EXW',
      }),
      materials
    );
    const e = result.estimate;
    expect(e.developmentCostPerKg).toBeCloseTo(0, 6);
    expect(e.logisticsCostPerKg).toBeCloseTo(0, 6);
    expect(e.salePricePerKg).toBeCloseTo(2.568, 6);
  });
});

describe('final price breakup — per-kg process cost (M&O = Σ process/kg)', () => {
  it('adds the process cost/kg as M&O (the only markup)', () => {
    // Total RM 2.14 + M&O (0.5 × ×2 = 1.0) + PrePress 0.5 + Transport 0.2 = 3.84
    const result = calculateEstimate(
      baseEstimate({
        operatingCostMethod: 'process_per_kg',
        processes: [
          { id: 'p1', name: 'Lamination', enabled: true, costPerKgUsd: 0.5, processQuantity: 2 },
        ],
        toolingChargeUsd: 500,
        toolingBilledToCustomer: true,
        deliveryChargeUsd: 200,
      }),
      materials
    );
    const e = result.estimate;
    expect(e.operationCostPerKg).toBeCloseTo(1.0, 6);
    expect(e.salePricePerKg).toBeCloseTo(3.84, 6);
    expect(e.operatingCostMethodResolved).toBe('process_per_kg');
  });
});

describe('final price breakup — slab ladder', () => {
  it('varies waste per band while keeping M&O/PrePress/Transport flat over the order qty', () => {
    const result = calculateEstimate(
      baseEstimate({
        operatingCostMethod: 'process_per_kg',
        processes: [
          { id: 'p1', name: 'Lamination', enabled: true, costPerKgUsd: 1.0, processQuantity: 1 },
        ],
        toolingChargeUsd: 500,
        toolingBilledToCustomer: true,
        deliveryChargeUsd: 200,
        orderQuantityKg: 1000, // PrePress 0.5, Transport 0.2 (flat across slabs)
        slabs: [
          { quantityKg: 100, pricePerKg: 0 },   // band 81–150 → waste 22%
          { quantityKg: 5000, pricePerKg: 0 },  // band 3001–5000 → waste 4%
        ],
      }),
      materials
    );
    // slab 100kg: RM 2×1.22=2.44 + M&O 1.0 + 0.5 + 0.2 = 4.14
    // slab 5000kg: RM 2×1.04=2.08 + M&O 1.0 + 0.5 + 0.2 = 3.78
    expect(result.slabs[0].pricePerKg).toBeCloseTo(4.14, 6);
    expect(result.slabs[1].pricePerKg).toBeCloseTo(3.78, 6);
  });
});

describe('band waste always applies (single unified model)', () => {
  it('applies band waste + M&O markup + prepress + transport', () => {
    // Total RM 2×1.07=2.14 + M&O 2.14×20%=0.428 + plates 0.3 + deliveryPerKg 0.1 = 2.968
    const result = calculateEstimate(
      baseEstimate({
        operatingCostMethod: 'markup_over_rm',
        markupPercent: 20,
        platesPerKg: 0.3,
        deliveryPerKg: 0.1,
      }),
      materials
    );
    const e = result.estimate;
    expect(e.salePricePerKg).toBeCloseTo(2.968, 6);
    expect(e.wastePercentApplied).toBe(7);
  });
});

describe('DEFAULT_WASTE_BANDS', () => {
  it('covers the agreed quantity ladder up to 100,000', () => {
    expect(DEFAULT_WASTE_BANDS[0]).toMatchObject({ minKg: 0, maxKg: 80 });
    expect(DEFAULT_WASTE_BANDS[DEFAULT_WASTE_BANDS.length - 1].maxKg).toBeNull();
    // waste % strictly decreases as quantity grows
    const pcts = DEFAULT_WASTE_BANDS.map((b) => b.wastePercent);
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeLessThanOrEqual(pcts[i - 1]);
    }
  });
});
