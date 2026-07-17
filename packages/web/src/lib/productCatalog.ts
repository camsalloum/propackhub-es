/**
 * Product catalog — flexible-packaging product families, subtypes, and per-subtype
 * dimension field schemas.
 *
 * DOMAIN MODEL (owner-confirmed 2026-06-21):
 *   - Bag and Pouch are SEPARATE product kinds with their OWN subtypes and DIFFERENT
 *     displayed dimension fields.
 *   - Costing is now SUBTYPE-DRIVEN per product kind (updated post engine split):
 *       · Bag  → `bag-flat-sheet.ts`  via `dimensions.productType === 'bag'`
 *       · Pouch → `pouch-flat-sheet.ts` via `dimensions.productType === 'pouch'`
 *     Each branch falls back to the legacy face-area model when no subtype is set,
 *     so pre-split estimates keep their original prices. The legacy comment that
 *     "Bag and Pouch reduce to the engine's pouch costing path" no longer applies.
 *   - Four product types are first-class everywhere: `roll | sleeve | pouch | bag`.
 *     `engineTypeForFamily` is identity for those codes (no bag→pouch collapse).
 *   - Subtypes are Master-Data-managed (reference category `product_subtype`);
 *     this file is the built-in default catalog + the field-schema source of truth.
 *
 * See docs/POUCH_CLASSIFICATION_v4.md and docs/BAG_COSTING_RESEARCH.md.
 */

/** Canonical product type stored in DB / engine / templates. */
export type ProductTypeCode = 'roll' | 'sleeve' | 'pouch' | 'bag';

/**
 * Top-level product kind code shown to the user (UI/data level). Driven by Master Data —
 * e.g. 'roll' | 'sleeve' | 'pouch' | 'bag' or any admin-added code.
 */
export type ProductFamily = string;

/** A single dimension input definition for the editor to render. */
export interface DimensionFieldDef {
  /** Persisted key inside the estimate `dimensions` JSON. */
  key: string;
  label: string;
  /** number = numeric input (mm unless noted); boolean = toggle. */
  type: 'number' | 'boolean';
  unit?: 'mm' | null;
  required?: boolean;
  /** Short helper shown under/next to the field. */
  hint?: string;
}

export interface ProductSubtype {
  /** Stable key persisted in estimates.product_subtype, e.g. `pouch_stand_up`. */
  key: string;
  label: string;
  family: ProductFamily;
  /** Optional grouping shown in the subtype picker (e.g. "Commercial Bags"). */
  group?: string;
  /** Dimension fields to render for this subtype (in display order). */
  dimensionFields: DimensionFieldDef[];
}

/**
 * UI-family / Master-Data code → persisted product type.
 * Roll, Sleeve, Pouch, Bag are each first-class (no bag→pouch collapse).
 * Unknown custom codes fall back to `pouch` only as a last resort.
 */
export function engineTypeForFamily(family: ProductFamily): ProductTypeCode {
  const key = (family || '').trim().toLowerCase();
  if (key === 'roll') return 'roll';
  if (key === 'sleeve') return 'sleeve';
  if (key === 'bag') return 'bag';
  if (key === 'pouch') return 'pouch';
  return 'pouch';
}

export const PRODUCT_FAMILY_LABELS: Record<string, string> = {
  roll: 'Roll',
  sleeve: 'Sleeve',
  pouch: 'Pouch',
  bag: 'Bag',
};

// ---------------------------------------------------------------------------
// Reusable dimension field definitions
// ---------------------------------------------------------------------------

const F = {
  // Roll / sleeve
  reelWidth: { key: 'reelWidthMm', label: 'Reel width', type: 'number', unit: 'mm', required: true } as DimensionFieldDef,
  cutoff: { key: 'cutoffMm', label: 'Cut-off', type: 'number', unit: 'mm', required: true } as DimensionFieldDef,
  piecesPerCut: { key: 'piecesPerCut', label: 'Pieces per cut', type: 'number', required: true } as DimensionFieldDef,
  layFlat: { key: 'layFlatValue', label: 'Lay-flat', type: 'number', unit: 'mm', required: true } as DimensionFieldDef,

  // Bag / pouch shared
  numberOfUps: { key: 'numberOfUps', label: 'Number of ups', type: 'number', required: true } as DimensionFieldDef,
  trim: { key: 'extraPrintingTrimMm', label: 'Extra printing trim', type: 'number', unit: 'mm' } as DimensionFieldDef,

  // Pouch face
  pouchOpenWidth: { key: 'openWidthMm', label: 'Open width (with gusset)', type: 'number', unit: 'mm', required: true } as DimensionFieldDef,
  pouchOpenHeight: { key: 'openHeightMm', label: 'Open height (F+G+B)', type: 'number', unit: 'mm', required: true } as DimensionFieldDef,

  // Bag face
  bagWidth: { key: 'openWidthMm', label: 'Width', type: 'number', unit: 'mm', required: true } as DimensionFieldDef,
  bagHeight: { key: 'openHeightMm', label: 'Height', type: 'number', unit: 'mm', required: true } as DimensionFieldDef,

  // Gussets
  bottomGusset: { key: 'bottomGussetMm', label: 'Bottom gusset', type: 'number', unit: 'mm' } as DimensionFieldDef,
  sideGusset: { key: 'sideGussetMm', label: 'Side gusset', type: 'number', unit: 'mm' } as DimensionFieldDef,

  // Add-ons
  zipper: { key: 'hasZipper', label: 'Zipper', type: 'boolean', hint: 'Adds zipper weight/cost per piece' } as DimensionFieldDef,
  handleLength: { key: 'handleLengthMm', label: 'Handle length', type: 'number', unit: 'mm' } as DimensionFieldDef,
  wicket: { key: 'wicketMm', label: 'Wicket / lip', type: 'number', unit: 'mm' } as DimensionFieldDef,
  flap: { key: 'flapMm', label: 'Flap / lip', type: 'number', unit: 'mm', hint: 'Adhesive flap depth' } as DimensionFieldDef,
};

