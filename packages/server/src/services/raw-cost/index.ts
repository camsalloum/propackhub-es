/**
 * Phase 3 — PEBI raw-cost provider seam.
 *
 * ES resolves raw material costs at calculate/snapshot time.  Today every tenant
 * uses the ES platform master price.  In a future optional integration a tenant can
 * point to PEBI's actual purchase cost instead — without any change to the engine
 * or the calculate path.
 *
 * Design (§10.1):
 *   • RawCostProvider — pure interface, no coupling to any source
 *   • PlatformMasterProvider — default, wraps the existing materials table
 *   • PebiRawCostProvider  — future HTTP client (not built yet; stub present)
 *
 * The provider is selected per-tenant via `rawCostSource` setting ('platform' | 'pebi').
 * When 'pebi' and the call fails, falls back to platform price + sets costSourceStale=true.
 */

export interface RawCostContext {
  tenantId: string;
}

export interface RawCostResult {
  /** USD cost per kg, or null if the material is unknown to this provider. */
  costUsd: number | null;
  /** True when the value came from a fallback (stale, degraded). */
  stale?: boolean;
  /** Which source ultimately supplied the cost. */
  source: 'platform' | 'pebi' | 'fallback';
}

/**
 * Provider interface — implement this to add a new cost source.
 * getCostsUsd is the bulk form; getCostUsd is derived from it by default.
 */
export interface RawCostProvider {
  readonly name: string;
  getCostUsd(materialKey: string, ctx: RawCostContext): Promise<RawCostResult>;
  getCostsUsd(
    materialKeys: string[],
    ctx: RawCostContext
  ): Promise<Record<string, RawCostResult>>;
}

// ---------------------------------------------------------------------------
// PlatformMasterProvider — the default (today's behaviour)
// ---------------------------------------------------------------------------

export class PlatformMasterProvider implements RawCostProvider {
  readonly name = 'platform_master';

  async getCostsUsd(
    materialKeys: string[],
    ctx: RawCostContext
  ): Promise<Record<string, RawCostResult>> {
    if (materialKeys.length === 0) return {};

    // Lazy import to avoid circular dependency
    const { getDatabase, schema } = await import('../../db/index.js');
    const { eq } = await import('drizzle-orm');

    const db = getDatabase();
    const rows = await db
      .select({
        platformMasterKey: schema.materials.platformMasterKey,
        costingKey: schema.materials.costingKey,
        costPerKgUsd: schema.materials.costPerKgUsd,
      })
      .from(schema.materials)
      .where(
        eq(schema.materials.tenantId, ctx.tenantId)
      );

    const byKey = new Map<string, number>();
    for (const row of rows) {
      const cost = parseFloat(row.costPerKgUsd);
      if (row.platformMasterKey) byKey.set(row.platformMasterKey, cost);
      if (row.costingKey) byKey.set(row.costingKey, cost);
    }

    const result: Record<string, RawCostResult> = {};
    for (const key of materialKeys) {
      const cost = byKey.get(key) ?? null;
      result[key] = { costUsd: cost, source: 'platform' };
    }
    return result;
  }

  async getCostUsd(materialKey: string, ctx: RawCostContext): Promise<RawCostResult> {
    const map = await this.getCostsUsd([materialKey], ctx);
    return map[materialKey] ?? { costUsd: null, source: 'platform' };
  }
}

// ---------------------------------------------------------------------------
// PebiRawCostProvider — future (stub; returns null so fallback kicks in)
// ---------------------------------------------------------------------------

export class PebiRawCostProvider implements RawCostProvider {
  readonly name = 'pebi_raw_cost';

  async getCostsUsd(
    materialKeys: string[],
    _ctx: RawCostContext
  ): Promise<Record<string, RawCostResult>> {
    // TODO (Phase 3 full): HTTP client to PEBI_RAWCOST_URL + service credential
    // For now return null for all keys so the resolver falls back to platform.
    const result: Record<string, RawCostResult> = {};
    for (const key of materialKeys) {
      result[key] = { costUsd: null, stale: true, source: 'fallback' };
    }
    return result;
  }

  async getCostUsd(materialKey: string, ctx: RawCostContext): Promise<RawCostResult> {
    const map = await this.getCostsUsd([materialKey], ctx);
    return map[materialKey];
  }
}

// ---------------------------------------------------------------------------
// Factory — selects provider based on tenant setting
// ---------------------------------------------------------------------------

export type RawCostSource = 'platform' | 'pebi';

const _platformProvider = new PlatformMasterProvider();
const _pebiProvider = new PebiRawCostProvider();

/**
 * Returns the active provider for a tenant.
 * When source='pebi' and the PEBI provider returns null, the resolver
 * (in estimate-calculation.ts) falls back to the platform provider automatically.
 */
export function getRawCostProvider(source: RawCostSource = 'platform'): RawCostProvider {
  return source === 'pebi' ? _pebiProvider : _platformProvider;
}

/**
 * Resolve costs for a set of material keys with automatic fallback.
 * If the primary provider returns null for a key, the platform provider is used.
 *
 * Returns a map of materialKey → USD cost (0 if completely unknown).
 */
export async function resolveCosts(
  materialKeys: string[],
  ctx: RawCostContext,
  source: RawCostSource = 'platform'
): Promise<Record<string, { costUsd: number; stale: boolean }>> {
  if (materialKeys.length === 0) return {};

  const primary = getRawCostProvider(source);
  const primaryResults = await primary.getCostsUsd(materialKeys, ctx);

  // Collect keys that the primary couldn't resolve
  const missingKeys = materialKeys.filter(
    (k) => primaryResults[k]?.costUsd == null
  );

  let fallbackResults: Record<string, RawCostResult> = {};
  if (missingKeys.length > 0 && source !== 'platform') {
    fallbackResults = await _platformProvider.getCostsUsd(missingKeys, ctx);
  }

  const out: Record<string, { costUsd: number; stale: boolean }> = {};
  for (const key of materialKeys) {
    const primary = primaryResults[key];
    const fallback = fallbackResults[key];
    const cost = primary?.costUsd ?? fallback?.costUsd ?? 0;
    const stale = primary?.stale ?? (primary?.costUsd == null && fallback?.costUsd != null);
    out[key] = { costUsd: cost, stale: Boolean(stale) };
  }
  return out;
}
