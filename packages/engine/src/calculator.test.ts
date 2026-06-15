import { describe, it, expect } from 'vitest';
import { calculateEstimate } from './calculator';
import { Estimate, Material } from './types';

/**
 * Golden tests — validate engine against Laravel costing formulas
 * Reference: archive/legacy-laravel/COSTING_NOTES.md
 *
 * Golden values computed from:
 * - Interplast FP Q1 2026 actuals (Sharjah P&L comparison)
 * - Excel costing model (Costing_form 25.2.25.xlsx)
 */

describe('Engine calculator — golden tests', () => {
  // Test materials library
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
    [
      'ink-sb',
      {
        id: 'ink-sb',
        name: 'Ink SB',
        type: 'ink',
        solidPercent: 30,
        density: 1.0,
        costPerKgUsd: 8.0,
        wastePercent: 5,
      },
    ],
    [
      'pet',
      {
        id: 'pet',
        name: 'PET',
        type: 'substrate',
        solidPercent: 100,
        density: 1.39,
        costPerKgUsd: 2.5,
        wastePercent: 2,
      },
    ],
  ]);

  it('should calculate layer GSM for substrate (PE Plain 25µ)', () => {
    const estimate: Estimate = {
      id: 'test-1',
      tenantId: 'tenant-1',
      jobName: 'Test PE Plain',
      status: 'draft',
      layers: [
        {
          id: 'layer-1',
          materialId: 'pe-plain',
          micron: 25,
          position: 0,
          gsm: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
        printingWebClass: 'wide_web',
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // PE Plain: gsm = micron × density = 25 × 0.92 = 23 GSM
    expect(result.estimate.layers[0].gsm).toBeCloseTo(23, 1);
  });

  it('should calculate layer cost/m² with waste factor', () => {
    const estimate: Estimate = {
      id: 'test-2',
      tenantId: 'tenant-1',
      jobName: 'Test PE cost',
      status: 'draft',
      layers: [
        {
          id: 'layer-1',
          materialId: 'pe-plain',
          micron: 25,
          position: 0,
          gsm: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
        printingWebClass: 'wide_web',
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // PE Plain: gsm = 23, cost/kg = 1.2 USD
    // cost_m2 = (gsm / 1000) × cost_per_kg × (1 + waste/100)
    //         = (23 / 1000) × 1.2 × 1.03 = 0.02838 USD/m²
    expect(result.estimate.layers[0].costPerM2).toBeCloseTo(0.02838, 4);
  });

  it('should calculate ink GSM (SB 30% solid at 5µ)', () => {
    const estimate: Estimate = {
      id: 'test-3',
      tenantId: 'tenant-1',
      jobName: 'Test Ink SB',
      status: 'draft',
      layers: [
        {
          id: 'layer-1',
          materialId: 'ink-sb',
          micron: 5,
          position: 0,
          gsm: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
        printingWebClass: 'wide_web',
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // Ink SB: gsm = (solid × micron) / 100 = (30 × 5) / 100 = 1.5 GSM
    expect(result.estimate.layers[0].gsm).toBeCloseTo(1.5, 1);
  });

  it('should calculate total GSM and micron for duplex (PET/Ink/PE)', () => {
    const estimate: Estimate = {
      id: 'test-4',
      jobName: 'Test duplex',
      layers: [
        {
          id: 1,
          materialId: 'pet',
          micron: 12,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
        {
          id: 2,
          materialId: 'ink-sb',
          micron: 5,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
        {
          id: 3,
          materialId: 'pe-plain',
          micron: 40,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // PET: gsm = 12 × 1.39 = 16.68, total contribution = 16.68
    // Ink: gsm = (30 × 5) / 100 = 1.5, total contribution = 1.5
    // PE: gsm = 40 × 0.92 = 36.8, total contribution = 36.8
    // total_gsm = 16.68 + 1.5 + 36.8 = 54.98 GSM
    // total_micron = 12 (PET) + 1.5 (Ink GSM as µ) + 40 (PE) = 53.5 µ
    expect(result.estimate.totalGsm).toBeCloseTo(54.98, 1);
    expect(result.estimate.totalMicron).toBeCloseTo(53.5, 1);
  });

  it('should calculate film density', () => {
    const estimate: Estimate = {
      id: 'test-5',
      jobName: 'Test density',
      layers: [
        {
          id: 1,
          materialId: 'pet',
          micron: 12,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
        {
          id: 2,
          materialId: 'pe-plain',
          micron: 40,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // totalGsm = (12 × 1.39) + (40 × 0.92) = 16.68 + 36.8 = 53.48
    // totalMicron = 12 + 40 = 52
    // filmDensity = 53.48 / 52 = 1.0285 g/cm³
    expect(result.estimate.filmDensity).toBeCloseTo(1.0285, 3);
  });

  it('should calculate pieces per kg for roll (800mm reel, 600mm cutoff)', () => {
    const estimate: Estimate = {
      id: 'test-6',
      jobName: 'Test pcs/kg',
      layers: [
        {
          id: 1,
          materialId: 'pe-plain',
          micron: 25,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // gsm = 25 × 0.92 = 23 GSM
    // pieces_per_kg = (1000 / (800 × 600 × 23 × 1e-6)) × 1
    //               = (1000 / 11.04) = 90.58 pieces/kg
    expect(result.estimate.piecesPerKg).toBeCloseTo(90.58, 1);
  });

  it('should calculate linear m/kg (web and reel)', () => {
    const estimate: Estimate = {
      id: 'test-7',
      jobName: 'Test linear m/kg',
      layers: [
        {
          id: 1,
          materialId: 'pe-plain',
          micron: 30,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // gsm = 30 × 0.92 = 27.6 GSM
    // sqm_per_kg = 1000 / 27.6 = 36.23 sqm/kg
    // printing_web_width = (800 × 2) + 10 = 1610 mm
    // linear_m_per_kg_web = (36.23 / 1610) × 1000 = 22.5 m/kg
    // linear_m_per_kg_reel = (36.23 / 800) × 1000 = 45.29 m/kg
    expect(result.estimate.linearMPerKgWeb).toBeCloseTo(22.5, 1);
    expect(result.estimate.linearMPerKgReel).toBeCloseTo(45.29, 1);
  });

  it('should calculate material cost per kg including waste', () => {
    const estimate: Estimate = {
      id: 'test-8',
      jobName: 'Test mat cost',
      layers: [
        {
          id: 1,
          materialId: 'pe-plain',
          micron: 30,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // gsm = 27.6 GSM
    // cost_m2 = (27.6 / 1000) × 1.2 × 1.03 = 0.03410 USD/m²
    // sqm_per_kg = 36.23
    // mat_cost_kg = (0.03410 / 27.6) × 1000 = 1.235 USD/kg
    const expectedMatCostKg = 1.235;
    expect(result.estimate.materialCostPerKg).toBeCloseTo(expectedMatCostKg, 2);
  });

  it('should calculate sale price per kg (additive formula)', () => {
    const estimate: Estimate = {
      id: 'test-9',
      jobName: 'Test sale price',
      layers: [
        {
          id: 1,
          materialId: 'pe-plain',
          micron: 30,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0.2,
      deliveryPerKg: 0.1,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // mat_cost_kg ≈ 1.235 USD/kg
    // markup = 1.235 × 15/100 = 0.185 USD/kg
    // sale_price = 1.235 + 0.185 + 0.2 + 0.1 = 1.72 USD/kg
    expect(result.estimate.salePricePerKg).toBeCloseTo(1.72, 2);
  });

  it('should compute waste percentage in cost breakdown', () => {
    const estimate: Estimate = {
      id: 'test-10',
      jobName: 'Test waste %',
      layers: [
        {
          id: 1,
          materialId: 'pe-plain',
          micron: 30,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // PE waste = 3%, so wastePercent should be > 0
    expect(result.costBreakdown.wastePercent).toBeGreaterThan(0);
    expect(result.costBreakdown.wastePercent).toBeLessThan(5); // waste is typically small
  });

  it('should calculate slab pricing correctly', () => {
    const estimate: Estimate = {
      id: 'test-11',
      jobName: 'Test slabs',
      layers: [
        {
          id: 1,
          materialId: 'pe-plain',
          micron: 25,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [
        { quantityKg: 1000, pricePerKg: 1.5, total: 0 },
        { quantityKg: 2000, pricePerKg: 1.4, total: 0 },
        { quantityKg: 5000, pricePerKg: 1.3, total: 0 },
      ],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 1000,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        piecesPerCut: 1,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // Slabs should have totals calculated based on sale price
    result.slabs.forEach((slab) => {
      expect(slab.total).toBe(slab.quantityKg * result.estimate.salePricePerKg);
    });
  });

  it('should handle pouch dimensions (width × height, not reel)', () => {
    const estimate: Estimate = {
      id: 'test-12',
      jobName: 'Test pouch',
      layers: [
        {
          id: 1,
          materialId: 'pe-plain',
          micron: 50,
          gsm: 0,
          costPerKg: 0,
          costPerM2: 0,
          material: undefined,
        },
      ],
      slabs: [],
      markupPercent: 15,
      platesPerKg: 0,
      deliveryPerKg: 0,
      orderQuantityKg: 100,
      displayCurrency: 'AED',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
      filmDensity: 0,
      sqmPerKg: 0,
      dimensions: {
        productType: 'pouch',
        openWidthMm: 200,
        openHeightMm: 300,
        numberOfUps: 1,
        extraPrintingTrimMm: 5,
      },
      processes: [],
    };

    const result = calculateEstimate(estimate, materials);
    // Pouch: gsm = 50 × 0.92 = 46 GSM
    // printing_web_width = (200 × 1) + 5 = 205 mm
    // pieces_per_kg = (1000 / (200 × 300 × 46 × 1e-6)) × 1 = 362.3 pcs/kg
    // linear_m_per_kg_reel = (1000/46 / 300) × 1000 = 72.46 m/kg (uses open_height)
    expect(result.estimate.piecesPerKg).toBeGreaterThan(300);
    expect(result.estimate.linearMPerKgReel).toBeCloseTo(72.46, 1);
  });
});
