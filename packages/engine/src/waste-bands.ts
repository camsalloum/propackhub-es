/**
 * Quantity-based waste bands.
 *
 * Smaller production runs carry proportionally more setup/run waste, so the
 * waste % applied to the structure's material cost is driven by the order
 * quantity (in true kg), not by the product group. Bands are global and
 * admin-editable; these are the seeded defaults.
 *
 * The waste % is applied ON TOP of the material cost already computed from the
 * structure (which itself includes each material's own `wastePercent`). It is a
 * separate run/setup waste, not a replacement.
 *
 * Matching: a quantity falls into the first band whose `maxKg` is >= the
 * quantity (`maxKg: null` is the open-ended top band). `minKg` is for display.
 */
export interface WasteBand {
  /** Lower bound (kg), inclusive — for display/labelling. */
  minKg: number;
  /** Upper bound (kg), inclusive. `null` = open-ended (top band). */
  maxKg: number | null;
  /** Waste % added over the material cost for orders in this band. */
  wastePercent: number;
}

/**
 * Seeded default bands (decreasing waste as quantity grows). These are starting
 * values; the platform admin curates the real percentages in Master Data.
 */
export const DEFAULT_WASTE_BANDS: WasteBand[] = [
  { minKg: 0, maxKg: 80, wastePercent: 30 },
  { minKg: 81, maxKg: 150, wastePercent: 22 },
  { minKg: 151, maxKg: 300, wastePercent: 15 },
  { minKg: 301, maxKg: 600, wastePercent: 10 },
  { minKg: 601, maxKg: 1500, wastePercent: 7 },
  { minKg: 1501, maxKg: 3000, wastePercent: 5 },
  { minKg: 3001, maxKg: 5000, wastePercent: 4 },
  { minKg: 5001, maxKg: 10000, wastePercent: 3 },
  { minKg: 10001, maxKg: 20000, wastePercent: 2.5 },
  { minKg: 20001, maxKg: 50000, wastePercent: 2 },
  { minKg: 50001, maxKg: 100000, wastePercent: 1.5 },
  { minKg: 100001, maxKg: null, wastePercent: 1 },
];

/** Sort bands ascending by upper bound (open-ended band last). */
function sortBands(bands: WasteBand[]): WasteBand[] {
  return [...bands].sort((a, b) => {
    if (a.maxKg === null) return 1;
    if (b.maxKg === null) return -1;
    return a.maxKg - b.maxKg;
  });
}

/**
 * Resolve the waste % for a given quantity (true kg). Returns the first band
 * whose upper bound covers the quantity; falls back to the last band's % (or 0
 * when no bands exist). A non-finite/negative quantity resolves to the lowest
 * band so a brand-new estimate still shows a sensible figure.
 */
export function wastePercentForQuantity(
  quantityKg: number,
  bands: WasteBand[] = DEFAULT_WASTE_BANDS
): number {
  if (!bands || bands.length === 0) return 0;
  const sorted = sortBands(bands);
  const qty = Number.isFinite(quantityKg) && quantityKg > 0 ? quantityKg : 0;
  for (const band of sorted) {
    if (band.maxKg === null || qty <= band.maxKg) {
      return band.wastePercent;
    }
  }
  // Quantity exceeds every finite band and there is no open-ended band — use the
  // largest band's percentage.
  return sorted[sorted.length - 1].wastePercent;
}
