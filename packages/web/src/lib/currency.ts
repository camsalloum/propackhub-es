export function usdToDisplay(usd: number, exchangeRateUsdToDisplay: number): number {
  const rate = exchangeRateUsdToDisplay > 0 ? exchangeRateUsdToDisplay : 1;
  return usd * rate;
}

export function formatPrice(amount: number, currency: string, decimals = 2): string {
  return `${currency} ${amount.toFixed(decimals)}`;
}
