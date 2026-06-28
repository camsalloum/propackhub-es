/** Maps template seed ref_material_key → tenant material row id. */

export interface TemplateLookupMaterial {
  id: string;
  name: string;
  type: string;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  costingKey?: string | null;
  /** Master-data catalog key — the genuine cross-tenant identifier. */
  platformMasterKey?: string | null;
}

export interface TemplateLayerRef {
  layer_order?: number;
  layer_type?: string;
  ref_material_key?: string;
  materialId?: string | null;
  default_micron?: number;
  swappable_with?: string;
  [key: string]: unknown;
}

export function buildValidMaterialIdSet(materials: TemplateLookupMaterial[]): Set<string> {
  return new Set(materials.map((m) => m.id));
}

export function buildTemplateMaterialLookup(materials: TemplateLookupMaterial[]): Map<string, string> {
  const lookup = new Map<string, string>();
  const set = (key: string, id: string) => lookup.set(key, id);

  for (const mat of materials) {
    if (mat.costingKey) {
      set(mat.costingKey, mat.id);
    }
    // Master-data catalog key is the genuine cross-tenant identifier: a layer
    // that stores platformMasterKey resolves to the equivalent material in any
    // tenant (all tenants seed the same platform_master_materials catalog).
    if (mat.platformMasterKey) {
      set(mat.platformMasterKey, mat.id);
    }

    const n = mat.name.toLowerCase();
    const family = (mat.substrateFamily || '').toLowerCase();
    const grade = (mat.substrateGrade || '').toLowerCase();

    set(n.replace(/\s+/g, '-'), mat.id);

    if (mat.type === 'substrate') {
      if (grade === 'ldpe natural' || (n.includes('ldpe') && n.includes('natural'))) {
        set('ldpe-natural', mat.id);
      }
      if (grade === 'ldpe white' || (n.includes('ldpe') && n.includes('white'))) {
        set('ldpe-white', mat.id);
      }
      if (
        grade === 'ldpe shrink' ||
        grade.includes('pe shrink') ||
        (n.includes('ldpe') && n.includes('shrink')) ||
        (n.includes('pe') && n.includes('shrink') && !n.includes('pet'))
      ) {
        set('ldpe-shrink', mat.id);
      }
      if (grade === 'pet transparent' || n === 'pet transparent') {
        set('pet-transparent', mat.id);
      }
      if (grade.includes('pet shrink') || (n.includes('pet') && n.includes('shrink'))) {
        set('pet-shrink', mat.id);
      }
      if (grade.includes('pvc shrink') || (n.includes('pvc') && n.includes('shrink'))) {
        set('pvc-shrink', mat.id);
      }
      if (n === 'bopp' || grade === 'bopp') {
        set('bopp', mat.id);
      }
      if (family.includes('bopp') && (grade.includes('transparent') || n.includes('transparent'))) {
        set('bopp', mat.id);
      }
      if (n === 'cpp' || grade === 'cpp' || grade.includes('cpp transparent')) {
        set('cpp', mat.id);
      }
      if (
        n.includes('aluminium') ||
        n.includes('aluminum') ||
        grade.includes('foil') ||
        grade.includes('alu')
      ) {
        set('alu-foil', mat.id);
      }
    }

    if (mat.type === 'ink') {
      if (n.includes('ink') && n.includes('sb')) {
        set('ink-sb', mat.id);
      }
      if (n.includes('ink') && n.includes('uv')) {
        set('ink-uv', mat.id);
      }
      if (family.includes('solvent based') && grade === 'common colors') {
        set('ink-sb', mat.id);
      }
      if ((family.includes('uv') || family.includes('uv-led')) && grade === 'common colors') {
        set('ink-uv', mat.id);
      }
    }

    if (mat.type === 'adhesive') {
      if (mat.costingKey === 'adhesive-sb') {
        set('adhesive-sb', mat.id);
      }
      if (n.includes('adhesive') && n.includes('sb') && mat.costingKey === 'adhesive-sb') {
        set('adhesive-sb', mat.id);
      }
      if (n === 'solvent base gp' || grade === 'gp') {
        set('adhesive-sb', mat.id);
      }
      if (n === 'solvent base' && grade !== 'mp' && grade !== 'hp') {
        set('adhesive-sb', mat.id);
        set('solvent-base', mat.id);
      }
      if (n === 'solvent less' || family === 'solvent less') {
        set('adhesive-wb', mat.id);
      }
      if (n === 'mono component' || family === 'mono component') {
        set('adhesive-mono-component', mat.id);
      }
    }
  }

  const solventInk = (m: TemplateLookupMaterial) =>
    m.type === 'ink' && familyOf(m).includes('solvent based');
  const uvInk = (m: TemplateLookupMaterial) =>
    m.type === 'ink' && (familyOf(m).includes('uv') || familyOf(m).includes('uv-led'));

  if (!lookup.has('ink-sb')) {
    const sb =
      materials.find((m) => solventInk(m) && gradeOf(m) === 'common colors') ||
      materials.find((m) => m.type === 'ink' && m.name.toLowerCase().includes('ink sb')) ||
      materials.find(solventInk);
    if (sb) set('ink-sb', sb.id);
  }

  if (!lookup.has('ink-uv')) {
    const uv =
      materials.find((m) => uvInk(m) && gradeOf(m) === 'common colors') ||
      materials.find((m) => m.type === 'ink' && m.name.toLowerCase().includes('ink uv')) ||
      materials.find(uvInk);
    if (uv) set('ink-uv', uv.id);
  }

  if (!lookup.has('bopp')) {
    const bopp =
      materials.find(
        (m) =>
          m.type === 'substrate' &&
          (m.substrateFamily || '').toLowerCase().includes('bopp') &&
          (m.name.toLowerCase().includes('transparent') ||
            (m.substrateGrade || '').toLowerCase().includes('transparent'))
      ) || materials.find((m) => (m.substrateFamily || '').toLowerCase().includes('bopp'));
    if (bopp) set('bopp', bopp.id);
  }

  return lookup;
}

