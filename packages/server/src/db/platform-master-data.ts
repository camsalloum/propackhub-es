import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, asc, sql, or, and } from 'drizzle-orm';
import { getDatabase, schema } from './index';
import { log } from '../utils/logger';
import type { MasterMaterial, MasterDataReference } from './master-materials-io';
import {
  costingKeyForMasterKey,
  normalizeReferenceShape,
  resolveMasterDataReferencePath,
  LEGACY_UNIT_METADATA,
  DEFAULT_UNIT_ROWS,
  type UnitBasis,
} from './master-materials-io';
import { roundUsd } from '../utils/usd';
import {
  DEFAULT_WASTE_BANDS_BY_PRINT_MODE,
  DEFAULT_CORM_SCALE_WITH_WASTE,
  plainBandsFromPrinted,
  type WasteBand,
  type WasteBandsByPrintMode,
} from '@es/engine';
import { syncMaterialsForTenant, pruneTenantSubstratesByPlatformKeyAllowlist, remappingRetiredAdhesivesForTenant } from './seed-materials';
import { relinkTemplatesForTenant } from './seed-templates';
import { syncCustomRmTypeCategories } from './seed-categories';
import { applySolventCommonAverage, SOLVENT_COMMON_KEY, computeSolventCommonAverage } from '../utils/solvent-common';
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
  if (type === 'solvent') return 1.54;
  if (type === 'packaging') return 0;
  if (family === 'Packaging') return 0;
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
    liquidCostUsd: row.liquidCostUsd != null ? Number(row.liquidCostUsd) : null,
    wastePercent: row.wastePercent,
    isSolventBased: row.isSolventBased,
    substrateFamily: row.substrateFamily,
    substrateGrade: row.substrateGrade,
    hoover: row.hoover,
    marketPriceUsd: row.marketPriceUsd != null ? Number(row.marketPriceUsd) : null,
    externalId: row.externalId ?? null,
    externalSource: row.externalSource ?? null,
    laminationRecipe: (row.laminationRecipe as MasterMaterial['laminationRecipe']) ?? null,
    accessoryKind: row.accessoryKind ?? null,
    costPerMeterUsd: row.costPerMeterUsd != null ? Number(row.costPerMeterUsd) : null,
    costPerPieceUsd: row.costPerPieceUsd != null ? Number(row.costPerPieceUsd) : null,
    weightGramPerMeter: row.weightGramPerMeter != null ? Number(row.weightGramPerMeter) : null,
    weightGramPerPiece: row.weightGramPerPiece != null ? Number(row.weightGramPerPiece) : null,
    priceUnit: row.priceUnit ?? null,
    unitPriceUsd: row.unitPriceUsd != null ? Number(row.unitPriceUsd) : null,
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
    type: m.type as 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'accessory' | 'packaging',
    solidPercent: m.solidPercent,
    density: m.density.toString(),
    costPerKgUsd: cost.toFixed(2),
    wastePercent: m.wastePercent ?? 0,
    isSolventBased: m.isSolventBased ?? false,
    substrateFamily: m.substrateFamily ?? null,
    substrateGrade: m.substrateGrade ?? null,
    hoover: m.hoover ?? null,
    marketPriceUsd: market.toFixed(2),
    liquidCostUsd: (m as any).liquidCostUsd != null ? Number((m as any).liquidCostUsd).toFixed(2) : null,
    costingKey: costingKeyForMasterKey(m.key),
    sortOrder: m.sortOrder ?? 0,
    active: true,
    externalId: m.externalId ?? null,
    externalSource: m.externalSource ?? null,
    laminationRecipe: m.laminationRecipe ?? null,
    accessoryKind: m.accessoryKind ?? null,
    costPerMeterUsd: m.costPerMeterUsd != null ? Number(m.costPerMeterUsd).toString() : null,
    costPerPieceUsd: m.costPerPieceUsd != null ? Number(m.costPerPieceUsd).toString() : null,
    weightGramPerMeter: m.weightGramPerMeter != null ? Number(m.weightGramPerMeter).toString() : null,
    weightGramPerPiece: m.weightGramPerPiece != null ? Number(m.weightGramPerPiece).toString() : null,
    priceUnit: m.priceUnit ?? null,
    unitPriceUsd: m.unitPriceUsd != null ? Number(m.unitPriceUsd).toFixed(4) : null,
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
  if (row.type === 'solvent' && row.key !== SOLVENT_COMMON_KEY) {
    await refreshSolventCommonRow(actor);
  }
  return rowToMasterMaterial(row);
}

