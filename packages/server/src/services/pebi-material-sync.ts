/**
 * Sync PEBI substrate prices (PET, ALU, …) into ES tenant materials.
 * Uses PEBI HTTP integration API when configured, else direct PEBI_DATABASE_URL + shared catalog builders.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.js';

export const PEBI_MATERIAL_SOURCE = 'pebi';
export const PEBI_SYNC_FAMILIES = ['PET', 'ALU', 'BOPP', 'CPP', 'PA', 'PAP'] as const;
export type PebiSyncFamily = (typeof PEBI_SYNC_FAMILIES)[number];

const require = createRequire(import.meta.url);
const pphServicesPath = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../../../pph/server/services'
);
const { buildPetMaterialsCatalog } = require(`${pphServicesPath}/pebi-es-pet-catalog.js`) as {
  buildPetMaterialsCatalog: (
    pool: Pool,
    options?: { aedPerUsd?: number }
  ) => Promise<PebiMaterialsCatalog>;
};
const { buildAluMaterialsCatalog } = require(`${pphServicesPath}/pebi-es-alu-catalog.js`) as {
  buildAluMaterialsCatalog: (
    pool: Pool,
    options?: { aedPerUsd?: number }
  ) => Promise<PebiMaterialsCatalog>;
};
const { buildBoppMaterialsCatalog } = require(`${pphServicesPath}/pebi-es-bopp-catalog.js`) as {
  buildBoppMaterialsCatalog: (
    pool: Pool,
    options?: { aedPerUsd?: number }
  ) => Promise<PebiMaterialsCatalog>;
};
const { buildCppMaterialsCatalog } = require(`${pphServicesPath}/pebi-es-cpp-catalog.js`) as {
  buildCppMaterialsCatalog: (
    pool: Pool,
    options?: { aedPerUsd?: number }
  ) => Promise<PebiMaterialsCatalog>;
};
const { buildPaMaterialsCatalog } = require(`${pphServicesPath}/pebi-es-pa-catalog.js`) as {
  buildPaMaterialsCatalog: (
    pool: Pool,
    options?: { aedPerUsd?: number }
  ) => Promise<PebiMaterialsCatalog>;
};
const { buildPapMaterialsCatalog } = require(`${pphServicesPath}/pebi-es-pap-catalog.js`) as {
  buildPapMaterialsCatalog: (
    pool: Pool,
    options?: { aedPerUsd?: number }
  ) => Promise<PebiMaterialsCatalog>;
};

export type PebiMaterialRow = {
  pebiGradeKey: string;
  esPlatformMasterKey: string;
  type: string;
  substrateFamily: string;
  substrateGrade: string;
  marketPriceUsd: number | null;
  costPerKgUsd: number | null;
  densityGCm3: number | null;
  solidPercent: number;
  hasStock: boolean;
  pricePolicy: string;
  mappingStatus: string;
};

type PebiMaterialsCatalog = {
  success: boolean;
  family: string;
  catalogVersion: number;
  materials: PebiMaterialRow[];
  unmapped: Array<{ pbGradeKey?: string; reason: string }>;
};

export type MaterialSyncResult = {
  tenantId: string;
  platformCompanyCode: string;
  family: string;
  inserted: number;
  updated: number;
  skipped: number;
  unmappedCount: number;
  total: number;
  source: 'pebi_api' | 'pebi_db';
};

export type PebiMissingMaterial = {
  pbGradeKey: string;
  pbGrade: string;
  reason: string;
};

export type PebiMissingMaterialsResult = {
  family: string;
  total: number;
  missing: PebiMissingMaterial[];
  source: 'pebi_api' | 'pebi_db';
};

function toDecimalString(value: number | null | undefined, fallback: string): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toFixed(4);
}

async function buildMaterialsCatalog(
  pool: Pool,
  family: PebiSyncFamily,
  aedPerUsd: number
): Promise<PebiMaterialsCatalog> {
  if (family === 'ALU') return buildAluMaterialsCatalog(pool, { aedPerUsd });
  if (family === 'BOPP') return buildBoppMaterialsCatalog(pool, { aedPerUsd });
  if (family === 'CPP') return buildCppMaterialsCatalog(pool, { aedPerUsd });
  if (family === 'PA') return buildPaMaterialsCatalog(pool, { aedPerUsd });
  if (family === 'PAP') return buildPapMaterialsCatalog(pool, { aedPerUsd });
  return buildPetMaterialsCatalog(pool, { aedPerUsd });
}

async function loadPebiMaterials(
  companyCode: string,
  family: PebiSyncFamily,
  aedPerUsd: number
): Promise<{ catalog: PebiMaterialsCatalog; source: 'pebi_api' | 'pebi_db' }> {
  const dbUrl = process.env.PEBI_DATABASE_URL?.trim();
  const apiUrl = process.env.PEBI_API_URL?.trim();
  const secret = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();

  if (dbUrl) {
    const pool = new Pool({ connectionString: dbUrl, max: 2 });
    try {
      const catalog = await buildMaterialsCatalog(pool, family, aedPerUsd);
      return { catalog, source: 'pebi_db' };
    } finally {
      await pool.end();
    }
  }

  if (apiUrl && secret) {
    const base = apiUrl.replace(/\/$/, '');
    const { data } = await axios.get<PebiMaterialsCatalog>(
      `${base}/api/integration/es/materials`,
      {
        params: { family, aedPerUsd },
        headers: {
          'X-PPH-Integration-Key': secret,
          'X-PPH-Company-Code': companyCode,
        },
        timeout: 120_000,
      }
    );

    if (!data?.success || !Array.isArray(data.materials)) {
      throw new Error('PEBI integration API returned an unexpected materials payload');
    }

    return { catalog: data, source: 'pebi_api' };
  }

  throw new Error(
    'Set PEBI_DATABASE_URL (dev) or PEBI_API_URL + PEBI_ES_INTEGRATION_SECRET for material sync'
  );
}


async function findTenantMaterial(
  tenantId: string,
  row: PebiMaterialRow
): Promise<
  | {
      id: string;
      isTenantOnly: boolean;
      marketPriceUsd: string | null;
      costPerKgUsd: string | null;
    }
  | undefined
> {
  const db = getDatabase();
  const selectFields = {
    id: schema.materials.id,
    isTenantOnly: schema.materials.isTenantOnly,
    marketPriceUsd: schema.materials.marketPriceUsd,
    costPerKgUsd: schema.materials.costPerKgUsd,
  };

  const [byPlatformKey] = await db
    .select(selectFields)
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        eq(schema.materials.platformMasterKey, row.esPlatformMasterKey)
      )
    )
    .limit(1);

  if (byPlatformKey) return byPlatformKey;

  const [byExternal] = await db
    .select(selectFields)
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        eq(schema.materials.externalSource, PEBI_MATERIAL_SOURCE),
        eq(schema.materials.externalId, row.pebiGradeKey)
      )
    )
    .limit(1);

  return byExternal;
}

async function loadPlatformMaterialFallback(platformMasterKey: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      density: schema.platformMasterMaterials.density,
      solidPercent: schema.platformMasterMaterials.solidPercent,
      costPerKgUsd: schema.platformMasterMaterials.costPerKgUsd,
      marketPriceUsd: schema.platformMasterMaterials.marketPriceUsd,
    })
    .from(schema.platformMasterMaterials)
    .where(eq(schema.platformMasterMaterials.key, platformMasterKey))
    .limit(1);
  return row;
}

function hasPositivePrice(market: number | null | undefined, cost: number | null | undefined): boolean {
  return (market != null && market > 0) || (cost != null && cost > 0);
}

const ALU_12_PLATFORM_KEY = 'alu-foil-12';
const ALU_9_PLATFORM_KEY = 'alu-foil-9';
/** Matches PEBI catalog: 12 µm market (AED/kg) = 9 µm market + 0.20 */
const ALU_12_MARKET_DELTA_AED = 0.2;
const PET_TRANSPARENT_KEY = 'pet-transparent';
const PET_WHITE_PRICE_DELTA_USD = 0.4;
const CPP_TRANSPARENT_KEY = 'cpp-transparent';
const CPP_FALLBACK_DELTA_USD: Record<string, number> = {
  'cpp-white': 0.3,
  'cpp-retort': 0.1,
  'cpp-high-seal-strength': 0.1,
};
/** Grades without PB stock — keep tenant/platform price until PEBI has a live price. */
const PLATFORM_PRICE_HOLD_KEYS_BY_FAMILY: Partial<Record<PebiSyncFamily, ReadonlySet<string>>> = {
  PA: new Set(['bopa-transparent-hb', 'pa-pe']),
  PAP: new Set(['kraft-paper-brown', 'mg-paper', 'paper-white-coated']),
};

