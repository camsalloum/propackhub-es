import type { EstimateDimensions } from './types';

/**
 * Bag flat-sheet area model — 9 subtypes.
 * Reference: docs/BAG_COSTING_RESEARCH.md (DRAFT formulas, pending expert validation).
 *
 * piecesPerKg = 1000 / (flatSheetAreaM2 × totalGsm)
 *
 * The flat sheet is the rectangular blank of film required to form one bag,
 * BEFORE filling. It accounts for gussets, flaps, lips, seal allowances, and
 * reinforcement patches. It does NOT include process waste (deferred to slab
 * waste % in V2).
 */

export type BagConfiguratorType =
  | 'gusseted'
  | 'bottom-gusset'
  | 'side-gusset'
  | 'courier'
  | 'diaper'
  | 'industrial'
  | 'loop'
  | 'patch'
  | 'punch'
  | 'wicket';

/**
 * Maps estimate.productSubtype codes (stored in DB) → configurator type.
 * Single source of truth — web/server import this to avoid drift.
 *
 * `bag_gusseted_shopping` is the unified shopping-bag subtype (bottom and/or side
 * gusset, or flat). The legacy `bag_bottom_gusset_shopping` / `bag_side_gusset_shopping`
 * codes remain mapped for backward compatibility with existing estimates; new
 * estimates use `bag_gusseted_shopping`.
 */
export const BAG_SUBTYPE_TO_CONFIGURATOR: Record<string, BagConfiguratorType> = {
  bag_gusseted_shopping: 'gusseted',
  // Industrial bag = flat / side-gusseted tube → unified gusseted formula.
  bag_industrial: 'gusseted',
  bag_bottom_gusset_shopping: 'bottom-gusset',
  bag_side_gusset_shopping: 'side-gusset',
  bag_courier: 'courier',
  bag_diaper: 'diaper',
  bag_loop_handle: 'loop',
  bag_patch_handle: 'patch',
  bag_punch_handle: 'punch',
  bag_wicket: 'wicket',
};

export const DEFAULT_BAG_SEAL_ALLOWANCE_MM = 10;

export interface BagFlatSheetResult {
  /** Flat blank area in m² (patch area added where applicable). */
  areaM2: number;
  /** Blank width in mm (cross-direction — the web width). */
  blankWidthMm: number;
  /** Blank length in mm (machine-direction — the cut length). */
  blankLengthMm: number;
  /** Reinforcement patch area in m² (patch subtype only). */
  patchAreaM2: number;
  /** Resolved configurator type, or null if unresolvable. */
  type: BagConfiguratorType | null;
}

/**
 * Resolve the bag configurator type from dimensions.
 * Prefers explicit `bagSubtype`; falls back to `productSubtype` code.
 */
export function resolveBagConfiguratorType(
  dimensions: EstimateDimensions
): BagConfiguratorType | null {
  if (dimensions.bagSubtype) {
    const t = dimensions.bagSubtype as BagConfiguratorType;
    if (BAG_SUBTYPE_VALUES.has(t)) return t;
  }
  if (dimensions.productSubtype) {
    const mapped = BAG_SUBTYPE_TO_CONFIGURATOR[dimensions.productSubtype];
    if (mapped) return mapped;
  }
  return null;
}

const BAG_SUBTYPE_VALUES = new Set<BagConfiguratorType>([
  'gusseted', 'bottom-gusset', 'side-gusset', 'courier', 'diaper', 'industrial',
  'loop', 'patch', 'punch', 'wicket',
]);

/**
 * Compute the flat-sheet blank area (m²) for one bag.
 * Returns { areaM2: 0, ... } if the configurator type cannot be resolved,
 * so callers can fall back to a face-area estimate.
 */
