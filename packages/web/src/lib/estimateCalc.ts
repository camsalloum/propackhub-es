import {
  calculateEstimate,
  derivePrintingWebClass,
  stackNeedsSolventMix,
  DEFAULT_CLEANING_SOLVENT_KG_PER_JOB,
  type Estimate,
  type Material,
  type LaminationRecipe,
  type WasteBand,
} from '@es/engine';
import { cormDisplayPerKgToEngineUsd } from './currency';

export interface ClientCalcMaterial {
  id: string;
  name: string;
  type: string;
  solidPercent: number;
  density: number | string;
  costPerKgUsd: number | string;
  wastePercent: number;
  isSolventBased?: boolean;
  laminationRecipe?: LaminationRecipe | null;
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
  markupPercent: number;
  platesPerKg: number;
  deliveryPerKg: number;
  slabs: Array<{ quantityKg: number; pricePerKg?: number }>;
  displayCurrency: string;
  exchangeRateUsdToDisplay: number;
  solventCostPerKgUsd?: number;
  laminationRecipeOverrides?: Record<string, LaminationRecipe>;
  cleaningSolventKgPerJob?: number;
  inkPrintingProcess?: 'flexo' | 'rotogravure' | null;
  inkSolventRatio?: number;
  orderQuantityKg?: number;
  /** Manufacturing & Operating method (tenant setting): process_per_kg | markup_over_rm | fixed_per_group. */
  operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  /** Per-template CoRM (display currency per kg) — only used when operatingCostMethod === 'fixed_per_group'. */
  cormPerKgUsd?: number | null;
  // Pricing model v2 — when pricingMethod is set, the engine uses waste bands +
  // lump-sum tooling/delivery + margin instead of the legacy additive model.
  pricingMethod?: 'markup' | 'margin_per_kg';
  marginValuePerKgUsd?: number;
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
    return 'substrate';
  };
  const density = typeof m.density === 'string' ? parseFloat(m.density) : m.density;
  const costPerKgUsd = typeof m.costPerKgUsd === 'string' ? parseFloat(m.costPerKgUsd) : m.costPerKgUsd;
  return {
    id: m.id,
    name: m.name,
    type: normalizeType(m.type),
    solidPercent: m.solidPercent,
    density,
    costPerKgUsd,
    wastePercent: m.wastePercent,
    isSolventBased: m.isSolventBased,
    laminationRecipe: m.laminationRecipe ?? null,
    laminationTier: m.laminationRecipe?.tier ?? null,
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
    },
    markupPercent: input.markupPercent,
    platesPerKg: input.platesPerKg,
    deliveryPerKg: input.deliveryPerKg,
    operatingCostMethod: input.operatingCostMethod ?? undefined,
    cormPerKgUsd:
      input.cormPerKgUsd != null
        ? cormDisplayPerKgToEngineUsd(input.cormPerKgUsd, input.exchangeRateUsdToDisplay)
        : undefined,
    processes: (input.processes || []).map((p, i) => ({
      id: p.id || `proc-${i}`,
      name: p.name,
      processKey: p.processKey ?? undefined,
      processQuantity: p.processQuantity ?? 1,
      costPerKgUsd: p.costPerKgUsd ?? 0,
      costPerHour: p.costPerHour ?? 0,
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
    laminationRecipeOverrides: input.laminationRecipeOverrides,
    cleaningSolventKgPerJob: input.cleaningSolventKgPerJob ?? DEFAULT_CLEANING_SOLVENT_KG_PER_JOB,
    inkPrintingProcess: input.inkPrintingProcess ?? undefined,
    inkSolventRatio: input.inkSolventRatio,
    pricingMethod: input.pricingMethod,
    marginValuePerKgUsd: input.marginValuePerKgUsd,
    toolingChargeUsd: input.toolingChargeUsd,
    toolingBilledToCustomer: input.toolingBilledToCustomer,
    deliveryTerm: input.deliveryTerm,
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