function shouldHoldPlatformPrice(family: PebiSyncFamily, platformMasterKey: string): boolean {
  return PLATFORM_PRICE_HOLD_KEYS_BY_FAMILY[family]?.has(platformMasterKey) ?? false;
}

function positivePriceOrNull(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null;
}

function decimalPriceOrNull(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  return positivePriceOrNull(Number(value));
}

function resolveHeldPlatformPrice(
  existing:
    | {
        marketPriceUsd: string | null;
        costPerKgUsd: string | null;
      }
    | undefined,
  platformFallback: Awaited<ReturnType<typeof loadPlatformMaterialFallback>>
): { marketUsd: number; costUsd: number } | null {
  const existingMarket = decimalPriceOrNull(existing?.marketPriceUsd);
  const existingCost = decimalPriceOrNull(existing?.costPerKgUsd);
  const platformMarket = decimalPriceOrNull(platformFallback?.marketPriceUsd);
  const platformCost = decimalPriceOrNull(platformFallback?.costPerKgUsd);

  const marketUsd = existingMarket ?? platformMarket ?? existingCost ?? platformCost;
  const costUsd = existingCost ?? platformCost ?? existingMarket ?? platformMarket;
  if (!hasPositivePrice(marketUsd, costUsd)) return null;

  return {
    marketUsd: marketUsd ?? costUsd!,
    costUsd: costUsd ?? marketUsd!,
  };
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function derivePetWhiteFallbackPrice(
  row: PebiMaterialRow,
  catalogRows: PebiMaterialRow[]
): { marketUsd: number; costUsd: number } | null {
  if (!row.esPlatformMasterKey || !PET_WHITE_FALLBACK_KEYS.has(row.esPlatformMasterKey)) {
    return null;
  }

  const transparent = catalogRows.find((candidate) => candidate.esPlatformMasterKey === PET_TRANSPARENT_KEY);
  if (!transparent) return null;

  const transparentMarket = positivePriceOrNull(transparent.marketPriceUsd);
  const transparentCost = positivePriceOrNull(transparent.costPerKgUsd);
  const transparentBase = transparentMarket ?? transparentCost;
  if (transparentBase == null) return null;

  const fallback = roundUsd(transparentBase + PET_WHITE_PRICE_DELTA_USD);
  return {
    marketUsd: fallback,
    costUsd: fallback,
  };
}

const PET_WHITE_FALLBACK_KEYS = new Set(['pet-white', 'pet-twist-white']);

function deriveCppTransparentFallbackPrice(
  row: PebiMaterialRow,
  catalogRows: PebiMaterialRow[]
): { marketUsd: number; costUsd: number } | null {
  const key = row.esPlatformMasterKey;
  if (!key) return null;
  const deltaUsd = CPP_FALLBACK_DELTA_USD[key];
  if (deltaUsd == null) return null;

  const transparent = catalogRows.find((candidate) => candidate.esPlatformMasterKey === CPP_TRANSPARENT_KEY);
  if (!transparent) return null;

  const transparentMarket = positivePriceOrNull(transparent.marketPriceUsd);
  const transparentCost = positivePriceOrNull(transparent.costPerKgUsd);
  const transparentBase = transparentMarket ?? transparentCost;
  if (transparentBase == null) return null;

  const fallback = roundUsd(transparentBase + deltaUsd);
  return {
    marketUsd: fallback,
    costUsd: fallback,
  };
}

function deriveAlu12FallbackPrice(
  row: PebiMaterialRow,
  catalogRows: PebiMaterialRow[],
  aedPerUsd: number
): { marketUsd: number; costUsd: number } | null {
  if (row.esPlatformMasterKey !== ALU_12_PLATFORM_KEY || row.hasStock) {
    return null;
  }

  const nine = catalogRows.find((candidate) => candidate.esPlatformMasterKey === ALU_9_PLATFORM_KEY);
  if (!nine) return null;

  const nineMarketUsd = positivePriceOrNull(nine.marketPriceUsd);
  const nineCostUsd = positivePriceOrNull(nine.costPerKgUsd);
  const nineBaseUsd = nineMarketUsd ?? nineCostUsd;
  if (nineBaseUsd == null) return null;

  const fallbackUsd = roundUsd((nineBaseUsd * aedPerUsd + ALU_12_MARKET_DELTA_AED) / aedPerUsd);
  return {
    marketUsd: fallbackUsd,
    costUsd: fallbackUsd,
  };
}

function deriveFormulaFallbackPrice(
  row: PebiMaterialRow,
  catalogRows: PebiMaterialRow[],
  family: PebiSyncFamily,
  aedPerUsd: number
): { marketUsd: number; costUsd: number } | null {
  if (family === 'PET') {
    return derivePetWhiteFallbackPrice(row, catalogRows);
  }
  if (family === 'ALU') {
    return deriveAlu12FallbackPrice(row, catalogRows, aedPerUsd);
  }
  if (family === 'CPP') {
    return deriveCppTransparentFallbackPrice(row, catalogRows);
  }
  return null;
}

function pbGradeFromKey(pbGradeKey: string): string {
  // Format: `PET|<pbGradeLabel...>`
  const parts = pbGradeKey.split('|');
  if (parts.length <= 1) return pbGradeKey;
  return parts.slice(1).join('|').trim();
}

async function resolveMaterialName(platformMasterKey: string, substrateGrade: string): Promise<string> {
  const db = getDatabase();
  const [platformRow] = await db
    .select({ name: schema.platformMasterMaterials.name })
    .from(schema.platformMasterMaterials)
    .where(eq(schema.platformMasterMaterials.key, platformMasterKey))
    .limit(1);

  return platformRow?.name ?? substrateGrade;
}

async function getLinkedTenant(tenantId: string) {
  const db = getDatabase();
  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      platformCompanyCode: schema.tenants.platformCompanyCode,
      exchangeRateUsdToDisplay: schema.tenants.exchangeRateUsdToDisplay,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant?.platformCompanyCode) {
    throw new Error('Tenant has no platform_company_code — link to PEBI before syncing materials');
  }

  return tenant;
}

