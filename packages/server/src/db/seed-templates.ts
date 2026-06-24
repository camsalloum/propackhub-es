import { getDatabase, schema } from './index';
import templateSeed from './structure-templates-seed.json';
import { eq, and, asc } from 'drizzle-orm';
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
  product_type: 'roll' | 'sleeve' | 'pouch';
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
}

function templateKeyFromSeed(t: TemplateSeedEntry): string {
  return deriveStandardTemplateKey({
    pebiParentPg: t.pebi_parent_pg,
    name: t.name,
    materialClass: t.material_class,
    structureType: t.structure_type,
  });
}

function templateInsertRow(
  tenantId: string,
  t: TemplateSeedEntry,
  resolvedLayers: ReturnType<typeof resolveTemplateLayers>
) {
  return {
    tenantId,
    templateKey: templateKeyFromSeed(t),
    name: t.name,
    pebiParentPg: t.pebi_parent_pg,
    productType: t.product_type,
    materialClass: t.material_class,
    structureType: t.structure_type,
    substrateOrigin: t.substrate_origin,
    displayOrder: t.display_order,
    defaultDimensions: t.default_dimensions || {},
    defaultLayers: resolvedLayers,
    defaultProcesses: t.default_processes || [],
    defaultPrintingWebClass: (t.default_printing_web_class || 'wide_web') as 'wide_web' | 'narrow_web',
    solventMixEnabled: t.solvent_mix_enabled || false,
    inkSystemOptions: t.ink_system_options || ['SB'],
    substrateOptions: t.substrate_options || null,
    isStandard: true,
  };
}

async function loadTenantMaterials(tenantId: string) {
  const db = getDatabase();
  return db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));
}

export async function seedTemplatesForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();

  try {
    const materials = await loadTenantMaterials(tenantId);
    const materialLookup = buildTemplateMaterialLookup(materials);
    const validIds = buildValidMaterialIdSet(materials);
    const templates = (templateSeed as any).templates as TemplateSeedEntry[];

    const templatesToInsert = templates.map((t) => {
      const resolvedLayers = resolveTemplateLayers(
        t.default_layers.map((layer) => ({ ...layer })),
        materialLookup,
        validIds
      );
      return templateInsertRow(tenantId, t, resolvedLayers);
    });

    const inserted = await db
      .insert(schema.structureTemplates)
      .values(templatesToInsert)
      .returning();

    console.log(`✓ Seeded ${inserted.length} structure templates for tenant ${tenantId}`);
    return inserted.length;
  } catch (error) {
    console.error('Failed to seed structure templates:', error);
    throw error;
  }
}

/** Insert any standard templates from seed that are missing by name (e.g. new laminate tiers). */
export async function syncMissingStandardTemplates(tenantId: string): Promise<number> {
  const db = getDatabase();
  const materials = await loadTenantMaterials(tenantId);
  const materialLookup = buildTemplateMaterialLookup(materials);
  const validIds = buildValidMaterialIdSet(materials);
  const templates = (templateSeed as { templates: TemplateSeedEntry[] }).templates;

  const existing = await db
    .select({ id: schema.structureTemplates.id, name: schema.structureTemplates.name })
    .from(schema.structureTemplates)
    .where(eq(schema.structureTemplates.tenantId, tenantId));
  const existingNames = new Set(existing.map((r: (typeof existing)[number]) => r.name));

  const legacyLaminates = existing.find((r: (typeof existing)[number]) => r.name === 'Laminates');
  if (legacyLaminates && !existingNames.has('Laminates · Duplex')) {
    await db
      .update(schema.structureTemplates)
      .set({ name: 'Laminates · Duplex', updatedAt: new Date() })
      .where(eq(schema.structureTemplates.id, legacyLaminates.id));
    existingNames.delete('Laminates');
    existingNames.add('Laminates · Duplex');
  }

  const missing = templates.filter((t) => !existingNames.has(t.name));
  if (missing.length === 0) return 0;

  const rows = missing.map((t) => {
    const resolvedLayers = resolveTemplateLayers(
      t.default_layers.map((layer) => ({ ...layer })),
      materialLookup,
      validIds
    );
    return templateInsertRow(tenantId, t, resolvedLayers);
  });

  await db.insert(schema.structureTemplates).values(rows);
  console.log(`✓ Synced ${rows.length} missing standard templates for tenant ${tenantId}`);
  const pruned = await pruneDuplicateStandardTemplates(tenantId);
  if (pruned > 0) {
    console.log(`✓ Deactivated ${pruned} duplicate standard templates for tenant ${tenantId}`);
  }
  return rows.length;
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

/** Idempotent — seeds 13 parent PG templates only when tenant has none (e.g. pre-Phase C accounts). */
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
    console.log(`✓ Relinked materials on ${updated} templates for tenant ${tenantId}`);
  }
  return updated;
}
