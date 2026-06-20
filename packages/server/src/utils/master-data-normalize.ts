import type { MasterDataReference } from '../db/master-materials-io';

const PRODUCT_TYPE_MAP: Record<string, 'roll' | 'sleeve' | 'pouch'> = {
  roll: 'roll',
  sleeve: 'sleeve',
  'bag or pouch': 'pouch',
  pouch: 'pouch',
  bag: 'pouch',
};

const UNIT_MAP: Record<string, string> = {
  kgs: 'kgs',
  kg: 'kgs',
  kpcs: 'kpcs',
  sqm: 'sqm',
  lm: 'lm',
  'roll 500 lm': 'roll_500_lm',
};

export function normalizeProductTypeLabel(label: string): 'roll' | 'sleeve' | 'pouch' | null {
  const key = label.trim().toLowerCase();
  return PRODUCT_TYPE_MAP[key] ?? null;
}

export function normalizeUnitLabel(label: string): string | null {
  const key = label.trim().toLowerCase();
  return UNIT_MAP[key] ?? null;
}

export interface MasterDataReferenceResponse extends MasterDataReference {
  productTypeOptions: Array<{ label: string; value: 'roll' | 'sleeve' | 'pouch' }>;
  unitOptions: Array<{ label: string; value: string }>;
}

const DEFAULT_PRODUCT_TYPES: MasterDataReferenceResponse['productTypeOptions'] = [
  { label: 'Roll', value: 'roll' },
  { label: 'Sleeve', value: 'sleeve' },
  { label: 'Bag or Pouch', value: 'pouch' },
];

const DEFAULT_UNITS: MasterDataReferenceResponse['unitOptions'] = [
  { label: 'Kgs', value: 'kgs' },
  { label: 'Kpcs', value: 'kpcs' },
  { label: 'SQM', value: 'sqm' },
  { label: 'LM', value: 'lm' },
  { label: 'Roll 500 LM', value: 'roll_500_lm' },
];

export function enrichMasterDataReference(ref: MasterDataReference): MasterDataReferenceResponse {
  const productTypeOptions = ref.productTypes
    .map((label) => {
      const value = normalizeProductTypeLabel(label);
      return value ? { label, value } : null;
    })
    .filter((x): x is { label: string; value: 'roll' | 'sleeve' | 'pouch' } => x != null);

  const unitOptions = ref.units
    .map((label) => {
      const value = normalizeUnitLabel(label);
      return value ? { label, value } : null;
    })
    .filter((x): x is { label: string; value: string } => x != null);

  return {
    ...ref,
    productTypeOptions: productTypeOptions.length > 0 ? productTypeOptions : DEFAULT_PRODUCT_TYPES,
    unitOptions: unitOptions.length > 0 ? unitOptions : DEFAULT_UNITS,
  };
}
