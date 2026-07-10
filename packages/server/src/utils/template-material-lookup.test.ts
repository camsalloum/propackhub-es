import { describe, it, expect } from 'vitest';
import {
  buildTemplateMaterialLookup,
  resolveLayerMaterialId,
  buildValidMaterialIdSet,
} from './template-material-lookup';

const fixtureMaterials = [
  {
    id: 'uuid-pe-commercial',
    name: 'PE Plain Film — Commercial',
    type: 'substrate',
    substrateFamily: 'PE',
    substrateGrade: 'PE Plain Film — Commercial',
    costingKey: 'pe-plain-commercial',
  },
  {
    id: 'uuid-pe-shrink',
    name: 'PE Shrink Film',
    type: 'substrate',
    substrateFamily: 'PE',
    substrateGrade: 'PE Shrink Film',
    costingKey: 'pe-shrink',
  },
  {
    id: 'uuid-bopp',
    name: 'BOPP Transparent HS Glossy',
    type: 'substrate',
    substrateFamily: 'BOPP',
    substrateGrade: 'BOPP Transparent HS Glossy',
    costingKey: 'bopp',
  },
  {
    id: 'uuid-ink-sb',
    name: 'Common Colors',
    type: 'ink',
    substrateFamily: 'Solvent Based',
    substrateGrade: 'Common Colors',
    costingKey: 'ink-sb',
  },
  {
    id: 'uuid-adhesive',
    name: 'Solvent Base',
    type: 'adhesive',
    substrateFamily: 'Solvent Base',
    substrateGrade: 'Solvent Base',
    costingKey: 'adhesive-sb',
  },
];

describe('template-material-lookup', () => {
  it('resolves all canonical ref keys via costingKey', () => {
    const lookup = buildTemplateMaterialLookup(fixtureMaterials);
    const keys = ['pe-plain-commercial', 'ldpe-natural', 'pe-shrink', 'ldpe-shrink', 'bopp', 'ink-sb', 'adhesive-sb'];
    for (const key of keys) {
      expect(lookup.get(key)).toBeTruthy();
    }
  });

  it('maps ldpe-shrink to PE Shrink row', () => {
    const lookup = buildTemplateMaterialLookup(fixtureMaterials);
    expect(lookup.get('ldpe-shrink')).toBe('uuid-pe-shrink');
    expect(lookup.get('pe-shrink')).toBe('uuid-pe-shrink');
  });

  it('maps legacy ldpe-natural to commercial PE film', () => {
    const lookup = buildTemplateMaterialLookup(fixtureMaterials);
    expect(lookup.get('ldpe-natural')).toBe('uuid-pe-commercial');
  });

  it('maps bopp to BOPP Transparent', () => {
    const lookup = buildTemplateMaterialLookup(fixtureMaterials);
    expect(lookup.get('bopp')).toBe('uuid-bopp');
  });

  it('falls back from stale materialId to ref_material_key', () => {
    const lookup = buildTemplateMaterialLookup(fixtureMaterials);
    const validIds = buildValidMaterialIdSet(fixtureMaterials);
    const resolved = resolveLayerMaterialId(
      { materialId: 'deleted-uuid', ref_material_key: 'ink-sb' },
      lookup,
      validIds
    );
    expect(resolved).toBe('uuid-ink-sb');
  });

  it('prefers ref_material_key over cached materialId', () => {
    const lookup = buildTemplateMaterialLookup(fixtureMaterials);
    const validIds = buildValidMaterialIdSet(fixtureMaterials);
    const resolved = resolveLayerMaterialId(
      { materialId: 'uuid-bopp', ref_material_key: 'ldpe-natural' },
      lookup,
      validIds
    );
    expect(resolved).toBe('uuid-pe-commercial');
  });
});
