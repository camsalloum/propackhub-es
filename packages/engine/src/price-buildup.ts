/**
 * Final sale-price build-up (per kg, USD base).
 *
 * Profit margin (process_per_kg only):
 *   profit = defaultProfitMarginPercent% × (Total RM + process M&O + PrePress + Transport + accessory)
 * i.e. % of total cost before margin — not of RM alone.
 */
import {
  wastePercentForQuantity,
  effectiveCormPerKg,
  DEFAULT_CORM_SCALE_WITH_WASTE,
  type WasteBand,
} from './waste-bands';
import type { Process } from './types';

export type OperatingCostMethod = 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';

/** Tenant / estimate default when process method is active and no override is set. */
export const DEFAULT_PROFIT_MARGIN_PERCENT = 5;

export function operatingCostMethodRowLabel(method: OperatingCostMethod | undefined | null): string {
  switch (method) {
    case 'fixed_per_group':
      return 'Margin Over Raw Material';
    case 'markup_over_rm':
      return 'Markup Over Material';
    case 'process_per_kg':
    default:
      return 'Manufacturing & Operating';
  }
}

/**
 * `costPerKgUsd × processQuantity`; the sum is the M&O cost per kg used by the
 * `process_per_kg` method. `totalCost` per process = perKg × order quantity.
 */
export function computeMfgProcessCosts(processes: Process[], orderQuantityKg: number) {
  let operationCostPerKg = 0;

  const updatedProcesses = processes.map((process) => {
    if (!process.enabled) {
      return { ...process, runHours: 0, totalCost: 0 };
    }
    const qty = Math.max(1, Math.round(process.processQuantity ?? 1));
    const perKg = (process.costPerKgUsd ?? 0) * qty;
    operationCostPerKg += perKg;
    return {
      ...process,
      processQuantity: qty,
      runHours: 0,
      totalCost: perKg * (orderQuantityKg > 0 ? orderQuantityKg : 0),
    };
  });

  return {
    processes: updatedProcesses,
    totalProcessCost: operationCostPerKg * (orderQuantityKg > 0 ? orderQuantityKg : 0),
    operationCostPerKg,
  };
}

export type PriceBuildupParams = {
  materialPerKg: number;
  accessoryPerKg: number;
  wasteQtyKg: number;
  amortizeQtyKg: number;
  wasteBands?: WasteBand[];
  /** USD/kg — caller converts from display at engine boundary. */
  platesPerKg: number;
  /** USD/kg — caller converts from display at engine boundary. */
  deliveryPerKg: number;
  toolingChargeUsd: number;
  toolingBilled: boolean;
  deliveryChargeUsd: number;
  operatingCostMethod: OperatingCostMethod;
  markupPercent: number;
  mfgProcessPerKg: number;
  /** Base Fixed CoRM (USD/kg) for print mode; scaled by waste when fixed_per_group. */
  cormPerKgUsd: number;
  /** Multiplier on waste % applied to CoRM (default 1 = waste 10% → CoRM +10%). */
  cormScaleWithWaste: number;
  /**
   * Process method only: profit % of total cost before margin.
   * Defaults to {@link DEFAULT_PROFIT_MARGIN_PERCENT}.
   */
  profitMarginPercent?: number;
};

export type PriceBuildupResult = {
  wastePct: number;
  wasteAdjustedMaterialPerKg: number;
  mfgOperatingPerKg: number;
  profitMarginPerKg: number;
  prepressCostPerKg: number;
  transportCostPerKg: number;
  salePricePerKg: number;
};

/**
 * Final price build-up (per kg, USD base) — single unified model:
 *   Total RM  = material × (1 + band waste%)
 *   M&O       = process_per_kg ? Σ(process cost/kg)
 *             : markup_over_rm ? Total RM × markup%
 *             : fixed_per_group ? cormPerKgUsd (waste-scaled)
 *   PrePress  = platesPerKg + tooling(amortized)
 *   Transport = deliveryPerKg + delivery(amortized)
 *   Profit    = process_per_kg only: % × (Total RM + M&O + PrePress + Transport + accessory)
 *   Sale      = Total RM + M&O + PrePress + Transport + accessory + Profit
 */
export function priceWithNewModel(params: PriceBuildupParams): PriceBuildupResult {
  const wastePct = wastePercentForQuantity(params.wasteQtyKg, params.wasteBands);
  const wasteAdjustedMaterialPerKg = params.materialPerKg * (1 + wastePct / 100);

  const amort = params.amortizeQtyKg > 0 ? params.amortizeQtyKg : 0;
  const prepressCostPerKg =
    params.platesPerKg + (params.toolingBilled && amort > 0 ? params.toolingChargeUsd / amort : 0);
  const transportCostPerKg =
    params.deliveryPerKg + (amort > 0 ? params.deliveryChargeUsd / amort : 0);

  const cormScale = params.cormScaleWithWaste ?? DEFAULT_CORM_SCALE_WITH_WASTE;
  const mfgOperatingPerKg =
    params.operatingCostMethod === 'process_per_kg'
      ? params.mfgProcessPerKg
      : params.operatingCostMethod === 'fixed_per_group'
        ? effectiveCormPerKg(params.cormPerKgUsd, wastePct, cormScale)
        : wasteAdjustedMaterialPerKg * (params.markupPercent / 100);

  let profitMarginPerKg = 0;
  if (params.operatingCostMethod === 'process_per_kg') {
    const pct = params.profitMarginPercent ?? DEFAULT_PROFIT_MARGIN_PERCENT;
    const costBeforeProfit =
      wasteAdjustedMaterialPerKg +
      mfgOperatingPerKg +
      prepressCostPerKg +
      transportCostPerKg +
      params.accessoryPerKg;
    profitMarginPerKg = costBeforeProfit * (pct / 100);
  }

  const salePricePerKg =
    wasteAdjustedMaterialPerKg +
    mfgOperatingPerKg +
    prepressCostPerKg +
    transportCostPerKg +
    params.accessoryPerKg +
    profitMarginPerKg;

  return {
    wastePct,
    wasteAdjustedMaterialPerKg,
    mfgOperatingPerKg,
    profitMarginPerKg,
    prepressCostPerKg,
    transportCostPerKg,
    salePricePerKg,
  };
}
