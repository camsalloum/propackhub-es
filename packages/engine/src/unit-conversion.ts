/**
 * Order-quantity unit conversion (data-driven).
 * Reference: archive/legacy-laravel/COSTING_NOTES.md §7.4.
 *
 * Every order-quantity unit is expressed as a {basis, multiplier} pair, where
 * the base unit is always kilograms and `basis` selects one of a small set of
 * engine-fixed physical conversions:
 *
 *   basis 'kg'     : 1 unit = 1 kg                       (passthrough)
 *   basis 'pieces' : 1 unit = 1 piece    → kg = qty / piecesPerKg
 *   basis 'sqm'    : 1 unit = 1 m²        → kg = qty / sqmPerKg
 *   basis 'lm'     : 1 unit = 1 linear m  → kg = qty / linearMPerKgReel
 *
 * `multiplier` is how many base physical units make up one entered unit, e.g.
 * Kpcs = pieces × 1000, "Roll 500 LM" = lm × 500, "1 MT" = kg × 1000.
 *
 * IMPORTANT — which linear metre: the 'lm' basis uses the FINISHED (reel/
 * delivered) product width (`linearMPerKgReel`), measured along the running
 * length; the print repeat/cut-off is irrelevant for linear metres (it only
 * matters for piece counting). The press/web linear-metre figure
 * (`linearMPerKgWeb`) is an MES quantity, not a costing unit, so it is NOT a
 * unit basis here.
 *
 * Admin curates the default unit list and the basis catalog; tenants may add
 * their own units only as a {basis, multiplier} on top of an existing basis.
 *
 * productMetrics (piecesPerKg, sqmPerKg, linearMPerKgReel) are computed from the
 * structure (totalGsm) and dimensions BEFORE conversion, so there is no
 * circular dependency on the order quantity itself.
 */

/** Engine-fixed conversion bases. Each maps to one structure-derived metric. */
export type UnitBasis = 'kg' | 'pieces' | 'sqm' | 'lm';

export const UNIT_BASES: UnitBasis[] = ['kg', 'pieces', 'sqm', 'lm'];

/** A unit definition: a physical basis plus how many base units it represents. */
export interface UnitDef {
  basis: UnitBasis;
  /** Base physical units per entered unit (e.g. Kpcs → 1000). Must be > 0. */
  multiplier: number;
}

export type OrderQuantityUnit = 'kgs' | 'kpcs' | 'sqm' | 'lm' | 'roll_500_lm';

export const ORDER_QUANTITY_UNITS: OrderQuantityUnit[] = [
  'kgs', 'kpcs', 'sqm', 'lm', 'roll_500_lm',
];

/**
 * Legacy unit-code → descriptor map. Saved estimates store a bare unit code;
 * this keeps them converting correctly under the data-driven engine.
 * NOTE: 'lm' resolves to the finished (reel) linear metre — the costing figure.
 */
export const LEGACY_UNIT_MAP: Record<string, UnitDef> = {
  kgs: { basis: 'kg', multiplier: 1 },
  kpcs: { basis: 'pieces', multiplier: 1000 },
  sqm: { basis: 'sqm', multiplier: 1 },
  lm: { basis: 'lm', multiplier: 1 },
  roll_500_lm: { basis: 'lm', multiplier: 500 },
};

export interface ConversionMetrics {
  piecesPerKg: number;
  sqmPerKg: number;
  /** Linear meters per kg across the printing web width (MES quantity — unused by the 'lm' basis). */
  linearMPerKgWeb: number;
  /** Linear meters per kg across the finished reel/delivered product width (the costing basis for 'lm'). */
  linearMPerKgReel: number;
}

/**
 * Resolve a unit (descriptor or legacy string code) to a {basis, multiplier}.
 * - undefined/empty → kg passthrough
 * - a descriptor    → validated and returned
 * - a known code    → mapped via LEGACY_UNIT_MAP
 * - anything else    → null (caller decides how to handle an unknown unit)
 */
export function resolveUnitDef(unit: string | UnitDef | null | undefined): UnitDef | null {
  if (unit == null || unit === '') return { basis: 'kg', multiplier: 1 };
  if (typeof unit === 'object') {
    if (!UNIT_BASES.includes(unit.basis) || !Number.isFinite(unit.multiplier) || unit.multiplier <= 0) {
      return null;
    }
    return unit;
  }
  return LEGACY_UNIT_MAP[unit] ?? null;
}

/**
 * Convert a user-entered order quantity (in `unit`) to true kilograms.
 *
 * `unit` may be a {basis, multiplier} descriptor (preferred — resolved from the
 * effective unit list for the tenant) or a legacy string code. Returns 0 if the
 * quantity is non-finite/non-positive or the required conversion metric is
 * zero/missing. An unrecognised unit falls back to kg passthrough so an order is
 * never silently zeroed.
 */
export function convertOrderQuantityToKg(
  orderQuantity: number,
  unit: string | UnitDef | null | undefined,
  metrics: ConversionMetrics
): number {
  if (!Number.isFinite(orderQuantity) || orderQuantity <= 0) return 0;

  const def = resolveUnitDef(unit);
  if (!def) {
    // Unrecognised unit — passthrough as kg (avoid silently zeroing the order).
    return orderQuantity;
  }

  const qty = orderQuantity * (def.multiplier || 1);
  switch (def.basis) {
    case 'kg':
      return qty;
    case 'pieces':
      return metrics.piecesPerKg > 0 ? qty / metrics.piecesPerKg : 0;
    case 'sqm':
      return metrics.sqmPerKg > 0 ? qty / metrics.sqmPerKg : 0;
    case 'lm':
      return metrics.linearMPerKgReel > 0 ? qty / metrics.linearMPerKgReel : 0;
    default:
      return orderQuantity;
  }
}
