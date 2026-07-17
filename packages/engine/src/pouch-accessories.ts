// Pouch accessory costing — zipper / spout / valve / window / handle.
//
// Accessories add real WEIGHT and real COST that the legacy engine ignored.
// This module turns an estimate's accessory selections into three per-piece
// contributions that the main calculator folds into grams/piece and sale price:
//
//   - weightGramPerPiece : extra grams added to each finished piece
//   - costUsdPerPiece     : hardware cost (USD) added to each finished piece
//   - filmAreaM2          : extra film area (e.g. a window patch) that is weighed
//                           at the structure GSM and costed through the per-kg RM
//
// Rate basis (mirrors docs/POUCH_COSTING_RESEARCH.md §7 and the BOM2 zipper
// formula): zipper = per linear metre (≈ pouch width); spout/valve/handle =
// per piece; window = per m² of added patch film.
//
// Rates resolve from an explicit snapshot on the selection (preferred — keeps a
// quote reproducible) and fall back to the referenced accessory Material row.

import type { EstimateDimensions, Material } from './types';

export type PouchAccessoryKind =
  | 'zipper'
  | 'spout'
  | 'valve'
  | 'window'
  | 'handle'
  | 'tear_notch'
  | 'laser_score'
  | 'easy_peel'
  | 'hanging_hole';

export interface PouchAccessorySelection {
  kind: PouchAccessoryKind;
  /** Off when explicitly false; treated as on otherwise. */
  enabled?: boolean;
  /** Accessory Material row this selection draws its rate from. */
  materialId?: string;
  /** Per-piece accessories (spout/valve/handle): how many per pouch. Default 1.
   *  For zipper this is the number of zip runs (default 1). */
  count?: number;

  // Snapshot rates (optional). When present they win over the material lookup,
  // so an accepted quote stays reproducible even if master-data rates change.
  /** Zipper: USD per linear metre of zip profile. */
  costPerMeterUsd?: number;
  /** Zipper: grams per linear metre of zip profile. */
  weightGramPerMeter?: number;
  /** Spout / valve / handle: USD per unit. */
  costPerPieceUsd?: number;
  /** Spout / valve / handle: grams per unit. */
  weightGramPerPiece?: number;
  /** Window / patch: USD per m² of patch film (optional extra over structure RM). */
  costPerM2Usd?: number;
  /** Window patch: grams per m² (patch film gsm = micron × density). When set, the
   *  patch is weighed by its OWN film instead of the structure GSM. */
  weightGramPerM2?: number;
  /** Window patch film thickness (µ) — kept for re-editing; rates are derived from it. */
  patchMicronMm?: number;
  /** Window patch width (mm). */
  widthMm?: number;
  /** Window patch height (mm). */
  heightMm?: number;
  /** Window patch centre position as a % of the pouch face (0–100). Defaults to centre (50,50).
   *  Cosmetic only — affects where the patch is drawn, not cost/weight. */
  windowPosXPct?: number;
  windowPosYPct?: number;
  /** Zipper: distance from open/fill end (mm). Visual + machine clearance; cost still ≈ open width. */
  positionFromTopMm?: number;
  /** Zipper: Push-Pull | Slider (stored as label string in UI; optional). */
  zipType?: string;
  /** Zipper profile width (mm). */
  zipWidthMm?: number;
}

export interface PouchAccessoryResult {
  /** Extra grams added to each finished piece (hardware + window film). */
  weightGramPerPiece: number;
  /** Hardware cost (USD) added to each finished piece. */
  costUsdPerPiece: number;
  /** Extra film area (m²) added to the blank (window/patch). */
  filmAreaM2: number;
}

const EMPTY: PouchAccessoryResult = {
  weightGramPerPiece: 0,
  costUsdPerPiece: 0,
  filmAreaM2: 0,
};

/**
 * Aggregate the per-piece weight, cost, and added film area for every enabled
 * accessory on a pouch estimate. Returns zeros when there are no accessories,
 * so existing estimates behave exactly as before.
 */
export function calculatePouchAccessories(
  dimensions: EstimateDimensions,
  materials: Map<string, Material>
): PouchAccessoryResult {
  const list = dimensions.accessories;
  if (!list || list.length === 0) return EMPTY;

  const openWidthMm = dimensions.openWidthMm ?? 0;
  let weightGramPerPiece = 0;
  let costUsdPerPiece = 0;
  let filmAreaM2 = 0;

  for (const a of list) {
    if (a.enabled === false) continue;
    const mat = a.materialId ? materials.get(a.materialId) : undefined;

    const perMeterCost = a.costPerMeterUsd ?? mat?.costPerMeterUsd ?? 0;
    const perMeterWeight = a.weightGramPerMeter ?? mat?.weightGramPerMeter ?? 0;
    const perPieceCost = a.costPerPieceUsd ?? mat?.costPerPieceUsd ?? 0;
    const perPieceWeight = a.weightGramPerPiece ?? mat?.weightGramPerPiece ?? 0;
    const count = a.count && a.count > 0 ? a.count : 1;

    switch (a.kind) {
      case 'zipper': {
        // Length of zip profile ≈ pouch open width × number of runs.
        const lengthM = (openWidthMm / 1000) * count;
        weightGramPerPiece += lengthM * perMeterWeight;
        costUsdPerPiece += lengthM * perMeterCost;
        break;
      }
      case 'spout':
      case 'valve':
      case 'handle':
      case 'hanging_hole': {
        weightGramPerPiece += count * perPieceWeight;
        costUsdPerPiece += count * perPieceCost;
        break;
      }
      case 'window': {
        // Window/patch film area (W×H).
        const areaM2 = ((a.widthMm ?? 0) * (a.heightMm ?? 0)) / 1e6;
        const perM2Cost = a.costPerM2Usd ?? 0;
        const perM2Weight = a.weightGramPerM2 ?? 0;
        if (perM2Cost > 0 || perM2Weight > 0) {
          // Patch is linked to a chosen substrate — price and weigh it by its OWN
          // film (cost = area × substrate $/m²; weight = area × patch gsm). It is
          // NOT folded into the structure blank, so it isn't double-counted at the
          // structure GSM/RM.
          costUsdPerPiece += areaM2 * perM2Cost;
          weightGramPerPiece += areaM2 * perM2Weight;
        } else {
          // Legacy fallback: weigh the patch at the structure GSM via the blank.
          filmAreaM2 += areaM2;
        }
        break;
      }
      case 'tear_notch':
      case 'laser_score':
      case 'easy_peel':
        // Tooling / process — optional per-piece rate when material is linked.
        if (perPieceCost > 0 || perPieceWeight > 0) {
          weightGramPerPiece += count * perPieceWeight;
          costUsdPerPiece += count * perPieceCost;
        }
        break;
      default:
        break;
    }
  }

  return { weightGramPerPiece, costUsdPerPiece, filmAreaM2 };
}