function familyOf(m: TemplateLookupMaterial): string {
  return (m.substrateFamily || '').toLowerCase();
}

function gradeOf(m: TemplateLookupMaterial): string {
  return (m.substrateGrade || '').toLowerCase();
}

export function resolveLayerMaterialId(
  layer: TemplateLayerRef,
  lookup: Map<string, string>,
  validIds?: Set<string>,
  /** Optional map of materialId → type for validating stale cached IDs */
  typeMap?: Map<string, string>
): string | null {
  // Guard against corrupted string literals stored by earlier repair scripts
  const refKey =
    layer.ref_material_key && layer.ref_material_key !== 'undefined' && layer.ref_material_key !== 'null'
      ? layer.ref_material_key
      : null;
  const cachedId =
    layer.materialId && layer.materialId !== 'undefined' && layer.materialId !== 'null'
      ? layer.materialId
      : null;

  // Always prefer the semantic ref_material_key — it re-resolves to the correct
  // material regardless of whether the cached materialId has gone stale.
  if (refKey) {
    const byKey = lookup.get(refKey);
    if (byKey && (!validIds || validIds.has(byKey))) {
      return byKey; // trust the key unconditionally — it's the source of truth
    }
  }

  // Fall back to cached materialId, but reject if the type is wrong
  if (cachedId && (!validIds || validIds.has(cachedId))) {
    if (typeMap && layer.layer_type) {
      const matType = typeMap.get(cachedId);
      if (matType === layer.layer_type) return cachedId;
      return null; // stale wrong-type ID
    }
    return cachedId;
  }

  return null;
}

export function resolveTemplateLayers<T extends TemplateLayerRef>(
  layers: T[],
  lookup: Map<string, string>,
  validIds?: Set<string>,
  typeMap?: Map<string, string>
): T[] {
  return layers.map((layer) => ({
    ...layer,
    materialId: resolveLayerMaterialId(layer, lookup, validIds, typeMap),
  }));
}
