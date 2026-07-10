import { describe, expect, it } from 'vitest';
import type { MasterMaterial } from '../db/master-materials-io';
import { applySolventCommonAverage, computeSolventCommonAverage } from './solvent-common';

describe('solvent common average', () => {
  it('averages only acetate / ethanol / methoxy / ethoxy peers', () => {
    const materials = [
      { key: 'solvent-ethyl-acetate', type: 'solvent' as const, costPerKgUsd: 1.0, density: 0.9 },
      { key: 'solvent-ethanol', type: 'solvent' as const, costPerKgUsd: 2.0, density: 0.8 },
      { key: 'solvent-methoxy-propanol', type: 'solvent' as const, costPerKgUsd: 3.0, density: 0.92 },
      { key: 'solvent-ethoxy-propanol', type: 'solvent' as const, costPerKgUsd: 4.0, density: 0.92 },
      { key: 'solvent-thf', type: 'solvent' as const, costPerKgUsd: 19.59, density: 0.89 },
      { key: 'solvent-ipa', type: 'solvent' as const, costPerKgUsd: 99, density: 0.79 },
      { key: 'solvent-common', type: 'solvent' as const, costPerKgUsd: 0, density: 0 },
    ];
    const avg = computeSolventCommonAverage(materials);
    expect(avg).toEqual({ costPerKgUsd: 2.5, density: 0.885 });

    const updated = applySolventCommonAverage(materials as MasterMaterial[]);
    const common = updated.find((m) => m.key === 'solvent-common');
    expect(common?.costPerKgUsd).toBe(2.5);
    expect(common?.density).toBe(0.885);
  });

  it('ignores non-peer solvents when resolving by platformMasterKey', () => {
    const avg = computeSolventCommonAverage([
      {
        platformMasterKey: 'solvent-ethyl-acetate',
        type: 'solvent',
        costPerKgUsd: 2,
        density: 0.9,
      },
      {
        platformMasterKey: 'solvent-thf',
        type: 'solvent',
        costPerKgUsd: 20,
        density: 0.89,
      },
    ]);
    expect(avg).toEqual({ costPerKgUsd: 2, density: 0.9 });
  });
});
