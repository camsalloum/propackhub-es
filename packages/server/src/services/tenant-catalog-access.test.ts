import { describe, it, expect } from 'vitest';
import {
  buildTenantCatalogAccess,
  canMutateMaterialRow,
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
