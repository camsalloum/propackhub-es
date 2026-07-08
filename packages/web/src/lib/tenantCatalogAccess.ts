export type CatalogSource = 'tenant' | 'platform' | 'pebi';

export type TenantCatalogAccess = {
  catalogSource: CatalogSource;
  canEditSyncedMaterials: boolean;
  canCreateTenantOnlyMaterials: boolean;
  priceSourceLabel: string;
};

export const LOCAL_CATALOG_ACCESS: TenantCatalogAccess = {
  catalogSource: 'tenant',
  canEditSyncedMaterials: true,
  canCreateTenantOnlyMaterials: true,
  priceSourceLabel: 'Your catalog',
};

export function resolveCatalogAccess(
  access: TenantCatalogAccess | null | undefined
): TenantCatalogAccess {
  return access ?? LOCAL_CATALOG_ACCESS;
}
