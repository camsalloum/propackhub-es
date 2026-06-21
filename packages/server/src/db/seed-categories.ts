import { eq } from 'drizzle-orm';
import { getDatabase, schema } from './index';
import { PACKAGING_FAMILY } from './master-materials-io';
import { listPlatformReferenceItems } from './platform-master-data';

const STANDARD_RM_CODES = new Set(['substrate', 'ink', 'adhesive', 'packaging']);

const BASE_TAXONOMY = [
  {
    name: 'Substrates',
    subcategories: ['PE Films', 'PET Films', 'BOPP / PP', 'Paper & Foil', 'Other Substrates'],
    materialTypes: ['substrate'] as const,
  },
  {
    name: 'Inks',
    subcategories: ['Inks SB', 'Inks UV'],
    materialTypes: ['ink'] as const,
  },
  {
    name: 'Adhesives',
    subcategories: ['Adhesives SB', 'Adhesives Other'],
    materialTypes: ['adhesive'] as const,
  },
  {
    name: 'Packaging',
    subcategories: ['Packaging'],
    materialTypes: ['substrate'] as const,
  },
];

type TaxonomyCategory = {
  name: string;
  subcategories: string[];
  materialTypes: readonly ('substrate' | 'ink' | 'adhesive')[];
  rmTypeCode?: string;
};

async function buildTaxonomy(): Promise<TaxonomyCategory[]> {
  const taxonomy: TaxonomyCategory[] = BASE_TAXONOMY.map((c) => ({ ...c, subcategories: [...c.subcategories] }));

  try {
    const rmTypes = await listPlatformReferenceItems('rm_type');
    for (const row of rmTypes) {
      const code = (row.code?.trim() || row.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();
      if (STANDARD_RM_CODES.has(code)) continue;
      taxonomy.push({
        name: row.label,
        subcategories: [row.label],
        materialTypes: ['substrate'],
        rmTypeCode: code,
      });
    }
  } catch {
    // Platform tables may not exist yet on first boot
  }

  return taxonomy;
}

function subcategoryForMaterial(
  name: string,
  type: string,
  substrateFamily?: string | null,
  itemClass?: string | null
): string {
  if (itemClass && !STANDARD_RM_CODES.has(itemClass)) {
    return name;
  }

  const n = name.toLowerCase();
  if (type === 'ink') {
    const fam = (substrateFamily || '').toLowerCase();
    if (fam.includes('uv')) return 'Inks UV';
    return 'Inks SB';
  }
  if (type === 'adhesive') {
    const fam = (substrateFamily || '').toLowerCase();
    if (fam.includes('less') || n.includes('less') || n.includes('wb')) return 'Adhesives Other';
    return 'Adhesives SB';
  }

  const family = (substrateFamily || '').toUpperCase();
  if (family === PACKAGING_FAMILY.toUpperCase()) return 'Packaging';
  if (family === 'PE' || family === 'CPP') return 'PE Films';
  if (family === 'PET' || family === 'SLEEVE') return 'PET Films';
  if (family === 'BOPP' || family === 'PA' || family === 'SPECIALTY') return 'BOPP / PP';
  if (family === 'ALU' || family === 'PAPER') return 'Paper & Foil';

  if (n.includes('ldpe') || n.includes('pe ') || n === 'pe' || n.includes('cpp')) return 'PE Films';
  if (n.includes('pet') || n.includes('pvc')) return 'PET Films';
  if (n.includes('bopp') || n.includes('opp') || n.includes('pp ')) return 'BOPP / PP';
  if (n.includes('alu') || n.includes('alumin') || n.includes('paper')) return 'Paper & Foil';
  return 'Other Substrates';
}

export async function backfillMaterialSubcategories(tenantId: string): Promise<void> {
  const db = getDatabase();
  const subcategories = await db
    .select()
    .from(schema.subcategories)
    .where(eq(schema.subcategories.tenantId, tenantId));
  const subcatIdByName = new Map(subcategories.map((s: (typeof subcategories)[number]) => [s.name, s.id]));

  const materials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  for (const mat of materials) {
    if (mat.subcategoryId) continue;
    const subName = subcategoryForMaterial(mat.name, mat.type, mat.substrateFamily, mat.itemClass);
    const subId = subcatIdByName.get(subName);
    if (subId) {
      await db
        .update(schema.materials)
        .set({ subcategoryId: subId })
        .where(eq(schema.materials.id, mat.id));
    }
  }
}

export async function seedCategoriesForTenant(tenantId: string): Promise<void> {
  const db = getDatabase();
  const taxonomy = await buildTaxonomy();
  const subcatIdByName = new Map<string, string>();

  for (const cat of taxonomy) {
    const [category] = await db
      .insert(schema.categories)
      .values({ tenantId, name: cat.name })
      .returning();

    for (const subName of cat.subcategories) {
      const [sub] = await db
        .insert(schema.subcategories)
        .values({ tenantId, categoryId: category.id, name: subName })
        .returning();
      subcatIdByName.set(subName, sub.id);
    }
  }

  const materials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  for (const mat of materials) {
    const subName = subcategoryForMaterial(mat.name, mat.type, mat.substrateFamily, mat.itemClass);
    const subId = subcatIdByName.get(subName);
    if (subId) {
      await db
        .update(schema.materials)
        .set({ subcategoryId: subId })
        .where(eq(schema.materials.id, mat.id));
    }
  }
}

/** Add categories for custom RM types added after initial seed. */
export async function syncCustomRmTypeCategories(tenantId: string): Promise<void> {
  const db = getDatabase();
  const taxonomy = await buildTaxonomy();
  const customCats = taxonomy.filter((c) => c.rmTypeCode);

  if (customCats.length === 0) return;

  const existingCats = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.tenantId, tenantId));
  const catByName = new Map(existingCats.map((c: (typeof existingCats)[number]) => [c.name, c]));

  for (const cat of customCats) {
    if (catByName.has(cat.name)) continue;
    const [category] = await db
      .insert(schema.categories)
      .values({ tenantId, name: cat.name })
      .returning();
    for (const subName of cat.subcategories) {
      await db.insert(schema.subcategories).values({
        tenantId,
        categoryId: category.id,
        name: subName,
      });
    }
  }

  await backfillMaterialSubcategories(tenantId);
}

export async function ensureCategoriesForTenant(tenantId: string): Promise<void> {
  const db = getDatabase();
  const existing = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.tenantId, tenantId))
    .limit(1);

  if (existing.length === 0) {
    await seedCategoriesForTenant(tenantId);
    return;
  }

  await syncCustomRmTypeCategories(tenantId);
}
