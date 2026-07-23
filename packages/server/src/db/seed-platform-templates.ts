/**
 * Bootstrap the platform-wide standard templates catalog.
 *
 * On every server boot we upsert entries from `structure-templates-seed.json`
 * into `platform_standard_templates` keyed by `template_key`.
 *
 * Semantics: INSERT IF MISSING. Admin edits to the same templateKey are
 * never overwritten on subsequent boots — the JSON is the bootstrap source,
 * not the source of truth. This keeps "ship with the app" defaults working
 * for fresh installs while preserving runtime admin changes.
 *
 * Also deactivates legacy Decision #17 parent-only rows (name === parent PG)
 * and obsolete `Parent · Tier` seed names that are no longer in the JSON,
 * so PEBI variant subcards replace them cleanly.
 */

import { getDatabase, schema } from './index';
import templateSeed from './structure-templates-seed.json';
import { eq, and } from 'drizzle-orm';
import { log } from '../utils/logger';
import { deriveStandardTemplateKey } from '../utils/template-key';

interface SeedLayer {
  layer_order: number;
  layer_type: 'substrate' | 'ink' | 'adhesive';
  ref_material_key: string;
  default_micron: number;
  swappable_with?: string;
}

interface SeedEntry {
  pebi_parent_pg: string;
  name: string;
  product_type: 'roll' | 'sleeve' | 'pouch' | 'bag';
  material_class: string | null;
  structure_type: string;
  substrate_origin: string | null;
  display_order: number;
  default_dimensions: Record<string, unknown>;
  default_layers: SeedLayer[];
  default_processes?: { process_key: string; enabled: boolean }[];
  default_printing_web_class?: 'wide_web' | 'narrow_web';
  solvent_mix_enabled?: boolean;
  ink_system_options?: string[];
  substrate_options?: string[];
}

function entryToInsertRow(t: SeedEntry) {
  const templateKey = deriveStandardTemplateKey({
    pebiParentPg: t.pebi_parent_pg,
    name: t.name,
    materialClass: t.material_class,
    structureType: t.structure_type,
  });
  return {
    templateKey,
    name: t.name,
    pebiParentPg: t.pebi_parent_pg,
    productType: t.product_type,
    materialClass: t.material_class,
    structureType: t.structure_type,
    substrateOrigin: t.substrate_origin,
    displayOrder: t.display_order,
    defaultDimensions: t.default_dimensions || {},
    defaultLayers: t.default_layers,
    defaultProcesses: t.default_processes || [],
    defaultPrintingWebClass: (t.default_printing_web_class || 'wide_web') as
      | 'wide_web'
      | 'narrow_web',
    solventMixEnabled: t.solvent_mix_enabled || false,
    inkSystemOptions: t.ink_system_options || ['SB'],
    substrateOptions: t.substrate_options || null,
    isActive: true,
  };
}

function isSupersededParentOnlyRow(name: string, pebiParentPg: string): boolean {
  const n = name.trim().toLowerCase();
  const p = pebiParentPg.trim().toLowerCase();
  if (n === p) return true;
  // Obsolete intermediate seed: "Laminates · Duplex" style under parent
  if (/[·•]/.test(name) && n.startsWith(p)) return true;
  return false;
}

/**
 * Insert any seed entries that are not yet present in `platform_standard_templates`.
 * Existing rows (matched by template_key) are left untouched so admin edits persist.
 * Returns the number of newly inserted rows.
 */
export async function bootstrapPlatformStandardCatalog(): Promise<number> {
  const db = getDatabase();
  const entries = (templateSeed as { templates: SeedEntry[] }).templates;
  const seedKeys = new Set(entries.map((e) => entryToInsertRow(e).templateKey));

  let inserted = 0;
  for (const entry of entries) {
    const row = entryToInsertRow(entry);
    const existing = await db
      .select({ id: schema.platformStandardTemplates.id })
      .from(schema.platformStandardTemplates)
      .where(eq(schema.platformStandardTemplates.templateKey, row.templateKey))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(schema.platformStandardTemplates).values(row);
    inserted++;
  }

  // Retire Decision #17 parent-only / ·-tier seeds replaced by PEBI variants.
  const activeRows = await db
    .select({
      id: schema.platformStandardTemplates.id,
      templateKey: schema.platformStandardTemplates.templateKey,
      name: schema.platformStandardTemplates.name,
      pebiParentPg: schema.platformStandardTemplates.pebiParentPg,
    })
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.isActive, true));

  let deactivated = 0;
  for (const row of activeRows) {
    if (seedKeys.has(row.templateKey)) continue;
    if (!isSupersededParentOnlyRow(row.name, row.pebiParentPg)) continue;
    await db
      .update(schema.platformStandardTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.platformStandardTemplates.id, row.id),
          eq(schema.platformStandardTemplates.isActive, true)
        )
      );
    deactivated++;
  }

  // Same PG + variant name with an old short key (pre-variant key derivation) → keep seed key only.
  const stillActive = await db
    .select({
      id: schema.platformStandardTemplates.id,
      templateKey: schema.platformStandardTemplates.templateKey,
      name: schema.platformStandardTemplates.name,
      pebiParentPg: schema.platformStandardTemplates.pebiParentPg,
    })
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.isActive, true));

  const bySig = new Map<string, typeof stillActive>();
  for (const row of stillActive) {
    const sig = `${row.pebiParentPg}::${row.name}`.toLowerCase();
    const list = bySig.get(sig) || [];
    list.push(row);
    bySig.set(sig, list);
  }
  for (const [, list] of bySig) {
    if (list.length < 2) continue;
    const keep = list.find((r) => seedKeys.has(r.templateKey)) || list.sort((a, b) => b.templateKey.length - a.templateKey.length)[0];
    for (const row of list) {
      if (row.id === keep.id) continue;
      await db
        .update(schema.platformStandardTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.platformStandardTemplates.id, row.id));
      deactivated++;
    }
  }

  if (inserted > 0 || deactivated > 0) {
    log.info(
      { inserted, deactivated },
      'Bootstrapped platform standard templates from seed JSON'
    );
  }
  return inserted;
}

/**
 * Read all active platform standards (ordered by display_order).
 * Used by per-tenant sync to project the catalog into `structure_templates`.
 */
export async function listPlatformStandards() {
  const db = getDatabase();
  return db
    .select()
    .from(schema.platformStandardTemplates)
    .orderBy(schema.platformStandardTemplates.displayOrder);
}