/**
 * Machine-layout fields — not shown during estimation; confirmed at order stage.
 * Engine still uses stored defaults (typically ups=1, trim=0).
 */
export const ESTIMATION_HIDDEN_DIMENSION_KEYS = new Set<string>([
  'numberOfUps',
  'extraPrintingTrimMm',
]);

const ROLL_FIELDS: DimensionFieldDef[] = [F.reelWidth, F.cutoff, F.numberOfUps, F.trim, F.piecesPerCut];
const SLEEVE_FIELDS: DimensionFieldDef[] = [F.layFlat, F.reelWidth, F.cutoff, F.numberOfUps, F.trim];

const POUCH_BASE: DimensionFieldDef[] = [F.pouchOpenWidth, F.pouchOpenHeight, F.numberOfUps, F.trim];
const BAG_BASE: DimensionFieldDef[] = [F.bagWidth, F.bagHeight, F.numberOfUps, F.trim];

// ---------------------------------------------------------------------------
// Subtype catalog
// ---------------------------------------------------------------------------

/** Premade pouch v4 — Family × Variant. Accessories are never separate subtypes. */
export const POUCH_SUBTYPES: ProductSubtype[] = [
  { key: 'pouch_tss_flat', label: 'Three-Side-Seal — Flat', family: 'pouch', group: 'Three-Side-Seal', dimensionFields: POUCH_BASE },
  { key: 'pouch_tss_standing', label: 'Three-Side-Seal — Standing (Doyen)', family: 'pouch', group: 'Three-Side-Seal', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_tss_standing_kseal', label: 'Three-Side-Seal — Standing (K-Seal)', family: 'pouch', group: 'Three-Side-Seal', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_cfs_flat', label: 'Center-Fold-Seal — Flat (Quad)', family: 'pouch', group: 'Center-Fold-Seal', dimensionFields: POUCH_BASE },
  { key: 'pouch_cfs_side_gusset', label: 'Center-Fold-Seal — Side Gusset', family: 'pouch', group: 'Center-Fold-Seal', dimensionFields: [...POUCH_BASE, F.sideGusset] },
  { key: 'pouch_cfs_standing', label: 'Center-Fold-Seal — Standing', family: 'pouch', group: 'Center-Fold-Seal', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_hff_flat', label: 'Half-Fold-Fusion — Flat', family: 'pouch', group: 'Half-Fold-Fusion', dimensionFields: POUCH_BASE },
  { key: 'pouch_hff_standing', label: 'Half-Fold-Fusion — Standing', family: 'pouch', group: 'Half-Fold-Fusion', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_sw_flat', label: 'Side-Weld — Flat', family: 'pouch', group: 'Side-Weld', dimensionFields: POUCH_BASE },
  { key: 'pouch_sw_side_gusset', label: 'Side-Weld — Side Gusset', family: 'pouch', group: 'Side-Weld', dimensionFields: [...POUCH_BASE, F.sideGusset] },
  { key: 'pouch_osw_trapezoid', label: 'Oblique — Trapezoid', family: 'pouch', group: 'Oblique-Side-Weld', dimensionFields: POUCH_BASE },
  { key: 'pouch_osw_triangle', label: 'Oblique — Triangle', family: 'pouch', group: 'Oblique-Side-Weld', dimensionFields: POUCH_BASE },
  { key: 'pouch_fbb_standing', label: 'Flat-Bottom Box — Standing', family: 'pouch', group: 'Flat-Bottom Box', dimensionFields: POUCH_BASE },
];

/** Legacy pouch subtypes — still resolvable for old estimates; hidden from picker. */
export const LEGACY_POUCH_SUBTYPES: ProductSubtype[] = [
  { key: 'pouch_3_side_seal', label: '3-Side Seal (legacy)', family: 'pouch', dimensionFields: POUCH_BASE },
  { key: 'pouch_stand_up', label: 'Stand-up Pouch (legacy)', family: 'pouch', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_kseal_stand_up', label: 'K-Seal Stand-up (legacy → TSS Standing K-Seal)', family: 'pouch', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_center_seal', label: 'Center-Seal (legacy)', family: 'pouch', dimensionFields: POUCH_BASE },
  { key: 'pouch_gusset', label: 'Gusset Pouch (legacy)', family: 'pouch', dimensionFields: [...POUCH_BASE, F.sideGusset] },
  { key: 'pouch_4_side_seal', label: '4-Side Seal (legacy)', family: 'pouch', dimensionFields: POUCH_BASE },
  { key: 'pouch_flat_bottom', label: 'Flat-Bottom (legacy)', family: 'pouch', dimensionFields: [...POUCH_BASE, F.sideGusset] },
];

/** Codes shown in the estimate pouch-type picker (v4 only). */
export const POUCH_PICKER_SUBTYPE_CODES = new Set(POUCH_SUBTYPES.map((s) => s.key));

export const BAG_SUBTYPES: ProductSubtype[] = [
  // Commercial bags
  { key: 'bag_punch_handle', label: 'Punch Handle', family: 'bag', group: 'Commercial Bags', dimensionFields: BAG_BASE },
  { key: 'bag_loop_handle', label: 'Loop Handle', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.handleLength] },
  { key: 'bag_patch_handle', label: 'Patch Handle', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.handleLength] },
  { key: 'bag_gusseted_shopping', label: 'Gusseted Shopping Bag', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.bottomGusset, F.sideGusset] },
  // Other bags
  { key: 'bag_industrial', label: 'Industrial Bag', family: 'bag', group: 'Industrial', dimensionFields: [...BAG_BASE, F.bottomGusset, F.sideGusset] },
  { key: 'bag_courier', label: 'Courier Bag', family: 'bag', group: 'Other', dimensionFields: [...BAG_BASE, F.flap] },
  { key: 'bag_diaper', label: 'Diaper Bag', family: 'bag', group: 'Other', dimensionFields: BAG_BASE },
  { key: 'bag_wicket', label: 'Wicket Bag', family: 'bag', group: 'Other', dimensionFields: [...BAG_BASE, F.wicket] },
];

