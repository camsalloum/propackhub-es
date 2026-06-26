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
  type: 'substrate' | 'ink' | 'adhesive' | 'solvent';
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

export interface MasterDataReference {
  productTypes: string[];
  productTypeRows: ProductTypeRow[];
  units: string[];
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
  }>;
  costingDefaults?: {
    cleaningSolventKgPerJob?: number;
  };
}

export const PACKAGING_FAMILY = 'Packaging';
export const SOLVENT_FAMILY = 'Solvent';

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
