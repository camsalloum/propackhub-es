import {
  effectiveCormPerKg,
  DEFAULT_CORM_SCALE_WITH_WASTE,
  wastePercentForQuantity,
  type WasteBand,
} from '@es/engine';
import { displayToUsd, usdToDisplayPrecise } from './currency';

export type PriceListUnit = 'kg' | 'm2' | 'lm' | 'roll' | 'pc' | 'kpcs';
export type SlabMode = 'predefined' | 'custom';

export const UNIT_LABELS: Record<PriceListUnit, string> = {
  kg: 'kg',
  m2: 'm²',
  lm: 'LM',
  roll: 'roll',
  pc: 'pc',
  kpcs: 'Kpcs',
};

const UNIT_QTY_DECIMALS: Record<PriceListUnit, number> = {
  kg: 0,
  m2: 0,
  lm: 0,
  roll: 0,
  pc: 0,
  kpcs: 1,
};

export type PriceListPricingInput = {
  wasteBands: WasteBand[];
  materialPerKgUsd: number;
  logisticsPerKgUsd: number;
  developmentPerKgUsd: number;
  accessoryPerKgUsd: number;
  pricingMethod: 'markup' | 'margin_per_kg';
  markupPercent: number;
  marginValuePerKgDisplay: number;
  estimateFxRate: number;
  totalGsm: number;
  piecesPerKg: number | null;
  lmPerKgReel: number | null;
  reelWidthMm: number;
  rollLengthLm: number;
  operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  baseCormDisplay?: number;
  cormScaleWithWaste?: number;
  moqKg?: number | null;
};

export type PriceListRowComputed = {
  bandKey: string;
  slab: string;
  meters: string | null;
  price: string;
  priceNum: number | null;
};

export type CustomSlabPriceRow = PriceListRowComputed & {
  quantityKg: number | null;
  wastePercent: number;
  belowMoq: boolean;
};

type UnitConversionInput = Pick<
  PriceListPricingInput,
  'totalGsm' | 'piecesPerKg' | 'lmPerKgReel' | 'reelWidthMm' | 'rollLengthLm'
>;

export function bandKey(band: WasteBand): string {
  return `${band.minKg}:${band.maxKg ?? 'open'}`;
}

export function bandRangeKg(band: WasteBand): string {
  return band.maxKg == null
    ? `${band.minKg.toLocaleString()}+ kg`
    : `${band.minKg.toLocaleString()} – ${band.maxKg.toLocaleString()} kg`;
}

function formatQty(n: number, decimals: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function smartPriceDecimals(n: number): { minDp: number; maxDp: number } {
  const abs = Math.abs(n);
  if (abs >= 100) return { minDp: 2, maxDp: 2 };
  if (abs >= 1) return { minDp: 2, maxDp: 2 };
  if (abs >= 0.1) return { minDp: 2, maxDp: 3 };
  if (abs >= 0.01) return { minDp: 2, maxDp: 4 };
  if (abs >= 0.001) return { minDp: 3, maxDp: 5 };
  return { minDp: 4, maxDp: 6 };
}

export function formatSmartPrice(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const { minDp, maxDp } = smartPriceDecimals(n);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: minDp,
    maximumFractionDigits: maxDp,
  });
}

export function smartPriceShownDecimals(n: number): number {
  const { minDp, maxDp } = smartPriceDecimals(n);
  const fixed = Math.abs(n).toFixed(maxDp);
  const frac = fixed.split('.')[1] ?? '';
  const trimmed = frac.replace(/0+$/, '');
  return Math.max(minDp, trimmed.length);
}

export function themeArgb(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  const parts = raw.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if (parts.length < 3) return fallback;
  const hex = parts
    .slice(0, 3)
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `FF${hex}`;
}

export function activeWasteBands(wasteBands: WasteBand[], moqKg?: number | null): WasteBand[] {
  const moq = moqKg != null && moqKg > 0 ? moqKg : 0;
  if (moq <= 0) return wasteBands;
  return wasteBands
    .filter((b) => b.maxKg == null || b.maxKg >= moq)
    .map((b) => ({
      ...b,
      minKg: Math.max(b.minKg, moq),
    }));
}

