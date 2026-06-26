/**
 * Lamination adhesive recipes (GP / MP / HP) — parts-by-weight dilution with EA.
 * Master stores binder concentrate; EA priced at estimate from Solvent catalog.
 */

export type LaminationTier = 'GP' | 'MP' | 'HP' | 'HP_SF' | 'CUSTOM';

export type LaminationComponentRole = 'adhesive' | 'hardener' | 'solvent' | 'other';

export interface LaminationRecipeComponent {
  role: LaminationComponentRole;
  name: string;
  parts: number;
  solidPercent: number;
  /** Binder price in USD/kg wet; solvent row may omit (resolved at estimate). */
  pricePerKgUsd?: number;
  /** Links to platform master solvent key, e.g. solvent-ethyl-acetate */
  solventKey?: string;
}

export interface LaminationRecipe {
  tier: LaminationTier;
  components: LaminationRecipeComponent[];
}

export interface LaminationCostResult {
  dryGsm: number;
  mixSolidFraction: number;
  wetGsm: number;
  eaGsm: number;
  binderCostPerM2: number;
  eaCostPerM2: number;
  totalCostPerM2: number;
  usdPerKgSolid: number;
  usdPerKgWet: number;
  usdPer1000SqmAtDryGsm: number;
}

export const DEFAULT_CLEANING_SOLVENT_KG_PER_JOB = 20;

export const DEFAULT_LAMINATION_RECIPES: Record<'GP' | 'MP' | 'HP', LaminationRecipe> = {
  GP: {
    tier: 'GP',
    components: [
      { role: 'adhesive', name: 'MORBOND 675 ADHESIVE', parts: 100, solidPercent: 75, pricePerKgUsd: 3.27 },
      { role: 'hardener', name: 'CURATIVE 675C HARDENER', parts: 20, solidPercent: 75, pricePerKgUsd: 3.27 },
      {
        role: 'solvent',
        name: 'Ethyl Acetate',
        parts: 137,
        solidPercent: 0,
        solventKey: 'solvent-ethyl-acetate',
        pricePerKgUsd: 1.0,
      },
    ],
  },
  MP: {
    tier: 'MP',
    components: [
      { role: 'adhesive', name: 'ECOLAD SB-982', parts: 100, solidPercent: 70, pricePerKgUsd: 3.47 },
      { role: 'hardener', name: 'ECOLAD SB-529', parts: 3.2, solidPercent: 100, pricePerKgUsd: 3.47 },
      {
        role: 'solvent',
        name: 'Ethyl Acetate',
        parts: 106,
        solidPercent: 0,
        solventKey: 'solvent-ethyl-acetate',
        pricePerKgUsd: 1.0,
      },
    ],
  },
  HP: {
    tier: 'HP',
    components: [
      { role: 'adhesive', name: 'MORBOND 655 ADHESIVE', parts: 100, solidPercent: 70, pricePerKgUsd: 3.81 },
      { role: 'hardener', name: 'CURATIVE CT 85 HARDENER', parts: 3, solidPercent: 100, pricePerKgUsd: 16.19 },
      {
        role: 'solvent',
        name: 'Ethyl Acetate',
        parts: 106,
        solidPercent: 0,
        solventKey: 'solvent-ethyl-acetate',
        pricePerKgUsd: 1.54,
      },
    ],
  },
};

export function recipeForTier(tier: string | undefined | null): LaminationRecipe | null {
  if (tier === 'GP' || tier === 'MP' || tier === 'HP') {
    return structuredClone(DEFAULT_LAMINATION_RECIPES[tier]);
  }
  return null;
}

export function binderComponents(recipe: LaminationRecipe): LaminationRecipeComponent[] {
  return recipe.components.filter((c) => c.role !== 'solvent');
}

export function solventComponents(recipe: LaminationRecipe): LaminationRecipeComponent[] {
  return recipe.components.filter((c) => c.role === 'solvent');
}

/** Concentrate stats (binder only — no EA) for master material row. */
export function deriveBinderConcentrateStats(recipe: LaminationRecipe): {
  solidPercent: number;
  costPerKgUsd: number;
  liquidCostUsd: number;
} {
  const binder = binderComponents(recipe);
  const totalParts = binder.reduce((s, c) => s + c.parts, 0);
  const totalSolids = binder.reduce((s, c) => s + c.parts * (c.solidPercent / 100), 0);
  const totalCost = binder.reduce((s, c) => s + c.parts * (c.pricePerKgUsd ?? 0), 0);
  if (totalParts <= 0 || totalSolids <= 0) {
    return { solidPercent: 100, costPerKgUsd: 0, liquidCostUsd: 0 };
  }
  return {
    solidPercent: (totalSolids / totalParts) * 100,
    costPerKgUsd: totalCost / totalSolids,
    liquidCostUsd: totalCost / totalParts,
  };
}

