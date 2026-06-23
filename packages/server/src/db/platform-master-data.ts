import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, asc, sql, or } from 'drizzle-orm';
import { getDatabase, schema } from './index';
import type { MasterMaterial, MasterDataReference } from './master-materials-io';
import {
  costingKeyForMasterKey,
  normalizeReferenceShape,
  resolveMasterDataReferencePath,
} from './master-materials-io';
import { roundUsd } from '../utils/usd';
import { syncMaterialsForTenant } from './seed-materials';
import { relinkTemplatesForTenant } from './seed-templates';
import { syncCustomRmTypeCategories } from './seed-categories';
import {
  appendMasterAuditEntries,
  materialAuditSnapshot,
  referenceEntityKey,
  referenceItemAuditSnapshot,
  type AuditActor,
} from './platform-master-audit';
import type { PlatformMasterMaterialRow, PlatformReferenceItemRow } from './platform-master-data-types';

export type { AuditActor } from './platform-master-audit';

const here = dirname(fileURLToPath(import.meta.url));

const PLATFORM_STATE_ID = 1;

/**
 * Default process definitions — seeded once into platform_reference_items.
 * Admin can edit labels, costs and speeds via Master Data > Processes.
 * code is the stable key used in template defaultProcesses and instantiate route.
 */
export const DEFAULT_PROCESS_ROWS = [
  { label: 'Extrusion',    code: 'extrusion',    description: 'Blown/cast film production — PE mono structures',        costPerHour: 50,  speedBasis: 'kg_per_hour', speedValue: 200, setupHours: 2 },
  { label: 'Printing',     code: 'printing',     description: 'Flexo / gravure print run',                              costPerHour: 80,  speedBasis: 'm_per_min',   speedValue: 100, setupHours: 4 },
  { label: 'Lamination',   code: 'lamination',   description: 'Solvent or solventless bonding — multilayer stacks',     costPerHour: 60,  speedBasis: 'm_per_min',   speedValue: 80,  setupHours: 2 },
  { label: 'Slitting',     code: 'slitting',     description: 'Reel slitting to finished width',                        costPerHour: 30,  speedBasis: 'm_per_min',   speedValue: 150, setupHours: 1 },
  { label: 'Pouch Making', code: 'pouch_making', description: 'Pouch forming, filling & sealing',                       costPerHour: 40,  speedBasis: 'pcs_per_min', speedValue: 60,  setupHours: 1 },
  { label: 'Bag Making',   code: 'bag_making',   description: 'Bag forming & sealing (shopping, industrial, courier)',  costPerHour: 35,  speedBasis: 'pcs_per_min', speedValue: 50,  setupHours: 1 },
  { label: 'Seaming',      code: 'seaming',      description: 'Side-seal seaming — sleeves',                            costPerHour: 35,  speedBasis: 'pcs_per_min', speedValue: 50,  setupHours: 1 },
] as const;

/** Ensure singleton version row exists (id = 1). */
export async function ensurePlatformMasterState(): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .select({ id: schema.platformMasterState.id })
    .from(schema.platformMasterState)
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID))
    .limit(1);
  if (!row) {
    await db.insert(schema.platformMasterState).values({
      id: PLATFORM_STATE_ID,
      masterDataVersion: 1,
    });
  }
}

/** Current platform master catalog revision — stamped on new estimates. */
export async function getMasterDataVersion(): Promise<number> {
  await ensurePlatformMasterState();
  const db = getDatabase();
  const [row] = await db
    .select({ v: schema.platformMasterState.masterDataVersion })
    .from(schema.platformMasterState)
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID))
    .limit(1);
  return row?.v ?? 1;
}

