import { describe, it, expect } from 'vitest';
import {
  defaultInkPrintingProcess,
  inkSolventRatioForProcess,
  INK_SOLVENT_RATIO_FLEXO,
  INK_SOLVENT_RATIO_ROTOGRAVURE,
} from './ink-printing';
import type { Material } from './types';

const materials = new Map<string, Material>([
  [
    'pet',
    {
      id: 'pet',
      name: 'PET Transparent',
      type: 'substrate',
      solidPercent: 100,
      density: 1.38,
      costPerKgUsd: 2.8,
      wastePercent: 5,
      substrateFamily: 'PET',
    },
  ],
  [
    'ldpe',
    {
      id: 'ldpe',
      name: 'LDPE Natural',
      type: 'substrate',
      solidPercent: 100,
      density: 0.92,
      costPerKgUsd: 2.1,
      wastePercent: 5,
      substrateFamily: 'PE',
    },
  ],
  [
    'ink-sb',
    {
      id: 'ink-sb',
      name: 'Ink SB',
      type: 'ink',
      solidPercent: 30,
      density: 1,
      costPerKgUsd: 40,
      wastePercent: 10,
      isSolventBased: true,
    },
  ],
]);

describe('ink printing defaults', () => {
  it('PE substrate stack defaults to flexo', () => {
    expect(
      defaultInkPrintingProcess([{ materialId: 'ldpe' }, { materialId: 'ink-sb' }], materials)
    ).toBe('flexo');
  });

  it('non-PE substrate defaults to rotogravure', () => {
    expect(
      defaultInkPrintingProcess([{ materialId: 'pet' }, { materialId: 'ink-sb' }], materials)
    ).toBe('rotogravure');
  });

  it('flexo uses higher ratio (less makeup solvent) than rotogravure', () => {
    expect(inkSolventRatioForProcess('flexo')).toBe(INK_SOLVENT_RATIO_FLEXO);
    expect(inkSolventRatioForProcess('rotogravure')).toBe(INK_SOLVENT_RATIO_ROTOGRAVURE);
    expect(INK_SOLVENT_RATIO_FLEXO).toBeGreaterThan(INK_SOLVENT_RATIO_ROTOGRAVURE);
  });
});
