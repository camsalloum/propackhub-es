import { describe, it, expect } from 'vitest';
import { itemClassForMasterMaterial, isPlatformPriceSource } from './item-class';
import type { MasterMaterial } from '../db/master-materials-io';

describe('itemClassForMasterMaterial', () => {
  const base: MasterMaterial = {
    key: 'x',
    name: 'X',
    type: 'substrate',
    solidPercent: 100,
    density: 1,
    costPerKgUsd: 1,
    wastePercent: 0,
    isSolventBased: false,
    substrateFamily: 'PE',
    substrateGrade: null,
    hoover: null,
    marketPriceUsd: 1,
  };

  it('maps ink and adhesive', () => {
    expect(itemClassForMasterMaterial({ ...base, type: 'ink' })).toBe('ink');
    expect(itemClassForMasterMaterial({ ...base, type: 'adhesive' })).toBe('adhesive');
  });

  it('maps packaging family', () => {
    expect(itemClassForMasterMaterial({ ...base, substrateFamily: 'Packaging' })).toBe('packaging');
  });

  it('maps default substrate', () => {
    expect(itemClassForMasterMaterial(base)).toBe('substrate');
  });
});

describe('isPlatformPriceSource', () => {
  it('treats excel as legacy platform alias', () => {
    expect(isPlatformPriceSource('platform')).toBe(true);
    expect(isPlatformPriceSource('excel')).toBe(true);
    expect(isPlatformPriceSource('manual')).toBe(false);
  });
});