function tenantAedPerUsd(tenant: { exchangeRateUsdToDisplay: string | null }): number {
  return Number(tenant.exchangeRateUsdToDisplay) > 0
    ? Number(tenant.exchangeRateUsdToDisplay)
    : 3.6725;
}

async function applyCatalogToTenant(
  tenantId: string,
  catalog: PebiMaterialsCatalog,
  family: PebiSyncFamily,
  aedPerUsd: number
): Promise<Pick<MaterialSyncResult, 'inserted' | 'updated' | 'skipped' | 'unmappedCount' | 'total'>> {
  const db = getDatabase();
  const now = new Date();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of catalog.materials) {
    if (!row.esPlatformMasterKey) {
      skipped++;
      continue;
    }

    const existing = await findTenantMaterial(tenantId, row);
    if (existing?.isTenantOnly) {
      skipped++;
      continue;
    }

    const marketUsd = positivePriceOrNull(row.marketPriceUsd);
    const costUsd = positivePriceOrNull(row.costPerKgUsd);
    const formulaFallback = !hasPositivePrice(marketUsd, costUsd)
      ? deriveFormulaFallbackPrice(row, catalog.materials, family, aedPerUsd)
      : null;
    let effectiveMarketUsd = marketUsd ?? formulaFallback?.marketUsd ?? null;
    let effectiveCostUsd = costUsd ?? formulaFallback?.costUsd ?? null;
    let priceSource: 'pebi' | 'platform' = 'pebi';

    const noPebiPrice = !hasPositivePrice(marketUsd, costUsd) && formulaFallback == null;
    if (shouldHoldPlatformPrice(family, row.esPlatformMasterKey) && noPebiPrice) {
      const platformFallback = await loadPlatformMaterialFallback(row.esPlatformMasterKey);
      const held = resolveHeldPlatformPrice(existing, platformFallback);
      if (!held) {
        skipped++;
        continue;
      }
      effectiveMarketUsd = held.marketUsd;
      effectiveCostUsd = held.costUsd;
      priceSource = 'platform';
    } else if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
      skipped++;
      continue;
    }

    const platformFallback = await loadPlatformMaterialFallback(row.esPlatformMasterKey);
    const resolvedCost = effectiveCostUsd ?? effectiveMarketUsd ?? 0;
    const resolvedMarket = effectiveMarketUsd ?? effectiveCostUsd ?? resolvedCost;
    const defaultDensity =
      family === 'ALU'
        ? 2.7
        : family === 'BOPP'
          ? 0.91
          : family === 'CPP'
            ? 0.9
            : family === 'PA'
              ? 1.15
              : family === 'PAP'
                ? 1.0
                : 1.4;
    const density =
      row.densityGCm3 != null && row.densityGCm3 > 0
        ? row.densityGCm3
        : Number(platformFallback?.density ?? defaultDensity);
    const solidPercent =
      row.solidPercent != null && row.solidPercent > 0
        ? row.solidPercent
        : platformFallback?.solidPercent ?? 100;

    const patch = {
      substrateFamily: row.substrateFamily,
      substrateGrade: row.substrateGrade,
      marketPriceUsd: toDecimalString(resolvedMarket, toDecimalString(resolvedCost, '0')),
      costPerKgUsd: toDecimalString(resolvedCost, '0'),
      density: toDecimalString(density, toDecimalString(defaultDensity, '1.4000')),
      solidPercent,
      priceSource,
      platformMasterKey: row.esPlatformMasterKey,
      platformSyncedAt: now,
      externalId: row.pebiGradeKey,
      externalSource: PEBI_MATERIAL_SOURCE,
      updatedAt: now,
    };

    if (existing) {
      await db.update(schema.materials).set(patch).where(eq(schema.materials.id, existing.id));
      updated++;
    } else {
      const name = await resolveMaterialName(row.esPlatformMasterKey, row.substrateGrade);
      await db.insert(schema.materials).values({
        tenantId,
        name,
        type: 'substrate',
        ...patch,
      });
      inserted++;
    }
  }

  return {
    inserted,
    updated,
    skipped,
    unmappedCount: catalog.unmapped.length,
    total: catalog.materials.length,
  };
}

