import { getDatabase, schema } from '../db';
import { eq } from 'drizzle-orm';
import axios from 'axios';

interface PriceSource {
  name: string;
  type: 'scrape' | 'api';
  url: string;
}

interface ConversionFactors {
  [family: string]: number;
}

// Load config
const config = require('./price-sources.json');

// Resin → film conversion
const CONVERSION: ConversionFactors = config.conversion_factors;

// Get resin price from Yahoo Finance (free, no auth)
async function getResinPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;
    const result = data?.quoteResponse?.result?.[0];
    const price = result?.regularMarketPrice;
    if (price && !isNaN(price)) return price;
  } catch (err) {
    console.warn(`Failed to fetch ${symbol}:`, err.message);
  }
  return null;
}

// Get resin price from free sources
async function scrapeResinPrice(resin: string): Promise<number | null> {
  const sources = config.resin_mapping[resin] || [];
  
  for (const sourceRef of sources) {
    const [sourceName, symbol] = sourceRef.split(':');
    const source = config.sources.find((s: PriceSource) => s.name === sourceName);
    
    if (!source) continue;
    
    try {
      if (source.type === 'api') {
        const price = await getResinPrice(symbol);
        if (price) return price;
      }
    } catch (err) {
      console.warn(`Failed to fetch ${resin} from ${sourceName}:`, err.message);
    }
  }
  
  return null;
}

// Fallback prices when APIs fail (USD/kg)
const FALLBACK_PRICES: Record<string, number> = {
  LDPE: 0.85,
  LLDPE: 0.88,
  HDPE: 0.92,
  PP: 0.95,
  PET: 1.20,
};

// Convert resin price to film price
function resinToFilmPrice(resinPrice: number, family: string): number {
  const factor = CONVERSION[family] || 1.20; // default 20% conversion
  return resinPrice * factor;
}

// Main refresh function
export async function refreshMaterialPrices(): Promise<{
  updated: number;
  errors: string[];
  changes: { material: string; old: number; new: number; source: string }[];
}> {
  const db = getDatabase();
  const errors: string[] = [];
  const changes: { material: string; old: number; new: number; source: string }[] = [];
  
  // Get all substrates grouped by family
  const substrates = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.type, 'substrate'));
  
  // Get unique families
  const families = [...new Set(substrates.map(m => m.substrateFamily).filter(Boolean))];
  
  // Fetch resin prices for each family
  const resinPrices: Record<string, number> = {};
  
  for (const family of families as string[]) {
    const resin = family === 'BOPP' || family === 'CPP' || family === 'PE' ? 'PP' : 
                  family === 'PET' || family === 'PA' || family === 'SLEEVE' ? 'PET' :
                  family === 'PAPER' ? 'LDPE' : // PAPER uses LDPE as base
                  family === 'SPECIALTY' ? 'PP' : // SPECIALTY uses weighted avg
                  family;
    
    let price = await scrapeResinPrice(resin);
    if (!price) {
      // Use fallback price
      price = FALLBACK_PRICES[resin] || 1.0;
    }
    resinPrices[family] = resinToFilmPrice(price, family);
  }
  
  // Update materials
  let updated = 0;
  
  for (const mat of substrates) {
    const family = mat.substrateFamily;
    if (!family || !resinPrices[family]) continue;
    
    const newPrice = resinPrices[family];
    const oldPrice = parseFloat(mat.marketPriceUsd || '0');
    
    // Check threshold
    if (oldPrice > 0) {
      const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
      if (changePercent < config.alert_threshold_percent) continue;
    }
    
    // Update
    await db
      .update(schema.materials)
      .set({ marketPriceUsd: newPrice.toString() })
      .where(eq(schema.materials.id, mat.id));
    
    // Log history
    await db
      .insert(schema.priceHistory)
      .values({
        materialId: mat.id,
        oldPrice,
        newPrice,
        source: 'auto-scrape',
      });
    
    changes.push({ material: mat.name, old: oldPrice, new: newPrice, source: 'auto-scrape' });
    updated++;
  }
  
  return { updated, errors, changes };
}