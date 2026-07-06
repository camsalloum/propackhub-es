import type { PriceListUnit, SlabMode } from './priceListPricing';

export const QUOTE_PRICE_LIST_PREFS_VERSION = 1;

export type QuotePriceListDisplayPrefs = {
  v: typeof QUOTE_PRICE_LIST_PREFS_VERSION;
  unit?: PriceListUnit;
  currency?: string;
  slabMode?: SlabMode;
  selectedBandKeys?: string[];
  customSlabs?: number[];
};

const PRICE_LIST_UNITS: PriceListUnit[] = ['kg', 'm2', 'lm', 'roll', 'pc', 'kpcs'];

export function parseQuotePriceListDisplayPrefs(
  raw: unknown
): QuotePriceListDisplayPrefs | null {
  if (raw == null) return null;
  const record = raw as Record<string, unknown>;
  const payload =
    record.v === QUOTE_PRICE_LIST_PREFS_VERSION
      ? record
      : (record.priceListDisplayPrefs ?? record.price_list_display_prefs ?? null);
  if (payload == null) return null;
  const parsed = payload as Partial<QuotePriceListDisplayPrefs>;
  if (parsed.v !== QUOTE_PRICE_LIST_PREFS_VERSION) return null;

  const unit = PRICE_LIST_UNITS.includes(parsed.unit as PriceListUnit)
    ? (parsed.unit as PriceListUnit)
    : undefined;
  const currency =
    typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency)
      ? parsed.currency
      : undefined;
  const slabMode =
    parsed.slabMode === 'predefined' || parsed.slabMode === 'custom'
      ? parsed.slabMode
      : undefined;
  const selectedBandKeys = Array.isArray(parsed.selectedBandKeys)
    ? parsed.selectedBandKeys.filter((k): k is string => typeof k === 'string' && k.length > 0)
    : undefined;
  const customSlabs = Array.isArray(parsed.customSlabs)
    ? [...new Set(
        parsed.customSlabs
          .map((n) => (typeof n === 'number' ? n : parseFloat(String(n))))
          .filter((n) => Number.isFinite(n) && n > 0)
      )].sort((a, b) => a - b)
    : undefined;

  return {
    v: QUOTE_PRICE_LIST_PREFS_VERSION,
    unit,
    currency,
    slabMode,
    selectedBandKeys,
    customSlabs,
  };
}

export function serializeQuotePriceListDisplayPrefs(
  prefs: QuotePriceListDisplayPrefs
): QuotePriceListDisplayPrefs {
  return {
    v: QUOTE_PRICE_LIST_PREFS_VERSION,
    ...(prefs.unit ? { unit: prefs.unit } : {}),
    ...(prefs.currency ? { currency: prefs.currency } : {}),
    ...(prefs.slabMode ? { slabMode: prefs.slabMode } : {}),
    ...(prefs.selectedBandKeys?.length ? { selectedBandKeys: prefs.selectedBandKeys } : {}),
    ...(prefs.customSlabs?.length ? { customSlabs: prefs.customSlabs } : {}),
  };
}

export function quotePriceListPrefsEqual(
  a: QuotePriceListDisplayPrefs | null | undefined,
  b: QuotePriceListDisplayPrefs | null | undefined
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
