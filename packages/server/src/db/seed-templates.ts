import { getDatabase, schema } from './index';
import templateSeed from './structure-templates-seed.json';
import { eq, and, asc } from 'drizzle-orm';
import { log } from '../utils/logger';
import {
  buildTemplateMaterialLookup,
  buildValidMaterialIdSet,
  resolveTemplateLayers,
  type TemplateLayerRef,
} from '../utils/template-material-lookup';
import {
  deriveStandardTemplateKey,
  resolveTemplateKeyAssignments,
  type TemplateKeyRow,
} from '../utils/template-key';

interface TemplateLayerSeed {
  layer_order: number;
  layer_type: 'substrate' | 'ink' | 'adhesive';
  ref_material_key: string;
  default_micron: number;
  swappable_with?: string;
}

interface TemplateSeedEntry {
  pebi_parent_pg: string;
  name: string;
  product_type: 'roll' | 'sleeve' | 'pouch' | 'bag';
  material_class: string | null;
  structure_type: string;
  substrate_origin: string | null;
  display_order: number;
  default_dimensions: Record<string, any>;
  default_layers: TemplateLayerSeed[];
  default_processes?: { process_key: string; enabled: boolean }[];
  default_printing_web_class?: 'wide_web' | 'narrow_web';
  solvent_mix_enabled?: boolean;
  ink_system_options?: string[];
  substrate_options?: string[];
  /** Per-template CoRM Printed (display currency/kg); platform DB only. */
  corm_per_kg_usd?: string | null;
  corm_per_kg_plain?: string | null;
  moq_kg?: string | null;
}

/**
 * Row shape consumed by tenant-projection logic. Platform rows and seed-JSON
 * entries are both normalized into this shape before projecting into a tenant.
 */
interface PlatformStandardSource {
  templateKey: string;
  name: string;
  pebiParentPg: string;
  productType: 'roll' | 'sleeve' | 'pouch' | 'bag';
  productSubtype?: string | null;
  materialClass: string | null;
  structureType: string | null;
  substrateOrigin: string | null;
  displayOrder: number;
  defaultDimensions: Record<string, any>;
  defaultLayers: TemplateLayerRef[];
  defaultProcesses: { process_key: string; enabled: boolean }[];
  defaultPrintingWebClass: 'wide_web' | 'narrow_web';
  solventMixEnabled: boolean;
  inkSystemOptions: string[] | null;
  substrateOptions: string[] | null;
  /** Per-template CoRM Printed (display currency/kg) — null for seed-JSON-only sources. */
  cormPerKgUsd: string | null;
  cormPerKgPlain: string | null;
  moqKg: string | null;
  isActive: boolean;
  updatedAt: Date | null;
}

function seedEntryToSource(t: TemplateSeedEntry): PlatformStandardSource {
  return {
    templateKey: deriveStandardTemplateKey({
      pebiParentPg: t.pebi_parent_pg,
      name: t.name,
      materialClass: t.material_class,
      structureType: t.structure_type,
    }),
    name: t.name,
    pebiParentPg: t.pebi_parent_pg,
    productType: t.product_type,
    materialClass: t.material_class,
    structureType: t.structure_type,
    substrateOrigin: t.substrate_origin,
    displayOrder: t.display_order,
    defaultDimensions: t.default_dimensions || {},
    defaultLayers: t.default_layers.map((l) => ({ ...l })) as TemplateLayerRef[],
    defaultProcesses: t.default_processes || [],
    defaultPrintingWebClass: (t.default_printing_web_class || 'wide_web') as
      | 'wide_web'
      | 'narrow_web',
    solventMixEnabled: t.solvent_mix_enabled || false,
    inkSystemOptions: t.ink_system_options || ['SB'],
    substrateOptions: t.substrate_options || null,
    cormPerKgUsd: t.corm_per_kg_usd ?? null,
    cormPerKgPlain: t.corm_per_kg_plain ?? null,
    moqKg: t.moq_kg ?? null,
    isActive: true,
    updatedAt: null,
  };
}

async function loadTenantMaterials(tenantId: string) {
  const db = getDatabase();
  return db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));
}

/**
 * Read the canonical platform-standards catalog. Falls back to the seed JSON
 * when the platform table is empty or unreadable (e.g. before the boot
 * bootstrap has run, or in dev environments where the table doesn't exist).
 *
 * IMPORTANT: this function must never throw. Callers (sync, ensure) depend on
 * always getting a usable source list so the templates endpoint doesn't 500.
 */
