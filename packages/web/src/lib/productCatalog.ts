/**
 * Product catalog — flexible-packaging product families, subtypes, and per-subtype
 * dimension field schemas.
 *
 * DOMAIN MODEL (owner-confirmed 2026-06-21):
 *   - Bag and Pouch are SEPARATE product kinds with their OWN subtypes and DIFFERENT
 *     displayed dimension fields.
 *   - Costing is unchanged: per the source Excel ("If Bag or Pouch" block), both Bag and
 *     Pouch reduce to the engine's `pouch` costing path (Open Width × Open Height + ups).
 *     So `engineTypeForFamily('bag') === 'pouch'` — the locked @es/engine + golden tests
 *     are NOT touched. The Bag/Pouch distinction lives in the UI + `productSubtype`.
 *   - Subtypes are intended to be Master-Data-managed (reference category `product_subtype`);
 *     this file is the built-in default catalog + the field-schema source of truth.
 *
 * See docs/ES_DEEP_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-21.md §18.1.
 */

import type { ProductTypeValue } from './masterDataReference';

/** Engine costing product type (roll/sleeve/pouch). Local alias avoids an import cycle. */
type EngineProductType = ProductTypeValue;

/**
 * Top-level product kind code shown to the user (UI/data level). Driven by Master Data —
 * e.g. 'roll' | 'sleeve' | 'pouch' | 'bag' or any admin-added code. NOT the engine type.
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

/** Bag/Pouch both cost via the engine `pouch` path; roll/sleeve are themselves; custom → pouch. */
export function engineTypeForFamily(family: ProductFamily): EngineProductType {
  if (family === 'roll') return 'roll';
  if (family === 'sleeve') return 'sleeve';
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

const ROLL_FIELDS: DimensionFieldDef[] = [F.reelWidth, F.cutoff, F.numberOfUps, F.trim, F.piecesPerCut];
const SLEEVE_FIELDS: DimensionFieldDef[] = [F.layFlat, F.reelWidth, F.cutoff, F.numberOfUps, F.trim];

const POUCH_BASE: DimensionFieldDef[] = [F.pouchOpenWidth, F.pouchOpenHeight, F.numberOfUps, F.trim];
const BAG_BASE: DimensionFieldDef[] = [F.bagWidth, F.bagHeight, F.numberOfUps, F.trim];

// ---------------------------------------------------------------------------
// Subtype catalog
// ---------------------------------------------------------------------------

export const POUCH_SUBTYPES: ProductSubtype[] = [
  { key: 'pouch_3_side_seal', label: '3-Side Seal', family: 'pouch', dimensionFields: POUCH_BASE },
  { key: 'pouch_3_side_seal_zip', label: '3-Side Seal + Zipper', family: 'pouch', dimensionFields: [...POUCH_BASE, F.zipper] },
  { key: 'pouch_stand_up', label: 'Stand-up Pouch', family: 'pouch', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_stand_up_zip', label: 'Stand-up Pouch + Zipper', family: 'pouch', dimensionFields: [...POUCH_BASE, F.bottomGusset, F.zipper] },
  { key: 'pouch_kseal_stand_up', label: 'K-Seal Stand-up Pouch', family: 'pouch', dimensionFields: [...POUCH_BASE, F.bottomGusset] },
  { key: 'pouch_kseal_stand_up_zip', label: 'K-Seal Stand-up Pouch + Zipper', family: 'pouch', dimensionFields: [...POUCH_BASE, F.bottomGusset, F.zipper] },
  { key: 'pouch_center_seal', label: 'Center-Seal Pouch', family: 'pouch', dimensionFields: POUCH_BASE },
  { key: 'pouch_gusset', label: 'Gusset Pouch', family: 'pouch', dimensionFields: [...POUCH_BASE, F.sideGusset] },
  { key: 'pouch_4_side_seal', label: '4-Side Seal Pouch', family: 'pouch', dimensionFields: POUCH_BASE },
];

export const BAG_SUBTYPES: ProductSubtype[] = [
  // Commercial bags
  { key: 'bag_punch_handle', label: 'Punch Handle', family: 'bag', group: 'Commercial Bags', dimensionFields: BAG_BASE },
  { key: 'bag_loop_handle', label: 'Loop Handle', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.handleLength] },
  { key: 'bag_patch_handle', label: 'Patch Handle', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.handleLength] },
  { key: 'bag_side_gusset_shopping', label: 'Side-Gusset Shopping Bag', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.sideGusset] },
  { key: 'bag_bottom_gusset_shopping', label: 'Bottom-Gusset Shopping Bag', family: 'bag', group: 'Commercial Bags', dimensionFields: [...BAG_BASE, F.bottomGusset] },
  // Other bags
  { key: 'bag_industrial', label: 'Industrial Bag', family: 'bag', group: 'Industrial', dimensionFields: [...BAG_BASE, F.sideGusset] },
  { key: 'bag_courier', label: 'Courier Bag', family: 'bag', group: 'Other', dimensionFields: [...BAG_BASE, F.flap] },
  { key: 'bag_diaper', label: 'Diaper Bag', family: 'bag', group: 'Other', dimensionFields: BAG_BASE },
  { key: 'bag_wicket', label: 'Wicket Bag', family: 'bag', group: 'Other', dimensionFields: [...BAG_BASE, F.wicket] },
];

export const ALL_SUBTYPES: ProductSubtype[] = [...POUCH_SUBTYPES, ...BAG_SUBTYPES];

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

/** Default subtype when a family is first selected (first in catalog). */
export function defaultSubtypeForFamily(family: ProductFamily): string | null {
  return subtypesForFamily(family)[0]?.key ?? null;
}
