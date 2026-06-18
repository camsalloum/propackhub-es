import { calculateEstimate, type Estimate, type Material } from '@es/engine';

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

export interface ClientCalcInput {
  layers: Array<{ id?: string; materialId: string; micron: number; position: number }>;
  materials: ClientCalcMaterial[];
  productType: 'roll' | 'sleeve' | 'pouch';
  printingWebClass: 'wide_web' | 'narrow_web';
  dimensions: Record<string, number | undefined>;
  markupPercent: number;
  platesPerKg: number;
  deliveryPerKg: number;
  slabs: Array<{ quantityKg: number; pricePerKg?: number }>;
  displayCurrency: string;
  exchangeRateUsdToDisplay: number;
  solventCostPerKgUsd?: number;
  solventRatio?: number;
}

function toMaterial(m: ClientCalcMaterial): Material {
  return {
    id: m.id,
    name: m.name,
    type: m.type as Material['type'],
    solidPercent: m.solidPercent,
    density: typeof m.density === 'string' ? parseFloat(m.density) : m.density,
    costPerKgUsd: typeof m.costPerKgUsd === 'string' ? parseFloat(m.costPerKgUsd) : m.costPerKgUsd,
    wastePercent: m.wastePercent,
    isSolventBased: m.isSolventBased,
  };
}

export function runClientCalculation(input: ClientCalcInput) {
  const materialMap = new Map<string, Material>();
  for (const m of input.materials) {
    materialMap.set(m.id, toMaterial(m));
  }

  const orderQty = input.slabs[0]?.quantityKg ?? 1000;
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
      printingWebClass: input.printingWebClass,
      ...input.dimensions,
    },
    markupPercent: input.markupPercent,
    platesPerKg: input.platesPerKg,
    deliveryPerKg: input.deliveryPerKg,
    processes: [],
    slabs: input.slabs.map((s) => ({
      quantityKg: s.quantityKg,
      pricePerKg: s.pricePerKg ?? 0,
    })),
    displayCurrencyCode: input.displayCurrency,
    exchangeRateUsdToDisplay: input.exchangeRateUsdToDisplay,
    orderQuantityKg: orderQty,
    solventCostPerKgUsd:
      input.printingWebClass === 'wide_web' ? input.solventCostPerKgUsd : undefined,
    solventRatio: input.printingWebClass === 'wide_web' ? input.solventRatio : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return calculateEstimate(estimate, materialMap);
}