async function loadPlatformStandardSources(): Promise<PlatformStandardSource[]> {
  const db = getDatabase();
  try {
    const rows = await db
      .select()
      .from(schema.platformStandardTemplates)
      .orderBy(asc(schema.platformStandardTemplates.displayOrder));

    if (rows.length > 0) {
      return rows.map(
        (r: (typeof rows)[number]): PlatformStandardSource => ({
          templateKey: r.templateKey,
          name: r.name,
          pebiParentPg: r.pebiParentPg,
          productType: r.productType as 'roll' | 'sleeve' | 'pouch' | 'bag',
          productSubtype: r.productSubtype ?? null,
          materialClass: r.materialClass,
          structureType: r.structureType,
          substrateOrigin: r.substrateOrigin,
          displayOrder: r.displayOrder,
          defaultDimensions:
            (r.defaultDimensions as Record<string, any> | null) || {},
          defaultLayers:
            (r.defaultLayers as TemplateLayerRef[] | null) || [],
          defaultProcesses:
            (r.defaultProcesses as { process_key: string; enabled: boolean }[] | null) || [],
          defaultPrintingWebClass:
            (r.defaultPrintingWebClass as 'wide_web' | 'narrow_web' | null) || 'wide_web',
          solventMixEnabled: r.solventMixEnabled ?? false,
          inkSystemOptions: (r.inkSystemOptions as string[] | null) || null,
          substrateOptions: (r.substrateOptions as string[] | null) || null,
          cormPerKgUsd: r.cormPerKgUsd ?? null,
          cormPerKgPlain: r.cormPerKgPlain ?? null,
          moqKg: r.moqKg ?? null,
          isActive: r.isActive ?? true,
          updatedAt: r.updatedAt ?? null,
        })
      );
    }
  } catch (err) {
    // Table may not exist yet on first-time boot of a fresh dev DB.
    log.warn(
      { err: (err as Error).message },
      'platform_standard_templates not readable, falling back to seed JSON'
    );
  }

  try {
    return (templateSeed as { templates: TemplateSeedEntry[] }).templates.map(seedEntryToSource);
  } catch (err) {
    log.error({ err }, 'Seed JSON fallback failed');
    return [];
  }
}

function sourceToTenantInsertRow(
  tenantId: string,
  source: PlatformStandardSource,
  resolvedLayers: ReturnType<typeof resolveTemplateLayers>
) {
  return {
    tenantId,
    templateKey: source.templateKey,
    name: source.name,
    pebiParentPg: source.pebiParentPg,
    productType: source.productType,
    productSubtype: source.productSubtype ?? null,
    materialClass: source.materialClass,
    structureType: source.structureType,
    substrateOrigin: source.substrateOrigin,
    displayOrder: source.displayOrder,
    defaultDimensions: source.defaultDimensions,
    defaultLayers: resolvedLayers,
    defaultProcesses: source.defaultProcesses,
    defaultPrintingWebClass: source.defaultPrintingWebClass,
    solventMixEnabled: source.solventMixEnabled,
    inkSystemOptions: source.inkSystemOptions ?? ['SB'],
    substrateOptions: source.substrateOptions,
    cormPerKgUsd: source.cormPerKgUsd,
    cormPerKgPlain: source.cormPerKgPlain,
    moqKg: source.moqKg,
    isStandard: true,
    isActive: source.isActive,
  };
}

/** Fields mirrored from platform → tenant copy (id preserved). */
function tenantMirrorUpdateFields(
  source: PlatformStandardSource,
  resolvedLayers: ReturnType<typeof resolveTemplateLayers>
) {
  return {
    name: source.name,
    pebiParentPg: source.pebiParentPg,
    productType: source.productType,
    productSubtype: source.productSubtype ?? null,
    materialClass: source.materialClass,
    structureType: source.structureType,
    substrateOrigin: source.substrateOrigin,
    displayOrder: source.displayOrder,
    defaultDimensions: source.defaultDimensions,
    defaultLayers: resolvedLayers,
    defaultProcesses: source.defaultProcesses,
    defaultPrintingWebClass: source.defaultPrintingWebClass,
    solventMixEnabled: source.solventMixEnabled,
    inkSystemOptions: source.inkSystemOptions ?? ['SB'],
    substrateOptions: source.substrateOptions,
    cormPerKgUsd: source.cormPerKgUsd,
    cormPerKgPlain: source.cormPerKgPlain,
    moqKg: source.moqKg,
    isActive: source.isActive,
    updatedAt: new Date(),
  };
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; cause?: { code?: string } };
  return (
    e.code === '23505' ||
    e.cause?.code === '23505' ||
    (typeof e.message === 'string' && e.message.includes('duplicate key value'))
  );
}