async function refreshSolventCommonRow(actor?: AuditActor): Promise<void> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(schema.platformMasterMaterials)
    .where(eq(schema.platformMasterMaterials.active, true));
  const materials = rows.map((r) => rowToMasterMaterial(r));
  const avg = computeSolventCommonAverage(materials);
  const common = rows.find((r) => r.key === SOLVENT_COMMON_KEY);
  if (!avg || !common) return;

  const values = masterMaterialInputToDbValues({
    ...rowToMasterMaterial(common),
    costPerKgUsd: avg.costPerKgUsd,
    density: avg.density,
    marketPriceUsd: avg.costPerKgUsd,
    hoover: 'Average of Ethyl Acetate, Ethanol, Methoxy Propanol, Ethoxy Propanol',
  });

  const [updated] = await db
    .update(schema.platformMasterMaterials)
    .set(values)
    .where(eq(schema.platformMasterMaterials.id, common.id))
    .returning();

  if (updated) {
    const version = await incrementMasterDataVersion();
    await appendMasterAuditEntries(
      version,
      [
        {
          entityType: 'material',
          entityKey: updated.key,
          action: 'update',
          beforeJson: materialAuditSnapshot(common),
          afterJson: materialAuditSnapshot(updated),
        },
      ],
      actor
    );
  }
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
  const normalized = applySolventCommonAverage(materials);
  const incomingKeys = new Set(normalized.map((m) => m.key));
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
  for (let i = 0; i < normalized.length; i++) {
    const m = normalized[i];
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
    .map((i: PlatformReferenceItemRow) => ({
      label: i.label,
      code: i.code?.trim() || deriveRmTypeCode(i.label),
      metadata: (i.metadata || {}) as Record<string, unknown>,
    }));

  const solventRmMeta = rmTypeRows.find((r) => r.code === 'solvent')?.metadata ?? {};
  const jsonRef = loadReferenceFromJson();
  const cleaningFromMeta =
    typeof solventRmMeta.cleaningSolventKgPerJob === 'number'
      ? solventRmMeta.cleaningSolventKgPerJob
      : jsonRef.costingDefaults?.cleaningSolventKgPerJob ?? 20;

  const productSubtypeRows = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'product_subtype')
    .map((i: PlatformReferenceItemRow) => ({
      label: i.label,
      code: i.code || '',
      parent: ((i.metadata || {}) as { parent?: string }).parent || '',
    }));

  // Units carry { basis, multiplier } metadata so order quantities convert to kg.
  // Rows saved before this metadata existed fall back to the legacy code map.
  const unitRows = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'unit')
    .map((i: PlatformReferenceItemRow) => {
      const meta = (i.metadata || {}) as { basis?: UnitBasis; multiplier?: number; variableMultiplier?: boolean };
      const code =
        (i.code || '').trim() ||
        i.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const legacy =
        LEGACY_UNIT_METADATA[code] ??
        LEGACY_UNIT_METADATA[i.label.trim().toLowerCase()] ??
        { basis: 'kg' as UnitBasis, multiplier: 1 };
      const basis: UnitBasis =
        meta.basis === 'kg' || meta.basis === 'pieces' || meta.basis === 'sqm' || meta.basis === 'lm'
          ? meta.basis
          : legacy.basis;
      const multiplier =
        typeof meta.multiplier === 'number' && meta.multiplier > 0 ? meta.multiplier : legacy.multiplier;
      return { label: i.label, code, basis, multiplier, variableMultiplier: meta.variableMultiplier === true };
    });

  const processRows = items
    .filter((i: PlatformReferenceItemRow) => i.category === 'process')
    .map((i: PlatformReferenceItemRow) => {
      const meta = (i.metadata || {}) as {
        description?: string;
        costPerHour?: number;
        speedBasis?: string;
        speedValue?: number;
        setupHours?: number;
        costPerKgUsd?: number;
      };
      return {
        label: i.label,
        code: i.code || '',
        description: meta.description ?? '',
        costPerHour: meta.costPerHour ?? 50,
        speedBasis: meta.speedBasis ?? 'kg_per_hour',
        speedValue: meta.speedValue ?? 100,
        setupHours: meta.setupHours ?? 1,
        costPerKgUsd: meta.costPerKgUsd ?? 0,
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
    unitRows,
    rmTypes: rmTypeRows.map((r: { label: string; code: string }) => r.label),
    rmTypeRows: rmTypeRows.map(({ metadata: _m, ...r }) => r),
    packaging: byCategory('packaging'),
    inkCoating: byCategory('ink_coating'),
    adhesive: byCategory('adhesive'),
    printingWebClasses,
    productSubtypeRows,
    processRows,
    costingDefaults: {
      cleaningSolventKgPerJob: cleaningFromMeta,
      loadPerPalletKg: jsonRef.costingDefaults?.loadPerPalletKg ?? 800,
      cartonsPerPallet: jsonRef.costingDefaults?.cartonsPerPallet ?? 20,
      pcsPerCarton: jsonRef.costingDefaults?.pcsPerCarton ?? 1000,
      ldWrapPasses: jsonRef.costingDefaults?.ldWrapPasses ?? 2,
      ldWrapFilmWidthMm: jsonRef.costingDefaults?.ldWrapFilmWidthMm ?? 500,
      ldWrapGsm: jsonRef.costingDefaults?.ldWrapGsm ?? 25,
      stretchWrapLayers: jsonRef.costingDefaults?.stretchWrapLayers ?? 4,
    },
    wasteBandsByPrintMode: await getPlatformWasteBandsByPrintMode(),
    cormScaleWithWaste: await getPlatformCormScaleWithWaste(),
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

/** Push platform master materials to tenant libraries with catalog_source = platform (or all when forceAll). */
export async function syncPlatformMasterToAllTenants(options?: {
  pruneOrphans?: boolean;
  forceAll?: boolean;
}): Promise<TenantSyncResult> {
  const db = getDatabase();
  const materials = await listPlatformMasterMaterials();
  const tenantRows = await db
    .select({ id: schema.tenants.id, catalogSource: schema.tenants.catalogSource })
    .from(schema.tenants);

  const tenantIds = tenantRows
    .filter((t) => options?.forceAll === true || t.catalogSource === 'platform')
    .map((t) => t.id);

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
    const { invalidateTemplatePrepareCache } = await import('../routes/templates');
    invalidateTemplatePrepareCache(tenantId);
  }

  const { invalidateTemplatePrepareCache: invalidateAll } = await import('../routes/templates');
  invalidateAll();

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
    log.info({ count: materialsSeeded }, 'Seeded platform master materials from JSON');
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
      {
        category: 'unit',
        items: (ref.units.length
          ? ref.units.map((l) => {
              const key = l.trim().toLowerCase();
              const match = DEFAULT_UNIT_ROWS.find((u) => u.label.toLowerCase() === key || u.code === key);
              const legacy = LEGACY_UNIT_METADATA[key];
              const basis = match?.basis ?? legacy?.basis ?? 'kg';
              const multiplier = match?.multiplier ?? legacy?.multiplier ?? 1;
              return { label: l, code: match?.code, metadata: { basis, multiplier } };
            })
          : DEFAULT_UNIT_ROWS.map((u) => ({
              label: u.label,
              code: u.code,
              metadata: { basis: u.basis, multiplier: u.multiplier },
            }))),
      },
      { category: 'rm_type', items: ref.rmTypes.map((l) => ({
        label: l,
        code: l.trim().toLowerCase() === 'solvent' ? 'solvent' : undefined,
        metadata:
          l.trim().toLowerCase() === 'solvent'
            ? { cleaningSolventKgPerJob: ref.costingDefaults?.cleaningSolventKgPerJob ?? 20 }
            : undefined,
      })) },
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
    log.info({ count: referenceSeeded }, 'Seeded platform reference items from JSON');
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
  log.info({ count: DEFAULT_PROCESS_ROWS.length }, 'Seeded default process definitions');
  return DEFAULT_PROCESS_ROWS.length;
}

/**
 * Idempotent — inserts solvent catalog rows + Solvent RM type for existing deployments.
 * Also upserts new seaming solvents (THF, Dioxolane, MPA, seaming mix) when missing.
 */
export async function ensureSolventCatalogSeeded(): Promise<{ materials: number; rmType: boolean }> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter((m) => m.type === 'solvent');
  const existingRows = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existingRows.map((r) => [r.key, r]));

  const NEW_SOLVENT_KEYS = new Set([
    'solvent-methoxy-propyl-acetate',
    'solvent-thf',
    'solvent-dioxolane',
    'solvent-sleeve-seaming',
  ]);

  let materialsAdded = 0;
  let materialsUpdated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const match = byKey.get(m.key);
    if (match) {
      if (NEW_SOLVENT_KEYS.has(m.key) || m.key === 'solvent-methoxy-propanol') {
        await db
          .update(schema.platformMasterMaterials)
          .set(masterMaterialInputToDbValues({ ...m, sortOrder: match.sortOrder ?? 900 + i }))
          .where(eq(schema.platformMasterMaterials.id, match.id));
        materialsUpdated++;
      }
      continue;
    }
    await db
      .insert(schema.platformMasterMaterials)
      .values(masterMaterialInputToDbValues({ ...m, sortOrder: 900 + i }));
    materialsAdded++;
  }

  let rmTypeAdded = false;
  const [solventRm] = await db
    .select({ id: schema.platformReferenceItems.id })
    .from(schema.platformReferenceItems)
    .where(
      and(
        eq(schema.platformReferenceItems.category, 'rm_type' as RefCategory),
        eq(schema.platformReferenceItems.code, 'solvent')
      )
    )
    .limit(1);

  if (!solventRm) {
    const rmRows = await db
      .select()
      .from(schema.platformReferenceItems)
      .where(eq(schema.platformReferenceItems.category, 'rm_type' as RefCategory))
      .orderBy(asc(schema.platformReferenceItems.sortOrder));
    const items = [
      ...rmRows.map((r) => ({
        label: r.label,
        code: r.code ?? undefined,
        metadata: (r.metadata as Record<string, unknown> | null) ?? undefined,
      })),
      { label: 'Solvent', code: 'solvent', metadata: { cleaningSolventKgPerJob: 20 } },
    ];
    await replacePlatformReferenceCategory('rm_type' as RefCategory, items);
    rmTypeAdded = true;
  }

  if (materialsAdded > 0 || materialsUpdated > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info(
      { added: materialsAdded, updated: materialsUpdated },
      'Seeded solvent materials and synced tenants'
    );
  }

  if (rmTypeAdded) {
    log.info('Added Solvent RM type to platform reference');
  }

  return { materials: materialsAdded, rmType: rmTypeAdded };
}

