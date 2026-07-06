/** Validation + dimension cleanup for template → estimate configure flow. */

import {
  DEFAULT_PROCESS_OPTIONS,
  normalizeProductType,
  type MasterDataReferenceState,
  type ProcessOption,
} from './masterDataReference';
import { engineTypeForFamily, type ProductFamily } from './productCatalog';

export type ProcessCostRow = {
  label: string;
  code: string;
  description?: string;
  costPerKgUsd?: number;
  costPerHour?: number;
  speedBasis?: string;
  speedValue?: number;
  setupHours?: number;
};

const normProcessToken = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** Merge processRows + processOptions into one lookup catalog (rows win). */
export function buildProcessCostCatalog(input: {
  processRows?: ProcessCostRow[];
  processOptions?: ProcessOption[];
}): ProcessCostRow[] {
  const byCode = new Map<string, ProcessCostRow>();
  for (const row of input.processRows ?? []) {
    const code = normProcessToken(row.code);
    if (!code) continue;
    byCode.set(code, row);
  }
  const optionSource =
    (input.processOptions ?? []).length > 0 ? input.processOptions! : DEFAULT_PROCESS_OPTIONS;
  for (const option of optionSource) {
    const code = normProcessToken(option.code);
    if (!code || byCode.has(code)) continue;
    byCode.set(code, {
      label: option.label,
      code: option.code,
      description: option.description,
      costPerKgUsd: option.costPerKgUsd ?? 0,
    });
  }
  return [...byCode.values()];
}

export function buildProcessCostCatalogFromReference(
  reference: Pick<MasterDataReferenceState, 'processRows' | 'processOptions'>
): ProcessCostRow[] {
  return buildProcessCostCatalog({
    processRows: reference.processRows,
    processOptions: reference.processOptions,
  });
}

export function lookupProcessCostRow(
  process: Record<string, unknown>,
  catalog: ProcessCostRow[]
): ProcessCostRow | null {
  const candidates = new Set<string>();
  const processKey = normProcessToken(process.processKey);
  const name = normProcessToken(process.name);
  if (processKey) candidates.add(processKey);
  if (name) {
    candidates.add(name);
    candidates.add(name.replace(/\s+/g, '_'));
  }
  return (
    catalog.find((row) => {
      const code = normProcessToken(row.code);
      const label = normProcessToken(row.label);
      for (const candidate of candidates) {
        if (candidate === code || candidate === label) return true;
      }
      return false;
    }) ?? null
  );
}

/** Master per-kg cost wins over stale legacy persisted values. */
export function resolveProcessPerKgUsd(
  process: Record<string, unknown>,
  catalog: ProcessCostRow[]
): number {
  const match = lookupProcessCostRow(process, catalog);
  const masterCost = Number(match?.costPerKgUsd ?? 0);
  if (masterCost > 0) return masterCost;

  const persisted = Number(process.costPerKgUsd ?? 0);
  if (persisted > 0) return persisted;

  const basis = normProcessToken(process.speedBasis);
  const costPerHour = Number(process.costPerHour ?? 0);
  const speedValue = Number(process.speedValue ?? 0);
  if (basis === 'kg_per_hour' && costPerHour > 0 && speedValue > 0) {
    return costPerHour / speedValue;
  }
  return 0;
}

const PROCESS_SPEED_BASES = ['kg_per_hour', 'm_per_min', 'pcs_per_min'] as const;
export type ProcessSpeedBasis = (typeof PROCESS_SPEED_BASES)[number];

/** API/DB rows return decimal columns as strings — Zod PATCH expects numbers. */
export function normalizeProcessForSave(process: Record<string, unknown>) {
  const rawBasis = String(process.speedBasis ?? 'kg_per_hour');
  const speedBasis: ProcessSpeedBasis = PROCESS_SPEED_BASES.includes(rawBasis as ProcessSpeedBasis)
    ? (rawBasis as ProcessSpeedBasis)
    : 'kg_per_hour';

  return {
    name: String(process.name ?? ''),
    /** Stable master-data code — e.g. 'lamination'. Used for reliable cost lookups. */
    processKey: process.processKey ? String(process.processKey) : null,
    /** How many times this process applies (e.g. 2 for double-lamination). */
    processQuantity: Math.max(1, Number(process.processQuantity) || 1),
    costPerHour: Number(process.costPerHour) || 0,
    speedBasis,
    speedValue: Number(process.speedValue) || 0,
    setupHours: Number(process.setupHours) || 0,
    enabled: process.enabled !== false,
    costPerKgUsd: Number(process.costPerKgUsd) || 0,
  };
}

export function normalizeProcessesForSave(processes: unknown[]): ReturnType<typeof normalizeProcessForSave>[] {
  return (processes ?? []).map((p) => normalizeProcessForSave(p as Record<string, unknown>));
}

const PERSISTABLE_PRODUCT_TYPES = ['roll', 'sleeve', 'pouch', 'bag'] as const;
export type PersistableProductType = (typeof PERSISTABLE_PRODUCT_TYPES)[number];

/** Map UI / Master-Data family codes to the DB enum the PATCH schema accepts. */
export function productTypeForSave(
  estimateProductType: string | null | undefined,
  uiFamily: string,
  options: Array<{ value: string }>
): PersistableProductType {
  const candidate = normalizeProductType(estimateProductType ?? uiFamily, options as any);
  if ((PERSISTABLE_PRODUCT_TYPES as readonly string[]).includes(candidate)) {
    return candidate as PersistableProductType;
  }
  return engineTypeForFamily(candidate as ProductFamily);
}