/**
 * Insert a tenant copy, or update if a concurrent sync already inserted it
 * (structure_templates_tenant_key_uq). Returns 'inserted' | 'updated'.
 */
async function insertOrUpdateTenantStandard(
  tenantId: string,
  source: PlatformStandardSource,
  resolvedLayers: ReturnType<typeof resolveTemplateLayers>
): Promise<'inserted' | 'updated'> {
  const db = getDatabase();
  try {
    await db
      .insert(schema.structureTemplates)
      .values(sourceToTenantInsertRow(tenantId, source, resolvedLayers));
    return 'inserted';
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    await db
      .update(schema.structureTemplates)
      .set(tenantMirrorUpdateFields(source, resolvedLayers))
      .where(
        and(
          eq(schema.structureTemplates.tenantId, tenantId),
          eq(schema.structureTemplates.templateKey, source.templateKey)
        )
      );
    return 'updated';
  }
}

/**
 * First-time seed for a brand-new tenant. Inserts a row per platform standard.
 * Layers are resolved from `ref_material_key` to the tenant's own `materials.id`.
 */
export async function seedTemplatesForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();

  try {
    const materials = await loadTenantMaterials(tenantId);
    const materialLookup = buildTemplateMaterialLookup(materials);
    const validIds = buildValidMaterialIdSet(materials);
    const sources = await loadPlatformStandardSources();

    if (sources.length === 0) {
      log.warn({ tenantId }, 'No platform standards available to seed for tenant');
      return 0;
    }

    const rowsToInsert = sources.map((source) => {
      const resolvedLayers = resolveTemplateLayers(
        source.defaultLayers.map((layer) => ({ ...layer })),
        materialLookup,
        validIds
      );
      return sourceToTenantInsertRow(tenantId, source, resolvedLayers);
    });

    const inserted = await db
      .insert(schema.structureTemplates)
      .values(rowsToInsert)
      .returning();

    log.info({ tenantId, count: inserted.length }, 'Seeded structure templates for tenant');
    return inserted.length;
  } catch (error) {
    log.error({ err: error, tenantId }, 'Failed to seed structure templates');
    throw error;
  }
}

/**
 * Reconcile a tenant's `structure_templates` rows against the platform catalog:
 *   - missing copies inserted
 *   - stale copies refreshed in place (id preserved so estimates keep working)
 *   - upstream-inactive copies marked inactive
 *   - "orphan" tenant copies (no longer in catalog) marked inactive
 *
 * Returns the number of rows touched.
 */
export async function syncPlatformStandardsToTenant(tenantId: string): Promise<number> {
  const db = getDatabase();
  const materials = await loadTenantMaterials(tenantId);
  const materialLookup = buildTemplateMaterialLookup(materials);
  const validIds = buildValidMaterialIdSet(materials);
  const sources = await loadPlatformStandardSources();

  const tenantCopies = await db
    .select()
    .from(schema.structureTemplates)
    .where(
      and(
        eq(schema.structureTemplates.tenantId, tenantId),
        eq(schema.structureTemplates.isStandard, true)
      )
    );

  const copiesByKey = new Map<string, (typeof tenantCopies)[number]>();
  for (const c of tenantCopies) {
    if (c.templateKey) copiesByKey.set(c.templateKey, c);
  }

  let touched = 0;
  const sourceKeys = new Set<string>();

  for (const source of sources) {
    sourceKeys.add(source.templateKey);
    const resolvedLayers = resolveTemplateLayers(
      source.defaultLayers.map((layer) => ({ ...layer })),
      materialLookup,
      validIds
    );

    const existing = copiesByKey.get(source.templateKey);

    if (!existing) {
      if (!source.isActive) continue; // never insert an inactive standard
      await insertOrUpdateTenantStandard(tenantId, source, resolvedLayers);
      touched++;
      continue;
    }

    // Upstream deactivation: mirror to tenant copy.
    if (!source.isActive && existing.isActive) {
      await db
        .update(schema.structureTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.structureTemplates.id, existing.id));
      touched++;
      continue;
    }

    // Platform catalog is source of truth for standards — always mirror.
    // Never gate on updatedAt/contentDrift (those skipped or fought live edits).
    await db
      .update(schema.structureTemplates)
      .set(tenantMirrorUpdateFields(source, resolvedLayers))
      .where(eq(schema.structureTemplates.id, existing.id));
    touched++;
  }

  // Orphans: tenant copies whose key no longer exists upstream → deactivate.
  for (const c of tenantCopies) {
    if (!c.templateKey) continue;
    if (sourceKeys.has(c.templateKey)) continue;
    if (!c.isActive) continue;
    await db
      .update(schema.structureTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.structureTemplates.id, c.id));
    touched++;
  }

  if (touched > 0) {
    log.info({ tenantId, touched }, 'Synced platform standards into tenant');
  }
  return touched;
}

