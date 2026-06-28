import type { EstimateDimensions } from './types';

/**
 * Pouch flat-sheet area model — 6 subtypes.
 * Reference: docs/POUCH_COSTING_RESEARCH.md (sister to BAG_COSTING_RESEARCH.md).
 *
 * piecesPerKg = 1000 / (flatSheetAreaM2 × totalGsm)
 *
 * Conventions (kept consistent with bag-flat-sheet.ts):
 * - `W` = one finished face width — **seal-inclusive** (equal to slit/layflat
 *   web width; cross-direction side seals lie within W).
 * - `H` = finished usable height — seal-exclusive; the sealed top lip is added
 *   separately via `SA` (and similarly for any other machine-direction seal).
 * - `BG` / `SG` are FORMED depths (bag/pouch stands BG tall; each side gusset
 *   folds inward by SG → unfolds flat to 2×SG wide → two sides = +4SG to width).
 * - `SA` is added on **machine-direction** edges only (top after fill, side-
 *   gusset bottom). It is NOT added on cross-direction (slit-width) side seals
 *   or on folds. The 4-side seal is the one exception — its two plies are
 *   separate die-cuts, so `SA` is added on both axes.
 * - Box-pouch bottom panel: the bottom seal allowance is treated as **absorbed
 *   into the empirical bottom-depth `D`**, not as an additive `SA`, because
 *   that junction's geometry is converter-specific (see docs §4.6/§8).
 */

export type PouchConfiguratorType =
  | 'three-side-seal'
  | 'center-seal'
  | 'four-side-seal'
  | 'stand-up'
  | 'side-gusset'
  | 'flat-bottom';

/**
 * Maps estimate.productSubtype codes (stored in DB) → configurator type.
 * Single source of truth — web/server import this to avoid drift.
 */
export const POUCH_SUBTYPE_TO_CONFIGURATOR: Record<string, PouchConfiguratorType> = {
  // Canonical codes
  pouch_three_side_seal: 'three-side-seal',
  pouch_center_seal: 'center-seal',
  pouch_four_side_seal: 'four-side-seal',
  pouch_stand_up: 'stand-up',
  pouch_side_gusset: 'side-gusset',
  pouch_flat_bottom: 'flat-bottom',
  // Existing DB codes (web productCatalog / Master-Data defaults)
  pouch_3_side_seal: 'three-side-seal',
  pouch_3_side_seal_zip: 'three-side-seal',
  pouch_stand_up_zip: 'stand-up',
  pouch_kseal_stand_up: 'stand-up',
  pouch_kseal_stand_up_zip: 'stand-up',
  pouch_gusset: 'side-gusset',
  pouch_4_side_seal: 'four-side-seal',
  // Legacy aliases
  pouch_pillow: 'center-seal',
  pouch_doypack: 'stand-up',
  pouch_box: 'flat-bottom',
};

export const DEFAULT_POUCH_SEAL_ALLOWANCE_MM = 10;

export interface PouchFlatSheetResult {
  /** Flat blank area in m² (separate bottom-panel area added where applicable). */
  areaM2: number;
  /** Blank width in mm (cross-direction — the web width). */
  blankWidthMm: number;
  /** Blank length in mm (machine-direction — the cut length). */
  blankLengthMm: number;
  /** Resolved configurator type, or null if unresolvable. */
  type: PouchConfiguratorType | null;
}

const POUCH_SUBTYPE_VALUES = new Set<PouchConfiguratorType>([
  'three-side-seal',
  'center-seal',
  'four-side-seal',
  'stand-up',
  'side-gusset',
  'flat-bottom',
]);

/**
 * Resolve the pouch configurator type from dimensions.
 * Prefers explicit `pouchSubtype`; falls back to `productSubtype` code.
 */
