import { eq } from 'drizzle-orm';
import { getDatabase, schema } from './index';
import { PACKAGING_FAMILY } from './master-materials-io';

const TAXONOMY = [
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

function subcategoryForMaterial(
  name: string,
  type: string,
  substrateFamily?: string | null
): string {
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
  const subcatIdByName = new Map(subcategories.map((s) => [s.name, s.id]));

  const materials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  for (const mat of materials) {
    if (mat.subcategoryId) continue;
    const subName = subcategoryForMaterial(mat.name, mat.type, mat.substrateFamily);
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

  const subcatIdByName = new Map<string, string>();

  for (const cat of TAXONOMY) {
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
    const subName = subcategoryForMaterial(mat.name, mat.type, mat.substrateFamily);
    const subId = subcatIdByName.get(subName);
    if (subId) {
      await db
        .update(schema.materials)
        .set({ subcategoryId: subId })
        .where(eq(schema.materials.id, mat.id));
    }
  }
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

  await backfillMaterialSubcategories(tenantId);
}
