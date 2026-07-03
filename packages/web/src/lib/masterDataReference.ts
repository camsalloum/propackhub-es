export type ProductTypeValue = 'roll' | 'sleeve' | 'pouch';
export type PrintingWebValue = 'wide_web' | 'narrow_web';

export interface ProductTypeOption {
  label: string;
  /** Family/product-type code from Master Data (roll/sleeve/pouch/bag/custom). NOT the engine type. */
  value: string;
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
  /** Conversion basis — used to filter units by product family (lm/sqm hidden for bag/pouch). */
  basis?: 'kg' | 'pieces' | 'sqm' | 'lm';
  /** When true, the multiplier (e.g. a roll's linear-metre length) is entered per-estimate, not fixed in Master Data. */
  variableMultiplier?: boolean;
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

export interface ProductSubtypeOption {
  label: string;
  /** e.g. pouch_stand_up, bag_wicket */
  code: string;
  /** Parent product-type code (roll/sleeve/pouch/bag/custom). */
  parent: string;
  group?: string | null;
}

export interface MasterDataReferenceState {
  productTypeOptions: ProductTypeOption[];
  printingWebClassOptions: PrintingWebOption[];
  unitOptions: UnitOption[];
  /** Driven by the rm_type reference in Master Data — replaces hardcoded Library filter tabs */
  rmTypeOptions: RmTypeOption[];
  /** Bag/Pouch subtypes — driven by the product_subtype reference in Master Data. */
  productSubtypeOptions: ProductSubtypeOption[];
  /** Process definitions — driven by Master Data > Processes. */
  processOptions: ProcessOption[];
  processRows?: Array<{
    label: string;
    code: string;
    description?: string;
    costPerKgUsd?: number;
  }>;
  costingDefaults?: {
    cleaningSolventKgPerJob?: number;
  };
  /** Platform-wide waste bands (single source of truth for all estimates). */
  wasteBands?: Array<{ minKg: number; maxKg: number | null; wastePercent: number }>;
}

export interface ProcessOption {
  /** Display label shown in the UI (e.g. "Pouch / Bag Making") */
  label: string;
  /** Stable code stored in template defaultProcesses (e.g. "pouch_making") */
  code: string;
  /** Short description shown as tooltip/hint */
  description: string;
  /** Platform default per-kg operating cost (USD). */
  costPerKgUsd?: number;
}

/** Default process options — used when Master Data has not yet been seeded. */
export const DEFAULT_PROCESS_OPTIONS: ProcessOption[] = [
  { label: 'Extrusion',    code: 'extrusion',    description: 'Blown/cast film production — PE mono structures', costPerKgUsd: 0.4 },
  { label: 'Printing',     code: 'printing',     description: 'Flexo / gravure print run', costPerKgUsd: 0.8 },
  { label: 'Lamination',   code: 'lamination',   description: 'Solvent or solventless bonding — multilayer stacks', costPerKgUsd: 0.3 },
  { label: 'Slitting',     code: 'slitting',     description: 'Reel slitting to finished width', costPerKgUsd: 0.1 },
  { label: 'Pouch Making', code: 'pouch_making', description: 'Pouch forming, filling & sealing', costPerKgUsd: 0.8 },
  { label: 'Bag Making',   code: 'bag_making',   description: 'Bag forming & sealing (shopping, industrial, courier)', costPerKgUsd: 0.5 },
  { label: 'Seaming',      code: 'seaming',      description: 'Side-seal seaming — sleeves', costPerKgUsd: 0.5 },
];

export const DEFAULT_RM_TYPE_OPTIONS: RmTypeOption[] = [
  { label: 'Substrate', code: 'substrate' },
  { label: 'Ink & Coating', code: 'ink' },
  { label: 'Adhesive', code: 'adhesive' },
  { label: 'Solvent', code: 'solvent' },
  { label: 'Packaging', code: 'packaging' },
];

/** Fallback subtype list when Master Data has none yet. Field schemas live in productCatalog. */
export const DEFAULT_PRODUCT_SUBTYPE_OPTIONS: ProductSubtypeOption[] = [
  { label: '3-Side Seal', code: 'pouch_3_side_seal', parent: 'pouch' },
  { label: '3-Side Seal + Zipper', code: 'pouch_3_side_seal_zip', parent: 'pouch' },
  { label: 'Stand-up Pouch', code: 'pouch_stand_up', parent: 'pouch' },
  { label: 'Stand-up Pouch + Zipper', code: 'pouch_stand_up_zip', parent: 'pouch' },
  { label: 'K-Seal Stand-up Pouch', code: 'pouch_kseal_stand_up', parent: 'pouch' },
  { label: 'K-Seal Stand-up Pouch + Zipper', code: 'pouch_kseal_stand_up_zip', parent: 'pouch' },
  { label: 'Center-Seal Pouch', code: 'pouch_center_seal', parent: 'pouch' },
  { label: 'Gusset Pouch', code: 'pouch_gusset', parent: 'pouch' },
  { label: '4-Side Seal Pouch', code: 'pouch_4_side_seal', parent: 'pouch' },
  { label: 'Flat-Bottom (Box) Pouch', code: 'pouch_flat_bottom', parent: 'pouch' },
  { label: 'Punch Handle', code: 'bag_punch_handle', parent: 'bag', group: 'Commercial Bags' },
  { label: 'Loop Handle', code: 'bag_loop_handle', parent: 'bag', group: 'Commercial Bags' },
  { label: 'Patch Handle', code: 'bag_patch_handle', parent: 'bag', group: 'Commercial Bags' },
  { label: 'Gusseted Shopping Bag', code: 'bag_gusseted_shopping', parent: 'bag', group: 'Commercial Bags' },
  { label: 'Industrial Bag', code: 'bag_industrial', parent: 'bag', group: 'Industrial' },
  { label: 'Courier Bag', code: 'bag_courier', parent: 'bag', group: 'Other' },
  { label: 'Diaper Bag', code: 'bag_diaper', parent: 'bag', group: 'Other' },
  { label: 'Wicket Bag', code: 'bag_wicket', parent: 'bag', group: 'Other' },
];

import { DEFAULT_WASTE_BANDS } from '@es/engine';

export const DEFAULT_MASTER_REFERENCE: MasterDataReferenceState = {
  productTypeOptions: [
    { label: 'Roll', value: 'roll' },
    { label: 'Sleeve', value: 'sleeve' },
    { label: 'Pouch', value: 'pouch' },
    { label: 'Bag', value: 'bag' },
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
    { label: 'Kgs', value: 'kgs', basis: 'kg' },
    { label: 'Kpcs', value: 'kpcs', basis: 'pieces' },
    { label: 'SQM', value: 'sqm', basis: 'sqm' },
    { label: 'LM', value: 'lm', basis: 'lm' },
    { label: 'Roll (custom length)', value: 'roll_500_lm', basis: 'lm', variableMultiplier: true },
  ],
  rmTypeOptions: DEFAULT_RM_TYPE_OPTIONS,
  productSubtypeOptions: DEFAULT_PRODUCT_SUBTYPE_OPTIONS,
  processOptions: DEFAULT_PROCESS_OPTIONS,
  processRows: [],
  costingDefaults: { cleaningSolventKgPerJob: 20 },
  wasteBands: DEFAULT_WASTE_BANDS.map((b) => ({ ...b })),
};

export function defaultProductTypeValue(options: ProductTypeOption[] = DEFAULT_MASTER_REFERENCE.productTypeOptions): string {
  return options[0]?.value ?? 'roll';
}

export function defaultUnitValue(options: UnitOption[] = DEFAULT_MASTER_REFERENCE.unitOptions): string {
  return options[0]?.value ?? 'kgs';
}

export function normalizeProductType(
  value: string | null | undefined,
  options: ProductTypeOption[] = DEFAULT_MASTER_REFERENCE.productTypeOptions
): string {
  if (value && options.some((o) => o.value === value)) return value;
  return defaultProductTypeValue(options);
}

export function normalizeUnitValue(
  value: string | null | undefined,
  options: UnitOption[] = DEFAULT_MASTER_REFERENCE.unitOptions
): string {
  if (value && options.some((o) => o.value === value)) return value;
  return defaultUnitValue(options);
}
