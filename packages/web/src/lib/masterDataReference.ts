export type ProductTypeValue = 'roll' | 'sleeve' | 'pouch';
export type PrintingWebValue = 'wide_web' | 'narrow_web';

export interface ProductTypeOption {
  label: string;
  value: ProductTypeValue;
}

export interface PrintingWebOption {
  label: string;
  value: PrintingWebValue;
  inkSystem: string | null;
  solidPercent: number | null;
  description: string;
}

export interface UnitOption {
  label: string;
  value: string;
}

/**
 * An RM type option from the platform reference.
 * `code` maps to a DB type discriminator:
 *   'substrate' | 'ink' | 'adhesive' | 'packaging' (= substrate + Packaging family)
 *   or a custom slug like 'plate' (= substrate + substrateFamily = label)
 */
export interface RmTypeOption {
  label: string;
  code: string;
}

export interface MasterDataReferenceState {
  productTypeOptions: ProductTypeOption[];
  printingWebClassOptions: PrintingWebOption[];
  unitOptions: UnitOption[];
  /** Driven by the rm_type reference in Master Data — replaces hardcoded Library filter tabs */
  rmTypeOptions: RmTypeOption[];
}

export const DEFAULT_RM_TYPE_OPTIONS: RmTypeOption[] = [
  { label: 'Substrate', code: 'substrate' },
  { label: 'Ink & Coating', code: 'ink' },
  { label: 'Adhesive', code: 'adhesive' },
  { label: 'Packaging', code: 'packaging' },
];

export const DEFAULT_MASTER_REFERENCE: MasterDataReferenceState = {
  productTypeOptions: [
    { label: 'Roll', value: 'roll' },
    { label: 'Sleeve', value: 'sleeve' },
    { label: 'Bag', value: 'pouch' },
  ],
  printingWebClassOptions: [
    {
      label: 'Wide Web',
      value: 'wide_web',
      inkSystem: 'Ink SB',
      solidPercent: 30,
      description: 'Ink SB (30% solid) with solvent mix',
    },
    {
      label: 'Narrow Web',
      value: 'narrow_web',
      inkSystem: 'Ink UV',
      solidPercent: 100,
      description: 'Ink UV (100% solid) without solvent for ink',
    },
  ],
  unitOptions: [
    { label: 'Kgs', value: 'kgs' },
    { label: 'Kpcs', value: 'kpcs' },
    { label: 'SQM', value: 'sqm' },
    { label: 'LM', value: 'lm' },
    { label: 'Roll 500 LM', value: 'roll_500_lm' },
  ],
  rmTypeOptions: DEFAULT_RM_TYPE_OPTIONS,
};

export function defaultProductTypeValue(options: ProductTypeOption[] = DEFAULT_MASTER_REFERENCE.productTypeOptions): ProductTypeValue {
  return options[0]?.value ?? 'roll';
}

export function defaultUnitValue(options: UnitOption[] = DEFAULT_MASTER_REFERENCE.unitOptions): string {
  return options[0]?.value ?? 'kgs';
}

export function normalizeProductType(
  value: string | null | undefined,
  options: ProductTypeOption[] = DEFAULT_MASTER_REFERENCE.productTypeOptions
): ProductTypeValue {
  if (value && options.some((o) => o.value === value)) return value as ProductTypeValue;
  return defaultProductTypeValue(options);
}

export function normalizeUnitValue(
  value: string | null | undefined,
  options: UnitOption[] = DEFAULT_MASTER_REFERENCE.unitOptions
): string {
  if (value && options.some((o) => o.value === value)) return value;
  return defaultUnitValue(options);
}