export async function syncFamilyMaterialsFromPebiForTenant(
  tenantId: string,
  family: PebiSyncFamily
): Promise<MaterialSyncResult> {
  const tenant = await getLinkedTenant(tenantId);
  const aedPerUsd = tenantAedPerUsd(tenant);
  const { catalog, source } = await loadPebiMaterials(tenant.platformCompanyCode!, family, aedPerUsd);
  const applied = await applyCatalogToTenant(tenantId, catalog, family, aedPerUsd);

  return {
    tenantId,
    platformCompanyCode: tenant.platformCompanyCode!,
    family: catalog.family,
    source,
    ...applied,
  };
}

export async function syncAllPebiMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult[]> {
  const results: MaterialSyncResult[] = [];
  for (const family of PEBI_SYNC_FAMILIES) {
    results.push(await syncFamilyMaterialsFromPebiForTenant(tenantId, family));
  }
  return results;
}

export async function syncPetMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'PET');
}

export async function syncAluMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'ALU');
}

export async function syncBoppMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'BOPP');
}

export async function syncCppMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'CPP');
}

export async function syncPaMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'PA');
}

export async function syncPapMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'PAP');
}

/**
 * Review queue for a PEBI-linked family (no DB writes).
 */
export async function getMaterialsMissingForTenant(
  tenantId: string,
  family: PebiSyncFamily
): Promise<PebiMissingMaterialsResult> {
  const tenant = await getLinkedTenant(tenantId);
  const aedPerUsd = tenantAedPerUsd(tenant);
  const { catalog, source } = await loadPebiMaterials(tenant.platformCompanyCode!, family, aedPerUsd);

  const missing: PebiMissingMaterial[] = [];

  for (const row of catalog.materials) {
    if (!row.esPlatformMasterKey) {
      missing.push({
        pbGradeKey: row.pebiGradeKey,
        pbGrade: pbGradeFromKey(row.pebiGradeKey),
        reason: 'no_es_platform_master_key',
      });
      continue;
    }

    const marketUsd = positivePriceOrNull(row.marketPriceUsd);
    const costUsd = positivePriceOrNull(row.costPerKgUsd);
    const formulaFallback = !hasPositivePrice(marketUsd, costUsd)
      ? deriveFormulaFallbackPrice(row, catalog.materials, family, aedPerUsd)
      : null;

    const effectiveMarketUsd = marketUsd ?? formulaFallback?.marketUsd ?? null;
    const effectiveCostUsd = costUsd ?? formulaFallback?.costUsd ?? null;

    if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
      const noPebiPrice = !hasPositivePrice(marketUsd, costUsd) && formulaFallback == null;
      if (shouldHoldPlatformPrice(family, row.esPlatformMasterKey) && noPebiPrice) {
        const existing = await findTenantMaterial(tenantId, row);
        const platformFallback = await loadPlatformMaterialFallback(row.esPlatformMasterKey);
        const held = resolveHeldPlatformPrice(existing, platformFallback);
        if (held) {
          continue;
        }
      }

      missing.push({
        pbGradeKey: row.pebiGradeKey,
        pbGrade: pbGradeFromKey(row.pebiGradeKey),
        reason:
          row.mappingStatus === 'needs_subgroup_members'
            ? 'no_subgroup_members'
            : 'no_live_price_after_fallback',
      });
    }
  }

  return {
    family: catalog.family,
    total: catalog.materials.length,
    missing,
    source,
  };
}

/**
 * PET review queue (backward compatible).
 */
export async function getPetMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'PET');
}

export async function getAluMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'ALU');
}

export async function getBoppMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'BOPP');
}

export async function getCppMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'CPP');
}

export async function getPaMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'PA');
}

export async function getPapMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'PAP');
}

export async function syncPetMaterialsForPlatformCompany(
  platformCompanyCode: string
): Promise<MaterialSyncResult> {
  const db = getDatabase();
  const [tenant] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, platformCompanyCode))
    .limit(1);

  if (!tenant) {
    throw new Error(`No ES tenant linked to platform_company_code=${platformCompanyCode}`);
  }

  return syncPetMaterialsFromPebiForTenant(tenant.id);
}

export async function syncAllPebiMaterialsForPlatformCompany(
  platformCompanyCode: string
): Promise<MaterialSyncResult[]> {
  const db = getDatabase();
  const [tenant] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, platformCompanyCode))
    .limit(1);

  if (!tenant) {
    throw new Error(`No ES tenant linked to platform_company_code=${platformCompanyCode}`);
  }

  return syncAllPebiMaterialsFromPebiForTenant(tenant.id);
}