export function dimensionsForSave(
  dimensions: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...dimensions };
  delete next.configureFromTemplate;
  return next;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalUuid(value: unknown): string | undefined {
  const s = typeof value === 'string' ? value.trim() : '';
  return UUID_RE.test(s) ? s : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function nonnegativeNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Drop values the create/PATCH Zod schema rejects (0 qty, empty UUIDs, bad enums). */
export function sanitizeEstimateSavePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...payload };

  if (next.orderQuantityKg !== undefined) {
    const qty = positiveNumber(next.orderQuantityKg);
    if (qty != null) next.orderQuantityKg = qty;
    else delete next.orderQuantityKg;
  }

  if (next.customerId !== undefined) {
    const id = optionalUuid(next.customerId);
    if (id) next.customerId = id;
    else delete next.customerId;
  }

  if (next.quoteId !== undefined) {
    const id = optionalUuid(next.quoteId);
    if (id) next.quoteId = id;
    else delete next.quoteId;
  }

  if (next.solventMaterialId !== undefined) {
    const id = optionalUuid(next.solventMaterialId);
    if (id) next.solventMaterialId = id;
    else delete next.solventMaterialId;
  }

  if (next.pricingMethod !== 'markup' && next.pricingMethod !== 'margin_per_kg') {
    delete next.pricingMethod;
  }

  if (next.solventRatio !== undefined) {
    const ratio = positiveNumber(next.solventRatio);
    if (ratio != null) next.solventRatio = ratio;
    else delete next.solventRatio;
  }

  if (Array.isArray(next.slabs)) {
    const slabs = (next.slabs as Array<{ quantityKg?: unknown; pricePerKg?: unknown }>)
      .map((s) => {
        const quantityKg = positiveNumber(s.quantityKg);
        if (quantityKg == null) return null;
        return {
          quantityKg,
          pricePerKg: nonnegativeNumber(s.pricePerKg) ?? 0,
        };
      })
      .filter((s): s is { quantityKg: number; pricePerKg: number } => s != null);
    if (slabs.length > 0) next.slabs = slabs;
    else delete next.slabs;
  }

  for (const key of [
    'marginValuePerKgUsd',
    'cormPerKgUsd',
    'cormPerKgPlain',
    'moqKg',
    'solventCostPerKgUsd',
    'cleaningSolventKgPerJob',
    'toolingChargeUsd',
    'deliveryChargeUsd',
  ] as const) {
    if (next[key] !== undefined) {
      const n = nonnegativeNumber(next[key]);
      if (n != null) next[key] = n;
      else delete next[key];
    }
  }

  return next;
}

export function validateSaveMaterialRefs(input: {
  layers: Array<{ materialId: string }>;
  materialIds: Iterable<string>;
  needsSolventMix: boolean;
  solventMaterialId?: string | null;
}): string | null {
  const known = new Set(input.materialIds);
  if (input.layers.some((l) => !l.materialId?.trim() || !known.has(l.materialId))) {
    return 'Select a valid material for every layer before saving.';
  }
  if (input.needsSolventMix && input.solventMaterialId && !known.has(input.solventMaterialId)) {
    return 'Select a valid solvent material before saving.';
  }
  return null;
}

export function estimateNeedsConfiguration(dimensions?: Record<string, unknown> | null): boolean {
  return Boolean(dimensions?.configureFromTemplate);
}

export function hasConfiguredProcesses(
  processes?: Array<{ enabled?: boolean }> | null
): boolean {
  return (processes ?? []).some((p) => p.enabled !== false);
}

export function validateConfiguredEstimate(input: {
  layers: Array<{ micron: number }>;
  productType: string;
  dimensions: Record<string, unknown>;
  processes?: Array<{ enabled?: boolean }> | null;
  /** When true, order unit is Roll (custom length) — length (LM) is required. */
  requiresRollLength?: boolean;
  /** Ink in structure → cut-off required for roll/sleeve. */
  structureHasPrinting?: boolean;
}): string | null {
  if (!hasConfiguredProcesses(input.processes)) {
    return 'Select at least one manufacturing process in Structure.';
  }
  if (input.layers.length === 0) return 'Add at least one layer.';
  if (input.layers.some((l) => !l.micron || l.micron <= 0)) {
    return 'Set thickness (µ) for every layer in Structure.';
  }

  if (input.requiresRollLength) {
    const rollLm = Number(input.dimensions.orderUnitMultiplier || 0);
    if (!(rollLm > 0)) {
      return 'Set roll length (LM) — required when unit is Roll (custom length).';
    }
  }

  if (input.productType === 'roll' || input.productType === 'sleeve') {
    const w = Number(input.dimensions.reelWidthMm || 0);
    const c = Number(input.dimensions.cutoffMm ?? NaN);
    if (w <= 0) return 'Set reel width in Dimensions.';
    if (!Number.isFinite(c) || c < 0) return 'Cut-off cannot be negative.';
    if (input.structureHasPrinting && c <= 0) {
      return 'Set cut-off for printed or converted roll / sleeve.';
    }
  }

  if (input.productType === 'pouch' || input.productType === 'bag') {
    const w = Number(input.dimensions.openWidthMm || 0);
    const h = Number(input.dimensions.openHeightMm || 0);
    if (w <= 0 || h <= 0) return 'Set width and height in Dimensions.';
  }

  return null;
}
