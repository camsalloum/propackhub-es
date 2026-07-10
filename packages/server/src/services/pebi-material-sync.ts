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
import { deriveBinderConcentrateStats, type LaminationRecipe } from '@es/engine';
import { getDatabase, schema } from '../db/index.js';

export const PEBI_MATERIAL_SOURCE = 'pebi';
export const PEBI_SYNC_FAMILIES = [
  'PET',
  'ALU',
  'BOPP',
  'CPP',
  'PA',
  'PAP',
  'SLEEVE',
  'SPECIALTY',
  'PE',
  'INK',
  'ADHESIVE',
  'SOLVENT',
  'PACKAGING',
] as const;
export type PebiSyncFamily = (typeof PEBI_SYNC_FAMILIES)[number];

const require = createRequire(import.meta.url);
const pphServicesPath = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../../../pph/server/services'
);

type CatalogBuilder = (
  pool: Pool,
  options?: { aedPerUsd?: number }
) => Promise<PebiMaterialsCatalog>;

const CATALOG_MODULES: Record<PebiSyncFamily, { file: string; exportName: string }> = {
  PET: { file: 'pebi-es-pet-catalog.js', exportName: 'buildPetMaterialsCatalog' },
  ALU: { file: 'pebi-es-alu-catalog.js', exportName: 'buildAluMaterialsCatalog' },
  BOPP: { file: 'pebi-es-bopp-catalog.js', exportName: 'buildBoppMaterialsCatalog' },
  CPP: { file: 'pebi-es-cpp-catalog.js', exportName: 'buildCppMaterialsCatalog' },
  PA: { file: 'pebi-es-pa-catalog.js', exportName: 'buildPaMaterialsCatalog' },
  PAP: { file: 'pebi-es-pap-catalog.js', exportName: 'buildPapMaterialsCatalog' },
  SLEEVE: { file: 'pebi-es-sleeve-catalog.js', exportName: 'buildSleeveMaterialsCatalog' },
  SPECIALTY: { file: 'pebi-es-specialty-catalog.js', exportName: 'buildSpecialtyMaterialsCatalog' },
  PE: { file: 'pebi-es-pe-catalog.js', exportName: 'buildPeMaterialsCatalog' },
  INK: { file: 'pebi-es-ink-catalog.js', exportName: 'buildInkMaterialsCatalog' },
  ADHESIVE: { file: 'pebi-es-adhesive-catalog.js', exportName: 'buildAdhesiveMaterialsCatalog' },
  SOLVENT: { file: 'pebi-es-solvent-catalog.js', exportName: 'buildSolventMaterialsCatalog' },
  PACKAGING: { file: 'pebi-es-packaging-catalog.js', exportName: 'buildPackagingMaterialsCatalog' },
};

const catalogBuilderCache = new Map<PebiSyncFamily, CatalogBuilder>();

function getCatalogBuilder(family: PebiSyncFamily): CatalogBuilder {
  const cached = catalogBuilderCache.get(family);
  if (cached) return cached;

  const spec = CATALOG_MODULES[family];
  const mod = require(`${pphServicesPath}/${spec.file}`) as Record<string, CatalogBuilder>;
  const builder = mod[spec.exportName];
  if (typeof builder !== 'function') {
    throw new Error(`PEBI catalog builder ${spec.exportName} missing in ${spec.file}`);
  }
  catalogBuilderCache.set(family, builder);
  return builder;
}

export type PebiMaterialRow = {
  pebiGradeKey: string;
  esPlatformMasterKey: string;
  type: string;
  substrateFamily: string;
  substrateGrade: string;
  marketPriceUsd: number | null;
  costPerKgUsd: number | null;
  /** Liquid $/kg from PEBI for ink/adhesive — ES converts to dry using ES solid%. */
  liquidCostUsd?: number | null;
  densityGCm3: number | null;
  solidPercent: number | null;
  hasStock: boolean;
  pricePolicy: string;
  mappingStatus: string;
  priceBasis?: 'liquid' | 'solid' | string | null;
  recipeComponentPrices?: Array<{
    role: string;
    sku?: string;
    parts?: number;
    pricePerKgUsd: number;
  }> | null;
  alternateComponentPrices?: Array<{
    role: string;
    sku?: string;
    parts?: number;
    pricePerKgUsd: number;
  }> | null;
  substrateHoover?: string | null;
  nominalGsm?: number | null;
  /** Packaging: kgs | mtr | rol | pcs */
  priceUnit?: string | null;
  unitPriceUsd?: number | null;
  packagingRole?: string | null;
  compositionUnparsedDescriptions?: string[] | null;
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

function toDecimalString(value: number | null | undefined, fallback: string, decimals = 4): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toFixed(decimals);
}

