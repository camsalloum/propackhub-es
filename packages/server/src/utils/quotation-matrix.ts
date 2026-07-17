/**
 * Quotation price matrix — mirrors web priceListPricing for PDF (kg/m² first;
 * other units when structure metrics exist on the calc result).
 */
import {
  DEFAULT_CORM_SCALE_WITH_WASTE,
  effectiveCormPerKg,
  formatCommercialPrice,
  wastePercentForQuantity,
  type CommercialRoundingPrefs,
  type WasteBand,
} from '@es/engine';

export type QuotationPriceUnit = 'kg' | 'm2' | 'lm' | 'roll' | 'pc' | 'kpcs';

export type QuotationMatrixInput = {
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

function bandKey(band: WasteBand): string {
  return `${band.minKg}:${band.maxKg ?? 'open'}`;
}

function parseBandKey(key: string): WasteBand | null {
  const [minStr, maxStr] = key.split(':');
  const minKg = parseFloat(minStr);
  if (!Number.isFinite(minKg)) return null;
  const maxKg = maxStr === 'open' || maxStr == null ? null : parseFloat(maxStr);
  return {
    minKg,
    maxKg: maxKg != null && Number.isFinite(maxKg) ? maxKg : null,
    wastePercent: 0,
  };
}

function usdToDisplayPrecise(usd: number, rate: number): number {
  const r = rate > 0 ? rate : 1;
  return usd * r;
}

function displayToUsd(display: number, rate: number): number {
  const r = rate > 0 ? rate : 1;
  return display / r;
}

function priceUsdPerKgForBand(input: QuotationMatrixInput, band: WasteBand): number {
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
  u: QuotationPriceUnit,
  input: QuotationMatrixInput
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
      return input.piecesPerKg != null && input.piecesPerKg > 0
        ? priceUsdPerKg / input.piecesPerKg
        : null;
    case 'kpcs':
      return input.piecesPerKg != null && input.piecesPerKg > 0
        ? (priceUsdPerKg / input.piecesPerKg) * 1000
        : null;
    default:
      return null;
  }
}

function resolveBand(template: WasteBand, bands: WasteBand[]): WasteBand {
  const key = bandKey(template);
  const found = bands.find((b) => bandKey(b) === key);
  if (found) return found;
  const mid = template.maxKg != null ? (template.minKg + template.maxKg) / 2 : template.minKg;
  const wastePercent = wastePercentForQuantity(mid, bands);
  return { ...template, wastePercent };
}

function formatSlabQty(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function quotationColumnHeaders(params: {
  slabMode: 'predefined' | 'custom';
  selectedBandKeys: string[];
  customSlabs: number[];
  unit: QuotationPriceUnit;
  wasteBands: WasteBand[];
}): string[] {
  const { slabMode, customSlabs, unit, wasteBands } = params;
  if (slabMode === 'custom') {
    return [...customSlabs].sort((a, b) => a - b).map((q) => formatSlabQty(q));
  }
  const selectedBandKeys = sortBandKeys(params.selectedBandKeys);
  return selectedBandKeys.map((key) => {
    const parsed = parseBandKey(key);
    if (!parsed) return key;
    const band = resolveBand(parsed, wasteBands);
    if (unit === 'kg') {
      return band.maxKg == null
        ? `${formatSlabQty(band.minKg)}+`
        : `${formatSlabQty(band.minKg)}–${formatSlabQty(band.maxKg)}`;
    }
    return band.maxKg == null
      ? `${formatSlabQty(band.minKg)}+ kg`
      : `${formatSlabQty(band.minKg)}–${formatSlabQty(band.maxKg)} kg`;
  });
}

/** Sort band keys by minKg ascending (prefs may store string-sorted keys). */
export function sortBandKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const amin = parseFloat(a.split(':')[0] ?? '') || 0;
    const bmin = parseFloat(b.split(':')[0] ?? '') || 0;
    return amin - bmin;
  });
}

function unitToKg(
  qty: number,
  u: QuotationPriceUnit,
  input: QuotationMatrixInput
): number | null {
  switch (u) {
    case 'kg':
      return qty;
    case 'm2':
      return input.totalGsm > 0 ? qty / (1000 / input.totalGsm) : null;
    case 'lm': {
      if (input.lmPerKgReel != null && input.lmPerKgReel > 0) return qty / input.lmPerKgReel;
      const widthM = input.reelWidthMm / 1000;
      if (input.totalGsm > 0 && widthM > 0) return qty / ((1000 / input.totalGsm) * widthM);
      return null;
    }
    case 'roll': {
      if (input.rollLengthLm <= 0) return null;
      const lm = qty * input.rollLengthLm;
      if (input.lmPerKgReel != null && input.lmPerKgReel > 0) return lm / input.lmPerKgReel;
      const widthM = input.reelWidthMm / 1000;
      if (input.totalGsm > 0 && widthM > 0) return lm / ((1000 / input.totalGsm) * widthM);
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

export function quotationPricesForRow(params: {
  input: QuotationMatrixInput;
  unit: QuotationPriceUnit;
  currency: string;
  slabMode: 'predefined' | 'custom';
  selectedBandKeys: string[];
  customSlabs: number[];
  rounding?: CommercialRoundingPrefs | null;
}): string[] {
  const { input, unit, currency, slabMode, selectedBandKeys, customSlabs, rounding } = params;
  const fx = currency === 'USD' ? 1 : input.estimateFxRate;

  if (slabMode === 'custom') {
    return customSlabs.map((qty) => {
      const quantityKg = unitToKg(qty, unit, input);
      const wastePercent =
        quantityKg == null ? 0 : wastePercentForQuantity(quantityKg, input.wasteBands);
      const band: WasteBand = {
        minKg: quantityKg ?? 0,
        maxKg: quantityKg ?? 0,
        wastePercent,
      };
      const priceUsd =
        quantityKg == null ? null : priceUsdInUnit(priceUsdPerKgForBand(input, band), unit, input);
      if (priceUsd == null) return '—';
      return formatCommercialPrice(usdToDisplayPrecise(priceUsd, fx), rounding);
    });
  }

  const keys = sortBandKeys(selectedBandKeys);
  return keys.map((key) => {
    const parsed = parseBandKey(key);
    if (!parsed) return '—';
    const band = resolveBand(parsed, input.wasteBands);
    const priceUsd = priceUsdInUnit(priceUsdPerKgForBand(input, band), unit, input);
    if (priceUsd == null) return '—';
    return formatCommercialPrice(usdToDisplayPrecise(priceUsd, fx), rounding);
  });
}

export function slabColumnCount(prefs: {
  slabMode?: 'predefined' | 'custom';
  selectedBandKeys?: string[];
  customSlabs?: number[];
}): number {
  if (prefs.slabMode === 'custom') return prefs.customSlabs?.length ?? 0;
  return prefs.selectedBandKeys?.length ?? 0;
}
