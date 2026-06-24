/** Validation + dimension cleanup for template → estimate configure flow. */

import { normalizeProductType } from './masterDataReference';
import { engineTypeForFamily, type ProductFamily } from './productCatalog';

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
    costPerHour: Number(process.costPerHour) || 0,
    speedBasis,
    speedValue: Number(process.speedValue) || 0,
    setupHours: Number(process.setupHours) || 0,
    enabled: process.enabled !== false,
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
  if (candidate === 'bag') return 'bag';
  const engine = engineTypeForFamily(candidate as ProductFamily);
  if (engine === 'roll' || engine === 'sleeve') return engine;
  return 'pouch';
}

export function dimensionsForSave(
  dimensions: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...dimensions };
  delete next.configureFromTemplate;
  return next;
}

export function estimateNeedsConfiguration(dimensions?: Record<string, unknown> | null): boolean {
  return Boolean(dimensions?.configureFromTemplate);
}

export function validateConfiguredEstimate(input: {
  layers: Array<{ micron: number }>;
  productType: string;
  dimensions: Record<string, unknown>;
}): string | null {
  if (input.layers.length === 0) return 'Add at least one layer.';
  if (input.layers.some((l) => !l.micron || l.micron <= 0)) {
    return 'Set thickness (µ) for every layer in Structure.';
  }

  if (input.productType === 'roll' || input.productType === 'sleeve') {
    const w = Number(input.dimensions.reelWidthMm || 0);
    const c = Number(input.dimensions.cutoffMm || 0);
    if (w <= 0 || c <= 0) return 'Set reel width and cutoff in Dimensions.';
  }

  if (input.productType === 'pouch' || input.productType === 'bag') {
    const w = Number(input.dimensions.openWidthMm || 0);
    const h = Number(input.dimensions.openHeightMm || 0);
    if (w <= 0 || h <= 0) return 'Set width and height in Dimensions.';
  }

  return null;
}
