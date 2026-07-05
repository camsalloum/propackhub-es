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

  it('existing scenario charges zero regardless of print colors', () => {
    const result = deriveToolingFromColors({
      printColorCount: 5,
      costPerColor: 500,
      toolingScenario: 'existing',
      toolingBillingMode: 'separate',
      exchangeRateUsdToDisplay: 1,
    });
    expect(result!.developmentTotalDisplay).toBe(0);
    expect(result!.billableColorCount).toBe(0);
    expect(result!.toolingChargeUsd).toBe('0.00');
  });

  it('modification bills only changed colors', () => {
    const result = deriveToolingFromColors({
      printColorCount: 5,
      costPerColor: 500,
      toolingScenario: 'modification',
      billableColorCount: 2,
      toolingBillingMode: 'amortized',
      exchangeRateUsdToDisplay: 1,
    });
    expect(result!.developmentTotalDisplay).toBe(1000);
    expect(result!.billableColorCount).toBe(2);
    expect(result!.toolingBilledToCustomer).toBe(true);
  });

  it('modification caps billable at print color count', () => {
    const result = deriveToolingFromColors({
      printColorCount: 3,
      costPerColor: 100,
      toolingScenario: 'modification',
      billableColorCount: 9,
      toolingBillingMode: 'separate',
      exchangeRateUsdToDisplay: 1,
    });
    expect(result!.billableColorCount).toBe(3);
    expect(result!.developmentTotalDisplay).toBe(300);
  });
});

describe('developmentTotalDisplay', () => {
  it('multiplies billable colors × cost per color', () => {
    expect(developmentTotalDisplay(8, '500')).toBe('4000.0000');
    expect(
      developmentTotalDisplay(5, '500', {
        toolingScenario: 'modification',
        billableColorCount: 2,
      })
    ).toBe('1000.0000');
    expect(
      developmentTotalDisplay(5, '500', { toolingScenario: 'existing' })
    ).toBe('0.0000');
  });
});