/**
 * Live-sync ONE platform standard to ALL tenant copies (across all tenants).
 * Mirrors the same per-tenant logic as `syncPlatformStandardsToTenant(tenantId)`,
 * but scoped to a single `templateKey` so the platform PATCH/DELETE handlers
 * can propagate a change immediately without re-syncing the entire catalog.
 *
 * Use this from the platform-templates admin route after a PATCH/DELETE so
 * that:
 *   - a CoRM (or other field) change on the platform row is mirrored to every
 *     tenant's `structure_templates` row of that templateKey in the same request,
 *   - a soft-delete (isActive=false) on the platform row deactivates the same
 *     row on every tenant that has it.
 *
 * Returns counts so the caller can surface a "Synced to N tenant(s)" toast.
 */
export async function syncSinglePlatformStandardToAllTenants(
  templateKey: string
): Promise<{ syncedTenants: number; deactivatedTenants: number; inserted: number }> {
  const db = getDatabase();
  const sources = await loadPlatformStandardSources();
  const source = sources.find((s) => s.templateKey === templateKey);
  if (!source) {
    throw new Error(
      `Platform standard "${templateKey}" not found after write — cannot live-sync tenants`
    );
  }

  const allTenantIds = (await db.select({ id: schema.tenants.id }).from(schema.tenants)).map(
    (t: { id: string }) => t.id
  );

  const tenantCopies = await db
    .select()
    .from(schema.structureTemplates)
    .where(
      and(
        eq(schema.structureTemplates.templateKey, templateKey),
        eq(schema.structureTemplates.isStandard, true)
      )
    );

  const existingByTenant = new Map<string, (typeof tenantCopies)[number]>();
  for (const c of tenantCopies) existingByTenant.set(c.tenantId, c);

  let syncedTenants = 0;
  let deactivatedTenants = 0;
  let inserted = 0;
  const failures: Array<{ tenantId: string; message: string }> = [];

  for (const tenantId of allTenantIds) {
    try {
      const existing = existingByTenant.get(tenantId);

      const materials = await loadTenantMaterials(tenantId);
      const materialLookup = buildTemplateMaterialLookup(materials);
      const validIds = buildValidMaterialIdSet(materials);
      const resolvedLayers = resolveTemplateLayers(
        source.defaultLayers.map((layer) => ({ ...layer })),
        materialLookup,
        validIds
      );

      if (!existing) {
        if (!source.isActive) continue;
        const outcome = await insertOrUpdateTenantStandard(
          tenantId,
          source,
          resolvedLayers
        );
        if (outcome === 'inserted') inserted++;
        else syncedTenants++;
        continue;
      }

      if (!source.isActive && existing.isActive) {
        await db
          .update(schema.structureTemplates)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(schema.structureTemplates.id, existing.id));
        deactivatedTenants++;
        continue;
      }

      // Always mirror platform → tenant (no updatedAt gate).
      await db
        .update(schema.structureTemplates)
        .set(tenantMirrorUpdateFields(source, resolvedLayers))
        .where(eq(schema.structureTemplates.id, existing.id));
      syncedTenants++;
    } catch (err) {
      failures.push({
        tenantId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Live-sync failed for ${failures.length}/${allTenantIds.length} tenant(s) ` +
        `(templateKey=${templateKey}): ` +
        failures.map((f) => `${f.tenantId}: ${f.message}`).join('; ')
    );
  }

  log.info(
    {
      templateKey,
      syncedTenants,
      deactivatedTenants,
      inserted,
      tenantCount: allTenantIds.length,
    },
    'Synced platform standard to tenants'
  );

  return { syncedTenants, deactivatedTenants, inserted };
}

/**
 * Legacy compatibility wrapper. Older callers used this name to mean
 * "insert any standard templates from the JSON seed that are missing in
 * the tenant." The platform-templates feature replaces the JSON-driven
 * sync with `syncPlatformStandardsToTenant`, which has the same effect
 * (and more): inserts missing copies, refreshes stale ones, deactivates
 * removed ones.
 */
export async function syncMissingStandardTemplates(tenantId: string): Promise<number> {
  return syncPlatformStandardsToTenant(tenantId);
}

/** Keep one active standard template per name (lowest display_order wins). */
export async function pruneDuplicateStandardTemplates(tenantId: string): Promise<number> {
  const db = getDatabase();
  const rows = await db
    .select({
      id: schema.structureTemplates.id,
      name: schema.structureTemplates.name,
    })
    .from(schema.structureTemplates)
    .where(
      and(
        eq(schema.structureTemplates.tenantId, tenantId),
        eq(schema.structureTemplates.isStandard, true),
        eq(schema.structureTemplates.isActive, true)
      )
    )
    .orderBy(asc(schema.structureTemplates.displayOrder), asc(schema.structureTemplates.createdAt));

  const seen = new Set<string>();
  const toDeactivate: string[] = [];
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (seen.has(key)) {
      toDeactivate.push(row.id);
    } else {
      seen.add(key);
    }
  }

  for (const id of toDeactivate) {
    await db
      .update(schema.structureTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.structureTemplates.id, id));
  }

  return toDeactivate.length;
}

/** Backfill template_key on existing rows (MES Phase D). Collision-safe for duplicate legacy rows. */
export async function syncTemplateKeysForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();
  const templates = await db
    .select()
    .from(schema.structureTemplates)
    .where(eq(schema.structureTemplates.tenantId, tenantId));

  const rows: TemplateKeyRow[] = templates.map((t: (typeof templates)[number]) => ({
    id: t.id,
    name: t.name,
    pebiParentPg: t.pebiParentPg,
    materialClass: t.materialClass,
    structureType: t.structureType,
    isStandard: t.isStandard,
    isActive: t.isActive,
    templateKey: t.templateKey,
    displayOrder: t.displayOrder,
    createdAt: t.createdAt,
  }));

  const assignments = resolveTemplateKeyAssignments(rows);
  const toUpdate: { id: string; key: string | null }[] = [];
  for (const t of templates) {
    const key = assignments.get(t.id) ?? null;
    if (t.templateKey !== key) {
      toUpdate.push({ id: t.id, key });
    }
  }
  if (toUpdate.length === 0) return 0;

  // Clear keys first so reassignment cannot hit structure_templates_tenant_key_uq.
  for (const { id } of toUpdate) {
    await db
      .update(schema.structureTemplates)
      .set({ templateKey: null, updatedAt: new Date() })
      .where(eq(schema.structureTemplates.id, id));
  }
  for (const { id, key } of toUpdate) {
    await db
      .update(schema.structureTemplates)
      .set({ templateKey: key, updatedAt: new Date() })
      .where(eq(schema.structureTemplates.id, id));
  }
  return toUpdate.length;
}

/** Idempotent — seeds platform standards into a tenant only when tenant has none. */
export async function ensureTemplatesForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();
  const existing = await db
    .select({ id: schema.structureTemplates.id })
    .from(schema.structureTemplates)
    .where(eq(schema.structureTemplates.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return 0;
  }

  return seedTemplatesForTenant(tenantId);
}

/** Re-resolve materialId on all templates from current tenant library (e.g. after Excel refresh). */
export async function relinkTemplatesForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();
  const materials = await loadTenantMaterials(tenantId);
  const lookup = buildTemplateMaterialLookup(materials);
  const validIds = buildValidMaterialIdSet(materials);
  // Type map so resolveLayerMaterialId can reject stale materialIds that point to the wrong type
  const typeMap = new Map<string, string>(materials.map((m) => [m.id, m.type]));

  const templates = await db
    .select()
    .from(schema.structureTemplates)
    .where(eq(schema.structureTemplates.tenantId, tenantId));

  let updated = 0;
  for (const template of templates) {
    const layers = (template.defaultLayers as TemplateLayerRef[]) || [];
    const resolved = resolveTemplateLayers(layers, lookup, validIds, typeMap);
    // Always update when any layer's materialId changed (including type-mismatch corrections)
    const changed = resolved.some(
      (layer, i) => layer.materialId !== layers[i]?.materialId
    );
    if (!changed) continue;

    await db
      .update(schema.structureTemplates)
      .set({ defaultLayers: resolved, updatedAt: new Date() })
      .where(eq(schema.structureTemplates.id, template.id));
    updated++;
  }

  if (updated > 0) {
    log.info({ tenantId, updated }, 'Relinked materials on templates for tenant');
  }
  return updated;
}
