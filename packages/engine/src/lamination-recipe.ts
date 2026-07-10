/**
 * Lamination adhesive recipes (MP / HP / SL / MONO) — plant sheet + PEBI component prices.
 * Master stores binder concentrate; EA priced at estimate from Solvent catalog.
 * Sheet "40% solid" on SB grades = diluted mix solids after EA; component solid% = concentrate TDS.
 */

export type LaminationTier = 'GP' | 'MP' | 'HP' | 'HP_SF' | 'SL' | 'MONO' | 'CUSTOM';

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
  /** Optional replacement chemistry (same ES grade; not default for costing). */
  alternate?: {
    label: string;
    components: LaminationRecipeComponent[];
  };
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

/** Plant sheet slot 4 — MORBOND 675A/675C (foil / dry). GP kept as alias of MP for legacy. */
const RECIPE_MP_FOIL: LaminationRecipe = {
  tier: 'MP',
  components: [
    { role: 'adhesive', name: 'MORBOND 675 A', parts: 100, solidPercent: 75, pricePerKgUsd: 3.33 },
    { role: 'hardener', name: 'MORBOND 675C', parts: 25, solidPercent: 75, pricePerKgUsd: 3.33 },
    {
      role: 'solvent',
      name: 'Ethyl Acetate',
      parts: 108,
      solidPercent: 0,
      solventKey: 'solvent-ethyl-acetate',
      pricePerKgUsd: 1.0,
    },
  ],
  alternate: {
    label: 'Flexcote 1152',
    components: [
      { role: 'adhesive', name: 'FLEXCOTE 1152', parts: 100, solidPercent: 70, pricePerKgUsd: 3.26 },
      { role: 'hardener', name: 'FLEXCOTE 9062LE', parts: 15, solidPercent: 100, pricePerKgUsd: 4.24 },
      {
        role: 'solvent',
        name: 'Ethyl Acetate',
        parts: 130,
        solidPercent: 0,
        solventKey: 'solvent-ethyl-acetate',
        pricePerKgUsd: 1.0,
      },
    ],
  },
};

/** Plant sheet slot 3 — MORBOND 655 + CT 85 (liquid / tomato). */
const RECIPE_HP_LIQUID: LaminationRecipe = {
  tier: 'HP',
  components: [
    { role: 'adhesive', name: 'MORBOND 655', parts: 100, solidPercent: 70, pricePerKgUsd: 3.81 },
    { role: 'hardener', name: 'CURATIVE CT 85', parts: 3, solidPercent: 100, pricePerKgUsd: 16.16 },
    {
      role: 'solvent',
      name: 'Ethyl Acetate',
      parts: 80,
      solidPercent: 0,
      solventKey: 'solvent-ethyl-acetate',
      pricePerKgUsd: 1.54,
    },
  ],
};

/** Plant sheet slot 1 — MORFREE MF 75-300 + C79. */
export const RECIPE_SL_DRY: LaminationRecipe = {
  tier: 'SL',
  components: [
    { role: 'adhesive', name: 'MORFREE 75-300', parts: 100, solidPercent: 100, pricePerKgUsd: 3.0 },
    { role: 'hardener', name: 'MORFREE C79', parts: 50, solidPercent: 100, pricePerKgUsd: 3.19 },
  ],
  alternate: {
    label: 'MORBOND 870',
    components: [
      { role: 'adhesive', name: 'MORBOND 870', parts: 100, solidPercent: 100, pricePerKgUsd: 3.48 },
      { role: 'hardener', name: 'CURATIVE CT 95', parts: 70, solidPercent: 100, pricePerKgUsd: 4.64 },
    ],
  },
};

/** Plant sheet slot 2 — MORFREE L75×850. */
export const RECIPE_MONO_PAPER: LaminationRecipe = {
  tier: 'MONO',
  components: [
    { role: 'adhesive', name: 'MORFREE L75×850', parts: 100, solidPercent: 100, pricePerKgUsd: 4.25 },
  ],
  alternate: {
    label: 'MORBOND 795 LV',
    components: [
      { role: 'adhesive', name: 'MORBOND 795 LV', parts: 100, solidPercent: 100, pricePerKgUsd: 8.0 },
    ],
  },
};

export const DEFAULT_LAMINATION_RECIPES: Record<'GP' | 'MP' | 'HP', LaminationRecipe> = {
  /** Legacy alias — same chemistry as MP foil (675). */
  GP: { ...RECIPE_MP_FOIL, tier: 'GP' },
  MP: RECIPE_MP_FOIL,
  HP: RECIPE_HP_LIQUID,
};

export function recipeForTier(tier: string | undefined | null): LaminationRecipe | null {
  if (tier === 'GP' || tier === 'MP' || tier === 'HP') {
    return structuredClone(DEFAULT_LAMINATION_RECIPES[tier]);
  }
  if (tier === 'SL') return structuredClone(RECIPE_SL_DRY);
  if (tier === 'MONO') return structuredClone(RECIPE_MONO_PAPER);
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
