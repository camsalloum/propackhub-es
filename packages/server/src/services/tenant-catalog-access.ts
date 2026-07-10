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

/** PEBI-synced rows without a live PEBI price remain editable in ES (manual or platform hold). */
export function canEditPebiSyncedMaterialPrice(input: {
  catalogSource: CatalogSource;
  externalSource?: string | null;
  priceSource?: string | null;
  isTenantOnly?: boolean;
}): boolean {
  if (input.isTenantOnly) return true;
  if (input.catalogSource !== 'pebi') return false;
  if (input.externalSource !== 'pebi') return false;
  return input.priceSource === 'manual' || input.priceSource === 'platform';
}

/** In-house PE films may be priced manually until PEBI publishes a live recipe cost. */
export function canEditPeSubstrateManualPrice(input: {
  type?: string | null;
  substrateFamily?: string | null;
  externalSource?: string | null;
  priceSource?: string | null;
}): boolean {
  if (input.type !== 'substrate' || input.substrateFamily !== 'PE') return false;
  if (input.externalSource === 'pebi' && input.priceSource === 'pebi') return false;
  return true;
}

/**
 * Ink & coating grades stay ES-editable except SB/UV Common liquid/dry price
 * when PEBI price is live. Solid% / density remain ES-owned (never PEBI-overwritten).
 */
export function canEditInkCoatingManualPrice(input: {
  type?: string | null;
  externalSource?: string | null;
  priceSource?: string | null;
}): boolean {
  if (input.type !== 'ink') return false;
  if (input.externalSource === 'pebi' && input.priceSource === 'pebi') return false;
  return true;
}

/** Solid%, density, and labels for ink — always ES-owned. */
export function canEditInkCoatingPhysicalProps(input: {
  type?: string | null;
}): boolean {
  return input.type === 'ink';
}

/**
 * Adhesive grades stay ES-editable except when PEBI component blend price is live.
 * Mix parts / solid% / density remain ES-owned.
 */
export function canEditAdhesiveManualPrice(input: {
  type?: string | null;
  externalSource?: string | null;
  priceSource?: string | null;
}): boolean {
  if (input.type !== 'adhesive') return false;
  if (input.externalSource === 'pebi' && input.priceSource === 'pebi') return false;
  return true;
}

export function canEditAdhesivePhysicalProps(input: {
  type?: string | null;
}): boolean {
  return input.type === 'adhesive';
}