const LEGACY_PACKAGING_KEYS = [
  'packaging-wraping-film',
  'packaging-paper-sheet',
  'packaging-pallet',
] as const;

/** Idempotent — inserts packaging catalog rows; retires legacy substrate placeholders. */
export async function ensurePackagingCatalogSeeded(): Promise<{ materials: number; retired: number }> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'packaging' && m.substrateFamily === 'Packaging'
  );
  const existingRows = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existingRows.map((r) => [r.key, r]));

  let materialsAdded = 0;
  let materialsUpdated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const match = byKey.get(m.key);
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: match?.sortOrder ?? 950 + i });
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      materialsUpdated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      materialsAdded++;
    }
  }

  let retired = 0;
  for (const key of LEGACY_PACKAGING_KEYS) {
    const row = byKey.get(key);
    if (row?.active) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      retired++;
    }
  }

  if (materialsAdded > 0 || materialsUpdated > 0 || retired > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ added: materialsAdded, updated: materialsUpdated, retired }, 'Packaging catalog seeded');
  }

  return { materials: materialsAdded + materialsUpdated, retired };
}

/** Idempotent — inserts process consumables catalog rows (mounting tape + other). */
export async function ensureConsumablesCatalogSeeded(): Promise<{ materials: number }> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'packaging' && m.substrateFamily === 'Consumables'
  );
  const existingRows = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existingRows.map((r) => [r.key, r]));

  let materialsAdded = 0;
  let materialsUpdated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const match = byKey.get(m.key);
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: match?.sortOrder ?? 970 + i });
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      materialsUpdated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      materialsAdded++;
    }
  }

  if (materialsAdded > 0 || materialsUpdated > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ added: materialsAdded, updated: materialsUpdated }, 'Consumables catalog seeded');
  }

  return { materials: materialsAdded + materialsUpdated };
}

