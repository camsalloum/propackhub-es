/**
 * Custom price-list slabs store fixed quantity breakpoints (representative /
 * amortize qty). Display ranges are derived to match predefined waste-band
 * labelling: first band from 0, then previous+1 → next (e.g. 0–1,000,
 * 1,001–2,000). Pricing still uses the entered breakpoint as amortize qty.
 */

export type CustomSlabRange = {
  /** Entered breakpoint — upper bound and amortize quantity. */
  qty: number;
  /** Inclusive lower bound for display (0 for the first band). */
  from: number;
  /** Inclusive upper bound (= qty). */
  to: number;
};

/** Sort unique positive breakpoints and derive inclusive from–to ranges. */
export function customSlabRangesFromBreakpoints(breakpoints: number[]): CustomSlabRange[] {
  const unique = [
    ...new Set(breakpoints.filter((q) => Number.isFinite(q) && q > 0)),
  ].sort((a, b) => a - b);
  return unique.map((qty, i) => ({
    qty,
    from: i === 0 ? 0 : unique[i - 1]! + 1,
    to: qty,
  }));
}
