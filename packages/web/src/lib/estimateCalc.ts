import {
  calculateEstimate,
  derivePrintingWebClass,
  stackNeedsSolventMix,
  DEFAULT_CLEANING_SOLVENT_KG_PER_JOB,
  DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM,
  BAG_SUBTYPE_TO_CONFIGURATOR,
  type Estimate,
  type Material,
  type LaminationRecipe,
  type WasteBand,
} from '@es/engine';
import { displayToUsd } from './currency';

export interface ClientCalcMaterial {
  id: string;
  name: string;
  type: string;
  solidPercent: number;
  density: number | string;
  costPerKgUsd: number | string;
  wastePercent: number;
  isSolventBased?: boolean;
  substrateFamily?: string | null;
  platformMasterKey?: string | null;
  laminationRecipe?: LaminationRecipe | null;
  costPerMeterUsd?: number | string | null;
  costPerPieceUsd?: number | string | null;
  priceUnit?: string | null;
  unitPriceUsd?: number | string | null;
}

export interface ClientCalcProcess {
  id?: string;
  name: string;
  processKey?: string | null;
  processQuantity?: number;
  costPerKgUsd?: number;
  costPerHour?: number;
  speedBasis?: 'kg_per_hour' | 'm_per_min' | 'pcs_per_min';
  speedValue?: number;
  setupHours?: number;
  enabled: boolean;
}

export interface ClientCalcInput {
  layers: Array<{ id?: string; materialId: string; micron: number; position: number }>;
  materials: ClientCalcMaterial[];
  processes?: ClientCalcProcess[];
  productType: 'roll' | 'sleeve' | 'pouch' | 'bag';
  dimensions: Record<string, unknown>;
  /**
   * Estimate-level subtype code (e.g. pouch_tss_flat). Must be injected into
   * engine dimensions — same as server `buildEngineEstimateFromRows` — or pouch/bag
   * flat-sheet formulas never resolve and film falls back to understated face area.
   */
  productSubtype?: string | null;
  markupPercent: number;
  platesPerKg: number;
  deliveryPerKg: number;
  slabs: Array<{ quantityKg: number; pricePerKg?: number }>;
  displayCurrency: string;
  exchangeRateUsdToDisplay: number;
  solventCostPerKgUsd?: number;
  seamingSolventCostPerKgUsd?: number;
  laminationRecipeOverrides?: Record<string, LaminationRecipe>;
  cleaningSolventKgPerJob?: number;
  sleeveSeamingSolventGsm?: number;
  packagingConfig?: import('@es/engine').PackagingConfig;
  consumablesConfig?: import('@es/engine').ConsumablesConfig;
  inkPrintingProcess?: 'flexo' | 'rotogravure' | null;
  printColorCount?: number | null;
  inkSolventRatio?: number;
  orderQuantityKg?: number;
  /** Manufacturing & Operating method (tenant setting): process_per_kg | markup_over_rm | fixed_per_group. */
  operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  /** Base CoRM for print mode (display currency per kg) — fixed_per_group only. */
  cormPerKgUsd?: number | null;
  /** CoRM tracks waste % by this factor (default 1). */
  cormScaleWithWaste?: number;
  // Pricing model v2 — when pricingMethod is set, the engine uses waste bands +
  // lump-sum tooling/delivery + margin instead of the legacy additive model.
  pricingMethod?: 'markup' | 'margin_per_kg';
  /** Margin per kg in display currency (converted to USD at engine boundary). */
  marginValuePerKgUsd?: number;
  /** Tooling lump sum in display currency (converted to USD at engine boundary). Freight stays USD. */
  toolingChargeUsd?: number;
  toolingBilledToCustomer?: boolean;
  deliveryTerm?: string;
  deliveryChargeUsd?: number;
  /** Quantity-based waste bands; falls back to engine defaults when omitted. */
  wasteBands?: WasteBand[];
  /** Order-quantity unit code + its resolved {basis, multiplier} (for live preview parity with the server). */
  orderQuantityUnit?: string;
  orderQuantityUnitDef?: { basis: 'kg' | 'pieces' | 'sqm' | 'lm'; multiplier: number };
}

function toMaterial(m: ClientCalcMaterial): Material {
  const normalizeType = (t: string): Material['type'] => {
    const lower = (t || '').toLowerCase();
    if (lower === 'ink' || lower.includes('ink')) return 'ink';
    if (lower === 'adhesive' || lower.includes('adhesive')) return 'adhesive';
    if (lower === 'solvent') return 'solvent';
    if (lower === 'packaging' || lower.includes('packaging')) return 'packaging';
    return 'substrate';
  };
  const density = typeof m.density === 'string' ? parseFloat(m.density) : m.density;
  const costPerKgUsd = typeof m.costPerKgUsd === 'string' ? parseFloat(m.costPerKgUsd) : m.costPerKgUsd;
  const parseOpt = (v: number | string | null | undefined): number | null => {
    if (v == null || v === '') return null;
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: m.id,
    name: m.name,
    type: normalizeType(m.type),
    solidPercent: m.solidPercent,
    density,
    costPerKgUsd,
    wastePercent: m.wastePercent,
    isSolventBased: m.isSolventBased,
    substrateFamily: m.substrateFamily ?? null,
    platformMasterKey: m.platformMasterKey ?? null,
    laminationRecipe: m.laminationRecipe ?? null,
    laminationTier: m.laminationRecipe?.tier ?? null,
    costPerMeterUsd: parseOpt(m.costPerMeterUsd),
    costPerPieceUsd: parseOpt(m.costPerPieceUsd),
    priceUnit: m.priceUnit ?? null,
    unitPriceUsd: parseOpt(m.unitPriceUsd),
  };
}

