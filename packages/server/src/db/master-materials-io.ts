/**
 * Platform master — types + seed/reference helpers.
 *
 * Excel has been fully retired. The platform DB (platform_master_materials +
 * platform_reference_items) is the single source of truth, seeded once from the
 * committed JSON (master-materials-seed.json / master-data-reference.json) and
 * managed thereafter via the in-app Master Data screen.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface MasterMaterial {
  key: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'accessory';
  solidPercent: number;
  density: number;
  costPerKgUsd: number;
  /** Stored liquid price (ink/adhesive only) — avoids floating-point round-trip loss on reload */
  liquidCostUsd?: number | null;
  wastePercent: number;
  isSolventBased: boolean;
  substrateFamily: string | null;
  substrateGrade: string | null;
  hoover: string | null;
  marketPriceUsd: number | null;
  /** GP/MP/HP lamination formula (binder + hardener + EA parts). */
  laminationRecipe?: Record<string, unknown> | null;
  // Accessory pricing (type='accessory' rows only).
  /** 'zipper' | 'spout' | 'valve' | 'handle' | 'window'. */
  accessoryKind?: string | null;
  costPerMeterUsd?: number | null;
  costPerPieceUsd?: number | null;
  weightGramPerMeter?: number | null;
  weightGramPerPiece?: number | null;
}

export interface ProductTypeRow {
  label: string;
  code: string;
}

export interface PrintingWebRow {
  label: string;
  code: string;
  inkSystem?: string | null;
  solidPercent?: number | null;
}

/** Order-quantity unit basis (mirrors engine UnitBasis). */
export type UnitBasis = 'kg' | 'pieces' | 'sqm' | 'lm';

export interface UnitRow {
  label: string;
  code: string;
  /** Conversion basis (engine-fixed). */
  basis: UnitBasis;
  /** Base physical units per entered unit (e.g. Kpcs → 1000). */
  multiplier: number;
  /**
   * When true, `multiplier` is only a fallback default — the actual value is
   * entered per-estimate at order time (e.g. "Roll (custom length)": the user
   * types the roll's linear-metre length, which becomes that estimate's
   * multiplier). See `resolveOrderUnitDef()` in tenant-reference-data.ts.
   */
  variableMultiplier?: boolean;
}

export interface MasterDataReference {
  productTypes: string[];
  productTypeRows: ProductTypeRow[];
  units: string[];
  /** Units with their conversion basis + multiplier (drives order-qty → kg). */
  unitRows?: UnitRow[];
  rmTypes: string[];
  /** Same list as rmTypes but with codes for filter/save mapping */
  rmTypeRows?: Array<{ label: string; code: string }>;
  packaging: string[];
  inkCoating: string[];
  adhesive: string[];
  solvent?: string[];
  printingWebClasses: PrintingWebRow[];
  /** Bag/Pouch subtypes managed in Master Data (code e.g. pouch_stand_up; parent = product-type code). */
  productSubtypeRows?: Array<{ label: string; code: string; parent?: string }>;
  /**
   * Process definitions managed in Master Data.
   * metadata carries costPerHour, speedBasis, speedValue, setupHours for instantiation defaults.
   */
  processRows?: Array<{
    label: string;
    code: string;
    description?: string;
    costPerHour?: number;
    speedBasis?: string;
    speedValue?: number;
    setupHours?: number;
    costPerKgUsd?: number;
  }>;
  costingDefaults?: {
    cleaningSolventKgPerJob?: number;
  };
  /** Platform-wide waste bands by print mode (Printed vs Plain). */
  wasteBandsByPrintMode?: {
    printed: Array<{ minKg: number; maxKg: number | null; wastePercent: number }>;
    plain: Array<{ minKg: number; maxKg: number | null; wastePercent: number }>;
  };
  /** CoRM tracks waste % by this factor (default 1). */
  cormScaleWithWaste?: number;
}

export const PACKAGING_FAMILY = 'Packaging';
export const SOLVENT_FAMILY = 'Solvent';

/**
 * Default order-quantity units shipped by the platform owner. Each carries a
 * conversion basis + multiplier so the engine can convert to kg. 'lm' uses the
 * finished (reel) product width — see engine unit-conversion.ts.
 */