export function unionWasteBands(contexts: Array<{ wasteBands: WasteBand[] }>): WasteBand[] {
  const map = new Map<string, WasteBand>();
  for (const ctx of contexts) {
    for (const band of ctx.wasteBands) {
      const key = bandKey(band);
      if (!map.has(key)) map.set(key, band);
    }
  }
  return [...map.values()].sort((a, b) => a.minKg - b.minKg);
}

export function findMatchingBand(
  wasteBands: WasteBand[],
  template: WasteBand
): WasteBand | undefined {
  const key = bandKey(template);
  return wasteBands.find((b) => bandKey(b) === key);
}

export function customSlabKey(qty: number): string {
  return `custom:${qty}`;
}

export function formatCustomSlabQty(qty: number, unit: PriceListUnit): string {
  return formatQty(qty, UNIT_QTY_DECIMALS[unit]);
}

export function kgToUnit(kg: number, u: PriceListUnit, input: UnitConversionInput): number | null {
  switch (u) {
    case 'kg':
      return kg;
    case 'm2':
      return input.totalGsm > 0 ? kg * (1000 / input.totalGsm) : null;
    case 'lm': {
      if (input.lmPerKgReel != null && input.lmPerKgReel > 0) return kg * input.lmPerKgReel;
      const widthM = input.reelWidthMm / 1000;
      if (input.totalGsm > 0 && widthM > 0) return kg * (1000 / input.totalGsm) * widthM;
      return null;
    }
    case 'roll': {
      if (input.rollLengthLm <= 0) return null;
      const lm =
        input.lmPerKgReel != null && input.lmPerKgReel > 0
          ? kg * input.lmPerKgReel
          : input.totalGsm > 0 && input.reelWidthMm > 0
            ? kg * (1000 / input.totalGsm) * (input.reelWidthMm / 1000)
            : null;
      return lm != null ? lm / input.rollLengthLm : null;
    }
    case 'pc':
      return input.piecesPerKg != null && input.piecesPerKg > 0 ? kg * input.piecesPerKg : null;
    case 'kpcs':
      return input.piecesPerKg != null && input.piecesPerKg > 0
        ? (kg * input.piecesPerKg) / 1000
        : null;
    default:
      return null;
  }
}

/** Inverse of kgToUnit — converts a quantity in the selected unit to true kg. */
export function unitToKg(qty: number, u: PriceListUnit, input: UnitConversionInput): number | null {
  if (!Number.isFinite(qty) || qty <= 0) return null;
  switch (u) {
    case 'kg':
      return qty;
    case 'm2':
      return input.totalGsm > 0 ? qty * (input.totalGsm / 1000) : null;
    case 'lm': {
      if (input.lmPerKgReel != null && input.lmPerKgReel > 0) return qty / input.lmPerKgReel;
      const widthM = input.reelWidthMm / 1000;
      if (input.totalGsm > 0 && widthM > 0) return qty * (input.totalGsm / 1000) / widthM;
      return null;
    }
    case 'roll': {
      if (input.rollLengthLm <= 0) return null;
      const lm = qty * input.rollLengthLm;
      if (input.lmPerKgReel != null && input.lmPerKgReel > 0) return lm / input.lmPerKgReel;
      const widthM = input.reelWidthMm / 1000;
      if (input.totalGsm > 0 && widthM > 0) return lm * (input.totalGsm / 1000) / widthM;
      return null;
    }
    case 'pc':
      return input.piecesPerKg != null && input.piecesPerKg > 0 ? qty / input.piecesPerKg : null;
    case 'kpcs':
      return input.piecesPerKg != null && input.piecesPerKg > 0
        ? (qty * 1000) / input.piecesPerKg
        : null;
    default:
      return null;
  }
}

