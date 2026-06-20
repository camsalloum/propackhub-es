/** Maps template seed ref_material_key → tenant material row id. */

export interface TemplateLookupMaterial {
  id: string;
  name: string;
  type: string;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
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

export function buildTemplateMaterialLookup(materials: TemplateLookupMaterial[]): Map<string, string> {
  const lookup = new Map<string, string>();
  const set = (key: string, id: string) => lookup.set(key, id);

  for (const mat of materials) {
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
      if (grade === 'ldpe shrink' || (n.includes('ldpe') && n.includes('shrink'))) {
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
      if (n === 'cpp' || grade === 'cpp') {
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
      if (n.includes('adhesive') && n.includes('sb')) {
        set('adhesive-sb', mat.id);
      }
      if (n === 'solvent base' || family === 'solvent base') {
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
      materials.find(
        (m) => solventInk(m) && gradeOf(m) === 'common colors'
      ) ||
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
  lookup: Map<string, string>
): string | null {
  if (layer.materialId) {
    return layer.materialId;
  }
  if (layer.ref_material_key) {
    return lookup.get(layer.ref_material_key) || null;
  }
  return null;
}

export function resolveTemplateLayers<T extends TemplateLayerRef>(
  layers: T[],
  lookup: Map<string, string>
): T[] {
  return layers.map((layer) => ({
    ...layer,
    materialId: resolveLayerMaterialId(layer, lookup),
  }));
}