const LAMINATION_ADHESIVE_KEYS = [
  'adhesive-sb-mp',
  'adhesive-sb-hp',
  'adhesive-sl-dry',
  'adhesive-mono',
] as const;
const RETIRED_ADHESIVE_KEYS = [
  'adhesive-sb',
  'adhesive-sb-gp',
  'adhesive-wb',
  'adhesive-mono-component',
] as const;

/**
 * Idempotent — upserts plant-sheet adhesive slots from seed JSON; retires legacy keys.
 */
export async function ensureLaminationAdhesivesSeeded(): Promise<{ upserted: number; retired: number }> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'adhesive' && (LAMINATION_ADHESIVE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 800 + i });
    const match = byKey.get(m.key);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  let retired = 0;
  for (const key of RETIRED_ADHESIVE_KEYS) {
    const row = byKey.get(key);
    if (row?.active) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      retired++;
    }
  }

  // Always sync + remapping retirees (idempotent). Never hard-prune adhesives while layers may still point at GP/WB.
  if (inserted > 0 || updated > 0 || retired > 0) {
    await incrementMasterDataVersion();
  }
  const materials = await listPlatformMasterMaterials();
  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  for (const t of tenants) {
    await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    await remappingRetiredAdhesivesForTenant(t.id);
  }
  if (inserted > 0 || updated > 0 || retired > 0) {
    log.info({ inserted, updated, retired }, 'Lamination adhesives updated and tenants synced');
  }

  return { upserted: inserted + updated + retired, retired };
}

const PET_SUBSTRATE_KEYS = [
  'pet-transparent',
  'pet-transparent-hr',
  'pet-metalized',
  'pet-metalized-hb',
  'pet-metalized-hf',
  'pet-white',
  'pet-matte',
  'pet-twist-transparent',
  'pet-twist-white',
  'pet-twist-metalized',
  'pet-adhesive-film',
] as const;

const RETIRED_PET_SUBSTRATE_KEYS = [
  'pet-twist-transparent-twist-transparent',
  'pet-twist-transparent-twist-white',
  'pet-twist-methalized',
] as const;

const LEGACY_PET_PLATFORM_KEYS: Record<string, string> = {
  'pet-twist-transparent': 'pet-twist-transparent-twist-transparent',
  'pet-twist-white': 'pet-twist-transparent-twist-white',
  'pet-twist-metalized': 'pet-twist-methalized',
};

