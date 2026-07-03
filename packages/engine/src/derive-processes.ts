export type ProcessLayerType = 'substrate' | 'ink' | 'adhesive';
export type ProcessProductType = 'roll' | 'sleeve' | 'pouch' | 'bag';
export type ProcessMaterialClass = 'PE' | 'Non PE';

export type DerivedProcessKey =
  | 'extrusion'
  | 'printing'
  | 'lamination'
  | 'slitting'
  | 'pouch_making'
  | 'bag_making'
  | 'seaming';

export interface ProcessDerivationLayer {
  type: ProcessLayerType;
  position?: number;
}

export interface ProcessCatalogEntry {
  label: string;
  costPerKgUsd: number | string;
}

export type ProcessCatalog = Partial<Record<DerivedProcessKey, ProcessCatalogEntry>>;

export interface ProcessDerivationOverride {
  enabled?: boolean;
  processQuantity?: number;
  process_quantity?: number;
}

export interface ProcessDerivationInput {
  layers: ProcessDerivationLayer[];
  productType: ProcessProductType;
  materialClass: ProcessMaterialClass;
  overrides?: Partial<Record<DerivedProcessKey, ProcessDerivationOverride>>;
}

export interface DerivedProcess {
  process_key: DerivedProcessKey;
  enabled: boolean;
  process_quantity: number;
  costPerKgUsd: number;
  label: string;
}

interface ProcessRule {
  key: DerivedProcessKey;
  enabled: boolean;
  processQuantity: number;
}

const PROCESS_LABELS: Record<DerivedProcessKey, string> = {
  extrusion: 'Extrusion',
  printing: 'Printing',
  lamination: 'Lamination',
  slitting: 'Slitting',
  pouch_making: 'Pouch Making',
  bag_making: 'Bag Making',
  seaming: 'Seaming',
};

function parseFiniteNumber(value: number | string | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function processQuantityFromOverride(override?: ProcessDerivationOverride): number | null {
  const candidate = override?.processQuantity ?? override?.process_quantity;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function normalizeProcessQuantity(key: DerivedProcessKey, quantity: number): number {
  const rounded = Math.round(quantity);
  if (key === 'extrusion') {
    if (rounded < 1) return 1;
    if (rounded > 2) return 2;
    return rounded;
  }
  return Math.max(1, rounded);
}

function buildRules(input: ProcessDerivationInput): ProcessRule[] {
  const inkLayerCount = input.layers.filter((layer) => layer.type === 'ink').length;
  const substrateLayerCount = input.layers.filter((layer) => layer.type === 'substrate').length;
  // Lamination passes = number of substrate-to-substrate bonds = (substrates - 1).
  // Using substrate count (not raw adhesive-layer count) is correct even when an interface
  // has a double adhesive coat (e.g. primer + adhesive) — that is still ONE lamination pass.
  const laminationPasses = Math.max(0, substrateLayerCount - 1);

  return [
    { key: 'extrusion', enabled: true, processQuantity: 1 },
    { key: 'printing', enabled: inkLayerCount >= 1, processQuantity: 1 },
    {
      key: 'lamination',
      enabled: laminationPasses >= 1,
      processQuantity: laminationPasses,
    },
    {
      key: 'slitting',
      enabled: input.productType === 'roll' || input.productType === 'sleeve',
      processQuantity: 1,
    },
    {
      key: 'pouch_making',
      enabled: input.productType === 'pouch',
      processQuantity: 1,
    },
    {
      key: 'bag_making',
      enabled: input.productType === 'bag',
      processQuantity: 1,
    },
    {
      key: 'seaming',
      enabled: input.productType === 'sleeve',
      processQuantity: 1,
    },
  ];
}

export function deriveProcessesFromStructure(
  input: ProcessDerivationInput,
  catalog: ProcessCatalog
): DerivedProcess[] {
  const rules = buildRules(input);
  const derived: DerivedProcess[] = [];

  for (const rule of rules) {
    if (!rule.enabled) {
      continue;
    }

    const override = input.overrides?.[rule.key];
    const overrideQuantity = processQuantityFromOverride(override);
    const processQuantity = normalizeProcessQuantity(
      rule.key,
      overrideQuantity ?? rule.processQuantity
    );

    const catalogEntry = catalog[rule.key];

    derived.push({
      process_key: rule.key,
      enabled: override?.enabled ?? true,
      process_quantity: processQuantity,
      costPerKgUsd: parseFiniteNumber(catalogEntry?.costPerKgUsd),
      label: catalogEntry?.label?.trim() || PROCESS_LABELS[rule.key],
    });
  }

  return derived;
}