export function resolvePouchConfiguratorType(
  dimensions: EstimateDimensions
): PouchConfiguratorType | null {
  if (dimensions.pouchSubtype) {
    const t = dimensions.pouchSubtype as PouchConfiguratorType;
    if (POUCH_SUBTYPE_VALUES.has(t)) return t;
  }
  if (dimensions.productSubtype) {
    const mapped = POUCH_SUBTYPE_TO_CONFIGURATOR[dimensions.productSubtype];
    if (mapped) return mapped;
  }
  return null;
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

  const W = dimensions.openWidthMm ?? 0;
  const H = dimensions.openHeightMm ?? 0;
  const BG = dimensions.bottomGussetMm ?? 0;
  const SG = dimensions.sideGussetMm ?? 0;
  const D = dimensions.bottomDepthMm ?? 0;
  const OV = dimensions.centerSealOverlapMm ?? 0;
  const SA = dimensions.sealAllowanceMm ?? DEFAULT_POUCH_SEAL_ALLOWANCE_MM;

  let area = 0; // total film area in mm²
  let blankWidth = 0;
  let blankLength = 0;

  switch (type) {
    case 'three-side-seal': {
      // Single web folded in half: bottom is the fold, top sealed after fill,
      // sides sealed within the slit width.
      //   blankWidth  = W                    (cross-dir: side seals lie within W)
      //   blankLength = 2H + SA              (front + back via fold + top seal)
      blankWidth = W;
      blankLength = 2 * H + SA;
      area = blankWidth * blankLength;
      break;
    }

    case 'center-seal': {
      // Pillow / fin-seal (VFFS): single web wrapped into a tube. The two web
      // edges meet at the back and are joined with a fin/lap seal of overlap OV.
      // Top and bottom are crimp end seals.
      //   blankWidth  = 2W + OV              (tube circumference + back-seal overlap)
      //   blankLength = H + 2·SA             (top + bottom end seals)
      blankWidth = 2 * W + OV;
      blankLength = H + 2 * SA;
      area = blankWidth * blankLength;
      break;
    }

    case 'four-side-seal': {
      // Two separate webs (front + back die-cut plies) sealed on all four edges.
      // Each ply takes SA on both axes (the exception — separate die-cuts, not a
      // continuous slit web).
      //   blankWidth  = W + 2·SA
      //   blankLength = H + 2·SA
      //   flatSheetArea = 2 × blankWidth × blankLength    (two plies)
      blankWidth = W + 2 * SA;
      blankLength = H + 2 * SA;
      area = 2 * blankWidth * blankLength;
      break;
    }

    case 'stand-up': {
      // Doypack: front + back + W-shaped bottom gusset (formed depth BG).
      // Two-web construction: gusset film W×2BG spread across 2W → +BG to length.
      //   blankWidth  = 2W
      //   blankLength = H + BG + SA          (no bottom seal — gusset apex is a fold)
      blankWidth = 2 * W;
      blankLength = H + BG + SA;
      area = blankWidth * blankLength;
      break;
    }

    case 'side-gusset': {
      // Front + back + two side gussets (formed depth SG, full-height) +
      // top + bottom seals.
      //   blankWidth  = 2W + 4·SG            (each side unfolds to 2SG)
      //   blankLength = H + 2·SA
      blankWidth = 2 * W + 4 * SG;
      blankLength = H + 2 * SA;
      area = blankWidth * blankLength;
      break;
    }

    case 'flat-bottom': {
      // Box pouch (5-panel): side-gusset body + folded rectangular bottom panel.
      //   blankWidth  = 2W + 4·SG            (side-gusset body)
      //   blankLength = H + SA               (top seal only; box bottom allowance
      //                                       absorbed into D, see POUCH_COSTING_RESEARCH §4.6/§8)
      //   bottomPanel = W × D                (folded flat base ≈ W wide × D deep)
      //   flatSheetArea = body + bottomPanel
      blankWidth = 2 * W + 4 * SG;
      blankLength = H + SA;
      const bodyArea = blankWidth * blankLength;
      const bottomPanelArea = W * D;
      area = bodyArea + bottomPanelArea;
      break;
    }

    default:
      // Unknown — caller should fall back to legacy pouch face area
      return { areaM2: 0, blankWidthMm: 0, blankLengthMm: 0, type: null };
  }

  return {
    areaM2: area / 1e6,
    blankWidthMm: blankWidth,
    blankLengthMm: blankLength,
    type,
  };
}
