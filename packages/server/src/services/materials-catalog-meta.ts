import { eq, max, and, isNotNull } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { getMasterDataVersion } from '../db/platform-master-data';
import { normalizeCatalogSource, type CatalogSource } from './tenant-catalog-access';

export type MaterialsCatalogMeta = {
  masterDataVersion: number;
  catalogSource: CatalogSource;
  materialsSyncedAt: string | null;
};

/** Lightweight catalog revision for client polling (Phase 3). */
export async function getMaterialsCatalogMeta(tenantId: string): Promise<MaterialsCatalogMeta> {
  const db = getDatabase();

  const [tenantRow] = await db
    .select({ catalogSource: schema.tenants.catalogSource })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  const [syncRow] = await db
    .select({ syncedAt: max(schema.materials.platformSyncedAt) })
    .from(schema.materials)
    .where(and(eq(schema.materials.tenantId, tenantId), isNotNull(schema.materials.platformSyncedAt)));

  const masterDataVersion = await getMasterDataVersion();
  const syncedAt = syncRow?.syncedAt;

  return {
    masterDataVersion,
    catalogSource: normalizeCatalogSource(tenantRow?.catalogSource),
    materialsSyncedAt: syncedAt instanceof Date ? syncedAt.toISOString() : null,
  };
}
