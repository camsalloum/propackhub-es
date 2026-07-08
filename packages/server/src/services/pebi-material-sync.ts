/**
 * Sync PET substrate prices from PEBI into ES tenant materials.
 * Uses PEBI HTTP integration API when configured, else direct PEBI_DATABASE_URL + shared catalog builder.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.js';

export const PEBI_MATERIAL_SOURCE = 'pebi';

const require = createRequire(import.meta.url);
const pphCatalogPath = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../../../pph/server/services/pebi-es-pet-catalog.js'
);
const { buildPetMaterialsCatalog } = require(pphCatalogPath) as {
  buildPetMaterialsCatalog: (
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

function toDecimalString(value: number | null | undefined, fallback: string): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toFixed(4);
}

async function loadPebiPetMaterials(
  companyCode: string,
  aedPerUsd: number
): Promise<{ catalog: PebiMaterialsCatalog; source: 'pebi_api' | 'pebi_db' }> {
  const dbUrl = process.env.PEBI_DATABASE_URL?.trim();
  const apiUrl = process.env.PEBI_API_URL?.trim();
  const secret = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();

  if (dbUrl) {
    const pool = new Pool({ connectionString: dbUrl, max: 2 });
    try {
      const catalog = await buildPetMaterialsCatalog(pool, { aedPerUsd });
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
        params: { family: 'PET', aedPerUsd },
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
): Promise<{ id: string; isTenantOnly: boolean } | undefined> {
  const db = getDatabase();

  const [byExternal] = await db
    .select({ id: schema.materials.id, isTenantOnly: schema.materials.isTenantOnly })
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        eq(schema.materials.externalSource, PEBI_MATERIAL_SOURCE),
        eq(schema.materials.externalId, row.pebiGradeKey)
      )
    )
    .limit(1);

  if (byExternal) return byExternal;

  const [byPlatformKey] = await db
    .select({ id: schema.materials.id, isTenantOnly: schema.materials.isTenantOnly })
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        eq(schema.materials.platformMasterKey, row.esPlatformMasterKey)
      )
    )
    .limit(1);

  return byPlatformKey;
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

const PET_WHITE_FALLBACK_KEYS = new Set(['pet-white', 'pet-twist-white']);
const PET_TRANSPARENT_KEY = 'pet-transparent';
const PET_WHITE_PRICE_DELTA_USD = 0.4;

function positivePriceOrNull(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null;
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

async function resolveMaterialName(platformMasterKey: string, substrateGrade: string): Promise<string> {
  const db = getDatabase();
  const [platformRow] = await db
    .select({ name: schema.platformMasterMaterials.name })
    .from(schema.platformMasterMaterials)
    .where(eq(schema.platformMasterMaterials.key, platformMasterKey))
    .limit(1);

  return platformRow?.name ?? substrateGrade;
}

export async function syncPetMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
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

  const aedPerUsd = Number(tenant.exchangeRateUsdToDisplay) > 0
    ? Number(tenant.exchangeRateUsdToDisplay)
    : 3.6725;

  const { catalog, source } = await loadPebiPetMaterials(tenant.platformCompanyCode, aedPerUsd);
  const now = new Date();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of catalog.materials) {
    if (!row.esPlatformMasterKey) {
      skipped++;
      continue;
    }

    const marketUsd = positivePriceOrNull(row.marketPriceUsd);
    const costUsd = positivePriceOrNull(row.costPerKgUsd);
    const formulaFallback = !hasPositivePrice(marketUsd, costUsd)
      ? derivePetWhiteFallbackPrice(row, catalog.materials)
      : null;
    const effectiveMarketUsd = marketUsd ?? formulaFallback?.marketUsd ?? null;
    const effectiveCostUsd = costUsd ?? formulaFallback?.costUsd ?? null;

    if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
      skipped++;
      continue;
    }

    const existing = await findTenantMaterial(tenantId, row);
    if (existing?.isTenantOnly) {
      skipped++;
      continue;
    }

    const platformFallback = await loadPlatformMaterialFallback(row.esPlatformMasterKey);
    const resolvedCost = effectiveCostUsd ?? effectiveMarketUsd ?? 0;
    const resolvedMarket = effectiveMarketUsd ?? effectiveCostUsd ?? resolvedCost;
    const density =
      row.densityGCm3 != null && row.densityGCm3 > 0
        ? row.densityGCm3
        : Number(platformFallback?.density ?? 1.4);
    const solidPercent =
      row.solidPercent != null && row.solidPercent > 0
        ? row.solidPercent
        : platformFallback?.solidPercent ?? 100;

    const patch = {
      substrateFamily: row.substrateFamily,
      substrateGrade: row.substrateGrade,
      marketPriceUsd: toDecimalString(resolvedMarket, toDecimalString(resolvedCost, '0')),
      costPerKgUsd: toDecimalString(resolvedCost, '0'),
      density: toDecimalString(density, '1.4000'),
      solidPercent,
      priceSource: 'pebi' as const,
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
    tenantId,
    platformCompanyCode: tenant.platformCompanyCode,
    family: catalog.family,
    inserted,
    updated,
    skipped,
    unmappedCount: catalog.unmapped.length,
    total: catalog.materials.length,
    source,
  };
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
