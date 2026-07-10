export const DEFAULT_SOLVENT_COST_PER_KG_USD = 1.54;
export const DEFAULT_SOLVENT_RATIO = 1.0;
export const SOLVENT_COMMON_MASTER_KEY = 'solvent-common';
export const SOLVENT_SEAMING_MIX_KEY = 'solvent-sleeve-seaming';

export const SOLVENT_RATIO_TOOLTIP =
  'Dry ink/adhesive GSM on the film ÷ this ratio = solvent GSM used for costing. ' +
  '1.0 means 1:1 (1 kg solvent per 1 kg dry solids on SB ink/adhesive layers).';

type SolventMaterialLike = {
  id: string;
  costPerKgUsd: string | number;
  platformMasterKey?: string | null;
  name?: string | null;
  type?: string | null;
};

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
      (m.platformMasterKey === SOLVENT_COMMON_MASTER_KEY || m.name === 'Solvent Common')
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
      (m.platformMasterKey === SOLVENT_COMMON_MASTER_KEY || m.name === 'Solvent Common')
  );
  return common?.id ?? materials.find((m) => m.type === 'solvent')?.id ?? null;
}

export function listSolventMaterials<T extends SolventMaterialLike>(materials: T[]): T[] {
  return materials
    .filter(
      (m) =>
        m.type === 'solvent' &&
        m.platformMasterKey !== SOLVENT_SEAMING_MIX_KEY &&
        m.name !== 'Sleeve Seaming Mix'
    )
    .sort((a, b) => {
      if (a.platformMasterKey === SOLVENT_COMMON_MASTER_KEY || a.name === 'Solvent Common') return -1;
      if (b.platformMasterKey === SOLVENT_COMMON_MASTER_KEY || b.name === 'Solvent Common') return 1;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
}
