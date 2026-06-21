import { describe, it, expect } from 'vitest';
import { enrichMasterDataReference } from './master-data-normalize';

describe('enrichMasterDataReference', () => {
  it('builds product type options from Excel rows with Code column', () => {
    const enriched = enrichMasterDataReference({
      productTypes: ['Roll', 'Sleeve', 'Bag'],
      productTypeRows: [
        { label: 'Roll', code: 'roll' },
        { label: 'Sleeve', code: 'sleeve' },
        { label: 'Bag', code: 'pouch' },
      ],
      units: ['Kgs'],
      rmTypes: [],
      packaging: [],
      inkCoating: [],
      adhesive: [],
      printingWebClasses: [],
    });
    expect(enriched.productTypeOptions).toEqual([
      { label: 'Roll', value: 'roll' },
      { label: 'Sleeve', value: 'sleeve' },
      { label: 'Bag', value: 'pouch' },
    ]);
  });

  it('builds printing web options from Excel sheet rows', () => {
    const enriched = enrichMasterDataReference({
      productTypes: [],
      productTypeRows: [],
      units: [],
      rmTypes: [],
      packaging: [],
      inkCoating: [],
      adhesive: [],
      printingWebClasses: [
        { label: 'Wide Web', code: 'wide_web', inkSystem: 'Ink SB', solidPercent: 30 },
        { label: 'Narrow Web', code: 'narrow_web', inkSystem: 'Ink UV', solidPercent: 100 },
      ],
    });
    expect(enriched.printingWebClassOptions).toHaveLength(2);
    expect(enriched.printingWebClassOptions[0].value).toBe('wide_web');
    expect(enriched.printingWebClassOptions[0].description).toContain('solvent');
  });
});
