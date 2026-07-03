import type { MasterDataReference, ProductTypeRow, PrintingWebRow } from '../db/master-materials-io';

export type ProductTypeValue = 'roll' | 'sleeve' | 'pouch';
export type PrintingWebValue = 'wide_web' | 'narrow_web';

const PRODUCT_TYPE_MAP: Record<string, ProductTypeValue> = {
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

const PRINTING_WEB_MAP: Record<string, PrintingWebValue> = {
  wide_web: 'wide_web',
  'wide web': 'wide_web',
  narrow_web: 'narrow_web',
  'narrow web': 'narrow_web',
};

export function normalizeProductTypeLabel(label: string): ProductTypeValue | null {
  const key = label.trim().toLowerCase();
  return PRODUCT_TYPE_MAP[key] ?? null;
}

export function normalizeProductTypeCode(codeOrLabel: string): ProductTypeValue | null {
  const key = codeOrLabel.trim().toLowerCase();
  if (key === 'roll' || key === 'sleeve' || key === 'pouch') return key;
  return normalizeProductTypeLabel(codeOrLabel);
}

export function normalizePrintingWebCode(codeOrLabel: string): PrintingWebValue | null {
  const key = codeOrLabel.trim().toLowerCase();
  return PRINTING_WEB_MAP[key] ?? null;
}

export function normalizeUnitLabel(label: string): string | null {
  const key = label.trim().toLowerCase();
  return UNIT_MAP[key] ?? null;
}

export interface ProductTypeOption {
  label: string;
  /** Family/product-type code as managed in Master Data (roll/sleeve/pouch/bag/custom). NOT the engine type. */
  value: string;
}

export interface PrintingWebOption {
  label: string;
  value: PrintingWebValue;
  inkSystem: string | null;
  solidPercent: number | null;
  description: string;
}

export interface RmTypeOption {
  label: string;
  /** Derived or stored code — matches DB type ('substrate'|'ink'|'adhesive'|'packaging') or custom kebab slug */
  code: string;
}

export interface ProductSubtypeOption {
  label: string;
  /** e.g. pouch_stand_up, bag_wicket */
  code: string;
  /** Parent product-type code this subtype belongs to (roll/sleeve/pouch/bag/custom). */
  parent: string;
  group?: string | null;
}

export interface MasterDataReferenceResponse extends MasterDataReference {
  productTypeOptions: ProductTypeOption[];
  unitOptions: Array<{ label: string; value: string; basis?: 'kg' | 'pieces' | 'sqm' | 'lm'; variableMultiplier?: boolean }>;
  printingWebClassOptions: PrintingWebOption[];
  rmTypeOptions: RmTypeOption[];
  productSubtypeOptions: ProductSubtypeOption[];
  processOptions: Array<{ label: string; code: string; description: string }>;
}

export const DEFAULT_PRODUCT_TYPE_ROWS: ProductTypeRow[] = [
  { label: 'Roll', code: 'roll' },
  { label: 'Sleeve', code: 'sleeve' },
  { label: 'Bag', code: 'pouch' },
];

export const DEFAULT_PRINTING_WEB_ROWS: PrintingWebRow[] = [
  { label: 'Wide Web', code: 'wide_web', inkSystem: 'Ink SB', solidPercent: 30 },
  { label: 'Narrow Web', code: 'narrow_web', inkSystem: 'Ink UV', solidPercent: 100 },
];

const DEFAULT_PRODUCT_TYPES: ProductTypeOption[] = [
  { label: 'Roll', value: 'roll' },
  { label: 'Sleeve', value: 'sleeve' },
  { label: 'Pouch', value: 'pouch' },
  { label: 'Bag', value: 'bag' },
];

const DEFAULT_PRINTING_WEB: PrintingWebOption[] = [
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
];

const DEFAULT_RM_TYPES: RmTypeOption[] = [
  { label: 'Substrate', code: 'substrate' },
  { label: 'Ink & Coating', code: 'ink' },
  { label: 'Adhesive', code: 'adhesive' },
  { label: 'Packaging', code: 'packaging' },
];

const DEFAULT_UNITS: MasterDataReferenceResponse['unitOptions'] = [
  { label: 'Kgs', value: 'kgs', basis: 'kg' },
  { label: 'Kpcs', value: 'kpcs', basis: 'pieces' },
  { label: 'SQM', value: 'sqm', basis: 'sqm' },
  { label: 'LM', value: 'lm', basis: 'lm' },
  { label: 'Roll 500 LM', value: 'roll_500_lm', basis: 'lm' },
];

function productTypeOptionsFromRows(rows: ProductTypeRow[]): ProductTypeOption[] {
  const out: ProductTypeOption[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const label = row.label?.trim();
    if (!label) continue;
    // Keep the admin's own code (distinct families like 'pouch' and 'bag' must NOT collapse).
    const value = (row.code?.trim() || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')).toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push({ label, value });
  }
  return out;
}

function printingWebOptionsFromRows(rows: PrintingWebRow[]): PrintingWebOption[] {
  const out: PrintingWebOption[] = [];
  for (const row of rows) {
    const value =
      normalizePrintingWebCode(row.code) ?? normalizePrintingWebCode(row.label);
    if (!value) {
      console.warn(`[master-data] Unknown printing web "${row.label}" (code: ${row.code}) — skipped`);
      continue;
    }
    const ink = row.inkSystem || (value === 'wide_web' ? 'Ink SB' : 'Ink UV');
    const solid = row.solidPercent ?? (value === 'wide_web' ? 30 : 100);
    out.push({
      label: row.label,
      value,
      inkSystem: ink,
      solidPercent: solid,
      description:
        value === 'wide_web'
          ? `${ink} (${solid}% solid) with solvent mix`
          : `${ink} (${solid}% solid) without solvent for ink`,
    });
  }
  return out;
}

export function enrichMasterDataReference(ref: MasterDataReference): MasterDataReferenceResponse {
  const ptRows =
    ref.productTypeRows?.length > 0
      ? ref.productTypeRows
      : (ref.productTypes ?? []).map((label) => ({ label, code: '' }));

  const productTypeOptions = productTypeOptionsFromRows(ptRows);

  const pwRows =
    ref.printingWebClasses?.length > 0 ? ref.printingWebClasses : DEFAULT_PRINTING_WEB_ROWS;
  const printingWebClassOptions = printingWebOptionsFromRows(pwRows);

  const unitOptions =
    ref.unitRows && ref.unitRows.length > 0
      ? ref.unitRows.map((u) => ({ label: u.label, value: u.code, basis: u.basis, variableMultiplier: u.variableMultiplier === true }))
      : ref.units
          .map((label) => {
            const value = normalizeUnitLabel(label);
            return value ? { label, value } : null;
          })
          .filter((x): x is { label: string; value: string } => x != null);

  const rmTypeOptions: RmTypeOption[] =
    ref.rmTypeRows && ref.rmTypeRows.length > 0
      ? ref.rmTypeRows
      : (ref.rmTypes ?? []).map((label) => ({
          label,
          code:
            ({ substrate: 'substrate', 'ink & coating': 'ink', ink: 'ink', adhesive: 'adhesive', packaging: 'packaging' } as Record<string, string>)[
              label.trim().toLowerCase()
            ] ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        }));

  const productSubtypeOptions: ProductSubtypeOption[] = (ref.productSubtypeRows ?? [])
    .map((r) => {
      const code = (r.code || '').trim().toLowerCase();
      const parent =
        (r.parent || '').trim().toLowerCase() ||
        (code.startsWith('bag') ? 'bag' : code.startsWith('pouch') ? 'pouch' : '');
      if (!code || !parent) return null;
      return { label: r.label, code, parent };
    })
    .filter((x): x is ProductSubtypeOption => x != null);

  const processOptions = (ref.processRows ?? [])
    .filter((p) => p.code)
    .map((p) => ({
      label: p.label,
      code: p.code,
      description: p.description ?? '',
      costPerKgUsd: p.costPerKgUsd ?? 0,
    }));

  return {
    ...ref,
    productTypeRows: ptRows,
    printingWebClasses: pwRows,
    productTypeOptions: productTypeOptions.length > 0 ? productTypeOptions : DEFAULT_PRODUCT_TYPES,
    printingWebClassOptions:
      printingWebClassOptions.length > 0 ? printingWebClassOptions : DEFAULT_PRINTING_WEB,
    unitOptions: unitOptions.length > 0 ? unitOptions : DEFAULT_UNITS,
    rmTypeOptions: rmTypeOptions.length > 0 ? rmTypeOptions : DEFAULT_RM_TYPES,
    productSubtypeOptions,
    processOptions,
    costingDefaults: ref.costingDefaults ?? { cleaningSolventKgPerJob: 20 },
  };
}
