import { and, eq, inArray } from 'drizzle-orm';
import type { Material } from '@es/engine';
import type { LaminationRecipe } from '@es/engine';
import { getDatabase, schema } from '../db';
import type { materials } from '../db/schema';

export type MaterialRow = typeof materials.$inferSelect;

export function toEngineMaterial(m: MaterialRow): Material {
  return {
    id: m.id,
    name: m.name,
    type: m.type as Material['type'],
    solidPercent: m.solidPercent,
    density: parseFloat(m.density),
    costPerKgUsd: parseFloat(m.costPerKgUsd),
    wastePercent: m.wastePercent,
    isSolventBased: m.isSolventBased ?? false,
    substrateFamily: m.substrateFamily,
    substrateGrade: m.substrateGrade,
    hoover: m.hoover,
    marketPriceUsd: m.marketPriceUsd ? parseFloat(m.marketPriceUsd) : null,
    laminationRecipe: (m.laminationRecipe as LaminationRecipe | null) ?? null,
    laminationTier: (m.laminationRecipe as LaminationRecipe | null)?.tier ?? null,
    accessoryKind: m.accessoryKind ?? null,
    costPerMeterUsd: m.costPerMeterUsd != null ? parseFloat(m.costPerMeterUsd) : null,
    costPerPieceUsd: m.costPerPieceUsd != null ? parseFloat(m.costPerPieceUsd) : null,
    weightGramPerMeter: m.weightGramPerMeter != null ? parseFloat(m.weightGramPerMeter) : null,
    weightGramPerPiece: m.weightGramPerPiece != null ? parseFloat(m.weightGramPerPiece) : null,
    platformMasterKey: m.platformMasterKey ?? null,
    priceUnit: m.priceUnit ?? null,
    unitPriceUsd: m.unitPriceUsd != null ? parseFloat(m.unitPriceUsd) : null,
  };
}

export function buildEngineMaterialMap(rows: MaterialRow[]): Map<string, Material> {
  return new Map(rows.map((m) => [m.id, toEngineMaterial(m)]));
}

/** Load only materials referenced by the given IDs (tenant-scoped). */
export async function loadTenantMaterialsByIds(
  tenantId: string,
  materialIds: Iterable<string | null | undefined>
): Promise<MaterialRow[]> {
  const ids = [...new Set([...materialIds].filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return [];
  const db = getDatabase();
  return db
    .select()
    .from(schema.materials)
    .where(and(eq(schema.materials.tenantId, tenantId), inArray(schema.materials.id, ids)));
}

const SEAMING_SOLVENT_KEYS = ['solvent-thf', 'solvent-dioxolane'] as const;

const PACKAGING_PLATFORM_KEYS = [
  'packaging-ld-wrap-film',
  'packaging-stretch-wrap-roll',
  'packaging-core-76',
  'packaging-core-77',
  'packaging-core-152',
  'packaging-pallet-wood',
  'packaging-carton-sleeve-600',
  'packaging-carton-default',
] as const;

const CONSUMABLES_PLATFORM_KEYS = [
  'consumables-mounting-tape',
  'consumables-other',
] as const;

/** THF + Dioxolane rows for sleeve seaming blend price. */
export async function loadTenantSeamingSolventMaterials(
  tenantId: string
): Promise<MaterialRow[]> {
  const db = getDatabase();
  return db
    .select()
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        inArray(schema.materials.platformMasterKey, [...SEAMING_SOLVENT_KEYS])
      )
    );
}

/** Packaging catalog rows for outbound costing. */
export async function loadTenantPackagingMaterials(tenantId: string): Promise<MaterialRow[]> {
  const db = getDatabase();
  return db
    .select()
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        inArray(schema.materials.platformMasterKey, [...PACKAGING_PLATFORM_KEYS])
      )
    );
}

/** Process consumables (mounting tape + other averaged groups). */
export async function loadTenantConsumablesMaterials(tenantId: string): Promise<MaterialRow[]> {
  const db = getDatabase();
  return db
    .select()
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        inArray(schema.materials.platformMasterKey, [...CONSUMABLES_PLATFORM_KEYS])
      )
    );
}

/** Merge layer/solvent materials with seaming solvents + packaging + consumables (dedupe by id). */
export async function loadTenantMaterialsForEstimate(
  tenantId: string,
  materialIds: Iterable<string | null | undefined>
): Promise<MaterialRow[]> {
  const [byId, seaming, packaging, consumables] = await Promise.all([
    loadTenantMaterialsByIds(tenantId, materialIds),
    loadTenantSeamingSolventMaterials(tenantId),
    loadTenantPackagingMaterials(tenantId),
    loadTenantConsumablesMaterials(tenantId),
  ]);
  const map = new Map<string, MaterialRow>();
  for (const row of [...byId, ...seaming, ...packaging, ...consumables]) map.set(row.id, row);
  return [...map.values()];
}