function toDensityString(value: number | null | undefined, fallback: string): string {
  return toDecimalString(value, fallback, 2);
}

async function buildMaterialsCatalog(
  pool: Pool,
  family: PebiSyncFamily,
  aedPerUsd: number
): Promise<PebiMaterialsCatalog> {
  return getCatalogBuilder(family)(pool, { aedPerUsd });
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
      density: string;
      solidPercent: number;
      laminationRecipe: LaminationRecipe | null;
      priceSource: 'excel' | 'manual' | 'platform' | 'pebi';
    }
  | undefined
> {
  const db = getDatabase();
  const selectFields = {
    id: schema.materials.id,
    isTenantOnly: schema.materials.isTenantOnly,
    marketPriceUsd: schema.materials.marketPriceUsd,
    costPerKgUsd: schema.materials.costPerKgUsd,
    density: schema.materials.density,
    solidPercent: schema.materials.solidPercent,
    laminationRecipe: schema.materials.laminationRecipe,
    priceSource: schema.materials.priceSource,
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

  if (byPlatformKey) {
    return {
      ...byPlatformKey,
      laminationRecipe: asLaminationRecipe(byPlatformKey.laminationRecipe),
    };
  }

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

  if (!byExternal) return undefined;
  return {
    ...byExternal,
    laminationRecipe: asLaminationRecipe(byExternal.laminationRecipe),
  };
}

async function loadPlatformMaterialFallback(platformMasterKey: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      density: schema.platformMasterMaterials.density,
      solidPercent: schema.platformMasterMaterials.solidPercent,
      costPerKgUsd: schema.platformMasterMaterials.costPerKgUsd,
      marketPriceUsd: schema.platformMasterMaterials.marketPriceUsd,
      laminationRecipe: schema.platformMasterMaterials.laminationRecipe,
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
const PVC_BLOW_SLEEVE_KEY = 'pvc-shrink-normal-shrink-blown';
const PVC_CAST_SLEEVE_KEY = 'pvc-shrink-high-shrink-cast';
const PVC_CAST_FORMULA_DELTA_USD = 0.8;
/** Grades without PB stock — keep tenant/platform price until PEBI has a live price. */
const PLATFORM_PRICE_HOLD_KEYS_BY_FAMILY: Partial<Record<PebiSyncFamily, ReadonlySet<string>>> = {
  PA: new Set(['bopa-transparent-hb', 'pa-pe']),
  PAP: new Set(['kraft-paper-brown', 'mg-paper']),
};

function shouldHoldPlatformPrice(family: PebiSyncFamily, platformMasterKey: string): boolean {
  return PLATFORM_PRICE_HOLD_KEYS_BY_FAMILY[family]?.has(platformMasterKey) ?? false;
}

function allowsManualPriceFallback(family: PebiSyncFamily): boolean {
  return family === 'PE' || family === 'INK' || family === 'ADHESIVE' || family === 'SOLVENT';
}

function packagingUnitPriceUsd(row: PebiMaterialRow): number | null {
  return (
    positivePriceOrNull(row.unitPriceUsd) ??
    positivePriceOrNull(row.costPerKgUsd) ??
    positivePriceOrNull(row.marketPriceUsd)
  );
}

function packagingPriceFields(row: PebiMaterialRow, unitPriceUsd: number) {
  const unit = String(row.priceUnit || 'kgs').toLowerCase();
  return {
    priceUnit: unit,
    unitPriceUsd: toDecimalString(unitPriceUsd, '0', 4),
    costPerKgUsd: unit === 'kgs' ? toDecimalString(unitPriceUsd, '0') : '0',
    costPerMeterUsd: unit === 'mtr' ? toDecimalString(unitPriceUsd, '0', 4) : null,
    costPerPieceUsd: unit === 'pcs' || unit === 'rol' ? toDecimalString(unitPriceUsd, '0', 4) : null,
  };
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

/** PEBI ink prices are liquid $/kg; ES costing uses dry $/kg = liquid / (solid%/100). */
function resolveInkDryCostUsd(
  row: PebiMaterialRow,
  solidPercent: number
): { marketUsd: number | null; costUsd: number | null } {
  const liquid =
    positivePriceOrNull(row.liquidCostUsd) ??
    positivePriceOrNull(row.marketPriceUsd) ??
    positivePriceOrNull(row.costPerKgUsd);
  if (liquid == null) return { marketUsd: null, costUsd: null };
  const solid = solidPercent > 0 && solidPercent <= 100 ? solidPercent : 100;
  const dry = roundUsd(liquid / (solid / 100));
  return { marketUsd: dry, costUsd: dry };
}

function asLaminationRecipe(value: unknown): LaminationRecipe | null {
  if (!value || typeof value !== 'object') return null;
  const recipe = value as LaminationRecipe;
  if (!Array.isArray(recipe.components)) return null;
  return recipe;
}

function applyComponentPricesToRecipe(
  recipe: LaminationRecipe,
  prices: NonNullable<PebiMaterialRow['recipeComponentPrices']>,
  alternatePrices?: PebiMaterialRow['alternateComponentPrices']
): LaminationRecipe {
  const byRole = new Map(prices.map((p) => [p.role, p.pricePerKgUsd]));
  const next: LaminationRecipe = {
    ...recipe,
    components: recipe.components.map((c) => {
      if (c.role === 'solvent') return c;
      const price = byRole.get(c.role);
      return price != null ? { ...c, pricePerKgUsd: price } : c;
    }),
  };
  if (recipe.alternate && alternatePrices?.length) {
    const altByRole = new Map(alternatePrices.map((p) => [p.role, p.pricePerKgUsd]));
    next.alternate = {
      ...recipe.alternate,
      components: recipe.alternate.components.map((c) => {
        if (c.role === 'solvent') return c;
        const price = altByRole.get(c.role);
        return price != null ? { ...c, pricePerKgUsd: price } : c;
      }),
    };
  }
  return next;
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

function deriveSleevePvcCastFallbackPrice(
  row: PebiMaterialRow,
  catalogRows: PebiMaterialRow[]
): { marketUsd: number; costUsd: number } | null {
  if (row.esPlatformMasterKey !== PVC_CAST_SLEEVE_KEY) return null;

  const blow = catalogRows.find((candidate) => candidate.esPlatformMasterKey === PVC_BLOW_SLEEVE_KEY);
  if (!blow) return null;

  const blowMarket = positivePriceOrNull(blow.marketPriceUsd);
  const blowCost = positivePriceOrNull(blow.costPerKgUsd);
  const blowBase = blowMarket ?? blowCost;
  if (blowBase == null) return null;

  const fallback = roundUsd(blowBase + PVC_CAST_FORMULA_DELTA_USD);
  return {
    marketUsd: fallback,
    costUsd: fallback,
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
  if (family === 'SLEEVE') {
    return deriveSleevePvcCastFallbackPrice(row, catalogRows);
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

    const platformFallback = await loadPlatformMaterialFallback(row.esPlatformMasterKey);
    const isInkFamily = family === 'INK';
    const isAdhesiveFamily = family === 'ADHESIVE';
    const isSolventFamily = family === 'SOLVENT';
    const isPackagingFamily = family === 'PACKAGING';
    const preservePhysical = isInkFamily || isAdhesiveFamily || isSolventFamily || isPackagingFamily;

    // INK/ADHESIVE/SOLVENT: never overwrite ES solid% / density from PEBI (catalog sends null).
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
                : family === 'SLEEVE'
                  ? 1.32
                  : family === 'SPECIALTY'
                    ? 0.85
                    : family === 'PE'
                      ? 0.92
                      : family === 'INK' || family === 'ADHESIVE'
                        ? 1.1
                        : family === 'SOLVENT'
                          ? 0.9
                          : family === 'PACKAGING'
                            ? 1
                            : 1.4;

    let solidPercent: number;
    let density: number;
    let laminationRecipe: LaminationRecipe | null = null;

    if (preservePhysical) {
      const existingSolid = existing?.solidPercent;
      const existingDensity = existing?.density != null ? Number(existing.density) : null;
      solidPercent =
        existingSolid != null && existingSolid > 0
          ? existingSolid
          : platformFallback?.solidPercent ?? 100;
      density =
        existingDensity != null && existingDensity > 0
          ? existingDensity
          : Number(platformFallback?.density ?? defaultDensity);
      if (isAdhesiveFamily) {
        laminationRecipe =
          asLaminationRecipe(existing?.laminationRecipe) ??
          asLaminationRecipe(platformFallback?.laminationRecipe);
      }
    } else {
      density =
        row.densityGCm3 != null && row.densityGCm3 > 0
          ? row.densityGCm3
          : Number(platformFallback?.density ?? defaultDensity);
      solidPercent =
        row.solidPercent != null && row.solidPercent > 0
          ? row.solidPercent
          : platformFallback?.solidPercent ?? 100;
    }

    let effectiveMarketUsd: number | null = null;
    let effectiveCostUsd: number | null = null;
    let priceSource: 'pebi' | 'platform' | 'manual' = 'pebi';

    if (isAdhesiveFamily && laminationRecipe && row.recipeComponentPrices?.length) {
      laminationRecipe = applyComponentPricesToRecipe(
        laminationRecipe,
        row.recipeComponentPrices,
        row.alternateComponentPrices
      );
      const stats = deriveBinderConcentrateStats(laminationRecipe);
      solidPercent = Math.round(stats.solidPercent);
      effectiveCostUsd = roundUsd(stats.costPerKgUsd);
      effectiveMarketUsd = effectiveCostUsd;
      if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
        if (allowsManualPriceFallback(family)) {
          const existingMarket = decimalPriceOrNull(existing?.marketPriceUsd);
          const existingCost = decimalPriceOrNull(existing?.costPerKgUsd);
          effectiveCostUsd = existingCost ?? 0;
          effectiveMarketUsd = existingMarket ?? existingCost ?? 0;
          priceSource = 'manual';
        } else {
          skipped++;
          continue;
        }
      }
    } else if (isInkFamily) {
      const inkDry = resolveInkDryCostUsd(row, solidPercent);
      effectiveMarketUsd = inkDry.marketUsd;
      effectiveCostUsd = inkDry.costUsd;
      if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
        if (allowsManualPriceFallback(family)) {
          const existingMarket = decimalPriceOrNull(existing?.marketPriceUsd);
          const existingCost = decimalPriceOrNull(existing?.costPerKgUsd);
          effectiveCostUsd = existingCost ?? 0;
          effectiveMarketUsd = existingMarket ?? existingCost ?? 0;
          priceSource = 'manual';
        } else {
          skipped++;
          continue;
        }
      }
    } else if (isSolventFamily) {
      const liquidUsd =
        positivePriceOrNull(row.liquidCostUsd) ?? positivePriceOrNull(row.marketPriceUsd);
      effectiveMarketUsd = liquidUsd;
      effectiveCostUsd = liquidUsd;
      if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
        if (allowsManualPriceFallback(family)) {
          const existingMarket = decimalPriceOrNull(existing?.marketPriceUsd);
          const existingCost = decimalPriceOrNull(existing?.costPerKgUsd);
          effectiveCostUsd = existingCost ?? 0;
          effectiveMarketUsd = existingMarket ?? existingCost ?? 0;
          priceSource = 'manual';
        } else {
          skipped++;
          continue;
        }
      }
    } else if (isPackagingFamily) {
      const unitPrice = packagingUnitPriceUsd(row);
      if (!hasPositivePrice(unitPrice, unitPrice)) {
        skipped++;
        continue;
      }
      effectiveMarketUsd = unitPrice;
      effectiveCostUsd = unitPrice;
    } else {
      const marketUsd = positivePriceOrNull(row.marketPriceUsd);
      const costUsd = positivePriceOrNull(row.costPerKgUsd);
      const formulaFallback = !hasPositivePrice(marketUsd, costUsd)
        ? deriveFormulaFallbackPrice(row, catalog.materials, family, aedPerUsd)
        : null;
      effectiveMarketUsd = marketUsd ?? formulaFallback?.marketUsd ?? null;
      effectiveCostUsd = costUsd ?? formulaFallback?.costUsd ?? null;

      const noPebiPrice = !hasPositivePrice(marketUsd, costUsd) && formulaFallback == null;
      if (shouldHoldPlatformPrice(family, row.esPlatformMasterKey) && noPebiPrice) {
        const held = resolveHeldPlatformPrice(existing, platformFallback);
        if (!held) {
          skipped++;
          continue;
        }
        effectiveMarketUsd = held.marketUsd;
        effectiveCostUsd = held.costUsd;
        priceSource = 'platform';
      } else if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
        if (allowsManualPriceFallback(family)) {
          const existingMarket = decimalPriceOrNull(existing?.marketPriceUsd);
          const existingCost = decimalPriceOrNull(existing?.costPerKgUsd);
          effectiveCostUsd = existingCost ?? 0;
          effectiveMarketUsd = existingMarket ?? existingCost ?? 0;
          priceSource = 'manual';
        } else {
          skipped++;
          continue;
        }
      }
    }

    const resolvedCost = effectiveCostUsd ?? effectiveMarketUsd ?? 0;
    const resolvedMarket = effectiveMarketUsd ?? effectiveCostUsd ?? resolvedCost;
    const packagingFields = isPackagingFamily
      ? packagingPriceFields(row, resolvedCost)
      : null;

    const patch: Record<string, unknown> = {
      substrateFamily: row.substrateFamily,
      substrateGrade: row.substrateGrade,
      marketPriceUsd: toDecimalString(resolvedMarket, toDecimalString(resolvedCost, '0')),
      costPerKgUsd: packagingFields?.costPerKgUsd ?? toDecimalString(resolvedCost, '0'),
      density: toDensityString(density, toDensityString(defaultDensity, '1.40')),
      solidPercent,
      priceSource,
      platformMasterKey: row.esPlatformMasterKey,
      platformSyncedAt: now,
      externalId: row.pebiGradeKey,
      externalSource: PEBI_MATERIAL_SOURCE,
      ...(row.packagingRole || row.substrateHoover ? { hoover: row.packagingRole ?? row.substrateHoover } : {}),
      ...(laminationRecipe ? { laminationRecipe } : {}),
      ...(packagingFields ?? {}),
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
        type: isInkFamily
          ? 'ink'
          : isAdhesiveFamily
            ? 'adhesive'
            : isSolventFamily
              ? 'solvent'
              : isPackagingFamily
                ? 'packaging'
                : 'substrate',
        solidPercent: solidPercent,
        density: toDensityString(density, toDensityString(defaultDensity, '1.40')),
        costPerKgUsd: packagingFields?.costPerKgUsd ?? toDecimalString(resolvedCost, '0'),
        marketPriceUsd: toDecimalString(resolvedMarket, toDecimalString(resolvedCost, '0')),
        substrateFamily: row.substrateFamily,
        substrateGrade: row.substrateGrade,
        priceSource,
        platformMasterKey: row.esPlatformMasterKey,
        platformSyncedAt: now,
        externalId: row.pebiGradeKey,
        externalSource: PEBI_MATERIAL_SOURCE,
        ...(row.packagingRole ? { hoover: row.packagingRole } : row.substrateHoover ? { hoover: row.substrateHoover } : {}),
        ...(laminationRecipe ? { laminationRecipe } : {}),
        ...(packagingFields ?? {}),
        updatedAt: now,
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

  if (family === 'SOLVENT') {
    await refreshTenantSolventCommon(tenantId);
  }

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

export async function syncSleeveMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'SLEEVE');
}

export async function syncSpecialtyMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'SPECIALTY');
}

