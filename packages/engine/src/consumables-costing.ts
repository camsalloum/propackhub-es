/**
 * Process consumables costing — Total RM.
 * - Mounting tape: Flexo only; plate area = colors × mountWidth × repeat → × $/m²
 * - Other: estimated $/kg allowance (no pcs/job)
 */
import type { Estimate, Material } from './types';

export type ConsumablesRole = 'mounting_tape' | 'other';

export const CONSUMABLES_PLATFORM_KEYS: Record<ConsumablesRole, string> = {
  mounting_tape: 'consumables-mounting-tape',
  other: 'consumables-other',
};

/** Default plate mount width (m) — not FG width. */
export const DEFAULT_MOUNT_WIDTH_M = 1;
/** Typical flexo cylinder circumference band (m). */
export const CYLINDER_REPEAT_MIN_M = 0.5;
export const CYLINDER_REPEAT_MAX_M = 0.6;
/** Average cylinder repeat (m) — smart default for plate mounting tape (500–600 mm). */
export const DEFAULT_REPEAT_M = 0.55;

export interface ConsumablesConfig {
  mountingTapeMaterialId?: string | null;
  otherMaterialId?: string | null;
  /** Plate mount width (m). Default 1. */
  mountWidthM?: number;
  /**
   * Plate/cylinder circumference (m) for mounting tape.
   * Default = average cylinder (0.55 m). Not product cutoff.
   */
  repeatM?: number;
  /** Override color count (else estimate.printColorCount). */
  colors?: number;
  /** Override calculated tape m². */
  tapeM2Override?: number | null;
  /** USD overrides: mounting = $/m², other = $/kg. */
  unitPriceOverridesUsd?: Partial<Record<ConsumablesRole, number>>;
}

export interface ConsumablesCostLine {
  role: ConsumablesRole;
  label: string;
  qty: number;
  calculatedQty: number;
  qtyUnit: string;
  unitPriceUsd: number | null;
  priceUnit: string | null;
  costJobUsd: number;
  costPerKgUsd: number;
  costPerM2Usd: number;
  needsReview: boolean;
  detail?: Record<string, number>;
}

export interface ConsumablesCostDetail {
  lines: ConsumablesCostLine[];
  totalCostPerKg: number;
  totalCostPerM2: number;
  needsReview: boolean;
}

