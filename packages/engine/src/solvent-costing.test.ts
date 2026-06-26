import { describe, it, expect } from 'vitest';
import { calculateSolventCosts } from './solvent-costing';
import type { Estimate, Layer, Material } from './types';
import { DEFAULT_LAMINATION_RECIPES } from './lamination-recipe';

const sbInk: Material = {
  id: 'ink-sb',
  name: 'Ink SB',
  type: 'ink',
  solidPercent: 30,
  density: 1,
  costPerKgUsd: 40,
  wastePercent: 10,
  isSolventBased: true,
};

const uvInk: Material = {
  id: 'ink-uv',
  name: 'Ink UV',
  type: 'ink',
  solidPercent: 100,
  density: 1,
  costPerKgUsd: 8,
  wastePercent: 3,
  isSolventBased: false,
};

const adhesiveSb: Material = {
  id: 'adh-sb',
  name: 'Adhesive SB',
  type: 'adhesive',
  solidPercent: 40,
  density: 1,
  costPerKgUsd: 4,
  wastePercent: 5,
  isSolventBased: true,
  laminationRecipe: DEFAULT_LAMINATION_RECIPES.GP,
};

const pet: Material = {
  id: 'pet',
  name: 'PET',
  type: 'substrate',
  solidPercent: 100,
  density: 1.4,
  costPerKgUsd: 2,
  wastePercent: 2,
  isSolventBased: false,
};

function baseEstimate(layers: Layer[]): Estimate {
  return {
    id: 'est-1',
    tenantId: 't1',
    jobName: 'test',
    status: 'draft',
    layers,
    dimensions: { productType: 'roll', reelWidthMm: 800, cutoffMm: 600, numberOfUps: 1, extraPrintingTrimMm: 0 },
    markupPercent: 0,
    platesPerKg: 0,
    deliveryPerKg: 0,
    processes: [],
    slabs: [],
    displayCurrencyCode: 'USD',
    exchangeRateUsdToDisplay: 1,
    orderQuantityKg: 2000,
    solventCostPerKgUsd: 1.54,
    cleaningSolventKgPerJob: 20,
  };
}

describe('calculateSolventCosts — SB vs UV ink', () => {
  const materials = new Map<string, Material>([
    ['ink-sb', sbInk],
    ['ink-uv', uvInk],
    ['adh-sb', adhesiveSb],
    ['pet', pet],
  ]);

  it('UV ink only: no ink makeup or cleaning', () => {
    const layers: Layer[] = [
      { id: '1', materialId: 'pet', micron: 12, position: 0, gsm: 16.8 },
      { id: '2', materialId: 'ink-uv', micron: 2, position: 1, gsm: 2 },
    ];
    const result = calculateSolventCosts(baseEstimate(layers), layers, materials, 18.8);
    expect(result.inkMakeupCostPerKg).toBe(0);
    expect(result.cleaningCostPerKg).toBe(0);
    expect(result.laminationCostPerKg).toBe(0);
    expect(result.totalCostPerKg).toBe(0);
  });

  it('SB ink: ink makeup + cleaning', () => {
    const layers: Layer[] = [
      { id: '1', materialId: 'pet', micron: 12, position: 0, gsm: 16.8 },
      { id: '2', materialId: 'ink-sb', micron: 2, position: 1, gsm: 2 },
    ];
    const result = calculateSolventCosts(baseEstimate(layers), layers, materials, 18.8);
    expect(result.inkMakeupCostPerKg).toBeGreaterThan(0);
    expect(result.cleaningCostPerKg).toBeGreaterThan(0);
  });

  it('UV ink + SB adhesive: lamination only, no ink makeup/cleaning', () => {
    const layers: Layer[] = [
      { id: '1', materialId: 'pet', micron: 12, position: 0, gsm: 16.8 },
      { id: '2', materialId: 'ink-uv', micron: 2, position: 1, gsm: 2 },
      { id: '3', materialId: 'adh-sb', micron: 3, position: 2, gsm: 3 },
    ];
    const result = calculateSolventCosts(baseEstimate(layers), layers, materials, 21.8);
    expect(result.laminationCostPerKg).toBeGreaterThan(0);
    expect(result.inkMakeupCostPerKg).toBe(0);
    expect(result.cleaningCostPerKg).toBe(0);
  });

  it('mixed SB + UV ink: makeup uses SB dry GSM only', () => {
    const layers: Layer[] = [
      { id: '1', materialId: 'pet', micron: 12, position: 0, gsm: 16.8 },
      { id: '2', materialId: 'ink-sb', micron: 2, position: 1, gsm: 2 },
      { id: '3', materialId: 'ink-uv', micron: 1, position: 2, gsm: 1 },
    ];
    const sbOnly = calculateSolventCosts(
      baseEstimate([
        { id: '1', materialId: 'pet', micron: 12, position: 0, gsm: 16.8 },
        { id: '2', materialId: 'ink-sb', micron: 2, position: 1, gsm: 2 },
      ]),
      [
        { id: '1', materialId: 'pet', micron: 12, position: 0, gsm: 16.8 },
        { id: '2', materialId: 'ink-sb', micron: 2, position: 1, gsm: 2 },
      ],
      materials,
      18.8
    );
    const mixed = calculateSolventCosts(baseEstimate(layers), layers, materials, 19.8);
    expect(mixed.inkMakeupCostPerM2).toBeCloseTo(sbOnly.inkMakeupCostPerM2, 6);
  });
});
