/**
 * Foreign Exchange Rate Fetcher
 * Fetches USD to display currency rates from external API
 */

const FX_API_URL = process.env.FX_API_URL || 'https://api.exchangerate-api.com/v4/latest/USD';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FXResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

// In-memory cache (consider Redis for multi-instance production)
const rateCache = new Map<string, CachedRate>();

/**
 * Fetch USD to target currency exchange rate
 * @param targetCurrency - 3-letter currency code (e.g., 'AED', 'EUR')
 * @returns Exchange rate (e.g., 3.67 for USD→AED)
 */
export async function fetchExchangeRate(targetCurrency: string): Promise<number> {
  // USD to USD is always 1.0
  if (targetCurrency === 'USD') {
    return 1.0;
  }

  // Check cache
  const cached = rateCache.get(targetCurrency);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_DURATION_MS) {
    return cached.rate;
  }

  try {
    const response = await fetch(FX_API_URL);
    
    if (!response.ok) {
      throw new Error(`FX API returned ${response.status}`);
    }

    const data: FXResponse = await response.json();
    
    const rate = data.rates[targetCurrency];
    
    if (!rate || rate <= 0) {
      throw new Error(`Invalid rate for ${targetCurrency}`);
    }

    // Cache the rate
    rateCache.set(targetCurrency, {
      rate,
      fetchedAt: Date.now(),
    });

    console.log(`✓ Fetched FX rate: 1 USD = ${rate} ${targetCurrency}`);
    return rate;
    
  } catch (error) {
    console.error(`Failed to fetch FX rate for ${targetCurrency}:`, error);
    
    // Return cached rate if available (even if expired)
    if (cached) {
      console.warn(`Using stale cached rate for ${targetCurrency}`);
      return cached.rate;
    }
    
    // Fallback to 1.0 (treat as USD)
    console.warn(`Fallback to 1.0 for ${targetCurrency}`);
    return 1.0;
  }
}

/**
 * Batch fetch multiple currency rates
 */
export async function fetchMultipleRates(currencies: string[]): Promise<Record<string, number>> {
  const rates: Record<string, number> = {};
  
  for (const currency of currencies) {
    rates[currency] = await fetchExchangeRate(currency);
  }
  
  return rates;
}

/**
 * Clear rate cache (for testing or manual refresh)
 */
export function clearRateCache() {
  rateCache.clear();
}
