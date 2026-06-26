import type { Estimate, Layer, Material } from './types';
import type { LaminationRecipe, LaminationRecipeComponent } from './lamination-recipe';
import {
  calculateLaminationCost,
  cleaningSolventCostPerKg,
  DEFAULT_CLEANING_SOLVENT_KG_PER_JOB,
} from './lamination-recipe';
import {
  calculateInkMakeupSolventCost,
  resolveInkPrintingProcess,
  resolveInkSolventRatio,
} from './ink-printing';
import { stackHasSbInk, stackNeedsSolventMix } from './layer-stack';

export interface SolventCostDetail {
  laminationCostPerM2: number;
  laminationCostPerKg: number;
  inkMakeupCostPerM2: number;
  inkMakeupCostPerKg: number;
  cleaningCostPerKg: number;
  cleaningCostPerM2: number;
  totalCostPerM2: number;
  totalCostPerKg: number;
  inkPrintingProcess: ReturnType<typeof resolveInkPrintingProcess>;
  inkSolventRatio: number;
}

const DEFAULT_SOLVENT_PRICE = 1.54;

export function resolveSolventComponentPrice(
  component: LaminationRecipeComponent,
  estimateSolventPrice?: number
): number {
  if (estimateSolventPrice != null && Number.isFinite(estimateSolventPrice)) {
    return estimateSolventPrice;
  }
  return component.pricePerKgUsd ?? DEFAULT_SOLVENT_PRICE;
}

function layerRecipe(
  layer: Layer,
  material: Material,
  overrides?: Record<string, LaminationRecipe>
): LaminationRecipe | null {
  const override = overrides?.[String(layer.id)];
  if (override?.components?.length) return override;
  return material.laminationRecipe ?? null;
}

/**
 * Lamination EA (SB adhesive recipes) + ink makeup (SB ink only, flexo/roto ratio) + cleaning (SB ink only).
 * UV ink layers: dry GSM in RM cost only — no makeup or cleaning solvent.
 */
export function calculateSolventCosts(
  estimate: Estimate,
  layers: Layer[],
  materials: Map<string, Material>,
  totalGsm: number
): SolventCostDetail {
  const empty: SolventCostDetail = {
    laminationCostPerM2: 0,
    laminationCostPerKg: 0,
    inkMakeupCostPerM2: 0,
    inkMakeupCostPerKg: 0,
    cleaningCostPerKg: 0,
    cleaningCostPerM2: 0,
    totalCostPerM2: 0,
    totalCostPerKg: 0,
    inkPrintingProcess: 'rotogravure',
    inkSolventRatio: 1,
  };

  if (!stackNeedsSolventMix(estimate.layers, materials) || totalGsm <= 0) {
    return empty;
  }

  const solventPrice = estimate.solventCostPerKgUsd ?? DEFAULT_SOLVENT_PRICE;
  const resolvePrice = (c: LaminationRecipeComponent) =>
    resolveSolventComponentPrice(c, estimate.solventCostPerKgUsd);

  let laminationCostPerM2 = 0;

  layers.forEach((layer) => {
    const material = materials.get(layer.materialId);
    if (!material || material.type !== 'adhesive' || !material.isSolventBased) return;

    const recipe = layerRecipe(layer, material, estimate.laminationRecipeOverrides);
    if (!recipe) return;

    const dryGsm = layer.gsm ?? layer.micron;
    const result = calculateLaminationCost(dryGsm, recipe, resolvePrice);
    laminationCostPerM2 += result.eaCostPerM2;
  });

  const laminationCostPerKg = (laminationCostPerM2 / totalGsm) * 1000;

  const inkSolventRatio = resolveInkSolventRatio(estimate, materials);
  const inkPrintingProcess = resolveInkPrintingProcess(estimate, materials);
  const inkMakeup = calculateInkMakeupSolventCost(
    layers,
    materials,
    solventPrice,
    inkSolventRatio,
    totalGsm
  );

  let cleaningCostPerKg = 0;
  if (stackHasSbInk(estimate.layers, materials)) {
    const cleaningKg =
      estimate.cleaningSolventKgPerJob ?? DEFAULT_CLEANING_SOLVENT_KG_PER_JOB;
    const orderKg = estimate.orderQuantityKg ?? 1000;
    cleaningCostPerKg = cleaningSolventCostPerKg(cleaningKg, solventPrice, orderKg);
  }

  const cleaningCostPerM2 = (cleaningCostPerKg * totalGsm) / 1000;
  const totalCostPerM2 =
    laminationCostPerM2 + inkMakeup.costPerM2 + cleaningCostPerM2;
  const totalCostPerKg =
    laminationCostPerKg + inkMakeup.costPerKg + cleaningCostPerKg;

  return {
    laminationCostPerM2,
    laminationCostPerKg,
    inkMakeupCostPerM2: inkMakeup.costPerM2,
    inkMakeupCostPerKg: inkMakeup.costPerKg,
    cleaningCostPerKg,
    cleaningCostPerM2,
    totalCostPerM2,
    totalCostPerKg,
    inkPrintingProcess,
    inkSolventRatio,
  };
}
