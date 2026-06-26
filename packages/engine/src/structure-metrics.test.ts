import { describe, it, expect } from 'vitest';
import {
  layerPhysicalThicknessMicron,
  calculateSubstrateGaugeMicron,
  calculateTotalConstructionMicron,
  calculateStructureDensity,
} from './structure-metrics';
import type { Layer, Material } from './types';

const materials = new Map<string, Material>([
  [
    'ldpe',
    {
      id: 'ldpe',
      name: 'LDPE',
      type: 'substrate',
      solidPercent: 100,
      density: 0.92,
      costPerKgUsd: 1.7,
      wastePercent: 0,
    },
  ],
  [
    'ink',
    {
      id: 'ink',
      name: 'SB Ink',
      type: 'ink',
      solidPercent: 35,
      density: 1.15,
      costPerKgUsd: 13,
      wastePercent: 0,
      isSolventBased: true,
    },
  ],
  [
    'adh',
    {
      id: 'adh',
      name: 'Adhesive',
      type: 'adhesive',
      solidPercent: 70,
      density: 1.1,
      costPerKgUsd: 6,
      wastePercent: 0,
      isSolventBased: true,
    },
  ],
]);

describe('structure-metrics', () => {
  it('substrate gauge excludes ink and adhesive', () => {
    const layers: Layer[] = [
      { id: '1', materialId: 'ldpe', micron: 25, position: 0, gsm: 23 },
      { id: '2', materialId: 'ink', micron: 2, position: 1, gsm: 2 },
    ];
    expect(calculateSubstrateGaugeMicron(layers, materials)).toBe(25);
  });

  it('construction micron uses dry gsm ÷ density for ink/adhesive', () => {
    const layers: Layer[] = [
      { id: '1', materialId: 'ldpe', micron: 25, position: 0, gsm: 23 },
      { id: '2', materialId: 'ink', micron: 2, position: 1, gsm: 2 },
    ];
    // 25 + 2/1.15 ≈ 26.739
    expect(calculateTotalConstructionMicron(layers, materials)).toBeCloseTo(26.739, 2);
  });

  it('structure density = total gsm / construction micron', () => {
    const totalGsm = 25;
    const construction = 26.739;
    expect(calculateStructureDensity(totalGsm, construction)).toBeCloseTo(0.935, 2);
  });

  it('layerPhysicalThicknessMicron for adhesive', () => {
    const layer: Layer = { id: 'a', materialId: 'adh', micron: 3, position: 0, gsm: 3 };
    expect(layerPhysicalThicknessMicron(layer, materials.get('adh')!)).toBeCloseTo(
      3 / 1.1,
      4
    );
  });
});
