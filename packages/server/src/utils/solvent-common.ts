import type { MasterMaterial } from '../db/master-materials-io';

export const SOLVENT_COMMON_KEY = 'solvent-common';

/** Recompute Solvent Common avg $/kg and density from catalog solvents (excludes Solvent Common row). */
export function computeSolventCommonAverage(
  materials: Array<Pick<MasterMaterial, 'key' | 'type' | 'costPerKgUsd' | 'density'>>
): { costPerKgUsd: number; density: number } | null {
  const peers = materials.filter(
    (m) => m.type === 'solvent' && m.key !== SOLVENT_COMMON_KEY && m.costPerKgUsd > 0 && m.density > 0
  );
  if (peers.length === 0) return null;

  const costPerKgUsd =
    Math.round((peers.reduce((s, m) => s + m.costPerKgUsd, 0) / peers.length) * 100) / 100;
  const density =
    Math.round((peers.reduce((s, m) => s + m.density, 0) / peers.length) * 1000) / 1000;

  return { costPerKgUsd, density };
}

export function applySolventCommonAverage<T extends MasterMaterial>(materials: T[]): T[] {
  const avg = computeSolventCommonAverage(materials);
  if (!avg) return materials;

  return materials.map((m) =>
    m.key === SOLVENT_COMMON_KEY
      ? {
          ...m,
          costPerKgUsd: avg.costPerKgUsd,
          density: avg.density,
          marketPriceUsd: avg.costPerKgUsd,
          hoover: 'Average of all solvents (price + density)',
        }
      : m
  );
}
