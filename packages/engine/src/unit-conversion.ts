/**
 * Order-quantity unit conversion.
 * Reference: archive/legacy-laravel/COSTING_NOTES.md §7.4.
 *
 * The user enters `orderQuantity` in one of:
 *   - 'kgs'         : kilograms (no conversion)
 *   - 'kpcs'        : thousand pieces  → kg = (qty × 1000) / piecesPerKg
 *   - 'sqm'         : square meters    → kg = qty / sqmPerKg
 *   - 'lm'          : linear meters    → kg = qty / linearMPerKgWeb
 *   - 'roll_500_lm' : rolls of 500 LM  → kg = (qty × 500) / linearMPerKgReel
 *
 * productMetrics (piecesPerKg, sqmPerKg, linearMPerKgWeb, linearMPerKgReel) are
 * computed from the structure (totalGsm) and dimensions BEFORE conversion, so
 * there is no circular dependency on the order quantity itself.
 */

export type OrderQuantityUnit = 'kgs' | 'kpcs' | 'sqm' | 'lm' | 'roll_500_lm';

export const ORDER_QUANTITY_UNITS: OrderQuantityUnit[] = [
  'kgs', 'kpcs', 'sqm', 'lm', 'roll_500_lm',
];

export interface ConversionMetrics {
  piecesPerKg: number;
  sqmPerKg: number;
  /** Linear meters per kg across the printing web width. */
  linearMPerKgWeb: number;
  /** Linear meters per kg across the reel/blank width. */
  linearMPerKgReel: number;
}

/**
 * Convert a user-entered order quantity (in `unit`) to true kilograms.
 * Returns 0 if the quantity is non-finite, non-positive, or the required
 * conversion metric is zero/missing.
 */
export function convertOrderQuantityToKg(
  orderQuantity: number,
  unit: string | null | undefined,
  metrics: ConversionMetrics
): number {
  if (!Number.isFinite(orderQuantity) || orderQuantity <= 0) return 0;

  const u = (unit ?? '') as string;
  switch (u) {
    case 'kgs':
    case '':
      return orderQuantity;

    case 'kpcs':
      return metrics.piecesPerKg > 0
        ? (orderQuantity * 1000) / metrics.piecesPerKg
        : 0;

    case 'sqm':
      return metrics.sqmPerKg > 0
        ? orderQuantity / metrics.sqmPerKg
        : 0;

    case 'lm':
      return metrics.linearMPerKgWeb > 0
        ? orderQuantity / metrics.linearMPerKgWeb
        : 0;

    case 'roll_500_lm':
      // 1 roll = 500 linear meters (reel basis)
      return metrics.linearMPerKgReel > 0
        ? (orderQuantity * 500) / metrics.linearMPerKgReel
        : 0;

    default:
      // Unknown unit — passthrough (avoid silently zeroing the order)
      return orderQuantity;
  }
}