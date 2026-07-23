import { describe, it, expect } from 'vitest';
import { buildLayerInsertValues, snapshotsFromMaterial } from './layer-lineage';
import {
  deriveSourceTemplateKey,
  deriveStandardTemplateKey,
  deriveTenantTemplateKey,
  resolveTemplateKeyAssignments,
} from './template-key';

describe('layer lineage (MES Phase B)', () => {
  it('snapshots platform and costing keys from material', () => {
    const snap = snapshotsFromMaterial({
      name: 'LDPE Natural',
      costPerKgUsd: '2.1000',
      platformMasterKey: 'ldpe-natural',
      costingKey: 'ldpe-natural',
    });
    expect(snap.platform_master_key_snapshot).toBe('ldpe-natural');
    expect(snap.costing_key_snapshot).toBe('ldpe-natural');
    expect(snap.material_name_snapshot).toBe('LDPE Natural');
  });

  it('buildLayerInsertValues includes snapshots when material provided', () => {
    const row = buildLayerInsertValues({
      estimateId: 'est-1',
      materialId: 'mat-1',
      micron: 25,
      position: 0,
      material: {
        name: 'PET',
        costPerKgUsd: '2.8',
        platformMasterKey: 'pet-transparent',
        costingKey: 'pet-transparent',
      },
    });
    expect(row.platform_master_key_snapshot).toBe('pet-transparent');
    expect(row.micron).toBe('25');
  });
});

describe('deriveStandardTemplateKey', () => {
  it('builds compound key for commercial printed PE mono', () => {
    expect(
      deriveStandardTemplateKey({
        pebiParentPg: 'Commercial Items Printed',
        name: 'Commercial Items Printed',
        materialClass: 'PE',
        structureType: 'Mono',
      })
    ).toBe('commercial-items-printed-pe-mono');
  });

  it('disambiguates laminates tiers from name', () => {
    expect(
      deriveStandardTemplateKey({
        pebiParentPg: 'Laminates',
        name: 'Laminates · Duplex',
        materialClass: 'Non PE',
        structureType: 'Multilayer',
      })
    ).toBe('laminates-non-pe-duplex');
  });

  it('includes PEBI variant name under parent PG', () => {
    expect(
      deriveStandardTemplateKey({
        pebiParentPg: 'Commercial Items Plain',
        name: 'Garbage Bags',
        materialClass: 'PE',
        structureType: 'Mono',
      })
    ).toBe('commercial-items-plain-pe-mono-garbage-bags');
  });
});

describe('resolveTemplateKeyAssignments', () => {
  it('gives canonical key to active row and null to inactive duplicate', () => {
    const activeId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const inactiveId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
    const assignments = resolveTemplateKeyAssignments([
      {
        id: inactiveId,
        name: 'Laminates · Triplex',
        pebiParentPg: 'Laminates',
        materialClass: 'Non PE',
        structureType: 'Multilayer',
        isStandard: true,
        isActive: false,
        templateKey: 'laminates-non-pe-triplex',
        displayOrder: 111,
      },
      {
        id: activeId,
        name: 'Laminates · Triplex',
        pebiParentPg: 'Laminates',
        materialClass: 'Non PE',
        structureType: 'Multilayer',
        isStandard: true,
        isActive: true,
        templateKey: null,
        displayOrder: 111,
      },
    ]);

    expect(assignments.get(activeId)).toBe('laminates-non-pe-triplex');
    expect(assignments.get(inactiveId)).toBeNull();
  });
});

describe('deriveTenantTemplateKey', () => {
  it('includes short id suffix', () => {
    expect(deriveTenantTemplateKey('Acme Custom', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toMatch(
      /^tenant-acme-custom-aaaaaaaa$/
    );
  });
});

describe('deriveSourceTemplateKey', () => {
  it('builds compound key for standard templates', () => {
    expect(
      deriveSourceTemplateKey({
        name: 'Commercial Items · Printed',
        pebiParentPg: 'Commercial Items',
        materialClass: 'PE',
        structureType: 'Mono',
        isStandard: true,
      })
    ).toBe('commercial-items-pe-printed');
  });

  it('prefixes tenant templates', () => {
    expect(
      deriveSourceTemplateKey({
        name: 'Acme Custom Laminate',
        pebiParentPg: 'Custom',
        isStandard: false,
      })
    ).toBe('tenant-acme-custom-laminate');
  });
});
