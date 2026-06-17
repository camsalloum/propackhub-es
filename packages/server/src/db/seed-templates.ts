import { getDatabase, schema } from './index';
import templateSeed from './structure-templates-seed.json';
import { eq } from 'drizzle-orm';

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

/**
 * Seed structure templates for a new tenant.
 * Called automatically on tenant registration after materials are seeded.
 * Maps ref_material_key to actual material IDs from the tenant's library.
 */
export async function seedTemplatesForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();

  try {
    // Load tenant materials to map ref_material_key → material ID
    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));

    // Build lookup map: lowercase name fragment → material ID
    const materialLookup = new Map<string, string>();
    for (const mat of materials) {
      materialLookup.set(mat.name.toLowerCase().replace(/\s+/g, '-'), mat.id);
      // Also store by partial match keys
      if (mat.name.toLowerCase().includes('ldpe') && mat.name.toLowerCase().includes('natural')) {
        materialLookup.set('ldpe-natural', mat.id);
      }
      if (mat.name.toLowerCase().includes('ldpe') && mat.name.toLowerCase().includes('shrink')) {
        materialLookup.set('ldpe-shrink', mat.id);
      }
      if (mat.name.toLowerCase().includes('pet') && mat.name.toLowerCase().includes('transparent')) {
        materialLookup.set('pet-transparent', mat.id);
      }
      if (mat.name.toLowerCase().includes('pet') && mat.name.toLowerCase().includes('shrink')) {
        materialLookup.set('pet-shrink', mat.id);
      }
      if (mat.name.toLowerCase().includes('pvc') && mat.name.toLowerCase().includes('shrink')) {
        materialLookup.set('pvc-shrink', mat.id);
      }
      if (mat.name.toLowerCase().includes('bopp')) {
        materialLookup.set('bopp', mat.id);
      }
      if (mat.name.toLowerCase().includes('cpp')) {
        materialLookup.set('cpp', mat.id);
      }
      if (mat.name.toLowerCase().includes('aluminium') || mat.name.toLowerCase().includes('aluminum') || mat.name.toLowerCase().includes('alu')) {
        materialLookup.set('alu-foil', mat.id);
      }
      if (mat.name.toLowerCase().includes('ink') && mat.name.toLowerCase().includes('sb')) {
        materialLookup.set('ink-sb', mat.id);
      }
      if (mat.name.toLowerCase().includes('ink') && mat.name.toLowerCase().includes('uv')) {
        materialLookup.set('ink-uv', mat.id);
      }
      if (mat.name.toLowerCase().includes('adhesive') && mat.name.toLowerCase().includes('sb')) {
        materialLookup.set('adhesive-sb', mat.id);
      }
      if (mat.name.toLowerCase().includes('solvent') && mat.name.toLowerCase().includes('base')) {
        materialLookup.set('solvent-base', mat.id);
      }
    }

    const templates = (templateSeed as any).templates as TemplateSeedEntry[];

    const templatesToInsert = templates.map((t) => {
      // Resolve material IDs in default_layers
      const resolvedLayers = t.default_layers.map((layer) => ({
        ...layer,
        materialId: materialLookup.get(layer.ref_material_key) || null,
      }));

      return {
        tenantId,
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
      };
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