/**
 * Legacy bag subtypes — superseded by the unified `bag_gusseted_shopping`. Kept out of the
 * picker but still resolvable so existing estimates (and their family/parent lookups) work.
 */
export const LEGACY_BAG_SUBTYPES: ProductSubtype[] = [
  { key: 'bag_side_gusset_shopping', label: 'Side-Gusset Shopping Bag', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.sideGusset] },
  { key: 'bag_bottom_gusset_shopping', label: 'Bottom-Gusset Shopping Bag', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.bottomGusset] },
];

export const ALL_SUBTYPES: ProductSubtype[] = [
  ...POUCH_SUBTYPES,
  ...LEGACY_POUCH_SUBTYPES,
  ...BAG_SUBTYPES,
  ...LEGACY_BAG_SUBTYPES,
];

const SUBTYPE_BY_KEY = new Map<string, ProductSubtype>(ALL_SUBTYPES.map((s) => [s.key, s]));

/** Subtypes for a family (roll/sleeve have no subtypes yet → empty). */
export function subtypesForFamily(family: ProductFamily): ProductSubtype[] {
  if (family === 'pouch') return POUCH_SUBTYPES;
  if (family === 'bag') return BAG_SUBTYPES;
  return [];
}

export function getSubtype(key: string | null | undefined): ProductSubtype | undefined {
  return key ? SUBTYPE_BY_KEY.get(key) : undefined;
}

/** Dimension fields to render for a given family + optional subtype. */
export function dimensionFieldsFor(
  family: ProductFamily,
  subtypeKey?: string | null
): DimensionFieldDef[] {
  const subtype = getSubtype(subtypeKey);
  if (subtype) return subtype.dimensionFields;
  if (family === 'roll') return ROLL_FIELDS;
  if (family === 'sleeve') return SLEEVE_FIELDS;
  if (family === 'bag') return BAG_BASE;
  return POUCH_BASE;
}

/** Estimation-phase fields only (hides machine-layout ups/trim). */
export function dimensionFieldsForEstimation(
  family: ProductFamily,
  subtypeKey?: string | null
): DimensionFieldDef[] {
  return dimensionFieldsFor(family, subtypeKey).filter(
    (f) => !ESTIMATION_HIDDEN_DIMENSION_KEYS.has(f.key)
  );
}

/** Default subtype when a family is first selected (first in catalog). */
export function defaultSubtypeForFamily(family: ProductFamily): string | null {
  return subtypesForFamily(family)[0]?.key ?? null;
}
