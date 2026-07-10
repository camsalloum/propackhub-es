/**
 * Sleeve seaming solvent mix — THF + 1,3-Dioxolane (default 75 / 25).
 * Applied when a SLEEVE-family substrate is in the stack.
 */

export const DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM = 0.25;

export const SLEEVE_SEAMING_THF_KEY = 'solvent-thf';
export const SLEEVE_SEAMING_DIOXOLANE_KEY = 'solvent-dioxolane';
export const SLEEVE_SEAMING_MIX_KEY = 'solvent-sleeve-seaming';

export interface SeamingSolventRecipe {
  thfParts: number;
  dioxolaneParts: number;
}

/** Default plant mix for sleeve seaming solvent. */
export const DEFAULT_SEAMING_SOLVENT_RECIPE: SeamingSolventRecipe = {
  thfParts: 75,
  dioxolaneParts: 25,
};

export function resolveSeamingBlendPricePerKg(
  thfPricePerKg: number,
  dioxolanePricePerKg: number,
  recipe: SeamingSolventRecipe = DEFAULT_SEAMING_SOLVENT_RECIPE
): number {
  const thf = Number.isFinite(thfPricePerKg) && thfPricePerKg > 0 ? thfPricePerKg : 0;
  const diox =
    Number.isFinite(dioxolanePricePerKg) && dioxolanePricePerKg > 0
      ? dioxolanePricePerKg
      : thf;
  const parts = (recipe.thfParts || 0) + (recipe.dioxolaneParts || 0);
  if (parts <= 0) return thf || diox;
  return (recipe.thfParts * thf + recipe.dioxolaneParts * diox) / parts;
}

/**
 * Seaming solvent cost from coat weight (g/m²) and blend $/kg.
 * costPerM2 = gsm/1000 × $/kg; costPerKg = costPerM2 / totalGsm × 1000.
 */
export function calculateSeamingSolventCost(
  seamingGsm: number,
  blendPricePerKg: number,
  totalGsm: number
): { costPerM2: number; costPerKg: number } {
  if (!(seamingGsm > 0) || !(blendPricePerKg > 0) || !(totalGsm > 0)) {
    return { costPerM2: 0, costPerKg: 0 };
  }
  const costPerM2 = (seamingGsm / 1000) * blendPricePerKg;
  const costPerKg = (costPerM2 / totalGsm) * 1000;
  return { costPerM2, costPerKg };
}
