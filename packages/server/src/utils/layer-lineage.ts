/** MES Phase B — stable material key snapshots on estimate layers. */

export type MaterialLineageSource = {
  name: string;
  costPerKgUsd: string;
  platformMasterKey?: string | null;
  costingKey?: string | null;
};

export function snapshotsFromMaterial(material: MaterialLineageSource) {
  return {
    material_name_snapshot: material.name,
    unit_cost_snapshot_usd: material.costPerKgUsd,
    platform_master_key_snapshot: material.platformMasterKey ?? null,
    costing_key_snapshot: material.costingKey ?? null,
  };
}

export function buildLayerInsertValues(args: {
  estimateId: string;
  materialId: string;
  micron: string | number;
  position: number;
  material?: MaterialLineageSource | null;
  /** Per-layer price override — when set, calculation uses this instead of the library price */
  unitCostOverrideUsd?: number | null;
}) {
  const base = {
    estimateId: args.estimateId,
    materialId: args.materialId,
    micron: String(args.micron),
    position: args.position,
    ...(args.material ? snapshotsFromMaterial(args.material) : {}),
  };
  // If an explicit price override is provided, write it as unit_cost_snapshot_usd
  if (args.unitCostOverrideUsd != null) {
    (base as any).unit_cost_snapshot_usd = String(args.unitCostOverrideUsd);
  }
  return base;
}

export function toMaterialLineageSource(m: {
  name: string;
  costPerKgUsd: string;
  platformMasterKey?: string | null;
  costingKey?: string | null;
}): MaterialLineageSource {
  return {
    name: m.name,
    costPerKgUsd: m.costPerKgUsd,
    platformMasterKey: m.platformMasterKey,
    costingKey: m.costingKey,
  };
}
