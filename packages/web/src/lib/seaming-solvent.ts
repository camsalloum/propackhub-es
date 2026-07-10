import {
  DEFAULT_SEAMING_SOLVENT_RECIPE,
  resolveSeamingBlendPricePerKg,
  SLEEVE_SEAMING_DIOXOLANE_KEY,
  SLEEVE_SEAMING_THF_KEY,
} from '@es/engine';

type SeamingMaterialLike = {
  costPerKgUsd: string | number;
  platformMasterKey?: string | null;
  name?: string | null;
  type?: string | null;
};

function priceOf(m: SeamingMaterialLike | undefined): number {
  if (!m) return 0;
  const n = Number(m.costPerKgUsd);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Blend $/kg from THF + 1,3-Dioxolane catalog rows (default 75/25). */
export function resolveSeamingSolventCostPerKgUsd(
  materials: SeamingMaterialLike[]
): number {
  const solvents = materials.filter((m) => m.type === 'solvent');
  const thf = solvents.find(
    (m) =>
      m.platformMasterKey === SLEEVE_SEAMING_THF_KEY ||
      /tetrahydrofuran|\bthf\b/i.test(m.name ?? '')
  );
  const diox = solvents.find(
    (m) =>
      m.platformMasterKey === SLEEVE_SEAMING_DIOXOLANE_KEY ||
      /dioxolane/i.test(m.name ?? '')
  );
  const thfPrice = priceOf(thf);
  const dioxPrice = priceOf(diox) || thfPrice;
  return resolveSeamingBlendPricePerKg(thfPrice, dioxPrice, DEFAULT_SEAMING_SOLVENT_RECIPE);
}
