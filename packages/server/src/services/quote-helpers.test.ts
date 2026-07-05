import { describe, it, expect } from 'vitest';
import { deriveToolingFromColors, developmentTotalDisplay } from './quote-helpers';

describe('deriveToolingFromColors', () => {
  it('converts display-currency development total to USD at frozen rate', () => {
    const result = deriveToolingFromColors({
      printColorCount: 8,
      costPerColor: 500,
      toolingBillingMode: 'separate',
      exchangeRateUsdToDisplay: 3.6725,
    });
    expect(result).not.toBeNull();
    expect(result!.developmentTotalDisplay).toBe(4000);
    // 4000 / 3.6725 ≈ 1089.18 USD
    expect(Number(result!.toolingChargeUsd)).toBeCloseTo(4000 / 3.6725, 2);
    expect(result!.toolingBilledToCustomer).toBe(false);
    expect(result!.toolingBillingMode).toBe('separate');
  });

  it('sets billed flag only for amortized mode', () => {
    const amortized = deriveToolingFromColors({
      printColorCount: 4,
      costPerColor: 100,
      toolingBillingMode: 'amortized',
      exchangeRateUsdToDisplay: 1,
    });
    expect(amortized!.toolingBilledToCustomer).toBe(true);
    expect(amortized!.toolingChargeUsd).toBe('400.00');

    const notBilled = deriveToolingFromColors({
      printColorCount: 4,
      costPerColor: 100,
      toolingBillingMode: 'not_billed',
      exchangeRateUsdToDisplay: 1,
    });
    expect(notBilled!.toolingBilledToCustomer).toBe(false);
  });

  it('defaults billing mode to separate when unset', () => {
    const result = deriveToolingFromColors({
      printColorCount: 2,
      costPerColor: 50,
      toolingBillingMode: null,
      exchangeRateUsdToDisplay: 1,
    });
    expect(result!.toolingBillingMode).toBe('separate');
    expect(result!.toolingBilledToCustomer).toBe(false);
  });

  it('returns null when colors or cost missing', () => {
    expect(
      deriveToolingFromColors({
        printColorCount: null,
        costPerColor: 100,
        toolingBillingMode: 'separate',
        exchangeRateUsdToDisplay: 1,
      })
    ).toBeNull();
  });
});

describe('developmentTotalDisplay', () => {
  it('multiplies colors × cost per color', () => {
    expect(developmentTotalDisplay(8, '500')).toBe('4000.0000');
  });
});
