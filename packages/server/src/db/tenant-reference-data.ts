/**
 * Tenant reference overlay — merges the owner-shipped platform defaults with a
 * tenant's own additions (tenant_reference_items).
 *
 * Class A categories (rm_type, process, product_subtype, packaging, ink_coating,
 * adhesive) and `unit` are tenant-extensible. `product_type` and `printing_web`
 * are engine-structural and stay owner-only — they are never read/written here.
 */
import { and, asc, eq } from 'drizzle-orm';
import { getDatabase, schema } from './index';
import { buildMasterDataReferenceFromDb } from './platform-master-data';
import { LEGACY_UNIT_METADATA, type MasterDataReference, type UnitBasis, type UnitRow } from './master-materials-io';

type RefCategory = typeof schema.tenantReferenceItems.$inferInsert['category'];
type TenantRefRow = typeof schema.tenantReferenceItems.$inferSelect;

/** Categories a tenant may add to / override. */
export const TENANT_EXTENSIBLE_CATEGORIES: ReadonlySet<RefCategory> = new Set<RefCategory>([
  'rm_type',
  'process',
  'product_subtype',
  'unit',
  'packaging',
  'ink_coating',
  'adhesive',
]);

export function isTenantExtensibleCategory(category: string): category is RefCategory {
  return TENANT_EXTENSIBLE_CATEGORIES.has(category as RefCategory);
}

/** A tenant's OWN overlay rows (excludes owner defaults), grouped by category. */
export async function listTenantOwnReference(
  tenantId: string
): Promise<Record<string, Array<{ label: string; code: string | null; metadata: Record<string, unknown> | null }>>> {
  const rows = await listTenantReferenceItems(tenantId);
  const out: Record<string, Array<{ label: string; code: string | null; metadata: Record<string, unknown> | null }>> = {};
  for (const r of rows) {
    (out[r.category] ??= []).push({
      label: r.label,
      code: r.code,
      metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    });
  }
  return out;
}

async function listTenantReferenceItems(tenantId: string, category?: RefCategory): Promise<TenantRefRow[]> {
  const db = getDatabase();
  const where = category
    ? and(eq(schema.tenantReferenceItems.tenantId, tenantId), eq(schema.tenantReferenceItems.category, category))
    : eq(schema.tenantReferenceItems.tenantId, tenantId);
  const rows = await db
    .select()
    .from(schema.tenantReferenceItems)
    .where(where)
    .orderBy(asc(schema.tenantReferenceItems.sortOrder), asc(schema.tenantReferenceItems.label));
  return rows.filter((r: TenantRefRow) => r.active);
}

function deriveCode(label: string, code?: string | null): string {
  return (
    (code || '').trim() ||
    label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  );
}

function unitRowFromItem(label: string, code: string, metadata: Record<string, unknown> | null): UnitRow {
  const meta = (metadata || {}) as { basis?: UnitBasis; multiplier?: number };
  const legacy = LEGACY_UNIT_METADATA[code] ?? LEGACY_UNIT_METADATA[label.trim().toLowerCase()] ?? {
    basis: 'kg' as UnitBasis,
    multiplier: 1,
  };
  const basis: UnitBasis =
    meta.basis === 'kg' || meta.basis === 'pieces' || meta.basis === 'sqm' || meta.basis === 'lm'
      ? meta.basis
      : legacy.basis;
  const multiplier = typeof meta.multiplier === 'number' && meta.multiplier > 0 ? meta.multiplier : legacy.multiplier;
  return { label, code, basis, multiplier };
}

/**
 * The effective reference for a tenant: owner defaults merged with the tenant's
 * own rows. Tenant rows are keyed by code (or label where there is no code) and
 * override/extend the matching platform entry.
 */
export async function buildMasterDataReferenceForTenant(tenantId: string): Promise<MasterDataReference> {
  const base = await buildMasterDataReferenceFromDb();
  const overlay = await listTenantReferenceItems(tenantId);
  if (overlay.length === 0) return base;

  const byCat = (cat: RefCategory) => overlay.filter((r) => r.category === cat);

  // ── units (basis + multiplier) ───────────────────────────────────────────
  const tenantUnits = byCat('unit').map((r) => unitRowFromItem(r.label, deriveCode(r.label, r.code), r.metadata as Record<string, unknown> | null));
  const unitRows = mergeByCode(base.unitRows ?? [], tenantUnits, (u) => u.code, (u) => u.label);

  // ── rm types ──────────────────────────────────────────────────────────────
  const tenantRmRows = byCat('rm_type').map((r) => ({ label: r.label, code: deriveCode(r.label, r.code) }));
  const rmTypeRows = mergeByCode(base.rmTypeRows ?? [], tenantRmRows, (r) => r.code, (r) => r.label);

  // ── product subtypes ────────────────────────────────────────────────────────
  const tenantSubtypes = byCat('product_subtype').map((r) => ({
    label: r.label,
    code: deriveCode(r.label, r.code),
    parent: ((r.metadata || {}) as { parent?: string }).parent || '',
  }));
  const productSubtypeRows = mergeByCode(
    base.productSubtypeRows ?? [],
    tenantSubtypes,
    (r) => r.code,
    (r) => r.label
  );

  // ── processes ───────────────────────────────────────────────────────────────
  const tenantProcesses = byCat('process').map((r) => {
    const meta = (r.metadata || {}) as {
      description?: string;
      costPerHour?: number;
      speedBasis?: string;
      speedValue?: number;
      setupHours?: number;
      costPerKgUsd?: number;
    };
    return {
      label: r.label,
      code: deriveCode(r.label, r.code),
      description: meta.description ?? '',
      costPerHour: meta.costPerHour ?? 50,
      speedBasis: meta.speedBasis ?? 'kg_per_hour',
      speedValue: meta.speedValue ?? 100,
      setupHours: meta.setupHours ?? 1,
      costPerKgUsd: meta.costPerKgUsd,
    };
  });
  const processRows = mergeProcessRowsByCode(base.processRows ?? [], tenantProcesses);

  // ── simple label lists ────────────────────────────────────────────────────
  const mergeLabels = (baseList: string[], cat: RefCategory) => {
    const out = [...baseList];
    const seen = new Set(baseList.map((l) => l.trim().toLowerCase()));
    for (const r of byCat(cat)) {
      const key = r.label.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r.label);
      }
    }
    return out;
  };

  return {
    ...base,
    units: unitRows.map((u) => u.label),
    unitRows,
    rmTypes: rmTypeRows.map((r) => r.label),
    rmTypeRows,
    productSubtypeRows,
    processRows,
    packaging: mergeLabels(base.packaging, 'packaging'),
    inkCoating: mergeLabels(base.inkCoating, 'ink_coating'),
    adhesive: mergeLabels(base.adhesive, 'adhesive'),
  };
}