export function runClientCalculation(input: ClientCalcInput) {
  const materialMap = new Map<string, Material>();
  for (const m of input.materials) {
    materialMap.set(m.id, toMaterial(m));
  }

  const orderQty = input.orderQuantityKg ?? input.slabs[0]?.quantityKg ?? 1000;
  const layerRefs = input.layers.filter((l) => l.materialId);
  const printingWebClass = derivePrintingWebClass(layerRefs, materialMap);
  const needsSolvent = stackNeedsSolventMix(layerRefs, materialMap);
  // Engine math is USD. RM + freight lump sums are already USD; other charges
  // are display currency and convert here (Decision #22).
  const fx = input.exchangeRateUsdToDisplay;
  const toUsd = (display: number) => displayToUsd(display, fx);

  const estimate: Estimate = {
    id: 'client-preview',
    tenantId: 'preview',
    jobName: 'preview',
    status: 'draft',
    layers: input.layers
      .filter((l) => l.materialId)
      .map((l, i) => ({
        id: l.id || `layer-${i}`,
        materialId: l.materialId,
        micron: l.micron,
        position: l.position ?? i,
      })),
    dimensions: {
      productType: input.productType,
      printingWebClass,
      ...input.dimensions,
      // Mirror server estimate-engine-input: productSubtype lives on the estimate
      // row, not in the numeric dimensions map. Without this, pouch/bag client
      // preview uses the legacy one-face fallback (~50% low for 2-web TSS).
      ...(input.productSubtype
        ? {
            productSubtype: input.productSubtype,
            bagSubtype: BAG_SUBTYPE_TO_CONFIGURATOR[input.productSubtype],
          }
        : {}),
    },
    markupPercent: input.markupPercent,
    platesPerKg: toUsd(input.platesPerKg),
    deliveryPerKg: toUsd(input.deliveryPerKg),
    operatingCostMethod: input.operatingCostMethod ?? undefined,
    cormPerKgUsd: input.cormPerKgUsd != null ? toUsd(input.cormPerKgUsd) : undefined,
    cormScaleWithWaste: input.cormScaleWithWaste,
    processes: (input.processes || []).map((p, i) => ({
      id: p.id || `proc-${i}`,
      name: p.name,
      processKey: p.processKey ?? undefined,
      processQuantity: p.processQuantity ?? 1,
      costPerKgUsd: toUsd(p.costPerKgUsd ?? 0),
      costPerHour: toUsd(p.costPerHour ?? 0),
      speedBasis: p.speedBasis ?? 'kg_per_hour',
      speedValue: p.speedValue ?? 0,
      setupHours: p.setupHours ?? 0,
      enabled: p.enabled,
    })),
    slabs: input.slabs.map((s) => ({
      quantityKg: s.quantityKg,
      pricePerKg: s.pricePerKg ?? 0,
    })),
    displayCurrencyCode: input.displayCurrency,
    exchangeRateUsdToDisplay: input.exchangeRateUsdToDisplay,
    orderQuantityKg: orderQty,
    orderQuantityUnit: input.orderQuantityUnit ?? 'kgs',
    orderQuantityUnitDef: input.orderQuantityUnitDef,
    solventCostPerKgUsd: needsSolvent ? input.solventCostPerKgUsd : undefined,
    seamingSolventCostPerKgUsd: input.seamingSolventCostPerKgUsd,
    laminationRecipeOverrides: input.laminationRecipeOverrides,
    cleaningSolventKgPerJob: input.cleaningSolventKgPerJob ?? DEFAULT_CLEANING_SOLVENT_KG_PER_JOB,
    sleeveSeamingSolventGsm: input.sleeveSeamingSolventGsm ?? DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM,
    packagingConfig: input.packagingConfig,
    consumablesConfig: input.consumablesConfig,
    inkPrintingProcess: input.inkPrintingProcess ?? undefined,
    printColorCount: input.printColorCount ?? undefined,
    inkSolventRatio: input.inkSolventRatio,
    pricingMethod: input.pricingMethod,
    marginValuePerKgUsd:
      input.marginValuePerKgUsd != null ? toUsd(input.marginValuePerKgUsd) : undefined,
    toolingChargeUsd: input.toolingChargeUsd != null ? toUsd(input.toolingChargeUsd) : undefined,
    toolingBilledToCustomer: input.toolingBilledToCustomer,
    deliveryTerm: input.deliveryTerm,
    // Freight lump sum stays USD.
    deliveryChargeUsd: input.deliveryChargeUsd,
    wasteBands: input.wasteBands,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return calculateEstimate(estimate, materialMap);
}

/** Effective margin % on sale price (PRD §7.3.1) */
export function effectiveMarginPercent(materialCost: number, markupPercent: number, salePrice: number): number {
  if (salePrice <= 0) return 0;
  const markupAmount = materialCost * (markupPercent / 100);
  return (markupAmount / salePrice) * 100;
}
