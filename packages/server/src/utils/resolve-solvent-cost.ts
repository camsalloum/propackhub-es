/** Default solvent $/kg when no library row is linked (Solvent Common seed average). */
export const DEFAULT_SOLVENT_COST_PER_KG_USD = 1.54;

export const DEFAULT_SOLVENT_RATIO = 1.0;

export const SOLVENT_COMMON_MASTER_KEY = 'solvent-common';

type SolventMaterialLike = {
  id: string;
  costPerKgUsd: string | number;
  platformMasterKey?: string | null;
  costingKey?: string | null;
  name?: string | null;
  type?: string | null;
};

/** Resolve $/kg for solvent-mix from estimate selection + tenant library. */
export function resolveSolventCostPerKgUsd(
  materials: SolventMaterialLike[],
  opts: {
    solventMaterialId?: string | null;
    solventCostPerKgUsd?: number | null;
  }
): number {
  if (opts.solventCostPerKgUsd != null && Number.isFinite(opts.solventCostPerKgUsd)) {
    return Number(opts.solventCostPerKgUsd);
  }
  if (opts.solventMaterialId) {
    const picked = materials.find((m) => m.id === opts.solventMaterialId);
    if (picked) {
      const cost = Number(picked.costPerKgUsd);
      if (Number.isFinite(cost) && cost > 0) return cost;
    }
  }
  const common = materials.find(
    (m) =>
      m.type === 'solvent' &&
      (m.platformMasterKey === SOLVENT_COMMON_MASTER_KEY ||
        m.costingKey === 'solvent-common' ||
        m.name === 'Solvent Common')
  );
  if (common) {
    const cost = Number(common.costPerKgUsd);
    if (Number.isFinite(cost) && cost > 0) return cost;
  }
  return DEFAULT_SOLVENT_COST_PER_KG_USD;
}

export function findDefaultSolventMaterialId(materials: SolventMaterialLike[]): string | null {
  const common = materials.find(
    (m) =>
      m.type === 'solvent' &&
      (m.platformMasterKey === SOLVENT_COMMON_MASTER_KEY ||
        m.costingKey === 'solvent-common' ||
        m.name === 'Solvent Common')
  );
  return common?.id ?? materials.find((m) => m.type === 'solvent')?.id ?? null;
}
