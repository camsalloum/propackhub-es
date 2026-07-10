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
import { stackHasSbInk, stackHasSleeveSubstrate, stackNeedsSolventMix } from './layer-stack';
import {
  calculateSeamingSolventCost,
  DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM,
} from './sleeve-seaming';

export interface SolventCostDetail {
  laminationCostPerM2: number;
  laminationCostPerKg: number;
  inkMakeupCostPerM2: number;
  inkMakeupCostPerKg: number;
  cleaningCostPerKg: number;
  cleaningCostPerM2: number;
  seamingCostPerM2: number;
  seamingCostPerKg: number;
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
 * Lamination EA (SB adhesive recipes) + ink makeup (SB ink only, flexo/roto ratio)
 * + cleaning (SB ink only) + sleeve seaming solvent (SLEEVE substrate).
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
    seamingCostPerM2: 0,
    seamingCostPerKg: 0,
    totalCostPerM2: 0,
    totalCostPerKg: 0,
    inkPrintingProcess: 'rotogravure',
    inkSolventRatio: 1,
  };

  const needsMix = stackNeedsSolventMix(estimate.layers, materials);
  const needsSeaming = stackHasSleeveSubstrate(estimate.layers, materials);
  if ((!needsMix && !needsSeaming) || totalGsm <= 0) {
    return empty;
  }

  const solventPrice = estimate.solventCostPerKgUsd ?? DEFAULT_SOLVENT_PRICE;
  const resolvePrice = (c: LaminationRecipeComponent) =>
    resolveSolventComponentPrice(c, estimate.solventCostPerKgUsd);

  let laminationCostPerM2 = 0;
  let inkMakeupCostPerM2 = 0;
  let inkMakeupCostPerKg = 0;
  let cleaningCostPerKg = 0;
  let inkPrintingProcess: ReturnType<typeof resolveInkPrintingProcess> = 'rotogravure';
  let inkSolventRatio = 1;

  if (needsMix) {
    layers.forEach((layer) => {
      const material = materials.get(layer.materialId);
      if (!material || material.type !== 'adhesive' || !material.isSolventBased) return;

      const recipe = layerRecipe(layer, material, estimate.laminationRecipeOverrides);
      if (!recipe) return;

      const dryGsm = layer.gsm ?? layer.micron;
      const result = calculateLaminationCost(dryGsm, recipe, resolvePrice);
      laminationCostPerM2 += result.eaCostPerM2;
    });

    inkSolventRatio = resolveInkSolventRatio(estimate, materials);
    inkPrintingProcess = resolveInkPrintingProcess(estimate, materials);
    const inkMakeup = calculateInkMakeupSolventCost(
      layers,
      materials,
      solventPrice,
      inkSolventRatio,
      totalGsm
    );
    inkMakeupCostPerM2 = inkMakeup.costPerM2;
    inkMakeupCostPerKg = inkMakeup.costPerKg;

    if (stackHasSbInk(estimate.layers, materials)) {
      const cleaningKg =
        estimate.cleaningSolventKgPerJob ?? DEFAULT_CLEANING_SOLVENT_KG_PER_JOB;
      const orderKg = estimate.orderQuantityKg ?? 1000;
      cleaningCostPerKg = cleaningSolventCostPerKg(cleaningKg, solventPrice, orderKg);
    }
  }

  const laminationCostPerKg = (laminationCostPerM2 / totalGsm) * 1000;
  const cleaningCostPerM2 = (cleaningCostPerKg * totalGsm) / 1000;

  let seamingCostPerM2 = 0;
  let seamingCostPerKg = 0;
  if (needsSeaming) {
    const seamingGsm =
      estimate.sleeveSeamingSolventGsm ?? DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM;
    const seamingPrice =
      estimate.seamingSolventCostPerKgUsd ?? solventPrice;
    const seaming = calculateSeamingSolventCost(seamingGsm, seamingPrice, totalGsm);
    seamingCostPerM2 = seaming.costPerM2;
    seamingCostPerKg = seaming.costPerKg;
  }

  const totalCostPerM2 =
    laminationCostPerM2 + inkMakeupCostPerM2 + cleaningCostPerM2 + seamingCostPerM2;
  const totalCostPerKg =
    laminationCostPerKg + inkMakeupCostPerKg + cleaningCostPerKg + seamingCostPerKg;

  return {
    laminationCostPerM2,
    laminationCostPerKg,
    inkMakeupCostPerM2,
    inkMakeupCostPerKg,
    cleaningCostPerKg,
    cleaningCostPerM2,
    seamingCostPerM2,
    seamingCostPerKg,
    totalCostPerM2,
    totalCostPerKg,
    inkPrintingProcess,
    inkSolventRatio,
  };
}
