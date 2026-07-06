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
