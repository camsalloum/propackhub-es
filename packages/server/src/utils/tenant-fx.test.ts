import { describe, expect, it } from 'vitest';
import { parsePositiveFx, requireTenantAedPerUsd } from '../utils/tenant-fx';

describe('tenant-fx', () => {
  it('parsePositiveFx rejects missing and non-positive', () => {
    expect(parsePositiveFx(null)).toBeNull();
    expect(parsePositiveFx(0)).toBeNull();
    expect(parsePositiveFx(-1)).toBeNull();
    expect(parsePositiveFx('')).toBeNull();
    expect(parsePositiveFx('3.6725')).toBeCloseTo(3.6725, 4);
  });

  it('requireTenantAedPerUsd fails visible when FX missing', () => {
    expect(() => requireTenantAedPerUsd({ exchangeRateUsdToDisplay: null }, 'sync')).toThrow(
      /Missing or invalid exchange rate/
    );
    expect(requireTenantAedPerUsd({ exchangeRateUsdToDisplay: '3.67' }, 'sync')).toBeCloseTo(3.67, 2);
  });
});