export async function syncPeMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'PE');
}

export async function syncInkMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'INK');
}

export async function syncAdhesiveMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'ADHESIVE');
}

export async function syncSolventMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'SOLVENT');
}

export async function syncPackagingMaterialsFromPebiForTenant(tenantId: string): Promise<MaterialSyncResult> {
  return syncFamilyMaterialsFromPebiForTenant(tenantId, 'PACKAGING');
}

/**
 * After SOLVENT price sync, recompute tenant Solvent Common from peer solvents.
 */
async function refreshTenantSolventCommon(tenantId: string): Promise<void> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(schema.materials)
    .where(and(eq(schema.materials.tenantId, tenantId), eq(schema.materials.type, 'solvent')));

  const peers = rows.filter(
    (r) =>
      r.platformMasterKey !== 'solvent-common' &&
      r.platformMasterKey !== 'solvent-sleeve-seaming' &&
      Number(r.costPerKgUsd) > 0 &&
      Number(r.density) > 0
  );
  if (peers.length === 0) return;

  const cost =
    Math.round((peers.reduce((s, r) => s + Number(r.costPerKgUsd), 0) / peers.length) * 100) / 100;
  const density =
    Math.round((peers.reduce((s, r) => s + Number(r.density), 0) / peers.length) * 1000) / 1000;

  const common = rows.find((r) => r.platformMasterKey === 'solvent-common');
  if (!common) return;

  // Keep seaming mix price aligned to THF (or dioxolane) after sync.
  const thf = rows.find((r) => r.platformMasterKey === 'solvent-thf');
  const diox = rows.find((r) => r.platformMasterKey === 'solvent-dioxolane');
  const seaming = rows.find((r) => r.platformMasterKey === 'solvent-sleeve-seaming');
  const thfPrice = thf ? Number(thf.costPerKgUsd) : null;
  if (thfPrice != null && thfPrice > 0 && diox) {
    await db
      .update(schema.materials)
      .set({
        costPerKgUsd: toDecimalString(thfPrice, '0'),
        marketPriceUsd: toDecimalString(thfPrice, '0'),
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, diox.id));
  }
  if (thfPrice != null && thfPrice > 0 && seaming) {
    await db
      .update(schema.materials)
      .set({
        costPerKgUsd: toDecimalString(thfPrice, '0'),
        marketPriceUsd: toDecimalString(thfPrice, '0'),
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, seaming.id));
  }

  await db
    .update(schema.materials)
    .set({
      costPerKgUsd: toDecimalString(cost, '0'),
      marketPriceUsd: toDecimalString(cost, '0'),
      density: toDensityString(density, '0.85'),
      hoover: 'Average of all solvents (price + density)',
      updatedAt: new Date(),
    })
    .where(eq(schema.materials.id, common.id));
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

    if (row.compositionUnparsedDescriptions?.length) {
      missing.push({
        pbGradeKey: row.pebiGradeKey,
        pbGrade: pbGradeFromKey(row.pebiGradeKey),
        reason: 'unparsed_composition',
      });
      continue;
    }

    const marketUsd = positivePriceOrNull(row.marketPriceUsd);
    const costUsd = positivePriceOrNull(row.costPerKgUsd);
    const liquidUsd = positivePriceOrNull(row.liquidCostUsd);
    const formulaFallback =
      family !== 'INK' &&
      family !== 'ADHESIVE' &&
      family !== 'SOLVENT' &&
      family !== 'PACKAGING' &&
      !hasPositivePrice(marketUsd, costUsd)
        ? deriveFormulaFallbackPrice(row, catalog.materials, family, aedPerUsd)
        : null;

    const effectiveMarketUsd =
      family === 'INK' || family === 'ADHESIVE' || family === 'SOLVENT'
        ? liquidUsd ?? marketUsd
        : family === 'PACKAGING'
          ? packagingUnitPriceUsd(row)
          : marketUsd ?? formulaFallback?.marketUsd ?? null;
    const effectiveCostUsd =
      family === 'INK' || family === 'ADHESIVE' || family === 'SOLVENT'
        ? liquidUsd ?? marketUsd ?? costUsd
        : family === 'PACKAGING'
          ? packagingUnitPriceUsd(row)
          : costUsd ?? formulaFallback?.costUsd ?? null;

    if (!hasPositivePrice(effectiveMarketUsd, effectiveCostUsd)) {
      const noPebiPrice =
        family === 'INK' || family === 'ADHESIVE' || family === 'SOLVENT'
          ? !hasPositivePrice(liquidUsd, marketUsd)
          : family === 'PACKAGING'
            ? !hasPositivePrice(packagingUnitPriceUsd(row), packagingUnitPriceUsd(row))
            : !hasPositivePrice(marketUsd, costUsd) && formulaFallback == null;
      if (shouldHoldPlatformPrice(family, row.esPlatformMasterKey) && noPebiPrice) {
        const existing = await findTenantMaterial(tenantId, row);
        const platformFallback = await loadPlatformMaterialFallback(row.esPlatformMasterKey);
        const held = resolveHeldPlatformPrice(existing, platformFallback);
        if (held) {
          continue;
        }
      }

      if (allowsManualPriceFallback(family)) {
        const existing = await findTenantMaterial(tenantId, row);
        if (hasPositivePrice(decimalPriceOrNull(existing?.marketPriceUsd), decimalPriceOrNull(existing?.costPerKgUsd))) {
          continue;
        }
        missing.push({
          pbGradeKey: row.pebiGradeKey,
          pbGrade: pbGradeFromKey(row.pebiGradeKey),
          reason: 'awaiting_manual_price',
        });
        continue;
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

export async function getSleeveMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'SLEEVE');
}

export async function getSpecialtyMaterialsMissingForTenant(tenantId: string): Promise<PebiMissingMaterialsResult> {
  return getMaterialsMissingForTenant(tenantId, 'SPECIALTY');
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
