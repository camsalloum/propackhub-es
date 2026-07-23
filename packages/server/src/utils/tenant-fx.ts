/**
 * Tenant FX helpers — never silently invent a regional rate (e.g. 3.6725 AED).
 * Callers must fail visible when FX is missing so quotes are not mispriced.
 */
export function parsePositiveFx(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Require a positive USD→display FX from the tenant row.
 * @throws Error when missing/invalid
 */
export function requireTenantAedPerUsd(
  tenant: { exchangeRateUsdToDisplay?: string | number | null; name?: string | null },
  context = 'tenant FX'
): number {
  const fx = parsePositiveFx(tenant.exchangeRateUsdToDisplay ?? null);
  if (fx == null) {
    const who = tenant.name ? ` for ${tenant.name}` : '';
    throw new Error(
      `Missing or invalid exchange rate (USD→display)${who}. Set Settings → Currency before ${context}.`
    );
  }
  return fx;
}