export function summarizeRecipe(
  recipe: LaminationRecipe,
  resolveSolventPrice: (c: LaminationRecipeComponent) => number,
  previewDryGsm = 3
): {
  totalParts: number;
  totalSolids: number;
  mixSolidPercent: number;
  usdPerKgWet: number;
  usdPerKgSolid: number;
  usdPer1000Sqm: number;
} {
  const totalParts = recipe.components.reduce((s, c) => s + c.parts, 0);
  const totalSolids = recipe.components.reduce(
    (s, c) => s + c.parts * (c.solidPercent / 100),
    0
  );
  const totalCost = recipe.components.reduce((s, c) => {
    const price = c.role === 'solvent' ? resolveSolventPrice(c) : (c.pricePerKgUsd ?? 0);
    return s + c.parts * price;
  }, 0);
  const mixSolidPercent = totalParts > 0 ? (totalSolids / totalParts) * 100 : 0;
  const usdPerKgWet = totalParts > 0 ? totalCost / totalParts : 0;
  const usdPerKgSolid = totalSolids > 0 ? totalCost / totalSolids : 0;
  const preview = calculateLaminationCost(previewDryGsm, recipe, resolveSolventPrice);
  return {
    totalParts,
    totalSolids,
    mixSolidPercent,
    usdPerKgWet,
    usdPerKgSolid,
    usdPer1000Sqm: preview.usdPer1000SqmAtDryGsm,
  };
}

/**
 * Cost dry gsm deposit using full recipe (binder layer cost + EA line returned separately).
 */
export function calculateLaminationCost(
  dryGsm: number,
  recipe: LaminationRecipe,
  resolveSolventPrice: (c: LaminationRecipeComponent) => number
): LaminationCostResult {
  if (dryGsm <= 0 || recipe.components.length === 0) {
    return {
      dryGsm: 0,
      mixSolidFraction: 0,
      wetGsm: 0,
      eaGsm: 0,
      binderCostPerM2: 0,
      eaCostPerM2: 0,
      totalCostPerM2: 0,
      usdPerKgSolid: 0,
      usdPerKgWet: 0,
      usdPer1000SqmAtDryGsm: 0,
    };
  }

  const totalParts = recipe.components.reduce((s, c) => s + c.parts, 0);
  const totalSolids = recipe.components.reduce(
    (s, c) => s + c.parts * (c.solidPercent / 100),
    0
  );
  const totalCost = recipe.components.reduce((s, c) => {
    const price = c.role === 'solvent' ? resolveSolventPrice(c) : (c.pricePerKgUsd ?? 0);
    return s + c.parts * price;
  }, 0);

  const mixSolidFraction = totalSolids / totalParts;
  const wetGsm = dryGsm / mixSolidFraction;
  const eaParts = solventComponents(recipe).reduce((s, c) => s + c.parts, 0);
  const eaGsm = wetGsm * (eaParts / totalParts);

  const usdPerKgSolid = totalCost / totalSolids;
  const usdPerKgWet = totalCost / totalParts;
  const totalCostPerM2 = (dryGsm / 1000) * usdPerKgSolid;

  const binder = binderComponents(recipe);
  const binderSolids = binder.reduce((s, c) => s + c.parts * (c.solidPercent / 100), 0);
  const binderCost = binder.reduce((s, c) => s + c.parts * (c.pricePerKgUsd ?? 0), 0);
  const binderSolidPrice = binderSolids > 0 ? binderCost / binderSolids : 0;
  const binderCostPerM2 = (dryGsm / 1000) * binderSolidPrice;

  const eaPrice =
    solventComponents(recipe).length > 0
      ? resolveSolventPrice(solventComponents(recipe)[0]!)
      : 0;
  const eaCostPerM2 = (eaGsm / 1000) * eaPrice;

  return {
    dryGsm,
    mixSolidFraction,
    wetGsm,
    eaGsm,
    binderCostPerM2,
    eaCostPerM2,
    totalCostPerM2,
    usdPerKgSolid,
    usdPerKgWet,
    usdPer1000SqmAtDryGsm: totalCostPerM2 * 1000,
  };
}

export function cleaningSolventCostPerKg(
  cleaningKgPerJob: number,
  solventPricePerKg: number,
  orderQuantityKg: number
): number {
  if (orderQuantityKg <= 0 || cleaningKgPerJob <= 0) return 0;
  return (cleaningKgPerJob * solventPricePerKg) / orderQuantityKg;
}
