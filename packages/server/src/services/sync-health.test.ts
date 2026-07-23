import { describe, expect, it } from 'vitest';
import { isUnpricedUnitPriceMaterial } from '../services/sync-health';

describe('sync-health helpers', () => {
  it('flags packaging with $0 unit price', () => {
    expect(
      isUnpricedUnitPriceMaterial({
        type: 'packaging',
        substrateFamily: 'PACKAGING',
        platformMasterKey: 'packaging-pallet',
        unitPriceUsd: '0',
      })
    ).toBe(true);
  });

  it('accepts priced consumables', () => {
    expect(
      isUnpricedUnitPriceMaterial({
        type: 'substrate',
        substrateFamily: 'CONSUMABLES',
        platformMasterKey: 'consumables-mounting-tape',
        unitPriceUsd: '17.72',
      })
    ).toBe(false);
  });
});
