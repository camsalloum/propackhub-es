import { getDatabase, schema } from './index';
import { eq, and, inArray } from 'drizzle-orm';
import { log } from '../utils/logger';
import masterMaterialsFallback from './master-materials-seed.json';
import type { MasterMaterial } from './master-materials-io';
import { PACKAGING_FAMILY, materialSyncKey, costingKeyForMasterKey } from './master-materials-io';
import { roundUsd } from '../utils/usd';
import { itemClassForMasterMaterial } from '../utils/item-class';
import { backfillMaterialSubcategories } from './seed-categories';
import { listPlatformMasterMaterials } from './platform-master-data';

type DbMaterial = typeof schema.materials.$inferSelect;

/** Retired adhesive platform keys → replacement key (plant-sheet cutover). */
export const ADHESIVE_RETIREMENT_MAP: Record<string, string> = {
  'adhesive-sb-gp': 'adhesive-sb-mp',
  'adhesive-sb': 'adhesive-sb-mp',
  'adhesive-wb': 'adhesive-sl-dry',
  'adhesive-mono-component': 'adhesive-mono',
};

/**
 * Remap estimate layers from retired adhesive materials onto replacements, then delete orphans.
 * Safe when layers still reference GP/WB/old-mono rows (FK would otherwise block prune).
 */
export async function remappingRetiredAdhesivesForTenant(
  tenantId: string
): Promise<{ remappedLayers: number; deleted: number }> {
  const db = getDatabase();
  const retiredKeys = Object.keys(ADHESIVE_RETIREMENT_MAP);
  const replacementKeys = [...new Set(Object.values(ADHESIVE_RETIREMENT_MAP))];

  const rows = await db
    .select({
      id: schema.materials.id,
      platformMasterKey: schema.materials.platformMasterKey,
    })
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        eq(schema.materials.type, 'adhesive'),
        eq(schema.materials.isTenantOnly, false),
        inArray(schema.materials.platformMasterKey, [...retiredKeys, ...replacementKeys])
      )
    );

  const byKey = new Map<string, string>();
  for (const row of rows) {
    const key = row.platformMasterKey?.trim();
    if (key) byKey.set(key, row.id);
  }

  let remappedLayers = 0;
  let deleted = 0;

  for (const [oldKey, newKey] of Object.entries(ADHESIVE_RETIREMENT_MAP)) {
    const oldId = byKey.get(oldKey);
    const newId = byKey.get(newKey);
    if (!oldId || !newId || oldId === newId) continue;

    const updated = await db
      .update(schema.layers)
      .set({ materialId: newId })
      .where(eq(schema.layers.materialId, oldId))
      .returning({ id: schema.layers.id });
    remappedLayers += updated.length;

    await db
      .delete(schema.materials)
      .where(and(eq(schema.materials.id, oldId), eq(schema.materials.tenantId, tenantId)));
    deleted++;
    byKey.delete(oldKey);
  }

  if (remappedLayers > 0 || deleted > 0) {
    log.info({ tenantId, remappedLayers, deleted }, 'Retired adhesive materials remapped and removed');
  }

  return { remappedLayers, deleted };
}

function mapMasterToDbRow(tenantId: string, material: MasterMaterial) {
  const now = new Date();
  return {
    tenantId,
    name: material.name,
    type: material.type as 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'accessory',
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
    laminationRecipe: material.laminationRecipe ?? null,
    // Accessory pricing (null for film/ink/adhesive rows).
    accessoryKind: material.accessoryKind ?? null,
    costPerMeterUsd: material.costPerMeterUsd != null ? material.costPerMeterUsd.toString() : null,
    costPerPieceUsd: material.costPerPieceUsd != null ? material.costPerPieceUsd.toString() : null,
    weightGramPerMeter: material.weightGramPerMeter != null ? material.weightGramPerMeter.toString() : null,
    weightGramPerPiece: material.weightGramPerPiece != null ? material.weightGramPerPiece.toString() : null,
    priceUnit: material.priceUnit ?? null,
    unitPriceUsd: material.unitPriceUsd != null ? material.unitPriceUsd.toString() : null,
  };
}

