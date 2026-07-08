/**
 * Materials catalog ownership by tenant licensing.
 *
 * - `tenant` — licensee owns prices (individual or self-managed company).
 * - `platform` — ProPackHub golden catalog is pushed; ES prices read-only.
 * - `pebi` — PEBI MES is price authority (Phase 4); ES mirror read-only.
 *
 * `is_tenant_only` custom rows remain editable regardless of catalog_source.
 */
export type CatalogSource = 'tenant' | 'platform' | 'pebi';

export type TenantCatalogAccess = {
  catalogSource: CatalogSource;
  canEditSyncedMaterials: boolean;
  canCreateTenantOnlyMaterials: boolean;
  priceSourceLabel: string;
};

export type TenantCatalogAccessInput = {
  catalogSource?: CatalogSource | string | null;
};

export function normalizeCatalogSource(value: string | null | undefined): CatalogSource {
  if (value === 'platform' || value === 'pebi') return value;
  return 'tenant';
}

export function buildTenantCatalogAccess(tenant: TenantCatalogAccessInput): TenantCatalogAccess {
  const catalogSource = normalizeCatalogSource(tenant.catalogSource);
  return {
    catalogSource,
    canEditSyncedMaterials: catalogSource === 'tenant',
    canCreateTenantOnlyMaterials: true,
    priceSourceLabel:
      catalogSource === 'pebi'
        ? 'Synced from PEBI'
        : catalogSource === 'platform'
          ? 'Platform catalog'
          : 'Your catalog',
  };
}

export const CATALOG_READ_ONLY_MESSAGE =
  'Material prices are managed outside Estimation Studio for this account. Contact your administrator.';

export function canMutateMaterialRow(
  access: TenantCatalogAccess,
  isTenantOnly: boolean
): boolean {
  if (isTenantOnly) return true;
  return access.canEditSyncedMaterials;
}