async function incrementMasterDataVersion(): Promise<number> {
  await ensurePlatformMasterState();
  const db = getDatabase();
  const [row] = await db
    .update(schema.platformMasterState)
    .set({
      masterDataVersion: sql`${schema.platformMasterState.masterDataVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID))
    .returning({ v: schema.platformMasterState.masterDataVersion });
  return row?.v ?? 1;
}

export class ReferenceItemInUseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly materialCount: number
  ) {
    super(message);
    this.name = 'ReferenceItemInUseError';
  }
}

async function countMaterialsUsingRmTypeCode(code: string): Promise<number> {
  const db = getDatabase();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.materials)
    .where(or(eq(schema.materials.itemClass, code), eq(schema.materials.substrateFamily, code)));
  return Number(row?.count ?? 0);
}

function assertUniqueReferenceCodes(
  items: Array<{ label: string; code?: string | null }>
): void {
  const codes = items.map((i) => i.code?.trim().toLowerCase()).filter((c): c is string => !!c);
  if (new Set(codes).size !== codes.length) {
    throw new Error('Duplicate reference codes in category');
  }
}

/** Placeholder costs when seeding ink/adhesive/packaging rows that had blank Excel prices. */
function placeholderCost(type: string, family: string | null): number {
  if (type === 'ink') return 12;
  if (type === 'adhesive') return 8;
  if (family === 'Packaging') return 2.5;
  return 0;
}

function resolveSeedJsonPath(): string {
  return resolve(here, 'master-materials-seed.json');
}

function rowToMasterMaterial(row: typeof schema.platformMasterMaterials.$inferSelect): MasterMaterial {
  return {
    key: row.key,
    name: row.name,
    type: row.type as MasterMaterial['type'],
    solidPercent: row.solidPercent,
    density: Number(row.density),
    costPerKgUsd: Number(row.costPerKgUsd),
    wastePercent: row.wastePercent,
    isSolventBased: row.isSolventBased,
    substrateFamily: row.substrateFamily,
    substrateGrade: row.substrateGrade,
    hoover: row.hoover,
    marketPriceUsd: row.marketPriceUsd != null ? Number(row.marketPriceUsd) : null,
  };
}

export function masterMaterialInputToDbValues(
  m: MasterMaterial & { sortOrder?: number; externalId?: string | null; externalSource?: string | null }
) {
  const cost = roundUsd(m.costPerKgUsd);
  const market = roundUsd(m.marketPriceUsd ?? m.costPerKgUsd);
  return {
    key: m.key,
    name: m.name,
    type: m.type as 'substrate' | 'ink' | 'adhesive',
    solidPercent: m.solidPercent,
    density: m.density.toString(),
    costPerKgUsd: cost.toFixed(2),
    wastePercent: m.wastePercent ?? 0,
    isSolventBased: m.isSolventBased ?? false,
    substrateFamily: m.substrateFamily ?? null,
    substrateGrade: m.substrateGrade ?? null,
    hoover: m.hoover ?? null,
    marketPriceUsd: market.toFixed(2),
    costingKey: costingKeyForMasterKey(m.key),
    sortOrder: m.sortOrder ?? 0,
    active: true,
    externalId: m.externalId ?? null,
    externalSource: m.externalSource ?? null,
    updatedAt: new Date(),
  };
}

export async function listPlatformMasterMaterials(): Promise<MasterMaterial[]> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(schema.platformMasterMaterials)
    .where(eq(schema.platformMasterMaterials.active, true))
    .orderBy(asc(schema.platformMasterMaterials.sortOrder), asc(schema.platformMasterMaterials.name));

  return rows.map(rowToMasterMaterial);
}

export async function listPlatformMasterMaterialsWithIds() {
  const db = getDatabase();
  return db
    .select()
    .from(schema.platformMasterMaterials)
    .where(eq(schema.platformMasterMaterials.active, true))
    .orderBy(asc(schema.platformMasterMaterials.sortOrder), asc(schema.platformMasterMaterials.name));
}

export async function getPlatformMasterMaterialById(id: string) {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(schema.platformMasterMaterials)
    .where(eq(schema.platformMasterMaterials.id, id))
    .limit(1);
  return row ?? null;
}

export async function createPlatformMasterMaterial(
  input: MasterMaterial & { sortOrder?: number },
  actor?: AuditActor
): Promise<MasterMaterial> {
  const db = getDatabase();
  const values = masterMaterialInputToDbValues(input);
  const [row] = await db.insert(schema.platformMasterMaterials).values(values).returning();
  const version = await incrementMasterDataVersion();
  await appendMasterAuditEntries(
    version,
    [
      {
        entityType: 'material',
        entityKey: row.key,
        action: 'create',
        afterJson: materialAuditSnapshot(row),
      },
    ],
    actor
  );
  return rowToMasterMaterial(row);
}

export async function updatePlatformMasterMaterial(
  id: string,
  input: Partial<MasterMaterial> & { sortOrder?: number; externalId?: string | null; externalSource?: string | null },
  actor?: AuditActor
): Promise<MasterMaterial | null> {
  const db = getDatabase();
  const existing = await getPlatformMasterMaterialById(id);
  if (!existing) return null;

  const existingMaterial = rowToMasterMaterial(existing);
  const merged: MasterMaterial = {
    ...existingMaterial,
    ...input,
    key: input.key ?? existingMaterial.key,
    name: input.name ?? existingMaterial.name,
    type: (input.type ?? existingMaterial.type) as MasterMaterial['type'],
    solidPercent: input.solidPercent ?? existingMaterial.solidPercent,
    density: input.density ?? existingMaterial.density,
    costPerKgUsd: input.costPerKgUsd ?? existingMaterial.costPerKgUsd,
    wastePercent: input.wastePercent ?? existingMaterial.wastePercent,
    isSolventBased: input.isSolventBased ?? existingMaterial.isSolventBased,
    substrateFamily: input.substrateFamily !== undefined ? input.substrateFamily : existingMaterial.substrateFamily,
    substrateGrade: input.substrateGrade !== undefined ? input.substrateGrade : existingMaterial.substrateGrade,
    hoover: input.hoover !== undefined ? input.hoover : existingMaterial.hoover,
    marketPriceUsd:
      input.marketPriceUsd !== undefined ? input.marketPriceUsd : existingMaterial.marketPriceUsd,
  };

  const values = masterMaterialInputToDbValues({
    ...merged,
    sortOrder: input.sortOrder,
  });

  const [row] = await db
    .update(schema.platformMasterMaterials)
    .set({
      ...values,
      ...(input.externalId !== undefined ? { externalId: input.externalId } : {}),
      ...(input.externalSource !== undefined ? { externalSource: input.externalSource } : {}),
    })
    .where(eq(schema.platformMasterMaterials.id, id))
    .returning();

  if (!row) return null;
  const version = await incrementMasterDataVersion();
  await appendMasterAuditEntries(
    version,
    [
      {
        entityType: 'material',
        entityKey: row.key,
        action: 'update',
        beforeJson: materialAuditSnapshot(existing),
        afterJson: materialAuditSnapshot(row),
      },
    ],
    actor
  );
  return rowToMasterMaterial(row);
}

export async function deletePlatformMasterMaterial(id: string, actor?: AuditActor): Promise<boolean> {
  const db = getDatabase();
  const existing = await getPlatformMasterMaterialById(id);
  const [row] = await db
    .update(schema.platformMasterMaterials)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.platformMasterMaterials.id, id))
    .returning();
  if (row && existing) {
    const version = await incrementMasterDataVersion();
    await appendMasterAuditEntries(
      version,
      [
        {
          entityType: 'material',
          entityKey: row.key,
          action: 'delete',
          beforeJson: materialAuditSnapshot(existing),
          afterJson: materialAuditSnapshot({ ...existing, active: false }),
        },
      ],
      actor
    );
  }
  return !!row;
}

export async function replacePlatformMasterMaterials(
  materials: Array<
    MasterMaterial & { sortOrder?: number; externalId?: string | null; externalSource?: string | null }
  >,
  actor?: AuditActor
): Promise<MasterMaterial[]> {
  const db = getDatabase();
  const incomingKeys = new Set(materials.map((m) => m.key));
  const auditEntries: Parameters<typeof appendMasterAuditEntries>[1] = [];

  const existing = await db.select().from(schema.platformMasterMaterials);
  for (const row of existing) {
    if (!incomingKeys.has(row.key) && row.active) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      auditEntries.push({
        entityType: 'material',
        entityKey: row.key,
        action: 'delete',
        beforeJson: materialAuditSnapshot(row),
        afterJson: materialAuditSnapshot({ ...row, active: false }),
      });
    }
  }

  const out: MasterMaterial[] = [];
  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: i });
    const match = existing.find((r: PlatformMasterMaterialRow) => r.key === m.key);
    if (match) {
      const [row] = await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id))
        .returning();
      out.push(rowToMasterMaterial(row));
      auditEntries.push({
        entityType: 'material',
        entityKey: row.key,
        action: 'update',
        beforeJson: materialAuditSnapshot(match),
        afterJson: materialAuditSnapshot(row),
      });
    } else {
      const [row] = await db.insert(schema.platformMasterMaterials).values(values).returning();
      out.push(rowToMasterMaterial(row));
      auditEntries.push({
        entityType: 'material',
        entityKey: row.key,
        action: 'create',
        afterJson: materialAuditSnapshot(row),
      });
    }
  }
  if (auditEntries.length > 0) {
    const version = await incrementMasterDataVersion();
    await appendMasterAuditEntries(version, auditEntries, actor);
  }
  return out;
}

type RefCategory = typeof schema.platformReferenceItems.$inferInsert['category'];

export async function listPlatformReferenceItems(category?: RefCategory) {
  const db = getDatabase();
  if (category) {
    return db
      .select()
      .from(schema.platformReferenceItems)
      .where(eq(schema.platformReferenceItems.category, category))
      .orderBy(
        asc(schema.platformReferenceItems.sortOrder),
        asc(schema.platformReferenceItems.label)
      )
      .then((rows: PlatformReferenceItemRow[]) => rows.filter((r: PlatformReferenceItemRow) => r.active));
  }
  return db
    .select()
    .from(schema.platformReferenceItems)
    .orderBy(
      asc(schema.platformReferenceItems.sortOrder),
      asc(schema.platformReferenceItems.label)
    )
    .then((rows: PlatformReferenceItemRow[]) => rows.filter((r: PlatformReferenceItemRow) => r.active));
}

/**
 * Derive a stable machine code from an RM type label when no code is stored.
 * Standard types map to their DB enum values; custom types become kebab-case.
 */
function deriveRmTypeCode(label: string): string {
  const STANDARD: Record<string, string> = {
    substrate: 'substrate',
    'ink & coating': 'ink',
    ink: 'ink',
    adhesive: 'adhesive',
    packaging: 'packaging',
  };
  return STANDARD[label.trim().toLowerCase()] ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export async function buildMasterDataReferenceFromDb(): Promise<MasterDataReference> {
  const items = await listPlatformReferenceItems();

  const byCategory = (cat: RefCategory) =>
    items.filter((i: PlatformReferenceItemRow) => i.category === cat).map((i: PlatformReferenceItemRow) => i.label);

  let productTypeRows = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'product_type')
    .map((i: PlatformReferenceItemRow) => ({ label: i.label, code: (i.code || '').toLowerCase() }));

  // Heal legacy seed where "Bag" was given the engine code "pouch": split into a proper
  // Pouch + a distinct Bag so BOTH appear in every dropdown (estimate editor + admin).
  if (productTypeRows.some((r: { label: string; code: string }) => r.label.trim().toLowerCase() === 'bag' && r.code === 'pouch')) {
    productTypeRows = productTypeRows.map((r: { label: string; code: string }) =>
      r.label.trim().toLowerCase() === 'bag' && r.code === 'pouch'
        ? { label: 'Pouch', code: 'pouch' }
        : r
    );
    if (!productTypeRows.some((r: { label: string; code: string }) => r.code === 'bag')) {
      productTypeRows.push({ label: 'Bag', code: 'bag' });
    }
  }

  const rmTypeRows = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'rm_type')
    .map((i: PlatformReferenceItemRow) => ({ label: i.label, code: i.code?.trim() || deriveRmTypeCode(i.label) }));

  const productSubtypeRows = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'product_subtype')
    .map((i: PlatformReferenceItemRow) => ({
      label: i.label,
      code: i.code || '',
      parent: ((i.metadata || {}) as { parent?: string }).parent || '',
    }));

  const processRows = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'process')
    .map((i: PlatformReferenceItemRow) => {
      const meta = (i.metadata || {}) as {
        description?: string;
        costPerHour?: number;
        speedBasis?: string;
        speedValue?: number;
        setupHours?: number;
      };
      return {
        label: i.label,
        code: i.code || '',
        description: meta.description ?? '',
        costPerHour: meta.costPerHour ?? 50,
        speedBasis: meta.speedBasis ?? 'kg_per_hour',
        speedValue: meta.speedValue ?? 100,
        setupHours: meta.setupHours ?? 1,
      };
    });

  const printingWebClasses = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'printing_web')
    .map((i: PlatformReferenceItemRow) => {
      const meta = (i.metadata || {}) as { inkSystem?: string; solidPercent?: number };
      return {
        label: i.label,
        code: i.code || '',
        inkSystem: meta.inkSystem ?? null,
        solidPercent: meta.solidPercent ?? null,
      };
    });

  return {
    productTypes: productTypeRows.map((r: { label: string; code: string }) => r.label),
    productTypeRows,
    units: byCategory('unit'),
    rmTypes: rmTypeRows.map((r: { label: string; code: string }) => r.label),
    rmTypeRows,
    packaging: byCategory('packaging'),
    inkCoating: byCategory('ink_coating'),
    adhesive: byCategory('adhesive'),
    printingWebClasses,
    productSubtypeRows,
    processRows,
  };
}

export async function replacePlatformReferenceCategory(
  category: RefCategory,
  items: Array<{ label: string; code?: string | null; metadata?: Record<string, unknown> | null }>,
  actor?: AuditActor
) {
  assertUniqueReferenceCodes(items);
  const db = getDatabase();
  const existing = await db
    .select()
    .from(schema.platformReferenceItems)
    .where(eq(schema.platformReferenceItems.category, category));

  const auditEntries: Parameters<typeof appendMasterAuditEntries>[1] = [];

  const incomingLabels = new Set(items.map((i) => i.label.trim().toLowerCase()));
  for (const row of existing) {
    if (!incomingLabels.has(row.label.trim().toLowerCase()) && row.active) {
      if (category === 'rm_type') {
        const code = row.code?.trim() || deriveRmTypeCode(row.label);
        const materialCount = await countMaterialsUsingRmTypeCode(code);
        if (materialCount > 0) {
          throw new ReferenceItemInUseError(
            `Cannot remove RM type "${row.label}": ${materialCount} material row(s) reference code "${code}"`,
            code,
            materialCount
          );
        }
      }
      await db
        .update(schema.platformReferenceItems)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformReferenceItems.id, row.id));
      auditEntries.push({
        entityType: 'reference_item',
        entityKey: referenceEntityKey(category, row.label, row.code),
        action: 'delete',
        beforeJson: referenceItemAuditSnapshot({ ...row, category }),
        afterJson: referenceItemAuditSnapshot({ ...row, category, active: false }),
      });
    }
  }

  const out: PlatformReferenceItemRow[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = item.label.trim();
    const match = existing.find((r: PlatformReferenceItemRow) => r.label.trim().toLowerCase() === label.toLowerCase());
    const values = {
      category,
      label,
      code: item.code?.trim() || null,
      metadata: item.metadata ?? null,
      sortOrder: i,
      active: true,
      updatedAt: new Date(),
    };
    if (match) {
      const [row] = await db
        .update(schema.platformReferenceItems)
        .set(values)
        .where(eq(schema.platformReferenceItems.id, match.id))
        .returning();
      out.push(row);
      auditEntries.push({
        entityType: 'reference_item',
        entityKey: referenceEntityKey(category, row.label, row.code),
        action: 'update',
        beforeJson: referenceItemAuditSnapshot({ ...match, category }),
        afterJson: referenceItemAuditSnapshot({ ...row, category }),
      });
    } else {
      const [row] = await db.insert(schema.platformReferenceItems).values(values).returning();
      out.push(row);
      auditEntries.push({
        entityType: 'reference_item',
        entityKey: referenceEntityKey(category, row.label, row.code),
        action: 'create',
        afterJson: referenceItemAuditSnapshot({ ...row, category }),
      });
    }
  }
  if (auditEntries.length > 0) {
    const version = await incrementMasterDataVersion();
    await appendMasterAuditEntries(version, auditEntries, actor);
  }

  if (category === 'rm_type') {
    const tenantIds = (await db.select({ id: schema.tenants.id }).from(schema.tenants)).map(
      (t: { id: string }) => t.id
    );
    for (const tenantId of tenantIds) {
      await syncCustomRmTypeCategories(tenantId);
    }
  }

  return out;
}

export interface TenantSyncResult {
  tenantsSynced: number;
  inserted: number;
  updated: number;
  orphans: number;
  pruned: number;
  templatesRelinked: number;
}

/** Push platform master materials to all tenant libraries (respects manual prices). */
export async function syncPlatformMasterToAllTenants(options?: {
  pruneOrphans?: boolean;
}): Promise<TenantSyncResult> {
  const db = getDatabase();
  const materials = await listPlatformMasterMaterials();
  const tenantIds = (await db.select({ id: schema.tenants.id }).from(schema.tenants)).map(
    (t: { id: string }) => t.id
  );

  let inserted = 0;
  let updated = 0;
  let orphans = 0;
  let pruned = 0;
  let templatesRelinked = 0;

  for (const tenantId of tenantIds) {
    const result = await syncMaterialsForTenant(tenantId, materials, {
      pruneOrphans: options?.pruneOrphans !== false,
    });
    inserted += result.inserted;
    updated += result.updated;
    orphans += result.orphans;
    pruned += result.pruned;
    templatesRelinked += await relinkTemplatesForTenant(tenantId);
  }

  return {
    tenantsSynced: tenantIds.length,
    inserted,
    updated,
    orphans,
    pruned,
    templatesRelinked,
  };
}

function loadSeedMaterialsFromJson(): MasterMaterial[] {
  const path = resolveSeedJsonPath();
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')) as MasterMaterial[];
}

function loadReferenceFromJson(): MasterDataReference {
  const jsonPath = resolveMasterDataReferencePath();
  if (existsSync(jsonPath)) {
    return normalizeReferenceShape(JSON.parse(readFileSync(jsonPath, 'utf8')));
  }
  return {
    productTypes: [],
    productTypeRows: [],
    units: [],
    rmTypes: [],
    packaging: [],
    inkCoating: [],
    adhesive: [],
    printingWebClasses: [],
  };
}

/** Idempotent — seeds platform tables from JSON when empty (one-time migration from Excel pipeline). */
export async function ensurePlatformMasterSeeded(): Promise<{ materials: number; reference: number }> {
  const db = getDatabase();

  const [matCount] = await db
    .select({ id: schema.platformMasterMaterials.id })
    .from(schema.platformMasterMaterials)
    .limit(1);

  let materialsSeeded = 0;
  if (!matCount) {
    const seed = loadSeedMaterialsFromJson();
    for (let i = 0; i < seed.length; i++) {
      const m = { ...seed[i] };
      if (!m.costPerKgUsd || m.costPerKgUsd <= 0) {
        m.costPerKgUsd = placeholderCost(m.type, m.substrateFamily);
        if (!m.marketPriceUsd || m.marketPriceUsd <= 0) {
          m.marketPriceUsd = m.costPerKgUsd;
        }
      }
      await db
        .insert(schema.platformMasterMaterials)
        .values(masterMaterialInputToDbValues({ ...m, sortOrder: i }));
      materialsSeeded++;
    }
    console.log(`✓ Seeded ${materialsSeeded} platform master materials from JSON`);
  }

  const [refCount] = await db
    .select({ id: schema.platformReferenceItems.id })
    .from(schema.platformReferenceItems)
    .limit(1);

  let referenceSeeded = 0;
  if (!refCount) {
    const ref = loadReferenceFromJson();
    const batches: Array<{ category: RefCategory; items: Array<{ label: string; code?: string; metadata?: Record<string, unknown> }> }> = [
      {
        category: 'product_type',
        items: (ref.productTypeRows?.length ? ref.productTypeRows : ref.productTypes.map((l) => ({ label: l, code: '' }))).map(
          (r) => ({ label: r.label, code: r.code })
        ),
      },
      { category: 'unit', items: ref.units.map((l) => ({ label: l })) },
      { category: 'rm_type', items: ref.rmTypes.map((l) => ({ label: l })) },
      { category: 'packaging', items: ref.packaging.map((l) => ({ label: l })) },
      { category: 'ink_coating', items: ref.inkCoating.map((l) => ({ label: l })) },
      { category: 'adhesive', items: ref.adhesive.map((l) => ({ label: l })) },
      {
        category: 'printing_web',
        items: (ref.printingWebClasses ?? []).map((r) => ({
          label: r.label,
          code: r.code,
          metadata: { inkSystem: r.inkSystem, solidPercent: r.solidPercent },
        })),
      },
      // Default processes — seeded once; admin can edit via Master Data > Processes
      {
        category: 'process',
        items: DEFAULT_PROCESS_ROWS.map((p) => ({
          label: p.label,
          code: p.code,
          metadata: { description: p.description, costPerHour: p.costPerHour, speedBasis: p.speedBasis, speedValue: p.speedValue, setupHours: p.setupHours },
        })),
      },
    ];

    for (const batch of batches) {
      if (batch.items.length === 0) continue;
      await replacePlatformReferenceCategory(batch.category, batch.items);
      referenceSeeded += batch.items.length;
    }
    console.log(`✓ Seeded ${referenceSeeded} platform reference items from JSON`);
  }

  await ensurePlatformMasterState();

  return { materials: materialsSeeded, reference: referenceSeeded };
}

/**
 * Idempotent — seeds default process rows into platform_reference_items when none exist.
 * Called on startup so existing deployments get processes without a full re-seed.
 */
export async function ensureProcessesSeeded(): Promise<number> {
  const db = getDatabase();
  const existing = await db
    .select({ id: schema.platformReferenceItems.id })
    .from(schema.platformReferenceItems)
    .where(eq(schema.platformReferenceItems.category, 'process' as RefCategory))
    .limit(1);

  if (existing.length > 0) return 0;

  await replacePlatformReferenceCategory(
    'process' as RefCategory,
    DEFAULT_PROCESS_ROWS.map((p) => ({
      label: p.label,
      code: p.code,
      metadata: {
        description: p.description,
        costPerHour: p.costPerHour,
        speedBasis: p.speedBasis,
        speedValue: p.speedValue,
        setupHours: p.setupHours,
      },
    }))
  );
  console.log(`✓ Seeded ${DEFAULT_PROCESS_ROWS.length} default process definitions`);
  return DEFAULT_PROCESS_ROWS.length;
}
