/** Commercial selling-price rounding for price list / Excel / quotation PDF. */

/**
 * Round to nearest step (e.g. 0.05):
 * 5.73 → 5.75, 5.38 → 5.40, 5.03 → 5.05, 4.61 → 4.60, 4.63 → 4.65
 */
export type CommercialRoundStep = 0.05 | 0.1 | 0.5 | 1;

export type CommercialRoundingPrefs = {
  enabled: boolean;
  /** Always `step` when enabled. Legacy `half` / `decimals` still parse. */
  mode: 'step' | 'half' | 'decimals';
  /** Used when mode is `step` (default 0.05). */
  step?: CommercialRoundStep;
  /** Legacy — mapped to a step when loading old prefs. */
  decimals?: 0 | 1 | 2 | 3 | 4;
};

export const COMMERCIAL_ROUND_STEPS: CommercialRoundStep[] = [0.05, 0.1, 0.5, 1];

export const DEFAULT_COMMERCIAL_ROUNDING: CommercialRoundingPrefs = {
  enabled: false,
  mode: 'step',
  step: 0.05,
};

/** Nearest multiple of `step` (half-up). */
export function roundToStep(n: number, step: number): number {
  if (!Number.isFinite(n) || !(step > 0)) return n;
  const scaled = Math.round(n / step);
  // Clean binary FP noise (e.g. 5.75 * issues)
  const raw = scaled * step;
  const places = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  const f = 10 ** places;
  return Math.round(raw * f) / f;
}

/** @deprecated use roundToStep(n, 0.5) */
export function roundToHalf(n: number): number {
  return roundToStep(n, 0.5);
}

export function roundToDecimals(n: number, decimals: 0 | 1 | 2 | 3 | 4): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function resolveCommercialRoundStep(
  prefs: CommercialRoundingPrefs | null | undefined
): CommercialRoundStep {
  if (prefs?.mode === 'half') return 0.5;
  if (prefs?.mode === 'decimals') {
    const d = prefs.decimals ?? 2;
    if (d === 0) return 1;
    if (d === 1) return 0.1;
    return 0.05;
  }
  const s = prefs?.step;
  if (s === 0.05 || s === 0.1 || s === 0.5 || s === 1) return s;
  return 0.05;
}

export function roundCommercialPrice(
  n: number,
  prefs: CommercialRoundingPrefs | null | undefined
): number {
  if (!Number.isFinite(n)) return n;
  if (!prefs?.enabled) return n;
  return roundToStep(n, resolveCommercialRoundStep(prefs));
}

function formatSmartPrice(n: number): string {
  const abs = Math.abs(n);
  let minDp = 2;
  let maxDp = 2;
  if (abs >= 100) {
    minDp = 2;
    maxDp = 2;
  } else if (abs >= 1) {
    minDp = 2;
    maxDp = 2;
  } else if (abs >= 0.1) {
    minDp = 2;
    maxDp = 3;
  } else if (abs >= 0.01) {
    minDp = 2;
    maxDp = 4;
  } else if (abs >= 0.001) {
    minDp = 3;
    maxDp = 5;
  } else {
    minDp = 4;
    maxDp = 6;
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: minDp,
    maximumFractionDigits: maxDp,
  });
}

function formatStepPrice(n: number, step: CommercialRoundStep): string {
  if (step === 1) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  if (step === 0.5) {
    const isHalf = Math.abs(n % 1) > 1e-9;
    return n.toLocaleString('en-US', {
      minimumFractionDigits: isHalf ? 1 : 0,
      maximumFractionDigits: isHalf ? 1 : 0,
    });
  }
  // 0.05 and 0.1 → always 2 dp for commercial clarity (5.40, 5.75)
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format after applying commercial rounding. Disabled → smart decimals. */
export function formatCommercialPrice(
  n: number,
  prefs: CommercialRoundingPrefs | null | undefined
): string {
  if (!Number.isFinite(n)) return '—';
  if (!prefs?.enabled) return formatSmartPrice(n);
  const step = resolveCommercialRoundStep(prefs);
  return formatStepPrice(roundToStep(n, step), step);
}

/** Portrait when ≤4 slab columns; landscape when 5+. */
export function quotationPageOrientation(
  slabColumnCount: number
): 'portrait' | 'landscape' {
  return slabColumnCount >= 5 ? 'landscape' : 'portrait';
}
