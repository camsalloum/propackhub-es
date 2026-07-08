export function usdToDisplay(usd: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  return roundUsd(usd * rate);
}

/** FX conversion without 2dp rounding — use for RM cost/kg, cost/m², and other fine-grained costing. */
export function usdToDisplayPrecise(usd: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  if (!Number.isFinite(usd)) return 0;
  return usd * rate;
}

/** Convert a display-currency value back to USD. */
export function displayToUsd(display: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  return roundUsd(display / rate);
}

/** Round USD amounts to 2 decimal places (x.xx). */
export function roundUsd(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/** Display string for USD price inputs (always x.xx). */
export function formatUsdInput(value: number | null | undefined): string {
  return roundUsd(value ?? 0).toFixed(2);
}

/** Parse a USD price field and round to 2 decimals. */
export function parseUsdInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '.') return 0;
  const n = parseFloat(trimmed);
  return roundUsd(Number.isFinite(n) ? n : 0);
}

/**
 * CoRM is stored in display currency per kg (legacy DB/API field `cormPerKgUsd`).
 * Engine price build-up runs in USD — convert at the boundary using the estimate FX snapshot.
 */
export function cormDisplayPerKgToEngineUsd(
  cormDisplayPerKg: number,
  exchangeRateUsdToDisplay: number
): number {
  return displayToUsd(cormDisplayPerKg, exchangeRateUsdToDisplay);
}

export function formatPrice(amount: number, currency: string, decimals = 2): string {
  return `${currency} ${roundUsd(amount).toFixed(decimals)}`;
}