export const DEFAULT_UNIT_ROWS: UnitRow[] = [
  { label: 'Kgs', code: 'kgs', basis: 'kg', multiplier: 1 },
  { label: 'Kpcs', code: 'kpcs', basis: 'pieces', multiplier: 1000 },
  { label: 'SQM', code: 'sqm', basis: 'sqm', multiplier: 1 },
  { label: 'LM', code: 'lm', basis: 'lm', multiplier: 1 },
  // User enters the roll's linear-metre length at order time (see variableMultiplier).
  // `multiplier` is kept as the fallback used until a length is entered.
  { label: 'Roll (custom length)', code: 'roll_500_lm', basis: 'lm', multiplier: 500, variableMultiplier: true },
];

/** Legacy unit code → basis/multiplier, for units stored without metadata. */
export const LEGACY_UNIT_METADATA: Record<string, { basis: UnitBasis; multiplier: number }> = {
  kgs: { basis: 'kg', multiplier: 1 },
  kg: { basis: 'kg', multiplier: 1 },
  kpcs: { basis: 'pieces', multiplier: 1000 },
  sqm: { basis: 'sqm', multiplier: 1 },
  lm: { basis: 'lm', multiplier: 1 },
  roll_500_lm: { basis: 'lm', multiplier: 500 },
};

/** Template ref_material_key → master seed `key`. */
export const TEMPLATE_REF_TO_MASTER_KEY: Record<string, string> = {
  'ldpe-natural': 'ldpe-natural',
  'ldpe-white': 'ldpe-white',
  'ldpe-shrink': 'pe-shrink',
  'pet-transparent': 'pet-transparent',
  'pet-shrink': 'pet-shrink',
  'pvc-shrink': 'pvc-shrink-normal-shrink-blown',
  bopp: 'bopp-transparent',
  cpp: 'cpp-transparent',
  'alu-foil': 'aluminium-foil',
  'ink-sb': 'ink-sb',
  'ink-uv': 'ink-uv',
  'adhesive-sb': 'adhesive-sb-gp',
  'adhesive-sb-gp': 'adhesive-sb-gp',
  'adhesive-sb-mp': 'adhesive-sb-mp',
  'adhesive-sb-hp': 'adhesive-sb-hp',
  'adhesive-wb': 'adhesive-wb',
  'adhesive-mono-component': 'adhesive-mono-component',
  'solvent-base': 'adhesive-sb',
  'solvent-common': 'solvent-common',
};

/** DB costingKey for a platform master row (template alias, e.g. ldpe-shrink on PE Shrink). */
export function costingKeyForMasterKey(masterKey: string): string | null {
  for (const [refKey, mappedKey] of Object.entries(TEMPLATE_REF_TO_MASTER_KEY)) {
    if (mappedKey === masterKey) return refKey;
  }
  return null;
}

export function resolveMasterSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, 'master-materials-seed.json');
}

export function resolveMasterDataReferencePath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, 'master-data-reference.json');
}

/** Backfill reference fields when reading older master-data-reference.json */
export function normalizeReferenceShape(ref: Partial<MasterDataReference>): MasterDataReference {
  const productTypes = ref.productTypes ?? [];
  const productTypeRows =
    ref.productTypeRows && ref.productTypeRows.length > 0
      ? ref.productTypeRows
      : productTypes.map((label) => ({ label, code: '' }));

  return {
    productTypes,
    productTypeRows,
    units: ref.units ?? [],
    unitRows: ref.unitRows ?? [],
    rmTypes: ref.rmTypes ?? [],
    packaging: ref.packaging ?? [],
    inkCoating: ref.inkCoating ?? [],
    adhesive: ref.adhesive ?? [],
    printingWebClasses: ref.printingWebClasses ?? [],
    productSubtypeRows: ref.productSubtypeRows ?? [],
    processRows: ref.processRows ?? [],
    costingDefaults: ref.costingDefaults ?? { cleaningSolventKgPerJob: 20 },
  };
}

/** Stable sync key — family + grade + hoover for all RM types. */
export function materialSyncKey(m: {
  type: string;
  name: string;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
}): string {
  if (m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY) {
    return `packaging|${m.substrateGrade || m.name}|${m.hoover || ''}`;
  }
  if (m.type === 'substrate') {
    return `substrate|${m.substrateFamily || ''}|${m.substrateGrade || m.name}|${m.hoover || ''}`;
  }
  if (m.type === 'ink' || m.type === 'adhesive') {
    return `${m.type}|${m.substrateFamily || ''}|${m.substrateGrade || m.name}|${m.hoover || ''}`;
  }
  return `${m.type}|${m.name}`;
}
