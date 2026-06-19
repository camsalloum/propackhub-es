import { eq } from 'drizzle-orm';
import { getDatabase, schema } from './index';

const DEFAULT_SLAB_TEMPLATES = [
  { key: 'standard', name: 'Standard', quantities: [1000, 2000, 5000] },
  { key: 'large', name: 'Large volumes', quantities: [5000, 10000, 20000] },
];

export async function seedSlabTemplatesForTenant(tenantId: string): Promise<void> {
  const db = getDatabase();
  for (const t of DEFAULT_SLAB_TEMPLATES) {
    await db.insert(schema.slabTemplates).values({
      tenantId,
      templateKey: t.key,
      name: t.name,
      quantities: t.quantities,
    });
  }
}

export async function ensureSlabTemplatesForTenant(tenantId: string): Promise<void> {
  const db = getDatabase();
  const existing = await db
    .select({ id: schema.slabTemplates.id })
    .from(schema.slabTemplates)
    .where(eq(schema.slabTemplates.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) return;
  await seedSlabTemplatesForTenant(tenantId);
}

export function quantitiesForSlabTemplateKey(key: string): number[] {
  const found = DEFAULT_SLAB_TEMPLATES.find((t) => t.key === key);
  return found?.quantities ?? DEFAULT_SLAB_TEMPLATES[0].quantities;
}
