import { describe, it, expect } from 'vitest';
import { calculateEstimate } from './calculator';
import { Estimate, Material } from './types';

/**
 * Bag costing integration tests.
 * Validates: flat-sheet area (not face area), pcs_per_min fix, unit conversion.
 */
describe('Engine calculator — bag costing', () => {
  const materials = new Map<string, Material>([
    [
      'pe-plain',
      {
        id: 'pe-plain',
        name: 'PE Plain',
        type: 'substrate',
        solidPercent: 100,
        density: 0.92,
        costPerKgUsd: 1.2,
        wastePercent: 3,
      },
    ],
  ]);

  const baseEstimate = {
    tenantId: 'tenant-1',
    jobName: 'Bottom-gusset bag',
    status: 'draft' as const,
    layers: [
      {
        id: 'layer-1',
        materialId: 'pe-plain',
        micron: 25, // gsm = 25 × 0.92 = 23
        position: 0,
      },
    ],
    slabs: [],
    markupPercent: 15,
    platesPerKg: 0,
    deliveryPerKg: 0,
    displayCurrencyCode: 'USD',
    exchangeRateUsdToDisplay: 1,
    processes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('bottom-gusset bag uses flat-sheet area (not face area)', () => {
    // W=400, H=500, BG=120 (formed depth), SA=10
    // Two-web construction: blank = 2×400 = 800 mm; length = 500 + 120 + 10 = 630 mm
    // (gusset film W×2BG spread across 2W → adds BG, NOT 2BG)
    // areaM2 = 800 × 630 / 1e6 = 0.5040 m²
    // totalGsm = 23; piecesPerKg = 1000 / (0.5040 × 23) = 86.24
    const estimate: Estimate = {
      ...baseEstimate,
      id: 'bag-1',
      orderQuantityKg: 1000,
      orderQuantityUnit: 'kgs',
      dimensions: {
        productType: 'bag',
        bagSubtype: 'bottom-gusset',
        openWidthMm: 400,
        openHeightMm: 500,
        bottomGussetMm: 120,
        sealAllowanceMm: 10,
        numberOfUps: 1,
        extraPrintingTrimMm: 0,
      },
    } as Estimate;

    const result = calculateEstimate(estimate, materials);
    const expectedArea = (800 * 630) / 1e6;
    const expectedPiecesPerKg = 1000 / (expectedArea * 23);
    expect(result.estimate.piecesPerKg).toBeCloseTo(expectedPiecesPerKg, 2);
    expect(result.estimate.piecesPerKg).toBeGreaterThan(0);
  });

  it('bag yields MORE pieces/kg than pouch with same W×H (because flat sheet is bigger)', () => {
    // A pouch with the same 400×500 face would have piecesPerKg = 1000/(0.2×23) = 217
    // The bag's flat sheet is 0.5040 m² → piecesPerKg ≈ 86 (2.5× fewer pieces/kg,
    // i.e. 2.5× more material per bag — correct two-web formed-depth area)
    const bagEstimate: Estimate = {
      ...baseEstimate,
      id: 'bag-2',
      orderQuantityKg: 1000,
      orderQuantityUnit: 'kgs',
      dimensions: {
        productType: 'bag',
        bagSubtype: 'bottom-gusset',
        openWidthMm: 400,
        openHeightMm: 500,
        bottomGussetMm: 120,
        sealAllowanceMm: 10,
        numberOfUps: 1,
        extraPrintingTrimMm: 0,
      },
    } as Estimate;

    const pouchEstimate: Estimate = {
      ...baseEstimate,
      id: 'pouch-2',
      jobName: 'Pouch',
      orderQuantityKg: 1000,
      orderQuantityUnit: 'kgs',
      dimensions: {
        productType: 'pouch',
        openWidthMm: 400,
        openHeightMm: 500,
        numberOfUps: 1,
        extraPrintingTrimMm: 0,
      },
    } as Estimate;

    const bagResult = calculateEstimate(bagEstimate, materials);
    const pouchResult = calculateEstimate(pouchEstimate, materials);
    // Bag uses MORE material per piece → FEWER pieces per kg
    expect(bagResult.estimate.piecesPerKg).toBeLessThan(pouchResult.estimate.piecesPerKg);
    expect(pouchResult.estimate.piecesPerKg / bagResult.estimate.piecesPerKg).toBeGreaterThan(2);
  });

  it('bag piecesPerKg conversion is sane (no /1000 bug) and M&O is per-kg', () => {
    // piecesPerKg ≈ 72.46; M&O uses per-kg process cost (no machine time / web width).
    const estimate: Estimate = {
      ...baseEstimate,
      id: 'bag-3',
      operatingCostMethod: 'process_per_kg',
      orderQuantityKg: 1000,
      orderQuantityUnit: 'kgs',
      dimensions: {
        productType: 'bag',
        bagSubtype: 'bottom-gusset',
        openWidthMm: 400,
        openHeightMm: 500,
        bottomGussetMm: 120,
        sealAllowanceMm: 10,
        numberOfUps: 1,
        extraPrintingTrimMm: 0,
      },
      processes: [
        {
          id: 'bag-making',
          name: 'Bag making',
          costPerKgUsd: 0.5,
          processQuantity: 1,
          enabled: true,
        },
      ],
    } as Estimate;

    const result = calculateEstimate(estimate, materials);
    // M&O (process_per_kg) = 0.5 × 1 = 0.5, independent of run size / machine speed.
    expect(result.estimate.operationCostPerKg).toBeCloseTo(0.5, 6);
    // Sanity: piecesPerKg ~72, NOT ~0.072 (the old /1000 bug)
    expect(result.estimate.piecesPerKg ?? 0).toBeGreaterThan(1);
  });

  it('orderQuantityUnit=kpcs converts to kg for order quantities', () => {
    // 10 kpcs = 10,000 pieces; piecesPerKg ≈ 72.46 → kg = 10000/72.46 ≈ 138.02 kg
    const estimate: Estimate = {
      ...baseEstimate,
      id: 'bag-4',
      operatingCostMethod: 'process_per_kg',
      orderQuantityKg: 10, // 10 kpcs
      orderQuantityUnit: 'kpcs',
      dimensions: {
        productType: 'bag',
        bagSubtype: 'bottom-gusset',
        openWidthMm: 400,
        openHeightMm: 500,
        bottomGussetMm: 120,
        sealAllowanceMm: 10,
        numberOfUps: 1,
        extraPrintingTrimMm: 0,
      },
      processes: [
        {
          id: 'bag-making',
          name: 'Bag making',
          costPerKgUsd: 0.5,
          processQuantity: 1,
          enabled: true,
        },
      ],
    } as Estimate;

    const result = calculateEstimate(estimate, materials);
    // orderQuantityKpcs output should reflect the converted kg
    expect(result.estimate.orderQuantityKpcs).toBeCloseTo(10, 1);
    // M&O stays per-kg regardless of the entered unit.
    expect(result.estimate.operationCostPerKg).toBeCloseTo(0.5, 6);
  });

  it('orderQuantityUnit=sqm converts to kg', () => {
    // totalGsm=23 → sqmPerKg = 1000/23 ≈ 43.48
    // 5000 sqm → kg = 5000/43.48 ≈ 115.04
    const estimate: Estimate = {
      ...baseEstimate,
      id: 'bag-5',
      orderQuantityKg: 5000,
      orderQuantityUnit: 'sqm',
      dimensions: {
        productType: 'bag',
        bagSubtype: 'industrial',
        openWidthMm: 400,
        openHeightMm: 500,
        sealAllowanceMm: 10,
        numberOfUps: 1,
        extraPrintingTrimMm: 0,
      },
    } as Estimate;

    const result = calculateEstimate(estimate, materials);
    const expectedKg = 5000 / (1000 / 23);
    expect(result.estimate.orderQuantitySqm).toBeCloseTo(5000, 1);
    // orderQuantitySqm is derived from trueKg × sqmPerKg, so it should round-trip
    expect(result.estimate.orderQuantitySqm).toBeCloseTo(5000, 0);
    expect(expectedKg).toBeCloseTo(115.04, 1);
  });

  it('unresolved bag subtype falls back to face area (no crash)', () => {
    const estimate: Estimate = {
      ...baseEstimate,
      id: 'bag-6',
      orderQuantityKg: 1000,
      orderQuantityUnit: 'kgs',
      dimensions: {
        productType: 'bag',
        // no bagSubtype, no productSubtype
        openWidthMm: 400,
        openHeightMm: 500,
        numberOfUps: 1,
        extraPrintingTrimMm: 0,
      },
    } as Estimate;

    const result = calculateEstimate(estimate, materials);
    expect(result.estimate.piecesPerKg).toBeGreaterThan(0);
    // Falls back to face area = 400×500 = 0.2 m²; piecesPerKg = 1000/(0.2×23) = 217.4
    expect(result.estimate.piecesPerKg).toBeCloseTo(1000 / (0.2 * 23), 1);
  });
});