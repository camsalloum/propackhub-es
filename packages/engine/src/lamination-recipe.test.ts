import { describe, expect, it } from 'vitest';
import {
  calculateLaminationCost,
  DEFAULT_LAMINATION_RECIPES,
  deriveBinderConcentrateStats,
  summarizeRecipe,
} from './lamination-recipe';

const eaPrice = (c: { pricePerKgUsd?: number }) => c.pricePerKgUsd ?? 1;

describe('lamination recipes', () => {
  it('GP matches spreadsheet totals at 3 gsm dry', () => {
    const recipe = DEFAULT_LAMINATION_RECIPES.GP;
    const summary = summarizeRecipe(recipe, eaPrice, 3);
    expect(summary.totalParts).toBeCloseTo(257, 0);
    expect(summary.totalSolids).toBeCloseTo(90, 0);
    expect(summary.usdPerKgWet).toBeCloseTo(2.06, 2);
    expect(summary.usdPerKgSolid).toBeCloseTo(5.88, 2);
    expect(summary.usdPer1000Sqm).toBeCloseTo(17.65, 1);

    const cost = calculateLaminationCost(3, recipe, eaPrice);
    expect(cost.totalCostPerM2).toBeCloseTo(0.01765, 4);
    expect(cost.eaGsm).toBeGreaterThan(cost.dryGsm);
  });

  it('MP matches spreadsheet totals at 3 gsm dry', () => {
    const recipe = DEFAULT_LAMINATION_RECIPES.MP;
    const summary = summarizeRecipe(recipe, eaPrice, 3);
    expect(summary.usdPerKgWet).toBeCloseTo(2.22, 2);
    expect(summary.usdPerKgSolid).toBeCloseTo(6.35, 1);
    expect(summary.usdPer1000Sqm).toBeCloseTo(19.04, 1);
  });

  it('HP SB matches spreadsheet totals at 3 gsm dry', () => {
    const recipe = DEFAULT_LAMINATION_RECIPES.HP;
    const summary = summarizeRecipe(recipe, (c) => c.pricePerKgUsd ?? 1.54, 3);
    expect(summary.usdPerKgWet).toBeCloseTo(2.84, 2);
    expect(summary.usdPerKgSolid).toBeCloseTo(8.13, 1);
    expect(summary.usdPer1000Sqm).toBeCloseTo(24.4, 1);
  });

  it('deriveBinderConcentrateStats excludes EA from master row', () => {
    const stats = deriveBinderConcentrateStats(DEFAULT_LAMINATION_RECIPES.GP);
    expect(stats.solidPercent).toBe(75);
    expect(stats.costPerKgUsd).toBeCloseTo(392.4 / 90, 2);
  });
});