/** Merge a base row list with tenant rows, tenant overriding/extending by code. */
function mergeByCode<T>(
  baseRows: T[],
  tenantRows: T[],
  codeOf: (r: T) => string,
  _labelOf: (r: T) => string
): T[] {
  const byCode = new Map<string, T>();
  for (const r of baseRows) byCode.set(codeOf(r).toLowerCase(), r);
  for (const r of tenantRows) byCode.set(codeOf(r).toLowerCase(), r); // tenant wins
  return [...byCode.values()];
}

function mergeProcessRowsByCode(
  baseRows: Array<{ label: string; code: string; description?: string; costPerHour?: number; speedBasis?: string; speedValue?: number; setupHours?: number; costPerKgUsd?: number }>,
  tenantRows: Array<{ label: string; code: string; description?: string; costPerHour?: number; speedBasis?: string; speedValue?: number; setupHours?: number; costPerKgUsd?: number }>
) {
  const byCode = new Map<string, typeof baseRows[number]>();
  for (const row of baseRows) byCode.set(row.code.toLowerCase(), row);
  for (const tenantRow of tenantRows) {
    const code = tenantRow.code.toLowerCase();
    const baseRow = byCode.get(code);
    if (baseRow) {
      byCode.set(code, {
        ...baseRow,
        ...tenantRow,
        costPerKgUsd: tenantRow.costPerKgUsd ?? baseRow.costPerKgUsd,
      });
    } else {
      byCode.set(code, {
        ...tenantRow,
        costPerKgUsd: tenantRow.costPerKgUsd ?? 0,
      });
    }
  }
  return [...byCode.values()];
}

/**
 * Resolve a tenant's order-quantity unit code to {basis, multiplier}. Used at
 * calc time so custom tenant units convert correctly. Returns undefined when the
 * code is a built-in legacy unit (the engine resolves those itself).
 */
export async function resolveOrderUnitDef(
  tenantId: string,
  unitCode: string | null | undefined
): Promise<{ basis: UnitBasis; multiplier: number } | undefined> {
  if (!unitCode) return undefined;
  const code = unitCode.trim().toLowerCase();
  // Tenant override first
  const tenantUnits = await listTenantReferenceItems(tenantId, 'unit');
  const tenantMatch = tenantUnits.find((r) => deriveCode(r.label, r.code) === code);
  if (tenantMatch) {
    const def = unitRowFromItem(tenantMatch.label, code, tenantMatch.metadata as Record<string, unknown> | null);
    return { basis: def.basis, multiplier: def.multiplier };
  }
  // Platform unit
  const base = await buildMasterDataReferenceFromDb();
  const match = (base.unitRows ?? []).find((u) => u.code.toLowerCase() === code);
  if (match) return { basis: match.basis, multiplier: match.multiplier };
  return undefined;
}

/**
 * Replace all of a tenant's rows for one reference category. Only Class A
 * categories + `unit` are allowed.
 */
export async function replaceTenantReferenceCategory(
  tenantId: string,
  category: RefCategory,
  items: Array<{ label: string; code?: string | null; metadata?: Record<string, unknown> | null }>
): Promise<TenantRefRow[]> {
  if (!isTenantExtensibleCategory(category)) {
    throw new Error(`Reference category "${category}" is not tenant-editable`);
  }
  const db = getDatabase();
  await db
    .delete(schema.tenantReferenceItems)
    .where(
      and(eq(schema.tenantReferenceItems.tenantId, tenantId), eq(schema.tenantReferenceItems.category, category))
    );

  const cleaned = items.filter((i) => i.label.trim());
  if (cleaned.length === 0) return [];

  const values = cleaned.map((item, i) => ({
    tenantId,
    category,
    label: item.label.trim(),
    code: item.code?.trim() || null,
    metadata: item.metadata ?? null,
    sortOrder: i,
    active: true,
    updatedAt: new Date(),
  }));
  return db.insert(schema.tenantReferenceItems).values(values).returning();
}
