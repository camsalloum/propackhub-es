/**
 * Shared RM / cost-breakdown metrics from a live engine estimate.
 * Material cost card and Cost breakdown must use the same Total RM figures.
 */
export type CostSummaryEstimate = {
  materialCostPerKg?: number;
  wasteAdjustedMaterialPerKg?: number;
  wastePercentApplied?: number;
  rmCostPerM2?: number;
  layerRmCostPerM2?: number;
  solventMixCostPerM2?: number;
  packagingCostPerM2?: number;
  consumablesCostPerM2?: number;
  packagingCostPerKg?: number;
  consumablesCostPerKg?: number;
  totalGsm?: number;
  operationCostPerKg?: number;
  profitMarginPerKg?: number;
  developmentCostPerKg?: number;
  logisticsCostPerKg?: number;
  accessoryCostPerKg?: number;
  salePricePerKg?: number;
  layers?: Array<{ costPerM2?: number }>;
};

export type RmTotals = {
  /** Pre-waste material (substrates + ink/adh/solvent + packaging + consumables). */
  materialNoWastePerKg: number;
  /** Total RM = material × (1 + band waste%) — same as Cost breakdown Total RM. */
  totalRmPerKg: number;
  /** Pre-waste RM per m². */
  materialNoWastePerM2: number;
  /** Total RM per m² (waste-adjusted). */
  totalRmPerM2: number;
  wastePercentApplied: number;
  wastePerKg: number;
  wastePerM2: number;
};

/** Build Total RM figures shared by Material cost card and Cost breakdown. */
export function buildRmTotals(
  e: CostSummaryEstimate | null | undefined,
  fallbackSolventPerM2 = 0,
  fallbackPackagingPerM2 = 0
): RmTotals | null {
  if (!e) return null;

  const layerPerM2 =
    e.layerRmCostPerM2 ??
    e.layers?.reduce((sum, layer) => sum + (layer.costPerM2 ?? 0), 0) ??
    0;
  const solventPerM2 = e.solventMixCostPerM2 ?? fallbackSolventPerM2;
  const packagingPerM2 = e.packagingCostPerM2 ?? fallbackPackagingPerM2;
  const consumablesPerM2 = e.consumablesCostPerM2 ?? 0;
  const materialNoWastePerM2 =
    e.rmCostPerM2 ?? layerPerM2 + solventPerM2 + packagingPerM2 + consumablesPerM2;

  const materialNoWastePerKg = e.materialCostPerKg ?? 0;
  const wastePercentApplied = e.wastePercentApplied ?? 0;
  const totalRmPerKg =
    e.wasteAdjustedMaterialPerKg ??
    materialNoWastePerKg * (1 + wastePercentApplied / 100);

  // Prefer kg→m² via GSM so Total RM /m² matches Total RM /kg.
  const gsm = e.totalGsm ?? 0;
  const totalRmPerM2 =
    gsm > 0
      ? totalRmPerKg * (gsm / 1000)
      : materialNoWastePerM2 * (1 + wastePercentApplied / 100);

  const wastePerKg = Math.max(0, totalRmPerKg - materialNoWastePerKg);
  const wastePerM2 = Math.max(0, totalRmPerM2 - materialNoWastePerM2);

  return {
    materialNoWastePerKg,
    totalRmPerKg,
    materialNoWastePerM2,
    totalRmPerM2,
    wastePercentApplied,
    wastePerKg,
    wastePerM2,
  };
}
