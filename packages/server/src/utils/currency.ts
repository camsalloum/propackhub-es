/** Convert USD amount to tenant display currency using frozen estimate/tenant rate. */
export function usdToDisplay(usd: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  return usd * rate;
}

/** Convert a display-currency amount back to USD (engine internal math). */
export function displayToUsd(display: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  if (!Number.isFinite(display)) return 0;
  return display / rate;
}

/**
 * CoRM is stored in display currency per kg (legacy column name `corm_per_kg_usd`).
 * Engine price build-up runs in USD — convert at the boundary using the estimate FX snapshot.
 */
export function cormDisplayPerKgToEngineUsd(
  cormDisplayPerKg: number,
  exchangeRateUsdToDisplay: number
): number {
  return displayToUsd(cormDisplayPerKg, exchangeRateUsdToDisplay);
}

export function formatDisplayAmount(amount: number, decimals = 2): string {
  return amount.toFixed(decimals);
}

/** Map engine slab USD prices to tenant display currency for PDF/UI. */
export function slabsUsdToDisplay(
  slabs: Array<{ quantityKg: number; pricePerKg: number }>,
  exchangeRateUsdToDisplay: number
): Array<{ quantityKg: number; pricePerKg: number }> {
  return slabs.map((s) => ({
    quantityKg: s.quantityKg,
    pricePerKg: usdToDisplay(s.pricePerKg, exchangeRateUsdToDisplay),
  }));
}
