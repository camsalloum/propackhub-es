import type { EstimateDimensions } from './types';

/**
 * Pouch flat-sheet area model — Premade Pouch Selector v4.
 *
 * Classification: Family (forming process) × Variant (shape modifier).
 * Costing keys: webCount, flatWidth, flatHeight, extraPanelArea, separateBottomWeb.
 *
 * Reference: docs/POUCH_CLASSIFICATION_v4.md (from pouch.zip).
 * piecesPerKg = 1000 / (flatSheetAreaM2 × totalGsm)
 */

/** Canonical configurator keys: `{family}-{variant}`. */
export type PouchConfiguratorType =
  | 'three-side-seal-flat'
  | 'three-side-seal-standing'
  | 'center-fold-seal-flat'
  | 'center-fold-seal-side-gusset'
  | 'center-fold-seal-standing'
  | 'half-fold-fusion-flat'
  | 'half-fold-fusion-standing'
  | 'side-weld-flat'
  | 'side-weld-side-gusset'
  | 'oblique-side-weld-trapezoid'
  | 'oblique-side-weld-triangle'
  | 'flat-bottom-box-standing';

/** Forming-process families (axis 1). */
export type PouchFamily =
  | 'three-side-seal'
  | 'center-fold-seal'
  | 'half-fold-fusion'
  | 'side-weld'
  | 'oblique-side-weld'
  | 'flat-bottom-box';

export interface PouchFlatGeom {
  flatWidth: number;
  flatHeight: number;
  webCount: number;
  extraPanelArea: number;
  separateBottomWeb: boolean;
}

/**
 * Maps estimate.productSubtype codes (stored in DB) → configurator type.
 * Includes v4 codes + legacy aliases so existing estimates keep resolving.
 */
export const POUCH_SUBTYPE_TO_CONFIGURATOR: Record<string, PouchConfiguratorType> = {
  // v4 canonical codes
  pouch_tss_flat: 'three-side-seal-flat',
  pouch_tss_standing: 'three-side-seal-standing',
  /** K-seal = standing bottom-weld style (same film formula as TSS standing). */
  pouch_tss_standing_kseal: 'three-side-seal-standing',
  pouch_cfs_flat: 'center-fold-seal-flat',
  pouch_cfs_side_gusset: 'center-fold-seal-side-gusset',
  pouch_cfs_standing: 'center-fold-seal-standing',
  pouch_hff_flat: 'half-fold-fusion-flat',
  pouch_hff_standing: 'half-fold-fusion-standing',
  pouch_sw_flat: 'side-weld-flat',
  pouch_sw_side_gusset: 'side-weld-side-gusset',
  pouch_osw_trapezoid: 'oblique-side-weld-trapezoid',
  pouch_osw_triangle: 'oblique-side-weld-triangle',
  pouch_fbb_standing: 'flat-bottom-box-standing',

  // Legacy productSubtype codes → nearest v4 type (by label intent)
  pouch_three_side_seal: 'three-side-seal-flat',
  pouch_3_side_seal: 'three-side-seal-flat',
  pouch_3_side_seal_zip: 'three-side-seal-flat',
  pouch_stand_up: 'three-side-seal-standing',
  pouch_stand_up_zip: 'three-side-seal-standing',
  /** Legacy K-seal stand-up → TSS standing (K-seal is bottom weld style, same area). */
  pouch_kseal_stand_up: 'three-side-seal-standing',
  pouch_kseal_stand_up_zip: 'three-side-seal-standing',
  pouch_doypack: 'three-side-seal-standing',
  pouch_center_seal: 'center-fold-seal-flat',
  pouch_pillow: 'center-fold-seal-flat',
  pouch_four_side_seal: 'center-fold-seal-flat',
  pouch_4_side_seal: 'center-fold-seal-flat',
  pouch_gusset: 'center-fold-seal-side-gusset',
  pouch_side_gusset: 'center-fold-seal-side-gusset',
  pouch_flat_bottom: 'flat-bottom-box-standing',
  pouch_box: 'flat-bottom-box-standing',
};

/** Old dimensions.pouchSubtype strings → v4 keys. */
const LEGACY_POUCH_SUBTYPE_STRINGS: Record<string, PouchConfiguratorType> = {
  'three-side-seal': 'three-side-seal-flat',
  'center-seal': 'center-fold-seal-flat',
  'four-side-seal': 'center-fold-seal-flat',
  'stand-up': 'three-side-seal-standing',
  'side-gusset': 'center-fold-seal-side-gusset',
  'flat-bottom': 'flat-bottom-box-standing',
};

const POUCH_SUBTYPE_VALUES = new Set<PouchConfiguratorType>([
  'three-side-seal-flat',
  'three-side-seal-standing',
  'center-fold-seal-flat',
  'center-fold-seal-side-gusset',
  'center-fold-seal-standing',
  'half-fold-fusion-flat',
  'half-fold-fusion-standing',
  'side-weld-flat',
  'side-weld-side-gusset',
  'oblique-side-weld-trapezoid',
  'oblique-side-weld-triangle',
  'flat-bottom-box-standing',
]);

export function familyForPouchType(type: PouchConfiguratorType): PouchFamily {
  if (type.startsWith('three-side-seal')) return 'three-side-seal';
  if (type.startsWith('center-fold-seal')) return 'center-fold-seal';
  if (type.startsWith('half-fold-fusion')) return 'half-fold-fusion';
  if (type.startsWith('side-weld')) return 'side-weld';
  if (type.startsWith('oblique-side-weld')) return 'oblique-side-weld';
  return 'flat-bottom-box';
}