/** Idempotent — upserts PET substrates from seed JSON (PB cat_desc alignment, Phase 4 Family 1). */
export async function ensurePetSubstratesFromSeed(): Promise<{ upserted: number; retired: number }> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (PET_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 120 + i });
    const legacyKey = LEGACY_PET_PLATFORM_KEYS[m.key];
    const match = byKey.get(m.key) ?? (legacyKey ? byKey.get(legacyKey) : undefined);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ ...values, key: m.key })
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  let retired = 0;
  for (const key of RETIRED_PET_SUBSTRATE_KEYS) {
    const row = byKey.get(key);
    if (row?.active) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      retired++;
    }
  }

  if (inserted > 0 || updated > 0 || retired > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated, retired }, 'PET substrates updated and tenants synced');
  }

  return { upserted: inserted + updated + retired, retired };
}

const BOPP_SUBSTRATE_KEYS = [
  'bopp-transparent-hs',
  'bopp-transparent-nhs',
  'bopp-transparent-hr',
  'bopp-transparent-lg',
  'bopp-white-lg',
  'bopp-matte-transparent',
  'bopp-metalized',
  'bopp-metalized-hb',
  'bopp-pearlized',
] as const;

const RETIRED_BOPP_SUBSTRATE_KEYS = ['bopp-white-opaque', 'bopp-transparent'] as const;

/** Idempotent — upserts BOPP substrates from seed JSON (Phase 4 Family 4). */
export async function ensureBoppSubstratesFromSeed(): Promise<{
  upserted: number;
  retired: number;
  pruned: number;
}> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (BOPP_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 200 + i });
    const match = byKey.get(m.key);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  let retired = 0;
  for (const key of RETIRED_BOPP_SUBSTRATE_KEYS) {
    const row = byKey.get(key);
    if (row?.active) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      retired++;
    }
  }

  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  let pruned = 0;

  if (inserted > 0 || updated > 0 || retired > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated, retired }, 'BOPP substrates updated and tenants synced');
  }

  for (const t of tenants) {
    pruned += await pruneTenantSubstratesByPlatformKeyAllowlist(
      t.id,
      'BOPP',
      BOPP_SUBSTRATE_KEYS
    );
  }
  if (pruned > 0) {
    log.info({ pruned }, 'Retired BOPP substrate rows removed from tenant libraries');
  }

  return { upserted: inserted + updated + retired, retired, pruned };
}

const CPP_SUBSTRATE_KEYS = [
  'cpp-transparent',
  'cpp-metalized',
  'cpp-white',
  'cpp-retort',
  'cpp-high-seal-strength',
] as const;

/** Idempotent — upserts CPP substrates from seed JSON (Phase 4 Family 5). */
export async function ensureCppSubstratesFromSeed(): Promise<{
  upserted: number;
  retired: number;
  pruned: number;
}> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (CPP_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 210 + i });
    const match = byKey.get(m.key);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  let pruned = 0;

  if (inserted > 0 || updated > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated }, 'CPP substrates updated and tenants synced');
  }

  for (const t of tenants) {
    pruned += await pruneTenantSubstratesByPlatformKeyAllowlist(
      t.id,
      'CPP',
      CPP_SUBSTRATE_KEYS
    );
  }
  if (pruned > 0) {
    log.info({ pruned }, 'Stale CPP substrate rows removed from tenant libraries');
  }

  return { upserted: inserted + updated, retired: 0, pruned };
}

const PA_SUBSTRATE_KEYS = ['bopa-transparent', 'bopa-transparent-hb', 'pa-pe'] as const;

/** Idempotent — upserts PA substrates from seed JSON (Phase 4 Family 6). */
export async function ensurePaSubstratesFromSeed(): Promise<{
  upserted: number;
  retired: number;
  pruned: number;
}> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (PA_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 220 + i });
    const match = byKey.get(m.key);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  let pruned = 0;

  if (inserted > 0 || updated > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated }, 'PA substrates updated and tenants synced');
  }

  for (const t of tenants) {
    pruned += await pruneTenantSubstratesByPlatformKeyAllowlist(t.id, 'PA', PA_SUBSTRATE_KEYS);
  }
  if (pruned > 0) {
    log.info({ pruned }, 'Stale PA substrate rows removed from tenant libraries');
  }

  return { upserted: inserted + updated, retired: 0, pruned };
}

const PAP_SUBSTRATE_KEYS = [
  'kraft-paper-brown',
  'kraft-paper-white',
  'mg-paper',
  'gp-paper',
  'c1s-paper',
  'coated-paper-pe',
  'twist-wrap-paper',
] as const;

const RETIRED_PAP_SUBSTRATE_KEYS = ['c2s-paper', 'paper-white-coated'] as const;

