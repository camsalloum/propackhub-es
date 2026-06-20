export interface CategoryNode {
  id: string;
  name: string;
  subcategories: Array<{ id: string; name: string; categoryId: string }>;
}

const DEFAULT_SUBSTRATE_FAMILIES = [
  'BOPP',
  'PET',
  'PE',
  'CPP',
  'PA',
  'ALU',
  'PAPER',
  'SLEEVE',
  'SPECIALTY',
] as const;

export function deriveSubstrateFamilies(
  materials: Array<{ type: string; substrateFamily?: string | null }>
): string[] {
  const set = new Set<string>(DEFAULT_SUBSTRATE_FAMILIES);
  for (const m of materials) {
    if (m.type === 'substrate' && m.substrateFamily) {
      set.add(m.substrateFamily);
    }
  }
  return [...set].sort((a, b) => {
    const ai = DEFAULT_SUBSTRATE_FAMILIES.indexOf(a as (typeof DEFAULT_SUBSTRATE_FAMILIES)[number]);
    const bi = DEFAULT_SUBSTRATE_FAMILIES.indexOf(b as (typeof DEFAULT_SUBSTRATE_FAMILIES)[number]);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export interface MaterialPickerGroup {
  label: string;
  materials: Array<{
    id: string;
    name: string;
    type: string;
    substrateFamily?: string | null;
    hoover?: string | null;
  }>;
}

export function groupMaterialsForPicker(
  materials: Array<{
    id: string;
    name: string;
    type: string;
    substrateFamily?: string | null;
    hoover?: string | null;
    subcategoryId?: string | null;
  }>,
  categories: CategoryNode[],
  layerType?: string
): MaterialPickerGroup[] {
  const filtered = layerType ? materials.filter((m) => m.type === layerType) : materials;
  const subToMeta = new Map<string, { category: string; subcategory: string }>();
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      subToMeta.set(sub.id, { category: cat.name, subcategory: sub.name });
    }
  }

  const groups = new Map<string, MaterialPickerGroup['materials']>();
  for (const mat of filtered) {
    const meta = mat.subcategoryId ? subToMeta.get(mat.subcategoryId) : undefined;
    const label = meta ? `${meta.category} › ${meta.subcategory}` : `Other › ${mat.type}`;
    const list = groups.get(label) ?? [];
    list.push(mat);
    groups.set(label, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, mats]) => ({
      label,
      materials: mats.sort((x, y) => x.name.localeCompare(y.name)),
    }));
}

export function materialMatchesCategory(
  material: { subcategoryId?: string | null },
  categoryFilter: string,
  categories: CategoryNode[]
): boolean {
  if (categoryFilter === 'all') return true;
  if (!material.subcategoryId) return categoryFilter === 'uncategorized';
  for (const cat of categories) {
    if (cat.id === categoryFilter) {
      return cat.subcategories.some((s) => s.id === material.subcategoryId);
    }
    if (cat.subcategories.some((s) => s.id === categoryFilter && s.id === material.subcategoryId)) {
      return true;
    }
  }
  return false;
}
