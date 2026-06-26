import { describe, it, expect } from 'vitest';
import { findExistingMatch } from './seed-materials';
import type { MasterMaterial } from './master-materials-io';
import { schema } from './index';

type DbMaterial = typeof schema.materials.$inferSelect;

function row(partial: Partial<DbMaterial> & Pick<DbMaterial, 'id' | 'type' | 'name'>): DbMaterial {
  return {
    tenantId: 'tenant-1',
    solidPercent: 100,
    density: '1',
    costPerKgUsd: '1',
    wastePercent: 0,
    isSolventBased: false,
    substrateFamily: null,
    substrateGrade: null,
    hoover: null,
    marketPriceUsd: null,
    subcategoryId: null,
    costingKey: null,
    priceSource: 'platform',
    isTenantOnly: false,
    platformMasterKey: null,
    platformSyncedAt: null,
    externalId: null,
    externalSource: null,
    laminationRecipe: null,
    itemClass: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

const ldpeMaster: MasterMaterial = {
  key: 'ldpe-natural',
  name: 'LDPE Natural',
  type: 'substrate',
  solidPercent: 100,
  density: 0.92,
  costPerKgUsd: 2.1,
  wastePercent: 5,
  isSolventBased: false,
  substrateFamily: 'PE',
  substrateGrade: 'Natural',
  hoover: null,
  marketPriceUsd: 2.1,
};

describe('findExistingMatch — platform key first (MES Phase A)', () => {
  it('matches by platform_master_key even when display name changed', () => {
    const existing = [
      row({
        id: 'mat-1',
        type: 'substrate',
        name: 'Renamed LDPE',
        platformMasterKey: 'ldpe-natural',
        costingKey: 'ldpe-natural',
        substrateFamily: 'PE',
        substrateGrade: 'Natural',
      }),
    ];

    expect(findExistingMatch(existing, ldpeMaster)?.id).toBe('mat-1');
  });

  it('falls back to costing_key when platform_master_key not yet backfilled', () => {
    const existing = [
      row({
        id: 'mat-2',
        type: 'substrate',
        name: 'LDPE Natural',
        platformMasterKey: null,
        costingKey: 'ldpe-natural',
        substrateFamily: 'PE',
        substrateGrade: 'Natural',
      }),
    ];

    expect(findExistingMatch(existing, ldpeMaster)?.id).toBe('mat-2');
  });

  it('does not match tenant-only rows by platform key', () => {
    const existing = [
      row({
        id: 'mat-custom',
        type: 'substrate',
        name: 'Custom',
        isTenantOnly: true,
        platformMasterKey: 'ldpe-natural',
      }),
    ];

    expect(findExistingMatch(existing, ldpeMaster)).toBeUndefined();
  });
});