/** Idempotent — upserts PAP/PAPER substrates from seed JSON (Phase 4 Family 7). */
export async function ensurePapSubstratesFromSeed(): Promise<{
  upserted: number;
  retired: number;
  pruned: number;
}> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (PAP_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 230 + i });
    const match = byKey.get(m.key);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  let retired = 0;
  for (const key of RETIRED_PAP_SUBSTRATE_KEYS) {
    const row = byKey.get(key);
    if (row?.active) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      retired++;
    }
  }

  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  let pruned = 0;

  if (inserted > 0 || updated > 0 || retired > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated, retired }, 'PAP substrates updated and tenants synced');
  }

  for (const t of tenants) {
    pruned += await pruneTenantSubstratesByPlatformKeyAllowlist(t.id, 'PAPER', PAP_SUBSTRATE_KEYS);
  }
  if (pruned > 0) {
    log.info({ pruned }, 'Stale PAPER substrate rows removed from tenant libraries');
  }

  return { upserted: inserted + updated + retired, retired, pruned };
}

const SLEEVE_SUBSTRATE_KEYS = [
  'pvc-shrink-normal-shrink-blown',
  'pvc-shrink-high-shrink-cast',
  'pet-shrink',
  'c-pet-shrink',
] as const;

/** Idempotent — upserts SLEEVE substrates from seed JSON (Phase 4 Family 8). */
export async function ensureSleeveSubstratesFromSeed(): Promise<{
  upserted: number;
  retired: number;
  pruned: number;
}> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (SLEEVE_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 240 + i });
    const match = byKey.get(m.key);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  let pruned = 0;

  if (inserted > 0 || updated > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated }, 'SLEEVE substrates updated and tenants synced');
  }

  for (const t of tenants) {
    pruned += await pruneTenantSubstratesByPlatformKeyAllowlist(t.id, 'SLEEVE', SLEEVE_SUBSTRATE_KEYS);
  }
  if (pruned > 0) {
    log.info({ pruned }, 'Stale SLEEVE substrate rows removed from tenant libraries');
  }

  return { upserted: inserted + updated, retired: 0, pruned };
}

const SPECIALTY_SUBSTRATE_KEYS = [
  '7alu-10pe-30-gp-paper',
  '7alu-10pe-35paper-12pe',
  '7alu-10pe-40paper-12pe',
  '6.3alu-10pe-50paper-12pe',
] as const;

const RETIRED_SPECIALTY_SUBSTRATE_KEYS = ['test', '7alu-10pe-50paper-12pe'] as const;

/** Idempotent — upserts SPECIALTY (Alu/Pap laminate) substrates from seed JSON. */
export async function ensureSpecialtySubstratesFromSeed(): Promise<{
  upserted: number;
  retired: number;
  pruned: number;
}> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (SPECIALTY_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 250 + i });
    const match = byKey.get(m.key);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set(values)
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  let retired = 0;
  for (const key of RETIRED_SPECIALTY_SUBSTRATE_KEYS) {
    const row = byKey.get(key);
    if (row?.active) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      retired++;
    }
  }

  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  let pruned = 0;

  if (inserted > 0 || updated > 0 || retired > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated, retired }, 'SPECIALTY substrates updated and tenants synced');
  }

  for (const t of tenants) {
    pruned += await pruneTenantSubstratesByPlatformKeyAllowlist(
      t.id,
      'SPECIALTY',
      SPECIALTY_SUBSTRATE_KEYS
    );
  }
  if (pruned > 0) {
    log.info({ pruned }, 'Stale SPECIALTY substrate rows removed from tenant libraries');
  }

  return { upserted: inserted + updated + retired, retired, pruned };
}

const PE_SUBSTRATE_KEYS = [
  'pe-plain-commercial',
  'pe-plain-industrial',
  'pe-ffs',
  'pe-wide-hdpe',
  'pe-shrink',
  'pe-lamination',
  'pe-shrink-pcr',
  'pe-evoh',
] as const;

const RETIRED_PE_SUBSTRATE_KEYS = ['ldpe-natural', 'ldpe-white'] as const;

const LEGACY_PE_PLATFORM_KEYS: Record<string, string> = {
  'pe-plain-commercial': 'ldpe-natural',
  'pe-plain-industrial': 'ldpe-white',
};

