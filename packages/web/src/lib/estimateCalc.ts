import {
  calculateEstimate,
  derivePrintingWebClass,
  stackNeedsSolventMix,
  type Estimate,
  type Material,
} from '@es/engine';

export interface ClientCalcMaterial {
  id: string;
  name: string;
  type: string;
  solidPercent: number;
  density: number | string;
  costPerKgUsd: number | string;
  wastePercent: number;
  isSolventBased?: boolean;
}

export interface ClientCalcProcess {
  id?: string;
  name: string;
  costPerHour: number;
  speedBasis: 'kg_per_hour' | 'm_per_min' | 'pcs_per_min';
  speedValue: number;
  setupHours: number;
  enabled: boolean;
}

export interface ClientCalcInput {
  layers: Array<{ id?: string; materialId: string; micron: number; position: number }>;
  materials: ClientCalcMaterial[];
  processes?: ClientCalcProcess[];
  productType: 'roll' | 'sleeve' | 'pouch';
  dimensions: Record<string, number | undefined>;
  markupPercent: number;
  platesPerKg: number;
  deliveryPerKg: number;
  slabs: Array<{ quantityKg: number; pricePerKg?: number }>;
  displayCurrency: string;
  exchangeRateUsdToDisplay: number;
  solventCostPerKgUsd?: number;
  solventRatio?: number;
  orderQuantityKg?: number;
}

function toMaterial(m: ClientCalcMaterial): Material {
  // Normalize type — guard against unexpected casing or aliases
  const normalizeType = (t: string): Material['type'] => {
    const lower = (t || '').toLowerCase();
    if (lower === 'ink' || lower.includes('ink')) return 'ink';
    if (lower === 'adhesive' || lower.includes('adhesive')) return 'adhesive';
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
    processes: (input.processes || []).map((p, i) => ({
      id: p.id || `proc-${i}`,
      name: p.name,
      costPerHour: p.costPerHour,
      speedBasis: p.speedBasis,
      speedValue: p.speedValue,
      setupHours: p.setupHours,
      enabled: p.enabled,
    })),
    slabs: input.slabs.map((s) => ({
      quantityKg: s.quantityKg,
      pricePerKg: s.pricePerKg ?? 0,
    })),
    displayCurrencyCode: input.displayCurrency,
    exchangeRateUsdToDisplay: input.exchangeRateUsdToDisplay,
    orderQuantityKg: orderQty,
    solventCostPerKgUsd: needsSolvent ? input.solventCostPerKgUsd : undefined,
    solventRatio: needsSolvent ? input.solventRatio : undefined,
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