function priceUsdPerKgForBand(input: PriceListPricingInput, band: WasteBand): number {
  const wasteAdj = input.materialPerKgUsd * (1 + band.wastePercent / 100);
  const baseCormUsd = displayToUsd(input.baseCormDisplay ?? 0, input.estimateFxRate);
  const cormScale = input.cormScaleWithWaste ?? DEFAULT_CORM_SCALE_WITH_WASTE;
  const cormUsd =
    input.operatingCostMethod === 'fixed_per_group'
      ? effectiveCormPerKg(baseCormUsd, band.wastePercent, cormScale)
      : 0;
  const costBase =
    wasteAdj +
    input.logisticsPerKgUsd +
    input.developmentPerKgUsd +
    input.accessoryPerKgUsd +
    cormUsd;
  const marginUsd =
    input.operatingCostMethod === 'fixed_per_group'
      ? 0
      : input.pricingMethod === 'margin_per_kg'
        ? displayToUsd(input.marginValuePerKgDisplay, input.estimateFxRate)
        : costBase * (input.markupPercent / 100);
  return costBase + marginUsd;
}

function priceUsdInUnit(
  priceUsdPerKg: number,
  u: PriceListUnit,
  input: Pick<
    PriceListPricingInput,
    'totalGsm' | 'piecesPerKg' | 'lmPerKgReel' | 'reelWidthMm' | 'rollLengthLm'
  >
): number | null {
  switch (u) {
    case 'kg':
      return priceUsdPerKg;
    case 'm2':
      return input.totalGsm > 0 ? priceUsdPerKg * (input.totalGsm / 1000) : null;
    case 'lm': {
      if (input.lmPerKgReel != null && input.lmPerKgReel > 0) return priceUsdPerKg / input.lmPerKgReel;
      const widthM = input.reelWidthMm / 1000;
      if (input.totalGsm > 0 && widthM > 0) return priceUsdPerKg * (input.totalGsm / 1000) * widthM;
      return null;
    }
    case 'roll': {
      if (input.rollLengthLm <= 0) return null;
      const perLm =
        input.lmPerKgReel != null && input.lmPerKgReel > 0
          ? priceUsdPerKg / input.lmPerKgReel
          : input.totalGsm > 0 && input.reelWidthMm > 0
            ? priceUsdPerKg * (input.totalGsm / 1000) * (input.reelWidthMm / 1000)
            : null;
      return perLm != null ? perLm * input.rollLengthLm : null;
    }
    case 'pc':
      return input.piecesPerKg != null && input.piecesPerKg > 0 ? priceUsdPerKg / input.piecesPerKg : null;
    case 'kpcs':
      return input.piecesPerKg != null && input.piecesPerKg > 0
        ? (priceUsdPerKg / input.piecesPerKg) * 1000
        : null;
    default:
      return null;
  }
}

function formatBandRange(band: WasteBand, u: PriceListUnit, input: UnitConversionInput): string {
  const qtyDecimals = UNIT_QTY_DECIMALS[u];
  const minU = kgToUnit(band.minKg, u, input);
  const maxU = band.maxKg == null ? null : kgToUnit(band.maxKg, u, input);
  if (minU == null) {
    return band.maxKg == null
      ? `${band.minKg.toLocaleString()}+`
      : `${band.minKg.toLocaleString()} – ${band.maxKg.toLocaleString()}`;
  }
  if (maxU == null) return `${formatQty(minU, qtyDecimals)}+`;
  return `${formatQty(minU, qtyDecimals)} – ${formatQty(maxU, qtyDecimals)}`;
}

export function isQuantityBelowMoq(
  quantityKg: number | null,
  moqKg?: number | null
): boolean {
  if (quantityKg == null || moqKg == null || moqKg <= 0) return false;
  return quantityKg < moqKg;
}

function formatMetersRange(band: WasteBand, input: UnitConversionInput): string | null {
  if (input.rollLengthLm <= 0) return null;
  const minRolls = kgToUnit(band.minKg, 'roll', input);
  const maxRolls = band.maxKg == null ? null : kgToUnit(band.maxKg, 'roll', input);
  if (minRolls == null) return null;
  const minM = minRolls * input.rollLengthLm;
  if (maxRolls == null) return `${formatQty(minM, 0)}+`;
  return `${formatQty(minM, 0)} – ${formatQty(maxRolls * input.rollLengthLm, 0)}`;
}

