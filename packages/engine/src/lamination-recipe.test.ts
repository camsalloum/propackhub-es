import { describe, expect, it } from 'vitest';
import {
  calculateLaminationCost,
  DEFAULT_LAMINATION_RECIPES,
  deriveBinderConcentrateStats,
  summarizeRecipe,
} from './lamination-recipe';

const eaPrice = (c: { pricePerKgUsd?: number }) => c.pricePerKgUsd ?? 1;

describe('lamination recipes', () => {
  it('MP foil (675) matches plant sheet mix ~40% solid after EA', () => {
    const recipe = DEFAULT_LAMINATION_RECIPES.MP;
    const summary = summarizeRecipe(recipe, eaPrice, 3);
    expect(summary.totalParts).toBeCloseTo(233, 0);
    expect(summary.mixSolidPercent).toBeCloseTo(40.2, 0);
    expect(summary.usdPerKgWet).toBeCloseTo(2.25, 2);
    expect(summary.usdPerKgSolid).toBeCloseTo(5.59, 1);
    expect(summary.usdPer1000Sqm).toBeCloseTo(16.78, 1);

    const cost = calculateLaminationCost(3, recipe, eaPrice);
    expect(cost.eaGsm).toBeGreaterThan(cost.dryGsm);
  });

  it('GP aliases MP foil chemistry', () => {
    const gp = DEFAULT_LAMINATION_RECIPES.GP;
    const mp = DEFAULT_LAMINATION_RECIPES.MP;
    expect(gp.components.map((c) => c.parts)).toEqual(mp.components.map((c) => c.parts));
  });

  it('HP liquid (655) matches plant sheet mix ~40% solid after EA', () => {
    const recipe = DEFAULT_LAMINATION_RECIPES.HP;
    const summary = summarizeRecipe(recipe, (c) => c.pricePerKgUsd ?? 1.54, 3);
    expect(summary.mixSolidPercent).toBeCloseTo(39.9, 0);
    expect(summary.usdPerKgWet).toBeCloseTo(3.02, 2);
    expect(summary.usdPerKgSolid).toBeCloseTo(7.57, 1);
    expect(summary.usdPer1000Sqm).toBeCloseTo(22.71, 1);
  });

  it('deriveBinderConcentrateStats excludes EA from master row', () => {
    const stats = deriveBinderConcentrateStats(DEFAULT_LAMINATION_RECIPES.MP);
    expect(stats.solidPercent).toBe(75);
    expect(stats.liquidCostUsd).toBeCloseTo(3.33, 2);
    expect(stats.costPerKgUsd).toBeCloseTo(4.44, 2);
  });
});
