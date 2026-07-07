import { describe, it, expect } from 'vitest';
import {
  defaultCutoffMm,
  rollFieldValuesFromDimensions,
  seedRollDimensionPatch,
} from './rollConfiguratorCatalog';

describe('rollConfiguratorCatalog CO defaults', () => {
  it('keeps CO at 0 for plain continuous web', () => {
    expect(defaultCutoffMm(250, { continuousWeb: true })).toBe(0);
    const patch = seedRollDimensionPatch({ reelWidthMm: 250, cutoffMm: -1 }, { continuousWeb: true });
    expect(patch.cutoffMm).toBe(0);
    const vals = rollFieldValuesFromDimensions({ cutoffMm: 0, reelWidthMm: 250 }, { continuousWeb: true });
    expect(vals.CO).toBe(0);
  });

  it('seeds printed rolls with CO proportional to reel width', () => {
    expect(defaultCutoffMm(250, { continuousWeb: false })).toBe(150);
    expect(defaultCutoffMm(500, { continuousWeb: false })).toBe(300);
    expect(defaultCutoffMm(35, { isLabels: true, continuousWeb: false })).toBe(180);

    const patch = seedRollDimensionPatch({ reelWidthMm: 0, cutoffMm: 0 }, { continuousWeb: false });
    expect(patch.reelWidthMm).toBe(250);
    expect(patch.cutoffMm).toBe(150);
  });

  it('replaces template placeholder CO=0 on printed rolls', () => {
    const patch = seedRollDimensionPatch(
      { reelWidthMm: 300, cutoffMm: 0, configureFromTemplate: 1 as unknown as number },
      { continuousWeb: false }
    );
    expect(patch.cutoffMm).toBe(180);
    expect(patch.reelWidthMm).toBeUndefined();
  });

  it('shows proportional CO in field values when stored CO is 0 on printed rolls', () => {
    const vals = rollFieldValuesFromDimensions({ reelWidthMm: 400, cutoffMm: 0 }, { continuousWeb: false });
    expect(vals.CO).toBe(240);
  });
});
