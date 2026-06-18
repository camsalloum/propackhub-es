/** Convert USD amount to tenant display currency using frozen estimate/tenant rate. */
export function usdToDisplay(usd: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  return usd * rate;
}

export function formatDisplayAmount(amount: number, decimals = 2): string {
  return amount.toFixed(decimals);
}
