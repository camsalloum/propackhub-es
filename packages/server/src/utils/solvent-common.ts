import type { MasterMaterial } from '../db/master-materials-io';

export const SOLVENT_COMMON_KEY = 'solvent-common';
/** Mix formula row — not a stock solvent; exclude from Solvent Common average. */
export const SOLVENT_SEAMING_MIX_KEY = 'solvent-sleeve-seaming';

/**
 * Solvent Common = simple average of these grades only (ink dilution pool).
 * Excludes IPA/MEK/toluene/THF/dioxolane/MPA/etc.
 */
export const SOLVENT_COMMON_PEER_KEYS = [
  'solvent-ethyl-acetate',
  'solvent-ethanol',
  'solvent-methoxy-propanol',
  'solvent-ethoxy-propanol',
] as const;

const PEER_KEY_SET = new Set<string>(SOLVENT_COMMON_PEER_KEYS);

function materialKey(m: { key?: string | null; platformMasterKey?: string | null }): string | null {
  const k = m.key || m.platformMasterKey;
  return k ? String(k) : null;
}

/** Recompute Solvent Common avg $/kg and density from the dilution peer set. */
export function computeSolventCommonAverage(
  materials: Array<{
    key?: string | null;
    platformMasterKey?: string | null;
    type: string;
    costPerKgUsd: number;
    density: number;
  }>
): { costPerKgUsd: number; density: number } | null {
  const peers = materials.filter((m) => {
    const k = materialKey(m);
    return (
      m.type === 'solvent' &&
      k != null &&
      PEER_KEY_SET.has(k) &&
      m.costPerKgUsd > 0 &&
      m.density > 0
    );
  });
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
          hoover: 'Average of Ethyl Acetate, Ethanol, Methoxy Propanol, Ethoxy Propanol',
        }
      : m
  );
}