const LEGACY_ADHESIVE_NAMES: Record<string, string[]> = {
  'adhesive-sb-mp': [
    'Adhesive SB (Solvent Based)',
    'Solvent Base',
    'Solvent Base GP',
    'Solvent Base MP',
    'Solvent Base MP — Foil',
    'MORBOND 675',
  ],
  'adhesive-sb-hp': [
    'Solvent Base HP',
    'Solvent Base HP — Liquid',
    'MORBOND 655',
  ],
  'adhesive-sl-dry': [
    'Adhesive WB (Water Based)',
    'Solvent Less',
    'Solvent Less — Dry',
    'MORFREE 75-300',
  ],
  'adhesive-mono': [
    'Mono Component',
    'Mono Component — Paper',
    'MORFREE L75×850',
    'MORFREE L75 X 850',
  ],
};

const LEGACY_INK_NAMES: Record<string, string[]> = {
  'ink-sb': ['Ink SB (Solvent Based)', 'Common Colors'],
  'ink-uv': ['Ink UV'],
};

/** Renamed platform_master_key → previous key (tenant upsert). */
const LEGACY_PLATFORM_KEYS: Record<string, string> = {
  'bopp-transparent-hs': 'bopp-transparent',
  'pet-twist-transparent': 'pet-twist-transparent-twist-transparent',
  'pet-twist-white': 'pet-twist-transparent-twist-white',
  'pet-twist-metalized': 'pet-twist-methalized',
  'pe-plain-commercial': 'ldpe-natural',
  'pe-plain-industrial': 'ldpe-white',
  'adhesive-sl-dry': 'adhesive-wb',
  'adhesive-mono': 'adhesive-mono-component',
  'adhesive-sb-mp': 'adhesive-sb-gp',
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
    if (row.type === 'ink' || row.type === 'adhesive' || row.type === 'solvent') {
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

  const legacyKey = LEGACY_PLATFORM_KEYS[material.key];
  if (legacyKey) {
    const byLegacyKey = existing.find(
      (row) => !row.isTenantOnly && row.platformMasterKey === legacyKey
    );
    if (byLegacyKey) return byLegacyKey;
  }

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
 * - **Sync:** automatic on platform master save to `catalog_source = platform` tenants only
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

    log.info({ tenantId, count: inserted.length }, 'Seeded materials for tenant');
    return inserted.length;
  } catch (error) {
    log.error({ err: error, tenantId }, 'Failed to seed materials');
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

      if (material.laminationRecipe !== undefined) {
        patch.laminationRecipe = material.laminationRecipe ?? null;
      }

      // Accessory pricing fields (platform is source of truth).
      patch.accessoryKind = row.accessoryKind;
      patch.costPerMeterUsd = row.costPerMeterUsd;
      patch.costPerPieceUsd = row.costPerPieceUsd;
      patch.weightGramPerMeter = row.weightGramPerMeter;
      patch.weightGramPerPiece = row.weightGramPerPiece;
      patch.priceUnit = row.priceUnit;
      patch.unitPriceUsd = row.unitPriceUsd;

      // Single source of truth: platform master always overwrites tenant prices.
      // Temporary overrides live only in estimate layer unit_cost_snapshot_usd, not in the library.
      patch.costPerKgUsd = row.costPerKgUsd;
      patch.marketPriceUsd = row.marketPriceUsd;
      patch.priceSource = 'platform';

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
 * Drop synced substrate rows outside the current platform key allowlist
 * (retired keys like `bopp-transparent`, `bopp-white-opaque`).
 */
export async function pruneTenantSubstratesByPlatformKeyAllowlist(
  tenantId: string,
  substrateFamily: string,
  allowedKeys: readonly string[]
): Promise<number> {
  const db = getDatabase();
  const allowed = new Set(allowedKeys);
  const rows = await db
    .select({
      id: schema.materials.id,
      platformMasterKey: schema.materials.platformMasterKey,
    })
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        eq(schema.materials.type, 'substrate'),
        eq(schema.materials.substrateFamily, substrateFamily),
        eq(schema.materials.isTenantOnly, false)
      )
    );

  let pruned = 0;
  for (const row of rows) {
    const key = row.platformMasterKey?.trim() || '';
    if (!key || !allowed.has(key)) {
      await db
        .delete(schema.materials)
        .where(and(eq(schema.materials.id, row.id), eq(schema.materials.tenantId, tenantId)));
      pruned++;
    }
  }
  return pruned;
}

/**
 * Get master materials list (for preview/admin)
 */
export async function getMasterMaterialsList(): Promise<MasterMaterial[]> {
  return loadPlatformMasterMaterials();
}
