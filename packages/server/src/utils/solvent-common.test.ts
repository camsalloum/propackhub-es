import { describe, expect, it } from 'vitest';
import { applySolventCommonAverage, computeSolventCommonAverage } from './solvent-common';

describe('solvent common average', () => {
  it('averages peer solvent prices and density', () => {
    const materials = [
      { key: 'solvent-ethyl-acetate', type: 'solvent' as const, costPerKgUsd: 1.0, density: 0.9 },
      { key: 'solvent-ipa', type: 'solvent' as const, costPerKgUsd: 2.0, density: 0.8 },
      { key: 'solvent-common', type: 'solvent' as const, costPerKgUsd: 0, density: 0 },
    ];
    const avg = computeSolventCommonAverage(materials);
    expect(avg).toEqual({ costPerKgUsd: 1.5, density: 0.85 });

    const updated = applySolventCommonAverage(materials);
    const common = updated.find((m) => m.key === 'solvent-common');
    expect(common?.costPerKgUsd).toBe(1.5);
    expect(common?.density).toBe(0.85);
  });
});
