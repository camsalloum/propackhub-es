import { describe, it, expect } from 'vitest';
import { derivePrintingWebClass, stackNeedsSolventMix } from './layer-stack';
import type { Material } from './types';

const sbInk: Material = {
  id: 'ink-sb',
  name: 'Ink SB',
  type: 'ink',
  solidPercent: 30,
  density: 1,
  costPerKgUsd: 5,
  wastePercent: 5,
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

const materials = [sbInk, uvInk, adhesiveSb, pet];

describe('derivePrintingWebClass', () => {
  it('returns wide_web for SB ink only', () => {
    expect(derivePrintingWebClass([{ materialId: 'ink-sb' }], materials)).toBe('wide_web');
  });

  it('returns narrow_web when UV ink is present', () => {
    expect(derivePrintingWebClass([{ materialId: 'ink-uv' }], materials)).toBe('narrow_web');
  });
});

describe('stackNeedsSolventMix', () => {
  it('is true for SB ink or adhesive', () => {
    expect(stackNeedsSolventMix([{ materialId: 'ink-sb' }], materials)).toBe(true);
    expect(stackNeedsSolventMix([{ materialId: 'adh-sb' }], materials)).toBe(true);
  });

  it('is false for substrate-only or UV ink', () => {
    expect(stackNeedsSolventMix([{ materialId: 'pet' }], materials)).toBe(false);
    expect(stackNeedsSolventMix([{ materialId: 'ink-uv' }], materials)).toBe(false);
  });
});
