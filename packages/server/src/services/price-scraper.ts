/**
 * Market price refresh for resin families.
 *
 * DECISION (audit 4.3, 2026-07-04): Accept unofficial Yahoo Finance chart/quote
 * endpoints (`query1.finance.yahoo.com`) with a two-URL fallback and
 * `FALLBACK_RESIN_USD_PER_KG` when both fail. No SLA — suitable for advisory
 * "market" column only, not for locked quote costing (user prices stay on
 * platform master / library). Revisit if a paid commodity feed is budgeted.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { log } from '../utils/logger';

type MaterialRow = typeof schema.materials.$inferSelect;

interface PriceSource {
  name: string;
  type: 'api';
  url: string;
}

interface PriceSourcesConfig {
  sources: PriceSource[];
  resin_mapping: Record<string, string[]>;
  conversion_factors: Record<string, number>;
  alert_threshold_percent: number;
  /** Yahoo polymer futures are quoted USD per pound */
  futures_unit: 'USD_per_lb';
}

const LB_TO_KG = 2.2046226218;

function loadConfig(): PriceSourcesConfig {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), 'price-sources.json');
  return JSON.parse(readFileSync(path, 'utf8')) as PriceSourcesConfig;
}

const config = loadConfig();
const CONVERSION = config.conversion_factors;

const FAMILY_TO_RESIN: Record<string, string> = {
  PE: 'LLDPE',
  BOPP: 'PP',
  CPP: 'PP',
  PET: 'PET',
  PA: 'PET',
  SLEEVE: 'PET',
  PAPER: 'LDPE',
  SPECIALTY: 'PP',
};

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ProPackHub-ES/1.0)',
  Accept: 'application/json',
};

/** Fetch CME-style futures price and convert to USD/kg resin. */
async function getYahooFuturesUsdPerKg(symbol: string): Promise<number | null> {
  const encoded = encodeURIComponent(symbol);
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=5d`,
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encoded}`,
  ];

  for (const url of urls) {
    try {
      const response = await axios.get(url, { timeout: 8000, headers: HTTP_HEADERS });
      const data = response.data;

      const chartPrice = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof chartPrice === 'number' && chartPrice > 0) {
        return chartPrice * LB_TO_KG;
      }

      const quotePrice = data?.quoteResponse?.result?.[0]?.regularMarketPrice;
      if (typeof quotePrice === 'number' && quotePrice > 0) {
        return quotePrice * LB_TO_KG;
      }
    } catch (err: unknown) {
      log.warn(
        { symbol, err: err instanceof Error ? err.message : err },
        'Yahoo fetch failed'
      );
    }
  }

  return null;
}

async function scrapeResinPriceUsdPerKg(resin: string): Promise<{ price: number | null; symbol: string | null }> {
  const sources = config.resin_mapping[resin] || [];

  for (const sourceRef of sources) {
    const [sourceName, symbol] = sourceRef.split(':');
    const source = config.sources.find((s) => s.name === sourceName);
    if (!source || source.type !== 'api' || !symbol) continue;

    const price = await getYahooFuturesUsdPerKg(symbol);
    if (price != null) return { price, symbol };
  }

  return { price: null, symbol: null };
}

const FALLBACK_RESIN_USD_PER_KG: Record<string, number> = {
  LDPE: 0.85,
  LLDPE: 0.88,
  HDPE: 0.92,
  PP: 0.95,
  PET: 1.2,
};

function resinToFilmUsdPerKg(resinUsdPerKg: number, family: string): number {
  const factor = CONVERSION[family] || 1.2;
  return Math.round(resinUsdPerKg * factor * 100) / 100;
}

function resolveResinForFamily(family: string): string | null {
  if (family === 'ALU') return null;
  return FAMILY_TO_RESIN[family] || null;
}

export interface MarketRefreshChange {
  material: string;
  family: string;
  old: number;
  new: number;
  source: string;
}

export interface MarketRefreshResult {
  updated: number;
  skipped: number;
  errors: string[];
  changes: MarketRefreshChange[];
  sources: { family: string; resin: string; symbol: string | null; resinUsdPerKg: number; filmUsdPerKg: number }[];
  note: string;
}

