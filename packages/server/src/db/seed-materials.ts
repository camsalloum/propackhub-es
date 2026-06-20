import { getDatabase, schema } from './index';
import { eq, and } from 'drizzle-orm';
import masterMaterials from './master-materials-seed.json';
import type { MasterMaterial } from './master-materials-io';
import { roundUsd } from '../utils/usd';

type DbMaterial = typeof schema.materials.$inferSelect;

function mapMasterToDbRow(tenantId: string, material: MasterMaterial) {
  return {
    tenantId,
    name: material.name,
    type: material.type as 'substrate' | 'ink' | 'adhesive',
    solidPercent: material.solidPercent,
    density: material.density.toString(),
    costPerKgUsd: roundUsd(material.costPerKgUsd).toFixed(2),
    wastePercent: material.wastePercent ?? 0,
    isSolventBased: material.isSolventBased || false,
    substrateFamily: material.substrateFamily || null,
    substrateGrade: material.substrateGrade || null,
    hoover: material.hoover || null,
    marketPriceUsd: roundUsd(material.marketPriceUsd ?? material.costPerKgUsd).toFixed(2),
  };
}

function substrateMatchKey(m: {
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
}): string {
  return `${m.substrateFamily || ''}|${m.substrateGrade || ''}|${m.hoover || ''}`;
}

export function findOrphanSubstrateRows(
  existing: DbMaterial[],
  sourceMaterials: MasterMaterial[]
): DbMaterial[] {
  const sourceKeys = new Set(
    sourceMaterials
      .filter((m) => m.type === 'substrate')
      .map((m) => substrateMatchKey(m))
  );
  return existing.filter(
    (row) => row.type === 'substrate' && !sourceKeys.has(substrateMatchKey(row))
  );
}

function findExistingMatch(existing: DbMaterial[], material: MasterMaterial): DbMaterial | undefined {
  if (material.type === 'substrate') {
    const byFamilyGradeHoover = existing.find(
      (row) =>
        row.type === 'substrate' &&
        row.substrateFamily === material.substrateFamily &&
        row.substrateGrade === material.substrateGrade &&
        (row.hoover || '') === (material.hoover || '')
    );
    if (byFamilyGradeHoover) return byFamilyGradeHoover;
    return existing.find((row) => row.type === 'substrate' && row.name === material.name);
  }

  return existing.find((row) => row.type === material.type && row.name === material.name);
}

/**
 * Seed master materials library for a new tenant
 * Called automatically on tenant registration
 */
export async function seedMaterialsForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();

  try {
    const materialsToInsert = (masterMaterials as MasterMaterial[]).map((material) =>
      mapMasterToDbRow(tenantId, material)
    );

    const inserted = await db.insert(schema.materials).values(materialsToInsert).returning();

    console.log(`✓ Seeded ${inserted.length} materials for tenant ${tenantId}`);
    return inserted.length;
  } catch (error) {
    console.error('Failed to seed materials:', error);
    throw error;
  }
}

/** Idempotent — seeds master materials when tenant library is empty. */
export async function ensureMaterialsForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();
  const existing = await db
    .select({ id: schema.materials.id })
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return 0;
  }

  return seedMaterialsForTenant(tenantId);
}

/**
 * Upsert master library rows for a tenant (insert missing, update matched).
 * Legacy tenant-only substrates are left untouched.
 * @param sourceMaterials — when provided (e.g. Excel refresh), use instead of cached seed import
 */
export async function syncMaterialsForTenant(
  tenantId: string,
  sourceMaterials?: MasterMaterial[],
  options?: { pruneOrphans?: boolean }
): Promise<{ inserted: number; updated: number; orphans: number; pruned: number }> {
  const db = getDatabase();
  const list = sourceMaterials ?? (masterMaterials as MasterMaterial[]);
  const existing = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  let inserted = 0;
  let updated = 0;

  for (const material of list) {
    const match = findExistingMatch(existing, material);
    const row = mapMasterToDbRow(tenantId, material);

    if (match) {
      await db
        .update(schema.materials)
        .set({
          name: row.name,
          type: row.type,
          solidPercent: row.solidPercent,
          density: row.density,
          costPerKgUsd: row.costPerKgUsd,
          wastePercent: row.wastePercent,
          isSolventBased: row.isSolventBased,
          substrateFamily: row.substrateFamily,
          substrateGrade: row.substrateGrade,
          hoover: row.hoover,
          marketPriceUsd: row.marketPriceUsd,
          updatedAt: new Date(),
        })
        .where(eq(schema.materials.id, match.id));
      updated++;
    } else {
      const [created] = await db.insert(schema.materials).values(row).returning();
      existing.push(created);
      inserted++;
    }
  }

  const orphans = findOrphanSubstrateRows(existing, list);
  let pruned = 0;
  if (options?.pruneOrphans && orphans.length > 0) {
    for (const row of orphans) {
      await db
        .delete(schema.materials)
        .where(and(eq(schema.materials.id, row.id), eq(schema.materials.tenantId, tenantId)));
      pruned++;
    }
  }

  return { inserted, updated, orphans: orphans.length, pruned };
}

/** Remove tenant substrate rows not present in the Excel/master source list (no upsert). */
export async function pruneOrphanSubstratesForTenant(
  tenantId: string,
  sourceMaterials: MasterMaterial[]
): Promise<number> {
  const db = getDatabase();
  const existing = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  const orphans = findOrphanSubstrateRows(existing, sourceMaterials);
  for (const row of orphans) {
    await db
      .delete(schema.materials)
      .where(and(eq(schema.materials.id, row.id), eq(schema.materials.tenantId, tenantId)));
  }
  return orphans.length;
}

/**
 * Get master materials list (for preview/admin)
 */
export function getMasterMaterialsList() {
  return masterMaterials;
}
