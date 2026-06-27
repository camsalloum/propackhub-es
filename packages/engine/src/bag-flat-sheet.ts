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
 */
export const BAG_SUBTYPE_TO_CONFIGURATOR: Record<string, BagConfiguratorType> = {
  bag_bottom_gusset_shopping: 'bottom-gusset',
  bag_side_gusset_shopping: 'side-gusset',
  bag_courier: 'courier',
  bag_diaper: 'diaper',
  bag_industrial: 'industrial',
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
  'bottom-gusset', 'side-gusset', 'courier', 'diaper', 'industrial',
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
  const SA = dimensions.sealAllowanceMm ?? DEFAULT_BAG_SEAL_ALLOWANCE_MM;

  let area = 0; // total film area in mm²
  let webWidth = 0; // printing web width (cross-direction) for linearM calc
  let cutLength = 0; // nominal cut length (machine-direction) for linearM calc
  let patchAreaM2 = 0;

  switch (type) {
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
      area = W * (2 * H + FL + SA);
      webWidth = W;
      cutLength = 2 * H + FL + SA;
      break;
    }

    case 'diaper': {
      // BG = FORMED bottom-gusset depth + top flap (FL) full width.
      // Same two-web construction as bottom-gusset: gusset film = W × 2BG spread
      // across 2W → adds BG (not 2BG) to length.
      // Area = 2W × (H + BG + FL + SA).
      area = 2 * W * (H + BG + FL + SA);
      webWidth = 2 * W;
      cutLength = H + BG + FL + SA;
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
      // Handle weight is averaged into the total bag weight: body area + handle area,
      // all multiplied by totalGsm downstream → total weight per bag.
      // BG = FORMED bottom-gusset depth. Two-web construction: gusset adds BG
      // (not 2BG) to length.
      // 2 handle strips, each HW wide × HL long (HW defaults to W if omitted).
      // NOTE: handle addition assumes WELDED-ON strip handles. For DIE-CUT loop
      // handles (punched from the body panel), handle material is already in the
      // body area and the +2·HW·HL term should be DROPPED. Pending converter
      // confirmation on which construction the loop subtype represents — see
      // docs/BAG_COSTING_RESEARCH.md §7A point F (new N-point).
      const handleWidth = HW > 0 ? HW : W;
      const bodyArea = 2 * W * (H + BG + SA);
      const handleArea = 2 * handleWidth * HL;
      area = bodyArea + handleArea;
      webWidth = 2 * W;
      cutLength = H + BG + SA; // body blank; handle weight averaged in via area
      break;
    }

    case 'patch': {
      // Base body + reinforcement patch (separate piece, same GSM assumption).
      // Catalog maps patch G → sideGussetMm (SG, formed depth) by default.
      if (BG > 0 && SG === 0) {
        // Bottom-gusset base (rare for patch): two-web → adds BG (not 2BG) to length.
        area = 2 * W * (H + BG + SA);
        webWidth = 2 * W;
        cutLength = H + BG + SA;
      } else {
        // Side-gusset base (catalog default): SG formed → 4SG
        area = (2 * W + 4 * SG) * (H + 2 * SA);
        webWidth = 2 * W + 4 * SG;
        cutLength = H + 2 * SA;
      }
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