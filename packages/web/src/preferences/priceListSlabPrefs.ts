import { createPreferenceStore } from './PreferenceStore';
import type { PriceListUnit } from '../lib/priceListPricing';

export const PRICE_LIST_SLAB_PREFS_VERSION = 1;

export type PriceListSlabPrefs = {
  v: typeof PRICE_LIST_SLAB_PREFS_VERSION;
  byUnit: Partial<Record<PriceListUnit, number[]>>;
};

export function priceListSlabPrefsKey(userId: string): string {
  return `es:price-list-slabs:${userId}`;
}

export function emptyPriceListSlabPrefs(): PriceListSlabPrefs {
  return { v: PRICE_LIST_SLAB_PREFS_VERSION, byUnit: {} };
}

export function parsePriceListSlabPrefs(raw: string | null): PriceListSlabPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PriceListSlabPrefs>;
    if (parsed.v !== PRICE_LIST_SLAB_PREFS_VERSION || typeof parsed.byUnit !== 'object') {
      return null;
    }
    const byUnit: Partial<Record<PriceListUnit, number[]>> = {};
    for (const [unit, slabs] of Object.entries(parsed.byUnit ?? {})) {
      if (!Array.isArray(slabs)) continue;
      const nums = slabs
        .map((s) => (typeof s === 'number' ? s : parseFloat(String(s))))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (nums.length > 0) {
        byUnit[unit as PriceListUnit] = [...new Set(nums)].sort((a, b) => a - b);
      }
    }
    return { v: PRICE_LIST_SLAB_PREFS_VERSION, byUnit };
  } catch {
    return null;
  }
}

export function serializePriceListSlabPrefs(prefs: PriceListSlabPrefs): string {
  return JSON.stringify(prefs);
}

export async function loadPriceListSlabPrefs(userId: string): Promise<PriceListSlabPrefs> {
  const store = createPreferenceStore();
  try {
    const raw = await store.get(priceListSlabPrefsKey(userId));
    return parsePriceListSlabPrefs(raw) ?? emptyPriceListSlabPrefs();
  } catch {
    return emptyPriceListSlabPrefs();
  }
}

export async function saveSlabsForUnit(
  userId: string,
  unit: PriceListUnit,
  slabs: number[],
  existing?: PriceListSlabPrefs
): Promise<PriceListSlabPrefs> {
  const normalized = [...new Set(slabs.filter((n) => Number.isFinite(n) && n > 0))].sort(
    (a, b) => a - b
  );
  const base = existing ?? (await loadPriceListSlabPrefs(userId));
  const next: PriceListSlabPrefs = {
    v: PRICE_LIST_SLAB_PREFS_VERSION,
    byUnit: { ...base.byUnit, [unit]: normalized },
  };
  const store = createPreferenceStore();
  try {
    await store.set(priceListSlabPrefsKey(userId), serializePriceListSlabPrefs(next));
  } catch {
    /* best effort */
  }
  return next;
}