/** Idempotent — upserts PE films from seed (PEBI HALB register alignment). */
export async function ensurePeSubstratesFromSeed(): Promise<{
  upserted: number;
  retired: number;
  pruned: number;
}> {
  const db = getDatabase();
  const seed = loadSeedMaterialsFromJson().filter(
    (m) => m.type === 'substrate' && (PE_SUBSTRATE_KEYS as readonly string[]).includes(m.key)
  );
  const existing = await db.select().from(schema.platformMasterMaterials);
  const byKey = new Map(existing.map((r) => [r.key, r]));

  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < seed.length; i++) {
    const m = seed[i]!;
    const values = masterMaterialInputToDbValues({ ...m, sortOrder: 260 + i });
    const legacyKey = LEGACY_PE_PLATFORM_KEYS[m.key];
    const match = byKey.get(m.key) ?? (legacyKey ? byKey.get(legacyKey) : undefined);
    if (match) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ ...values, key: m.key })
        .where(eq(schema.platformMasterMaterials.id, match.id));
      updated++;
    } else {
      await db.insert(schema.platformMasterMaterials).values(values);
      inserted++;
    }
  }

  let retired = 0;
  for (const key of RETIRED_PE_SUBSTRATE_KEYS) {
    const row = byKey.get(key);
    // Only retire if a renamed row already exists under the new key (avoid wiping mid-migrate).
    const renamedExists =
      (key === 'ldpe-natural' && byKey.has('pe-plain-commercial')) ||
      (key === 'ldpe-white' && byKey.has('pe-plain-industrial'));
    if (row?.active && !renamedExists && row.key === key) {
      // Legacy key was remapped in-place via LEGACY_PE_PLATFORM_KEYS — nothing to retire.
      continue;
    }
    if (row?.active && row.key === key && renamedExists) {
      await db
        .update(schema.platformMasterMaterials)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.platformMasterMaterials.id, row.id));
      retired++;
    }
  }

  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  let pruned = 0;

  if (inserted > 0 || updated > 0 || retired > 0) {
    await incrementMasterDataVersion();
    const materials = await listPlatformMasterMaterials();
    for (const t of tenants) {
      await syncMaterialsForTenant(t.id, materials, { pruneOrphans: false });
    }
    log.info({ inserted, updated, retired }, 'PE substrates updated and tenants synced');
  }

  for (const t of tenants) {
    pruned += await pruneTenantSubstratesByPlatformKeyAllowlist(t.id, 'PE', PE_SUBSTRATE_KEYS);
  }
  if (pruned > 0) {
    log.info({ pruned }, 'Stale PE substrate rows removed from tenant libraries');
  }

  return { upserted: inserted + updated + retired, retired, pruned };
}

/** Persist platform default cleaning EA kg/job (Master Data → Solvent tab). */
export async function updateCostingDefaults(
  cleaningSolventKgPerJob: number,
  actor?: AuditActor
): Promise<{ cleaningSolventKgPerJob: number }> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(schema.platformReferenceItems)
    .where(
      and(
        eq(schema.platformReferenceItems.category, 'rm_type' as RefCategory),
        eq(schema.platformReferenceItems.active, true)
      )
    );

  const solventRow = rows.find(
    (r) => r.code === 'solvent' || r.label.trim().toLowerCase() === 'solvent'
  );
  if (!solventRow) {
    throw new Error('Solvent RM type not found in platform reference');
  }

  const metadata = {
    ...((solventRow.metadata || {}) as Record<string, unknown>),
    cleaningSolventKgPerJob,
  };

  await db
    .update(schema.platformReferenceItems)
    .set({ metadata, updatedAt: new Date() })
    .where(eq(schema.platformReferenceItems.id, solventRow.id));

  const version = await incrementMasterDataVersion();
  await appendMasterAuditEntries(
    version,
    [
      {
        entityType: 'reference_item',
        entityKey: referenceEntityKey('rm_type', solventRow.label),
        action: 'update',
        beforeJson: referenceItemAuditSnapshot(solventRow),
        afterJson: referenceItemAuditSnapshot({ ...solventRow, metadata }),
      },
    ],
    actor
  );

  return { cleaningSolventKgPerJob };
}

function normalizeBandList(bands: WasteBand[]): WasteBand[] {
  return bands
    .filter((b) => b && Number.isFinite(b.minKg) && Number.isFinite(b.wastePercent))
    .map((b) => ({
      minKg: Math.max(0, Number(b.minKg) || 0),
      maxKg: b.maxKg == null ? null : Math.max(0, Number(b.maxKg) || 0),
      wastePercent: Math.min(100, Math.max(0, Number(b.wastePercent) || 0)),
    }))
    .sort((a, b) => {
      if (a.maxKg === null) return 1;
      if (b.maxKg === null) return -1;
      return a.maxKg - b.maxKg;
    });
}

function parseBandList(raw: unknown): WasteBand[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return normalizeBandList(
    raw.filter(
      (b): b is WasteBand =>
        !!b &&
        typeof (b as WasteBand).minKg === 'number' &&
        typeof (b as WasteBand).wastePercent === 'number'
    )
  );
}

function assertValidBandList(bands: WasteBand[], label: string): void {
  if (bands.length === 0) {
    throw new Error(`At least one ${label} waste band is required`);
  }
  if (bands.filter((b) => b.maxKg === null).length > 1) {
    throw new Error(`Only one open-ended (max = ∞) ${label} waste band is allowed`);
  }
}

/**
 * Parse stored jsonb: either legacy `WasteBand[]` (treated as Printed, Plain = 50%)
 * or `{ printed, plain }`.
 */
