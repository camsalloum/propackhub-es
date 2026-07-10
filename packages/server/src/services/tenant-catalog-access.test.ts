import { describe, it, expect } from 'vitest';
import {
  buildTenantCatalogAccess,
  canMutateMaterialRow,
  canEditPebiSyncedMaterialPrice,
  canEditPeSubstrateManualPrice,
  canEditInkCoatingManualPrice,
  canEditAdhesiveManualPrice,
  normalizeCatalogSource,
} from './tenant-catalog-access';

describe('buildTenantCatalogAccess', () => {
  it('tenant catalog — full edit on synced rows', () => {
    const access = buildTenantCatalogAccess({ catalogSource: 'tenant' });
    expect(access.catalogSource).toBe('tenant');
    expect(access.canEditSyncedMaterials).toBe(true);
    expect(access.canCreateTenantOnlyMaterials).toBe(true);
    expect(access.priceSourceLabel).toBe('Your catalog');
  });

  it('platform catalog — synced rows read-only', () => {
    const access = buildTenantCatalogAccess({ catalogSource: 'platform' });
    expect(access.canEditSyncedMaterials).toBe(false);
    expect(access.priceSourceLabel).toBe('Platform catalog');
  });

  it('pebi catalog — synced rows read-only', () => {
    const access = buildTenantCatalogAccess({ catalogSource: 'pebi' });
    expect(access.canEditSyncedMaterials).toBe(false);
    expect(access.priceSourceLabel).toBe('Synced from PEBI');
  });

  it('defaults unknown to tenant', () => {
    expect(normalizeCatalogSource(null)).toBe('tenant');
    expect(normalizeCatalogSource(undefined)).toBe('tenant');
    expect(buildTenantCatalogAccess({}).catalogSource).toBe('tenant');
  });
});

describe('canMutateMaterialRow', () => {
  const platformAccess = buildTenantCatalogAccess({ catalogSource: 'platform' });
  const tenantAccess = buildTenantCatalogAccess({ catalogSource: 'tenant' });

  it('tenant-only row editable on platform-managed tenant', () => {
    expect(canMutateMaterialRow(platformAccess, true)).toBe(true);
  });

  it('synced row not editable on platform-managed tenant', () => {
    expect(canMutateMaterialRow(platformAccess, false)).toBe(false);
  });

  it('synced row editable on tenant-owned catalog', () => {
    expect(canMutateMaterialRow(tenantAccess, false)).toBe(true);
  });
});

describe('canEditPebiSyncedMaterialPrice', () => {
  it('allows manual price on pebi-linked row without live PEBI cost', () => {
    expect(
      canEditPebiSyncedMaterialPrice({
        catalogSource: 'pebi',
        externalSource: 'pebi',
        priceSource: 'manual',
        isTenantOnly: false,
      })
    ).toBe(true);
  });

  it('blocks edit when price still comes from PEBI', () => {
    expect(
      canEditPebiSyncedMaterialPrice({
        catalogSource: 'pebi',
        externalSource: 'pebi',
        priceSource: 'pebi',
        isTenantOnly: false,
      })
    ).toBe(false);
  });
});

describe('canEditPeSubstrateManualPrice', () => {
  it('allows PE substrate edit before live PEBI price', () => {
    expect(
      canEditPeSubstrateManualPrice({
        type: 'substrate',
        substrateFamily: 'PE',
        externalSource: null,
        priceSource: 'platform',
      })
    ).toBe(true);
  });

  it('blocks PE substrate edit when PEBI price is authoritative', () => {
    expect(
      canEditPeSubstrateManualPrice({
        type: 'substrate',
        substrateFamily: 'PE',
        externalSource: 'pebi',
        priceSource: 'pebi',
      })
    ).toBe(false);
  });
});

describe('canEditInkCoatingManualPrice', () => {
  it('allows non-PEBI ink grades (primer, varnish, special colors, …)', () => {
    expect(
      canEditInkCoatingManualPrice({
        type: 'ink',
        externalSource: null,
        priceSource: 'platform',
      })
    ).toBe(true);
  });

  it('blocks SB/UV Common when PEBI liquid price is live', () => {
    expect(
      canEditInkCoatingManualPrice({
        type: 'ink',
        externalSource: 'pebi',
        priceSource: 'pebi',
      })
    ).toBe(false);
  });
});

describe('canEditAdhesiveManualPrice', () => {
  it('allows adhesive edit before live PEBI blend', () => {
    expect(
      canEditAdhesiveManualPrice({
        type: 'adhesive',
        externalSource: null,
        priceSource: 'platform',
      })
    ).toBe(true);
  });

  it('blocks adhesive price when PEBI blend is live', () => {
    expect(
      canEditAdhesiveManualPrice({
        type: 'adhesive',
        externalSource: 'pebi',
        priceSource: 'pebi',
      })
    ).toBe(false);
  });
});
