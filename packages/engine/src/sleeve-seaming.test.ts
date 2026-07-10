import { describe, it, expect } from 'vitest';
import {
  calculateSeamingSolventCost,
  resolveSeamingBlendPricePerKg,
  DEFAULT_SEAMING_SOLVENT_RECIPE,
  DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM,
} from './sleeve-seaming';
import { calculateSolventCosts } from './solvent-costing';
import type { Estimate, Layer, Material } from './types';

describe('sleeve seaming solvent', () => {
  it('blends 75/25 THF/Dioxolane', () => {
    expect(resolveSeamingBlendPricePerKg(20, 20, DEFAULT_SEAMING_SOLVENT_RECIPE)).toBe(20);
    expect(resolveSeamingBlendPricePerKg(20, 10, DEFAULT_SEAMING_SOLVENT_RECIPE)).toBe(17.5);
  });

  it('costs seaming at default 0.25 g/m²', () => {
    const { costPerM2, costPerKg } = calculateSeamingSolventCost(
      DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM,
      20,
      100
    );
    expect(costPerM2).toBeCloseTo(0.005, 6);
    expect(costPerKg).toBeCloseTo(0.05, 6);
  });

  it('adds seaming line when SLEEVE substrate present', () => {
    const sleeve: Material = {
      id: 'pvc',
      name: 'PVC Shrink',
      type: 'substrate',
      solidPercent: 100,
      density: 1.32,
      costPerKgUsd: 2,
      wastePercent: 2,
      substrateFamily: 'SLEEVE',
    };
    const materials = new Map([['pvc', sleeve]]);
    const layers: Layer[] = [{ id: '1', materialId: 'pvc', micron: 40, position: 0, gsm: 52.8 }];
    const estimate: Estimate = {
      id: 'e1',
      tenantId: 't1',
      jobName: 'sleeve',
      status: 'draft',
      layers,
      dimensions: { productType: 'sleeve', reelWidthMm: 200, cutoffMm: 100, numberOfUps: 1 },
      markupPercent: 0,
      platesPerKg: 0,
      deliveryPerKg: 0,
      processes: [],
      slabs: [],
      displayCurrencyCode: 'USD',
      exchangeRateUsdToDisplay: 1,
      orderQuantityKg: 1000,
      sleeveSeamingSolventGsm: 0.25,
      seamingSolventCostPerKgUsd: 20,
    };
    const result = calculateSolventCosts(estimate, layers, materials, 52.8);
    expect(result.seamingCostPerM2).toBeCloseTo(0.005, 6);
    expect(result.totalCostPerM2).toBeCloseTo(0.005, 6);
    expect(result.laminationCostPerKg).toBe(0);
  });
});