export function buildCustomSlabPrice(
  input: PriceListPricingInput,
  qtyInUnit: number,
  unit: PriceListUnit,
  currency: string
): CustomSlabPriceRow {
  const quantityKg = unitToKg(qtyInUnit, unit, input);
  const bands = activeWasteBands(input.wasteBands, input.moqKg);
  const wastePercent =
    quantityKg == null ? 0 : wastePercentForQuantity(quantityKg, bands);
  const band: WasteBand = {
    minKg: quantityKg ?? 0,
    maxKg: quantityKg ?? 0,
    wastePercent,
  };
  const fxForCurrency = currency === 'USD' ? 1 : input.estimateFxRate;
  const priceUsd =
    quantityKg == null ? null : priceUsdInUnit(priceUsdPerKgForBand(input, band), unit, input);
  const priceNum = priceUsd == null ? null : usdToDisplayPrecise(priceUsd, fxForCurrency);
  const belowMoq = isQuantityBelowMoq(quantityKg, input.moqKg);
  return {
    bandKey: customSlabKey(qtyInUnit),
    slab: formatCustomSlabQty(qtyInUnit, unit),
    meters: null,
    price: priceNum == null ? '—' : formatSmartPrice(priceNum),
    priceNum,
    quantityKg,
    wastePercent,
    belowMoq,
  };
}

export function buildCustomSlabPrices(
  input: PriceListPricingInput,
  unit: PriceListUnit,
  currency: string,
  quantities: number[]
): CustomSlabPriceRow[] {
  const unique = [...new Set(quantities.filter((q) => Number.isFinite(q) && q > 0))].sort(
    (a, b) => a - b
  );
  return unique.map((qty) => buildCustomSlabPrice(input, qty, unit, currency));
}

export function buildPriceListRows(
  input: PriceListPricingInput,
  unit: PriceListUnit,
  currency: string,
  selectedKeys: Set<string>
): PriceListRowComputed[] {
  const bands = activeWasteBands(input.wasteBands, input.moqKg);
  const fxForCurrency = currency === 'USD' ? 1 : input.estimateFxRate;
  return bands
    .filter((b) => selectedKeys.has(bandKey(b)))
    .map((band) => {
      const priceUsd = priceUsdInUnit(priceUsdPerKgForBand(input, band), unit, input);
      const priceNum =
        priceUsd == null ? null : usdToDisplayPrecise(priceUsd, fxForCurrency);
      return {
        bandKey: bandKey(band),
        slab: formatBandRange(band, unit, input),
        meters: unit === 'roll' ? formatMetersRange(band, input) : null,
        price: priceNum == null ? '—' : formatSmartPrice(priceNum),
        priceNum,
      };
    });
}

export function availablePriceListUnits(params: {
  allowedUnitBases: Set<string>;
  totalGsm: number;
  piecesPerKg: number | null;
  lmPerKgReel: number | null;
  reelWidthMm: number;
  requiresRollLength: boolean;
  rollLengthLm: number;
}): PriceListUnit[] {
  const units: PriceListUnit[] = ['kg'];
  if (params.totalGsm > 0 && params.allowedUnitBases.has('sqm')) units.push('m2');
  const canLm =
    params.allowedUnitBases.has('lm') &&
    ((params.lmPerKgReel != null && params.lmPerKgReel > 0) ||
      (params.totalGsm > 0 && params.reelWidthMm > 0));
  if (canLm) units.push('lm');
  if (canLm && params.requiresRollLength && params.rollLengthLm > 0) units.push('roll');
  const canPieces =
    params.allowedUnitBases.has('pieces') && params.piecesPerKg != null && params.piecesPerKg > 0;
  if (canPieces) {
    units.push('pc');
    units.push('kpcs');
  }
  return units;
}

export function intersectPriceListUnits(all: PriceListUnit[][]): PriceListUnit[] {
  if (all.length === 0) return ['kg'];
  let set = new Set(all[0]);
  for (let i = 1; i < all.length; i++) {
    const next = new Set(all[i]);
    set = new Set([...set].filter((u) => next.has(u)));
  }
  const order: PriceListUnit[] = ['kg', 'm2', 'lm', 'roll', 'pc', 'kpcs'];
  return order.filter((u) => set.has(u));
}
