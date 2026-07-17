import type { CommercialRoundingPrefs, CommercialRoundStep } from '@es/engine';
import { COMMERCIAL_ROUND_STEPS, resolveCommercialRoundStep } from '@es/engine';
import type { PriceListUnit, SlabMode } from './priceListPricing';

export const QUOTE_PRICE_LIST_PREFS_VERSION = 2;

export type QuotePriceListRounding = CommercialRoundingPrefs;

export type QuotePriceListDisplayPrefs = {
  v: typeof QUOTE_PRICE_LIST_PREFS_VERSION;
  unit?: PriceListUnit;
  currency?: string;
  slabMode?: SlabMode;
  selectedBandKeys?: string[];
  customSlabs?: number[];
  rounding?: QuotePriceListRounding;
};

const PRICE_LIST_UNITS: PriceListUnit[] = ['kg', 'm2', 'lm', 'roll', 'pc', 'kpcs'];

function parseRounding(raw: unknown): QuotePriceListRounding | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const enabled = r.enabled === true;

  // Normalize all legacy shapes to mode:step + step
  let step: CommercialRoundStep = 0.05;
  if (r.mode === 'half') {
    step = 0.5;
  } else if (r.mode === 'decimals') {
    const d = typeof r.decimals === 'number' ? r.decimals : 2;
    if (d <= 0) step = 1;
    else if (d === 1) step = 0.1;
    else step = 0.05;
  } else if (typeof r.step === 'number' && COMMERCIAL_ROUND_STEPS.includes(r.step as CommercialRoundStep)) {
    step = r.step as CommercialRoundStep;
  }

  return { enabled, mode: 'step', step };
}

/** Select value for Round dropdown: off | 0.05 | 0.1 | 0.5 | 1 */
export function roundingSelectValue(rounding: QuotePriceListRounding): string {
  if (!rounding.enabled) return 'off';
  return String(resolveCommercialRoundStep(rounding));
}

export function roundingFromSelectValue(value: string): QuotePriceListRounding {
  if (value === 'off') {
    return { enabled: false, mode: 'step', step: 0.05 };
  }
  const step = Number(value) as CommercialRoundStep;
  if (!COMMERCIAL_ROUND_STEPS.includes(step)) {
    return { enabled: true, mode: 'step', step: 0.05 };
  }
  return { enabled: true, mode: 'step', step };
}

/** Accept v1 (no rounding) or v2; always return v2 shape. */
export function parseQuotePriceListDisplayPrefs(
  raw: unknown
): QuotePriceListDisplayPrefs | null {
  if (raw == null) return null;
  const record = raw as Record<string, unknown>;
  const payload =
    record.v === 1 || record.v === QUOTE_PRICE_LIST_PREFS_VERSION
      ? record
      : (record.priceListDisplayPrefs ?? record.price_list_display_prefs ?? null);
  if (payload == null) return null;
  const parsed = payload as Partial<QuotePriceListDisplayPrefs> & { v?: number };
  if (parsed.v !== 1 && parsed.v !== QUOTE_PRICE_LIST_PREFS_VERSION) return null;

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
    ? [
        ...new Set(
          parsed.customSlabs
            .map((n) => (typeof n === 'number' ? n : parseFloat(String(n))))
            .filter((n) => Number.isFinite(n) && n > 0)
        ),
      ].sort((a, b) => a - b)
    : undefined;
  const rounding = parseRounding(parsed.rounding);

  return {
    v: QUOTE_PRICE_LIST_PREFS_VERSION,
    unit,
    currency,
    slabMode,
    selectedBandKeys,
    customSlabs,
    ...(rounding ? { rounding } : {}),
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
    ...(prefs.rounding ? { rounding: prefs.rounding } : {}),
  };
}

export function quotePriceListPrefsEqual(
  a: QuotePriceListDisplayPrefs | null | undefined,
  b: QuotePriceListDisplayPrefs | null | undefined
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