export function parseWasteBandsByPrintMode(raw: unknown): WasteBandsByPrintMode {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as { printed?: unknown; plain?: unknown };
    const printed = parseBandList(obj.printed);
    const plain = parseBandList(obj.plain);
    if (printed.length > 0 || plain.length > 0) {
      const printedFinal =
        printed.length > 0
          ? printed
          : DEFAULT_WASTE_BANDS_BY_PRINT_MODE.printed.map((b) => ({ ...b }));
      const plainFinal =
        plain.length > 0 ? plain : plainBandsFromPrinted(printedFinal);
      return { printed: printedFinal, plain: plainFinal };
    }
  }
  const legacy = parseBandList(raw);
  if (legacy.length > 0) {
    return { printed: legacy, plain: plainBandsFromPrinted(legacy) };
  }
  return {
    printed: DEFAULT_WASTE_BANDS_BY_PRINT_MODE.printed.map((b) => ({ ...b })),
    plain: DEFAULT_WASTE_BANDS_BY_PRINT_MODE.plain.map((b) => ({ ...b })),
  };
}

/** Read platform-wide Printed/Plain waste bands. Legacy array → Printed + Plain@50%. */
export async function getPlatformWasteBandsByPrintMode(): Promise<WasteBandsByPrintMode> {
  await ensurePlatformMasterState();
  const db = getDatabase();
  const [row] = await db
    .select({ wasteBands: schema.platformMasterState.wasteBands })
    .from(schema.platformMasterState)
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID))
    .limit(1);
  return parseWasteBandsByPrintMode(row?.wasteBands);
}

/** @deprecated Prefer getPlatformWasteBandsByPrintMode — returns Printed bands only. */
export async function getPlatformWasteBands(): Promise<WasteBand[]> {
  const byMode = await getPlatformWasteBandsByPrintMode();
  return byMode.printed.map((b) => ({ ...b }));
}

/** Persist Printed + Plain waste bands (Master Data → Waste Bands). */
export async function replacePlatformWasteBands(
  byMode: WasteBandsByPrintMode,
  actor?: AuditActor
): Promise<WasteBandsByPrintMode> {
  const printed = normalizeBandList(byMode.printed ?? []);
  const plain = normalizeBandList(byMode.plain ?? []);
  assertValidBandList(printed, 'Printed');
  assertValidBandList(plain, 'Plain');

  const normalized: WasteBandsByPrintMode = { printed, plain };

  await ensurePlatformMasterState();
  const db = getDatabase();

  const [beforeRow] = await db
    .select({ wasteBands: schema.platformMasterState.wasteBands })
    .from(schema.platformMasterState)
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID))
    .limit(1);
  const before = beforeRow?.wasteBands ?? null;

  await db
    .update(schema.platformMasterState)
    .set({ wasteBands: normalized, updatedAt: new Date() })
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID));

  const version = await incrementMasterDataVersion();
  await appendMasterAuditEntries(
    version,
    [
      {
        entityType: 'platform_master_state',
        entityKey: 'platform_master_state:waste_bands',
        action: 'update',
        beforeJson: before as Record<string, unknown> | null,
        afterJson: normalized as unknown as Record<string, unknown>,
      },
    ],
    actor
  );

  return normalized;
}

/** Platform factor: CoRM tracks waste % (default 1). */
export async function getPlatformCormScaleWithWaste(): Promise<number> {
  await ensurePlatformMasterState();
  const db = getDatabase();
  const [row] = await db
    .select({ cormScaleWithWaste: schema.platformMasterState.cormScaleWithWaste })
    .from(schema.platformMasterState)
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID))
    .limit(1);
  const n = row?.cormScaleWithWaste != null ? Number(row.cormScaleWithWaste) : DEFAULT_CORM_SCALE_WITH_WASTE;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CORM_SCALE_WITH_WASTE;
}

export async function setPlatformCormScaleWithWaste(
  scale: number,
  actor?: AuditActor
): Promise<number> {
  const normalized = Math.max(0, Number.isFinite(scale) ? scale : DEFAULT_CORM_SCALE_WITH_WASTE);
  await ensurePlatformMasterState();
  const db = getDatabase();
  const [beforeRow] = await db
    .select({ cormScaleWithWaste: schema.platformMasterState.cormScaleWithWaste })
    .from(schema.platformMasterState)
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID))
    .limit(1);
  const before = beforeRow?.cormScaleWithWaste ?? null;

  await db
    .update(schema.platformMasterState)
    .set({ cormScaleWithWaste: String(normalized), updatedAt: new Date() })
    .where(eq(schema.platformMasterState.id, PLATFORM_STATE_ID));

  const version = await incrementMasterDataVersion();
  await appendMasterAuditEntries(
    version,
    [
      {
        entityType: 'platform_master_state',
        entityKey: 'platform_master_state:corm_scale_with_waste',
        action: 'update',
        beforeJson: before != null ? { cormScaleWithWaste: Number(before) } : null,
        afterJson: { cormScaleWithWaste: normalized },
      },
    ],
    actor
  );

  return normalized;
}
