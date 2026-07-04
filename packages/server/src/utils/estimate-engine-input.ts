import {
  calculateEstimate,
  DEFAULT_CLEANING_SOLVENT_KG_PER_JOB,
  BAG_SUBTYPE_TO_CONFIGURATOR,
  type Estimate as EngineEstimate,
  type CalculationResult,
} from '@es/engine';
import type { materials, estimates, layers } from '../db/schema';
import { buildEngineMaterialMap } from './material-map';
import { resolveSolventCostPerKgUsd } from './resolve-solvent-cost';
import { displayToUsd } from './currency';

type EstimateRow = typeof estimates.$inferSelect;
type LayerRow = typeof layers.$inferSelect;
type MaterialRow = typeof materials.$inferSelect;
type ProcessRow = {
  id: string;
  name: string;
  processKey?: string | null;
  processQuantity?: number | null;
  costPerKgUsd?: string | null;
  costPerHour: string;
  speedBasis: string;
  speedValue: string;
  setupHours: string;
  enabled: boolean;
};
type SlabRow = { quantityKg: string; pricePerKg: string };

export function buildEngineEstimateFromRows(opts: {
  estimate: EstimateRow;
  tenantId: string;
  layers: LayerRow[];
  materials: MaterialRow[];
  processes: ProcessRow[];
  slabs: SlabRow[];
  layerPriceOverrides?: Map<string, number>;
  /** Manufacturing & Operating method (from tenant); defaults to markup_over_rm. */
  operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  /**
   * Fixed CoRM per kg already converted to **USD** by the caller
   * (`estimate-calculation.ts` converts from display-currency storage).
   */
  cormPerKgUsd?: number | null;
  /** Resolved {basis, multiplier} for the estimate's order-quantity unit (custom/tenant units). */
  orderQuantityUnitDef?: import('@es/engine').UnitDef;
}): { estimateForEngine: EngineEstimate; materialMap: Map<string, import('@es/engine').Material> } {
  const { estimate, tenantId, layers, materials, processes, slabs, layerPriceOverrides, operatingCostMethod, cormPerKgUsd, orderQuantityUnitDef } = opts;
  const materialMap = buildEngineMaterialMap(materials);
  const patchedMaterialMap = new Map(materialMap);
  // Engine math is USD. RM + freight lump sums are already USD; all other charges
  // are stored/edited in display currency and converted here.
  const fx = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;
  const toUsd = (display: number) => displayToUsd(display, fx);

  for (const layer of layers) {
    const override = layerPriceOverrides?.get(layer.materialId);
    if (override != null) {
      const base = materialMap.get(layer.materialId);
      if (base) {
        patchedMaterialMap.set(layer.id, { ...base, costPerKgUsd: override });
      }
    }
  }

  const estimateForEngine: EngineEstimate = {
    id: estimate.id,
    tenantId,
    customerId: estimate.customerId || undefined,
    jobName: estimate.jobName,
    status: estimate.status as EngineEstimate['status'],
    layers: layers.map((l) => ({
      id: l.id,
      materialId: layerPriceOverrides?.has(l.materialId) ? l.id : l.materialId,
      micron: parseFloat(l.micron),
      position: l.position ?? 0,
    })),
    dimensions: {
      productType: estimate.productType,
      printingWebClass: estimate.printingWebClass,
      ...(estimate.dimensions as object),
      // Resolve bag configurator type from productSubtype so the engine's
      // flat-sheet area model can run without a web/engine coupling.
      ...(estimate.productSubtype
        ? {
            productSubtype: estimate.productSubtype,
            bagSubtype: BAG_SUBTYPE_TO_CONFIGURATOR[estimate.productSubtype],
          }
        : {}),
    },
    markupPercent: parseFloat(estimate.markupPercent),
    platesPerKg: toUsd(parseFloat(estimate.platesPerKg)),
    deliveryPerKg: toUsd(parseFloat(estimate.deliveryPerKg)),
    // Pricing model v2 — present only when the estimate uses the new model.
    pricingMethod: (estimate.pricingMethod as 'markup' | 'margin_per_kg' | null) ?? undefined,
    marginValuePerKgUsd:
      estimate.marginValuePerKgUsd != null
        ? toUsd(parseFloat(estimate.marginValuePerKgUsd))
        : undefined,
    // Manufacturing & Operating method (tenant setting) — drives M&O in the price build-up.
    operatingCostMethod: operatingCostMethod ?? undefined,
    // Fixed CoRM already USD (caller converts from display-currency storage).
    cormPerKgUsd: cormPerKgUsd != null ? cormPerKgUsd : undefined,
    toolingChargeUsd:
      estimate.toolingChargeUsd != null ? toUsd(parseFloat(estimate.toolingChargeUsd)) : undefined,
    toolingBilledToCustomer: estimate.toolingBilledToCustomer ?? undefined,
    deliveryTerm: estimate.deliveryTerm ?? undefined,
    // Freight lump sum stays USD (Decision #22).
    deliveryChargeUsd:
      estimate.deliveryChargeUsd != null ? parseFloat(estimate.deliveryChargeUsd) : undefined,
    wasteBands: (estimate.wasteBands as import('@es/engine').WasteBand[] | null) ?? undefined,
    processes: processes.map((p) => ({
      id: p.id,
      name: p.name,
      processKey: p.processKey ?? undefined,
      processQuantity: p.processQuantity != null ? Number(p.processQuantity) : 1,
      costPerKgUsd: toUsd(p.costPerKgUsd != null ? parseFloat(p.costPerKgUsd) : 0),
      costPerHour: toUsd(parseFloat(p.costPerHour)),
      speedBasis: p.speedBasis as 'kg_per_hour' | 'm_per_min' | 'pcs_per_min',
      speedValue: parseFloat(p.speedValue),
      setupHours: parseFloat(p.setupHours),
      enabled: p.enabled,
    })),
    slabs: slabs.map((s) => ({
      quantityKg: parseFloat(s.quantityKg),
      pricePerKg: parseFloat(s.pricePerKg),
    })),
    displayCurrencyCode: estimate.displayCurrency,
    exchangeRateUsdToDisplay: parseFloat(estimate.exchangeRateUsdToDisplay),
    orderQuantityKg: estimate.orderQuantityKg
      ? parseFloat(estimate.orderQuantityKg)
      : slabs[0]?.quantityKg
        ? parseFloat(slabs[0].quantityKg)
        : 1000,
    // Unit the user entered orderQuantityKg in; engine converts to true kg.
    orderQuantityUnit: estimate.orderQuantityUnit ?? 'kgs',
    orderQuantityUnitDef,
    solventCostPerKgUsd: resolveSolventCostPerKgUsd(materials, {
      solventMaterialId: estimate.solventMaterialId,
      solventCostPerKgUsd: estimate.solventCostPerKgUsd
        ? parseFloat(estimate.solventCostPerKgUsd)
        : undefined,
    }),
    laminationRecipeOverrides:
      (estimate.laminationRecipeOverrides as EngineEstimate['laminationRecipeOverrides']) ?? undefined,
    cleaningSolventKgPerJob: estimate.cleaningSolventKgPerJob
      ? parseFloat(estimate.cleaningSolventKgPerJob)
      : DEFAULT_CLEANING_SOLVENT_KG_PER_JOB,
    inkPrintingProcess:
      (estimate.inkPrintingProcess as EngineEstimate['inkPrintingProcess']) ?? undefined,
    inkSolventRatio: estimate.solventRatio
      ? parseFloat(estimate.solventRatio)
      : undefined,
    createdAt: estimate.createdAt,
    updatedAt: estimate.updatedAt,
  };

  return { estimateForEngine, materialMap: patchedMaterialMap };
}

export function calculateEstimateFromRows(
  opts: Parameters<typeof buildEngineEstimateFromRows>[0]
): CalculationResult {
  const { estimateForEngine, materialMap } = buildEngineEstimateFromRows(opts);
  return calculateEstimate(estimateForEngine, materialMap);
}