/**
 * Refresh market prices for one tenant from free Yahoo Finance polymer futures.
 * User Price (costPerKgUsd) is never changed — only marketPriceUsd.
 * Grade premiums are preserved relative to the family average user price.
 */
export async function refreshMaterialPrices(tenantId: string): Promise<MarketRefreshResult> {
  const db = getDatabase();
  const errors: string[] = [];
  const changes: MarketRefreshChange[] = [];
  const sources: MarketRefreshResult['sources'] = [];

  const substrates: MaterialRow[] = await db
    .select()
    .from(schema.materials)
    .where(and(eq(schema.materials.tenantId, tenantId), eq(schema.materials.type, 'substrate')));

  const families = [...new Set(substrates.map((m) => m.substrateFamily).filter(Boolean))] as string[];
  const familyFilmPrice: Record<string, number> = {};
  const resinCache: Record<string, number> = {};

  for (const family of families) {
    const resin = resolveResinForFamily(family);
    if (!resin) {
      errors.push(`${family}: no free market feed (user price unchanged)`);
      continue;
    }

    if (!resinCache[resin]) {
      let { price, symbol } = await scrapeResinPriceUsdPerKg(resin);
      if (price == null) {
        price = FALLBACK_RESIN_USD_PER_KG[resin] ?? 1.0;
        errors.push(`${resin}: Yahoo unavailable — used fallback $${price.toFixed(2)}/kg resin`);
        symbol = symbol ?? config.resin_mapping[resin]?.[0]?.split(':')[1] ?? null;
      }
      resinCache[resin] = price;
      sources.push({
        family,
        resin,
        symbol,
        resinUsdPerKg: price,
        filmUsdPerKg: resinToFilmUsdPerKg(price, family),
      });
    }

    const resinUsd = resinCache[resin];
    familyFilmPrice[family] = resinToFilmUsdPerKg(resinUsd, family);
  }

  const familyAvgUser: Record<string, number> = {};
  for (const family of families) {
    const rows = substrates.filter((m) => m.substrateFamily === family);
    const sum = rows.reduce((acc, m) => acc + parseFloat(m.costPerKgUsd), 0);
    familyAvgUser[family] = rows.length > 0 ? sum / rows.length : 0;
  }

  let updated = 0;
  let skipped = 0;

  for (const mat of substrates) {
    const family = mat.substrateFamily;
    if (!family || familyFilmPrice[family] == null) continue;

    const baseFilm = familyFilmPrice[family];
    const avgUser = familyAvgUser[family] || 0;
    const userPrice = parseFloat(mat.costPerKgUsd);

    let newPrice = baseFilm;
    if (avgUser > 0 && userPrice > 0) {
      newPrice = Math.round(baseFilm * (userPrice / avgUser) * 100) / 100;
    }

    const oldPrice = parseFloat(mat.marketPriceUsd || mat.costPerKgUsd || '0');

    if (oldPrice > 0) {
      const changePercent = (Math.abs(newPrice - oldPrice) / oldPrice) * 100;
      if (changePercent < config.alert_threshold_percent) {
        skipped++;
        continue;
      }
    }

    await db
      .update(schema.materials)
      .set({ marketPriceUsd: newPrice.toString(), updatedAt: new Date() })
      .where(eq(schema.materials.id, mat.id));

    try {
      await db.insert(schema.priceHistory).values({
        materialId: mat.id,
        oldPrice: oldPrice.toString(),
        newPrice: newPrice.toString(),
        source: 'yahoo-futures',
      });
    } catch {
      // price_history table may not exist on older DBs
    }

    changes.push({
      material: mat.name,
      family,
      old: oldPrice,
      new: newPrice,
      source: 'yahoo-futures',
    });
    updated++;
  }

  return {
    updated,
    skipped,
    errors,
    changes,
    sources,
    note:
      'Market prices from free Yahoo Finance polymer futures (USD/lb → USD/kg) with family conversion factors. User prices are not changed. ALU/PAPER use approximations.',
  };
}
