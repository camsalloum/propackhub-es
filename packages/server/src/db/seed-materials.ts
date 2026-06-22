import { getDatabase, schema } from './index';
import { eq, and } from 'drizzle-orm';
import masterMaterialsFallback from './master-materials-seed.json';
import type { MasterMaterial } from './master-materials-io';
import { PACKAGING_FAMILY, materialSyncKey, costingKeyForMasterKey } from './master-materials-io';
import { roundUsd } from '../utils/usd';
import { itemClassForMasterMaterial, isPlatformPriceSource } from '../utils/item-class';
import { backfillMaterialSubcategories } from './seed-categories';
import { listPlatformMasterMaterials } from './platform-master-data';

type DbMaterial = typeof schema.materials.$inferSelect;

function mapMasterToDbRow(tenantId: string, material: MasterMaterial) {
  const now = new Date();
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
    costingKey: costingKeyForMasterKey(material.key),
    platformMasterKey: material.key,
    platformSyncedAt: now,
    itemClass: itemClassForMasterMaterial(material),
    priceSource: 'platform' as const,
    isTenantOnly: false,
  };
}

const LEGACY_ADHESIVE_NAMES: Record<string, string[]> = {
  'adhesive-sb': ['Adhesive SB (Solvent Based)', 'Solvent Base'],
  'adhesive-wb': ['Adhesive WB (Water Based)', 'Solvent Less'],
  'adhesive-mono-component': ['Mono Component'],
};

const LEGACY_INK_NAMES: Record<string, string[]> = {
  'ink-sb': ['Ink SB (Solvent Based)', 'Common Colors'],
  'ink-uv': ['Ink UV'],
};

function rmMatchKey(m: {
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
}): string {
  return `${m.substrateFamily || ''}|${m.substrateGrade || ''}|${m.hoover || ''}`;
}

function sourceKey(m: {
  type: string;
  name: string;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
}): string {
  return materialSyncKey(m);
}

export function findOrphanSubstrateRows(
  existing: DbMaterial[],
  sourceMaterials: MasterMaterial[]
): DbMaterial[] {
  const sourceKeys = new Set(sourceMaterials.map((m) => sourceKey(m)));
  return existing.filter((row) => {
    if (row.isTenantOnly) return false;
    if (row.type === 'substrate' && row.substrateFamily === PACKAGING_FAMILY) {
      return !sourceKeys.has(sourceKey(row));
    }
    if (row.type === 'substrate') {
      return !sourceKeys.has(sourceKey(row));
    }
    if (row.type === 'ink' || row.type === 'adhesive') {
      return !sourceKeys.has(sourceKey(row));
    }
    return false;
  });
}

export function findExistingMatch(existing: DbMaterial[], material: MasterMaterial): DbMaterial | undefined {
  const byPlatformKey = existing.find(
    (row) => !row.isTenantOnly && row.platformMasterKey === material.key
  );
  if (byPlatformKey) return byPlatformKey;

  const expectedCostingKey = costingKeyForMasterKey(material.key);
  const byCostingKey = existing.find(
    (row) =>
      !row.isTenantOnly &&
      !row.platformMasterKey &&
      row.costingKey === expectedCostingKey
  );
  if (byCostingKey) return byCostingKey;

  if (material.type === 'substrate' && material.substrateFamily === PACKAGING_FAMILY) {
    return existing.find(
      (row) =>
        row.type === 'substrate' &&
        row.substrateFamily === PACKAGING_FAMILY &&
        (row.substrateGrade || row.name) === (material.substrateGrade || material.name)
    );
  }

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

  if (material.type === 'ink' || material.type === 'adhesive') {
    const byFamilyGradeHoover = existing.find(
      (row) => row.type === material.type && rmMatchKey(row) === rmMatchKey(material)
    );
    if (byFamilyGradeHoover) return byFamilyGradeHoover;

    const legacyNames = (
      material.type === 'ink' ? LEGACY_INK_NAMES : LEGACY_ADHESIVE_NAMES
    )[material.key];
    if (legacyNames) {
      const byLegacy = existing.find(
        (row) => row.type === material.type && legacyNames.includes(row.name)
      );
      if (byLegacy) return byLegacy;
    }
    return existing.find((row) => row.type === material.type && row.name === material.name);
  }

  return existing.find((row) => row.type === material.type && row.name === material.name);
}

/**
 * Tenant materials library — seeded from platform master on first registration.
 *
 * Source of truth:
 * - **Platform:** `platform_master_materials` table (admin Master Data page)
 * - **Tenant DB:** copy of platform master on register; licensed users may add/edit rows (tenant-only)
 * - **Sync:** automatic on platform master save; respects `priceSource: manual`
 */
async function loadPlatformMasterMaterials(): Promise<MasterMaterial[]> {
  try {
    const fromDb = await listPlatformMasterMaterials();
    if (fromDb.length > 0) return fromDb;
  } catch {
    // DB not ready or tables missing — fall back to bundled JSON
  }
  return masterMaterialsFallback as MasterMaterial[];
}

export async function seedMaterialsForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();

  try {
    const platformMaterials = await loadPlatformMasterMaterials();
    const materialsToInsert = platformMaterials.map((material) =>
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
  const list = sourceMaterials ?? (await loadPlatformMasterMaterials());
  const existing = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  let inserted = 0;
  let updated = 0;
  const syncedIds = new Set<string>();

  for (const material of list) {
    const match = findExistingMatch(existing, material);
    const row = mapMasterToDbRow(tenantId, material);

    if (match) {
      const patch: Record<string, unknown> = {
        name: row.name,
        type: row.type,
        solidPercent: row.solidPercent,
        density: row.density,
        wastePercent: row.wastePercent,
        isSolventBased: row.isSolventBased,
        substrateFamily: row.substrateFamily,
        substrateGrade: row.substrateGrade,
        hoover: row.hoover,
        costingKey: row.costingKey,
        itemClass: row.itemClass,
        platformMasterKey: material.key,
        platformSyncedAt: new Date(),
        updatedAt: new Date(),
      };

      if (!isPlatformPriceSource(match.priceSource)) {
        patch.costPerKgUsd = row.costPerKgUsd;
        patch.marketPriceUsd = row.marketPriceUsd;
      }

      const [updatedRow] = await db
        .update(schema.materials)
        .set(patch)
        .where(eq(schema.materials.id, match.id))
        .returning();

      syncedIds.add(match.id);
      const idx = existing.findIndex((e: DbMaterial) => e.id === match.id);
      if (idx >= 0 && updatedRow) existing[idx] = updatedRow;
      updated++;
    } else {
      const [created] = await db.insert(schema.materials).values(row).returning();
      existing.push(created);
      syncedIds.add(created.id);
      inserted++;
    }
  }

  const orphans = existing.filter(
    (row: DbMaterial) =>
      !row.isTenantOnly &&
      (row.type === 'substrate' || row.type === 'ink' || row.type === 'adhesive') &&
      !syncedIds.has(row.id)
  );
  let pruned = 0;
  if (options?.pruneOrphans && orphans.length > 0) {
    for (const row of orphans) {
      await db
        .delete(schema.materials)
        .where(and(eq(schema.materials.id, row.id), eq(schema.materials.tenantId, tenantId)));
      pruned++;
    }
  }

  await backfillMaterialSubcategories(tenantId);

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
export async function getMasterMaterialsList(): Promise<MasterMaterial[]> {
  return loadPlatformMasterMaterials();
}
