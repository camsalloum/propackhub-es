export function usdToDisplay(usd: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  return roundUsd(usd * rate);
}

/** Round USD amounts to 2 decimal places (x.xx). */
export function roundUsd(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function formatPrice(amount: number, currency: string, decimals = 2): string {
  return `${currency} ${roundUsd(amount).toFixed(decimals)}`;
}
