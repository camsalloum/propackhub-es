/**
 * Quantity-based waste bands.
 *
 * Smaller production runs carry proportionally more setup/run waste, so the
 * waste % applied to the structure's material cost is driven by the order
 * quantity (in true kg), not by the product group. Bands are global and
 * admin-editable; these are the seeded defaults.
 *
 * Two print-mode tables exist: **Printed** and **Plain**. Estimates pick the
 * table from the structure (any ink layer → Printed, otherwise Plain). Plain
 * defaults to 50% of Printed; admins may edit either table independently.
 *
 * The waste % is applied ON TOP of the material cost already computed from the
 * structure (which itself includes each material's own `wastePercent`). It is a
 * separate run/setup waste, not a replacement.
 *
 * Matching: a quantity falls into the first band whose `maxKg` is >= the
 * quantity (`maxKg: null` is the open-ended top band). `minKg` is for display.
 */

export type WastePrintMode = 'printed' | 'plain';

export interface WasteBand {
  /** Lower bound (kg), inclusive — for display/labelling. */
  minKg: number;
  /** Upper bound (kg), inclusive. `null` = open-ended (top band). */
  maxKg: number | null;
  /** Waste % added over the material cost for orders in this band. */
  wastePercent: number;
}

export interface WasteBandsByPrintMode {
  printed: WasteBand[];
  plain: WasteBand[];
}

/** Plain defaults = 50% of Printed (admin may override either table). */
export const PLAIN_WASTE_FRACTION_OF_PRINTED = 0.5;

/**
 * Seeded default bands for **Printed** structures (decreasing waste as quantity grows).
 * Platform admin curates the real percentages in Master Data → Waste Bands.
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

/** Derive Plain bands from Printed at the default 50% fraction. */
export function plainBandsFromPrinted(printed: WasteBand[]): WasteBand[] {
  return printed.map((b) => ({
    minKg: b.minKg,
    maxKg: b.maxKg,
    wastePercent: Math.round(b.wastePercent * PLAIN_WASTE_FRACTION_OF_PRINTED * 1000) / 1000,
  }));
}

export const DEFAULT_WASTE_BANDS_PLAIN: WasteBand[] = plainBandsFromPrinted(DEFAULT_WASTE_BANDS);

export const DEFAULT_WASTE_BANDS_BY_PRINT_MODE: WasteBandsByPrintMode = {
  printed: DEFAULT_WASTE_BANDS.map((b) => ({ ...b })),
  plain: DEFAULT_WASTE_BANDS_PLAIN.map((b) => ({ ...b })),
};

/** True when the structure includes an ink layer (Printed); otherwise Plain. */
export function structureIsPrinted(
  layers: Array<{ materialType?: string | null; type?: string | null; layer_type?: string | null }>
): boolean {
  return layers.some((l) => {
    const t = l.materialType ?? l.type ?? l.layer_type;
    return t === 'ink';
  });
}

/** Pick the band table for a print mode (falls back to engine defaults). */
export function wasteBandsForPrintMode(
  byMode: WasteBandsByPrintMode | null | undefined,
  mode: WastePrintMode
): WasteBand[] {
  const printed =
    byMode?.printed?.length ? byMode.printed : DEFAULT_WASTE_BANDS_BY_PRINT_MODE.printed;
  const plain = byMode?.plain?.length ? byMode.plain : plainBandsFromPrinted(printed);
  return (mode === 'printed' ? printed : plain).map((b) => ({ ...b }));
}

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

/**
 * Default: CoRM scales 1:1 with band waste % (waste 10% → CoRM × 1.10).
 * Admin may set any non-negative factor (0 = flat CoRM, 1 = full match).
 */
export const DEFAULT_CORM_SCALE_WITH_WASTE = 1;

/** Plain CoRM defaults to this fraction of Printed when unset. */
export const PLAIN_CORM_FRACTION_OF_PRINTED = 0.5;

/** Base CoRM × (1 + wastePct/100 × scaleFactor). */
export function effectiveCormPerKg(
  baseCormPerKg: number,
  wastePercent: number,
  scaleFactor: number = DEFAULT_CORM_SCALE_WITH_WASTE
): number {
  const base = Number.isFinite(baseCormPerKg) ? Math.max(0, baseCormPerKg) : 0;
  const waste = Number.isFinite(wastePercent) ? Math.max(0, wastePercent) : 0;
  const scale = Number.isFinite(scaleFactor) ? Math.max(0, scaleFactor) : DEFAULT_CORM_SCALE_WITH_WASTE;
  return base * (1 + (waste / 100) * scale);
}

/** Plain CoRM from Printed when admin has not set an override. */
export function plainCormFromPrinted(printedCorm: number): number {
  const base = Number.isFinite(printedCorm) ? Math.max(0, printedCorm) : 0;
  return Math.round(base * PLAIN_CORM_FRACTION_OF_PRINTED * 10000) / 10000;
}

/**
 * Seed slab quantities from MOQ upward using waste-band breakpoints.
 * First point is max(MOQ, first band min); then each band's maxKg above MOQ.
 */
export function slabQuantitiesFromMoq(
  moqKg: number,
  bands: WasteBand[] = DEFAULT_WASTE_BANDS,
  maxSlabs = 5
): number[] {
  const moq = Number.isFinite(moqKg) && moqKg > 0 ? moqKg : 0;
  if (moq <= 0) {
    // No MOQ — fall back to band upper bounds (legacy behaviour for open templates).
    const fromBands = sortBands(bands)
      .filter((b) => b.maxKg != null && b.maxKg > 0)
      .map((b) => b.maxKg as number);
    return fromBands.slice(0, maxSlabs);
  }
  const sorted = sortBands(bands);
  const qtySet = new Set<number>([moq]);
  for (const band of sorted) {
    if (band.maxKg != null && band.maxKg >= moq) {
      qtySet.add(band.maxKg);
    }
  }
  return [...qtySet].sort((a, b) => a - b).slice(0, maxSlabs);
}