export function calculateBagFlatSheetAreaM2(
  dimensions: EstimateDimensions
): BagFlatSheetResult {
  const type = resolveBagConfiguratorType(dimensions);

  const W = dimensions.openWidthMm ?? 0;
  const H = dimensions.openHeightMm ?? 0;
  const BG = dimensions.bottomGussetMm ?? 0;
  const SG = dimensions.sideGussetMm ?? 0;
  const FL = dimensions.flapMm ?? 0;
  const HL = dimensions.handleLengthMm ?? 0;
  const HW = dimensions.bagHandleWidthMm ?? 0;
  const PW = dimensions.bagPatchWidthMm ?? 0;
  const PH = dimensions.bagPatchHeightMm ?? 0;
  const LH = dimensions.bagWicketLipMm ?? 0;
  const TF = dimensions.bagTopFoldMm ?? 0;
  const POD = dimensions.bagPodHeightMm ?? 0;
  const SA = dimensions.sealAllowanceMm ?? DEFAULT_BAG_SEAL_ALLOWANCE_MM;

  let area = 0; // total film area in mm²
  let webWidth = 0; // printing web width (cross-direction) for linearM calc
  let cutLength = 0; // nominal cut length (machine-direction) for linearM calc
  let patchAreaM2 = 0;

  switch (type) {
    case 'gusseted': {
      // UNIFIED gusseted shopping bag — supersedes separate bottom-gusset / side-gusset.
      // W = one face (front panel). Two-web / lay-flat-tube construction.
      // The gusset state is driven purely by which depths are entered:
      //   - BG > 0  → bottom gusset present (gusset closes the base → ONE top seal)
      //   - SG > 0  → side gussets present  (each unfolds to 2·SG → +4·SG on width)
      //
      //   width  = 2W + (SG > 0 ? 4·SG : 0)
      //   length = BG > 0 ? (H + BG + SA)   // bottom gusset closes base, single top seal
      //                   : (H + 2·SA)       // flat / side-only → bottom + top seal
      //
      // Numerically identical to the legacy types for the single-gusset cases:
      //   BG>0,SG=0 → bottom-gusset | BG=0,SG>0 → side-gusset | BG=0,SG=0 → flat tube
      //   BG>0,SG>0 → block-bottom / quad-seal (the previously missing combination).
      const widthMm = 2 * W + (SG > 0 ? 4 * SG : 0);
      const lengthMm = BG > 0 ? H + BG + SA : H + 2 * SA;
      area = widthMm * lengthMm;
      webWidth = widthMm;
      cutLength = lengthMm;
      break;
    }

    case 'bottom-gusset': {
      // BG = FORMED depth (bag stands BG tall at bottom when filled).
      // Two-web construction: blankWidth = 2W (front+back side-by-side).
      // Gusset film = W × 2BG (W wide, unfolds to 2BG long). Spread across 2W
      // width → adds BG to length (NOT 2BG — that belongs to fold-in-half model).
      // Area = 2W × (H + BG + SA).
      area = 2 * W * (H + BG + SA);
      webWidth = 2 * W;
      cutLength = H + BG + SA;
      break;
    }

    case 'side-gusset': {
      // SG = FORMED depth per side (fold goes SG inward; internal depth = 2×SG).
      // Each side gusset unfolds flat to 2×SG wide; two sides = 4SG added to width.
      // Gussets run full height H → co-extensive with length, folded into width.
      // Area = (2W + 4SG) × (H + 2SA).
      area = (2 * W + 4 * SG) * (H + 2 * SA);
      webWidth = 2 * W + 4 * SG;
      cutLength = H + 2 * SA;
      break;
    }

    case 'courier': {
      // Single-web wraparound: web width = W, length = 2H + flap + top seal.
      // FL = adhesive/peel flap (the courier closure strip — set FL to the real
      // peel-seal depth, typically 25–40 mm, not the generic SA).
      // POD = optional proof-of-delivery document pocket: an extra W×POD film panel
      // welded to the face. Adds film weight (0 = no pocket).
      area = W * (2 * H + FL + SA) + W * POD;
      webWidth = W;
      cutLength = 2 * H + FL + SA + POD;
      break;
    }

    case 'diaper': {
      // BG = FORMED bottom-gusset depth. TF = top fold/hem (bagTopFoldMm).
      // Two-web construction: gusset film = W × 2BG spread across 2W → adds BG.
      // Neck cut (bagNeckCutMm) and vent holes are die-cut from the blank → no net
      // film removed for weight (blank is still purchased full), so not subtracted.
      // Area = 2W × (H + BG + TF + SA).
      area = 2 * W * (H + BG + TF + SA);
      webWidth = 2 * W;
      cutLength = H + BG + TF + SA;
      break;
    }

    case 'industrial': {
      // SG = FORMED side-gusset depth per side (unfolds to 2SG each, 4SG total).
      // Area = (2W + 4SG) × (H + 2SA). SG=0 → flat tube (2W × (H+2SA)).
      area = (2 * W + 4 * SG) * (H + 2 * SA);
      webWidth = 2 * W + 4 * SG;
      cutLength = H + 2 * SA;
      break;
    }

    case 'loop': {
      // Loop handle is the SAME material as the body (cut from the same film web).
      // BG = FORMED bottom-gusset depth. Two-web construction: gusset adds BG to length.
      //
      // Handle construction (bagLoopWelded):
      //   1 = WELDED-ON strip (default): 2 ribbon strips, each HW wide × HL long, are
      //       extra film welded to the mouth → add 2·HW·HL to the area.
      //   0 = DIE-CUT loop (punched from the body panel): NO extra film — the handle is
      //       part of the body blank, so the handle term is dropped.
      // HW = ribbon width (default 25 mm). NEVER inherits W (a full-width handle is wrong).
      const welded = (dimensions.bagLoopWelded ?? 1) !== 0;
      const handleWidth = HW > 0 ? HW : 25;
      const bodyArea = 2 * W * (H + BG + SA);
      const handleArea = welded ? 2 * handleWidth * HL : 0;
      area = bodyArea + handleArea;
      webWidth = 2 * W;
      cutLength = H + BG + SA; // body blank; handle weight averaged in via area
      break;
    }

    case 'patch': {
      // Base body uses the SAME unified gusset logic as 'gusseted' (flat / bottom /
      // side / both), plus a separate reinforcement patch piece (PW × PH).
      // Catalog default maps the patch base gusset to bottomGussetMm (bottom-gusset is
      // the common patch-handle body), but side/both are supported if entered.
      // The patch is cut from the same film as the body, so it is weighed at the body's
      // structure GSM (its area is included in areaM2). A genuinely heavier-gauge patch
      // would need its own structure — out of scope here (see audit §3.1).
      const widthMm = 2 * W + (SG > 0 ? 4 * SG : 0);
      const lengthMm = BG > 0 ? H + BG + SA : H + 2 * SA;
      area = widthMm * lengthMm;
      webWidth = widthMm;
      cutLength = lengthMm;
      patchAreaM2 = (PW * PH) / 1e6;
      break;
    }

    case 'punch': {
      // Flat or side-gusseted bag with die-cut handle slot punched from body.
      // SG = FORMED depth (unfolds to 4SG total). SG=0 → flat bag.
      // Die-cut removes no net film (slot is cut from the body panel).
      area = (2 * W + 4 * SG) * (H + 2 * SA);
      webWidth = 2 * W + 4 * SG;
      cutLength = H + 2 * SA;
      break;
    }

    case 'wicket': {
      // Wicket is a MODIFIER (holes for wicket pins), not a base shape.
      // Catalog has G (bottomGussetMm) with hint "0 = flat bottom" → supports both.
      // G = FORMED depth. Two-web construction: gusset adds G (not 2G) to length.
      // LH = lip/header strip across full width.
      if (BG > 0) {
        // Gusseted wicket: bottom-gusset body + lip
        area = 2 * W * (H + BG + SA + LH);
        webWidth = 2 * W;
        cutLength = H + BG + SA + LH;
      } else {
        // Flat wicket (no gusset): industrial flat tube + lip
        area = 2 * W * (H + 2 * SA + LH);
        webWidth = 2 * W;
        cutLength = H + 2 * SA + LH;
      }
      break;
    }

    default:
      // Unknown — caller should fall back to pouch face area
      return { areaM2: 0, blankWidthMm: 0, blankLengthMm: 0, patchAreaM2: 0, type: null };
  }

  const areaM2 = area / 1e6 + patchAreaM2;
  return { areaM2, blankWidthMm: webWidth, blankLengthMm: cutLength, patchAreaM2, type };
}