export interface PouchFlatSheetResult {
  /** Total film area in m² (webCount × flat panel + extra panels). */
  areaM2: number;
  /** Per-web flat width in mm (cross-direction). */
  blankWidthMm: number;
  /** Per-web flat height in mm (machine-direction). */
  blankLengthMm: number;
  webCount: number;
  /** Extra panel area in mm² (gusset/bottom insert) added outside the main webs. */
  extraPanelAreaMm2: number;
  /** When true, bottom/gusset panel may use a different laminate (flag for costing). */
  separateBottomWeb: boolean;
  type: PouchConfiguratorType | null;
}

/**
 * Resolve the pouch configurator type from dimensions.
 * Prefers explicit `pouchSubtype`; falls back to `productSubtype` code.
 */
export function resolvePouchConfiguratorType(
  dimensions: EstimateDimensions
): PouchConfiguratorType | null {
  if (dimensions.pouchSubtype) {
    const raw = dimensions.pouchSubtype;
    if (POUCH_SUBTYPE_VALUES.has(raw as PouchConfiguratorType)) {
      return raw as PouchConfiguratorType;
    }
    const legacy = LEGACY_POUCH_SUBTYPE_STRINGS[raw];
    if (legacy) return legacy;
  }
  if (dimensions.productSubtype) {
    const mapped = POUCH_SUBTYPE_TO_CONFIGURATOR[dimensions.productSubtype];
    if (mapped) return mapped;
  }
  return null;
}

/** v4 flat-geometry formulas (mm). Seal process defaults are outside this base model. */
export function calculatePouchFlatGeom(
  type: PouchConfiguratorType,
  d: {
    W: number;
    L: number;
    G: number;
    S1: number;
    D: number;
  }
): PouchFlatGeom {
  const { W, L, G, S1, D } = d;

  switch (type) {
    case 'three-side-seal-flat':
      return { flatWidth: W, flatHeight: L, webCount: 2, extraPanelArea: 0, separateBottomWeb: false };

    case 'three-side-seal-standing':
      return {
        flatWidth: W,
        flatHeight: L,
        webCount: 2,
        extraPanelArea: W * G,
        separateBottomWeb: true,
      };

    case 'center-fold-seal-flat':
      return {
        flatWidth: W,
        flatHeight: L + S1,
        webCount: 1,
        extraPanelArea: 0,
        separateBottomWeb: false,
      };

    case 'center-fold-seal-side-gusset':
      return {
        flatWidth: W + 2 * G,
        flatHeight: L + S1,
        webCount: 1,
        extraPanelArea: 0,
        separateBottomWeb: false,
      };

    case 'center-fold-seal-standing':
      return {
        flatWidth: W,
        flatHeight: L + G / 2,
        webCount: 1,
        extraPanelArea: 0,
        separateBottomWeb: false,
      };

    case 'half-fold-fusion-flat':
      return {
        flatWidth: W * 2,
        flatHeight: L,
        webCount: 1,
        extraPanelArea: 0,
        separateBottomWeb: false,
      };

    case 'half-fold-fusion-standing':
      return {
        flatWidth: W * 2,
        flatHeight: L - G,
        webCount: 1,
        extraPanelArea: W * G,
        separateBottomWeb: true,
      };

    case 'side-weld-flat':
      return { flatWidth: W, flatHeight: L, webCount: 1, extraPanelArea: 0, separateBottomWeb: false };

    case 'side-weld-side-gusset':
      return {
        flatWidth: W + 2 * G,
        flatHeight: L - G,
        webCount: 1,
        extraPanelArea: 0,
        separateBottomWeb: false,
      };

    case 'oblique-side-weld-trapezoid':
    case 'oblique-side-weld-triangle':
      // Angled trim is scrap, not base flat area.
      return { flatWidth: W, flatHeight: L, webCount: 1, extraPanelArea: 0, separateBottomWeb: false };

    case 'flat-bottom-box-standing':
      return {
        flatWidth: W + D,
        flatHeight: L,
        webCount: 3,
        extraPanelArea: W * D,
        separateBottomWeb: true,
      };
  }
}

/**
 * Compute the flat-sheet blank area (m²) for one pouch.
 * Returns { areaM2: 0, ... } if the configurator type cannot be resolved,
 * so callers can fall back to a face-area estimate (legacy pouch behavior).
 */
export function calculatePouchFlatSheetAreaM2(
  dimensions: EstimateDimensions
): PouchFlatSheetResult {
  const type = resolvePouchConfiguratorType(dimensions);
  if (!type) {
    return {
      areaM2: 0,
      blankWidthMm: 0,
      blankLengthMm: 0,
      webCount: 0,
      extraPanelAreaMm2: 0,
      separateBottomWeb: false,
      type: null,
    };
  }

  const W = dimensions.openWidthMm ?? 0;
  const L = dimensions.openHeightMm ?? 0;
  // Bottom gusset (standing) and side gusset share formed-depth fields by variant.
  const usesSideGusset =
    type === 'center-fold-seal-side-gusset' || type === 'side-weld-side-gusset';
  const G = usesSideGusset
    ? (dimensions.sideGussetMm ?? 0)
    : (dimensions.bottomGussetMm ?? 0);
  const S1 = dimensions.bottomSealWidthMm ?? dimensions.sealAllowanceMm ?? 12;
  const D = dimensions.bottomDepthMm ?? 0;

  const geom = calculatePouchFlatGeom(type, { W, L, G, S1, D });
  const mainMm2 = geom.flatWidth * geom.flatHeight * geom.webCount;
  const areaMm2 = mainMm2 + geom.extraPanelArea;

  return {
    areaM2: areaMm2 / 1e6,
    blankWidthMm: geom.flatWidth,
    blankLengthMm: geom.flatHeight,
    webCount: geom.webCount,
    extraPanelAreaMm2: geom.extraPanelArea,
    separateBottomWeb: geom.separateBottomWeb,
    type,
  };
}