function positive(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

function num(v: number | null | undefined, fallback: number): number {
  return v != null && Number.isFinite(v) && v >= 0 ? v : fallback;
}

export function mergeConsumablesConfigDefaults(
  cfg?: ConsumablesConfig | null
): ConsumablesConfig {
  return {
    mountingTapeMaterialId: cfg?.mountingTapeMaterialId ?? null,
    otherMaterialId: cfg?.otherMaterialId ?? null,
    mountWidthM: cfg?.mountWidthM,
    repeatM: cfg?.repeatM,
    colors: cfg?.colors,
    tapeM2Override: cfg?.tapeM2Override ?? null,
    unitPriceOverridesUsd: { ...cfg?.unitPriceOverridesUsd },
  };
}

/**
 * Plate/cylinder repeat for mounting tape — not product cutoff.
 * Product cutoffs (e.g. 125 mm labels) are FG repeats; flexo cylinders are typically 500–600 mm.
 * Reuse cutoff only when it already falls in that cylinder band; otherwise use the average.
 */
export function defaultRepeatMFromEstimate(estimate: Estimate): number {
  const cutoffMm = estimate.dimensions?.cutoffMm;
  if (cutoffMm != null && Number.isFinite(cutoffMm) && cutoffMm > 0) {
    const m = cutoffMm / 1000;
    if (m >= CYLINDER_REPEAT_MIN_M && m <= CYLINDER_REPEAT_MAX_M) return m;
  }
  return DEFAULT_REPEAT_M;
}

/** Resolve tape repeat: honor explicit override unless it is a leaked product-cutoff value. */
export function resolveMountingTapeRepeatM(
  cfg: ConsumablesConfig,
  estimate: Estimate
): number {
  const explicit = positive(cfg.repeatM);
  if (explicit != null) {
    const cutoffMm = estimate.dimensions?.cutoffMm;
    const cutoffM =
      cutoffMm != null && Number.isFinite(cutoffMm) && cutoffMm > 0 ? cutoffMm / 1000 : null;
    // Old default copied product cutoff (e.g. 0.125 m) into config — ignore that leak.
    if (
      cutoffM != null &&
      Math.abs(explicit - cutoffM) < 1e-9 &&
      explicit < CYLINDER_REPEAT_MIN_M
    ) {
      return defaultRepeatMFromEstimate(estimate);
    }
    return explicit;
  }
  return defaultRepeatMFromEstimate(estimate);
}

export function resolveConsumablesUnitPrice(
  material: Material | undefined | null,
  role: ConsumablesRole
): {
  unitPriceUsd: number | null;
  priceUnit: string | null;
  needsReview: boolean;
} {
  if (!material) {
    return { unitPriceUsd: null, priceUnit: null, needsReview: true };
  }
  if (role === 'other') {
    const price =
      positive(material.costPerKgUsd) ??
      positive(material.unitPriceUsd) ??
      positive(material.marketPriceUsd);
    return {
      unitPriceUsd: price,
      priceUnit: 'kgs',
      needsReview: price == null,
    };
  }
  // Mounting tape: $/m²
  const price =
    positive(material.unitPriceUsd) ??
    positive(material.costPerPieceUsd) ??
    positive(material.costPerMeterUsd);
  const unit = (material.priceUnit ?? 'm2').toLowerCase();
  return {
    unitPriceUsd: price,
    priceUnit: unit === 'm2' || unit === 'sqm' ? 'm2' : unit,
    needsReview: price == null,
  };
}

function findByPlatformKey(
  materials: Map<string, Material>,
  key: string
): Material | undefined {
  for (const m of materials.values()) {
    if (m.platformMasterKey === key) return m;
  }
  return undefined;
}

function resolveMaterial(
  materials: Map<string, Material>,
  cfg: ConsumablesConfig,
  role: ConsumablesRole
): Material | undefined {
  const id =
    role === 'mounting_tape' ? cfg.mountingTapeMaterialId : cfg.otherMaterialId;
  if (id && materials.has(id)) return materials.get(id);
  return findByPlatformKey(materials, CONSUMABLES_PLATFORM_KEYS[role]);
}

function emptyDetail(): ConsumablesCostDetail {
  return { lines: [], totalCostPerKg: 0, totalCostPerM2: 0, needsReview: false };
}

export function calculateConsumablesCosts(
  estimate: Estimate,
  materials: Map<string, Material>,
  opts: {
    orderQuantityKg: number;
    totalGsm: number;
    printColorCount?: number | null;
  }
): ConsumablesCostDetail {
  const orderKg = opts.orderQuantityKg;
  const totalGsm = opts.totalGsm;
  if (orderKg <= 0 || totalGsm <= 0) return emptyDetail();

  const cfg = mergeConsumablesConfigDefaults(estimate.consumablesConfig);
  const process = estimate.inkPrintingProcess ?? 'flexo';
  const isFlexo = process === 'flexo';
  const lines: ConsumablesCostLine[] = [];

  // ── Mounting tape (Flexo only) ───────────────────────────────────────────
  if (isFlexo) {
    const colors = Math.max(
      0,
      Math.floor(
        num(cfg.colors, opts.printColorCount != null ? opts.printColorCount : 0)
      )
    );
    const mountWidthM = num(cfg.mountWidthM, DEFAULT_MOUNT_WIDTH_M);
    const repeatM = resolveMountingTapeRepeatM(cfg, estimate);
    const calculatedTapeM2 = colors > 0 ? colors * mountWidthM * repeatM : 0;
    const tapeM2 =
      cfg.tapeM2Override != null && Number.isFinite(cfg.tapeM2Override)
        ? Math.max(0, Number(cfg.tapeM2Override))
        : calculatedTapeM2;

    const mat = resolveMaterial(materials, cfg, 'mounting_tape');
    const resolved = resolveConsumablesUnitPrice(mat, 'mounting_tape');
    const overridePrice = positive(cfg.unitPriceOverridesUsd?.mounting_tape);
    const unitPriceUsd = overridePrice ?? resolved.unitPriceUsd;
    const needsReview = unitPriceUsd == null && tapeM2 > 0;
    const costJobUsd =
      unitPriceUsd != null && tapeM2 > 0 ? unitPriceUsd * tapeM2 : 0;
    const costPerKgUsd = costJobUsd / orderKg;
    const costPerM2Usd = costPerKgUsd * (totalGsm / 1000);

    lines.push({
      role: 'mounting_tape',
      label: 'Mounting tape',
      qty: tapeM2,
      calculatedQty: calculatedTapeM2,
      qtyUnit: 'm²',
      unitPriceUsd,
      priceUnit: 'm2',
      costJobUsd,
      costPerKgUsd,
      costPerM2Usd,
      needsReview: needsReview || (tapeM2 > 0 && unitPriceUsd == null),
      detail: { colors, mountWidthM, repeatM },
    });
  }

  // ── Other consumables ($/kg allowance) ───────────────────────────────────
  {
    const mat = resolveMaterial(materials, cfg, 'other');
    const resolved = resolveConsumablesUnitPrice(mat, 'other');
    const overridePrice = positive(cfg.unitPriceOverridesUsd?.other);
    const unitPriceUsd = overridePrice ?? resolved.unitPriceUsd;
    const needsReview = unitPriceUsd == null;
    const costPerKgUsd = unitPriceUsd ?? 0;
    const costPerM2Usd = costPerKgUsd * (totalGsm / 1000);
    const costJobUsd = costPerKgUsd * orderKg;

    lines.push({
      role: 'other',
      label: 'Other consumables',
      qty: 1,
      calculatedQty: 1,
      qtyUnit: 'kg',
      unitPriceUsd,
      priceUnit: 'kgs',
      costJobUsd,
      costPerKgUsd: needsReview ? 0 : costPerKgUsd,
      costPerM2Usd: needsReview ? 0 : costPerM2Usd,
      needsReview,
    });
  }

  const totalCostPerKg = lines.reduce((s, l) => s + l.costPerKgUsd, 0);
  const totalCostPerM2 = lines.reduce((s, l) => s + l.costPerM2Usd, 0);
  const needsReview = lines.some((l) => l.needsReview);

  return { lines, totalCostPerKg, totalCostPerM2, needsReview };
}
