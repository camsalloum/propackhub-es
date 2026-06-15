import { getDatabase, schema } from './index';
import masterMaterials from './master-materials-seed.json';

/**
 * Seed master materials library for a new tenant
 * Called automatically on tenant registration
 */
export async function seedMaterialsForTenant(tenantId: string): Promise<number> {
  const db = getDatabase();
  
  try {
    const materialsToInsert = masterMaterials.map((material: any) => ({
      tenantId,
      name: material.name,
      type: material.type as 'substrate' | 'ink' | 'adhesive',
      solidPercent: material.solidPercent,
      density: material.density.toString(),
      costPerKgUsd: material.costPerKgUsd.toString(),
      wastePercent: material.wastePercent,
      isSolventBased: material.isSolventBased || false,
    }));

    const inserted = await db
      .insert(schema.materials)
      .values(materialsToInsert)
      .returning();

    console.log(`✓ Seeded ${inserted.length} materials for tenant ${tenantId}`);
    return inserted.length;
  } catch (error) {
    console.error('Failed to seed materials:', error);
    throw error;
  }
}

/**
 * Get master materials list (for preview/admin)
 */
export function getMasterMaterialsList() {
  return masterMaterials;
}
