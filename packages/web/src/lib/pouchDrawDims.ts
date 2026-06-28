import type { PouchConfiguratorType } from './pouchConfiguratorCatalog';

/** Normalized mm values for 2D schematic + flat-blank renderers. */
export interface PouchDrawDims {
  W: number;
  H: number;
  BG: number;
  SG: number;
  D: number;
  OV: number;
}

export function pouchDrawDimsFromFields(vals: Record<string, number>): PouchDrawDims {
  const W = vals.W > 0 ? vals.W : 110;
  const H = vals.H != null && vals.H > 0 ? vals.H : 190;
  return {
    W,
    H,
    BG: Math.max(0, vals.BG ?? 0),
    SG: Math.max(0, vals.SG ?? 0),
    D: Math.max(0, vals.D ?? 0),
    OV: Math.max(0, vals.OV ?? 0),
  };
}

/**
 * Indicative flat-sheet size shown in the status bar.
 * Mirrors engine/src/pouch-flat-sheet.ts exactly so the UI label matches the
 * blank the engine cost is based on. SA shown as engine default (10 mm).
 */
const SA_INDICATIVE = 10;

export function pouchFlatSheetLabel(d: PouchDrawDims, type: PouchConfiguratorType): string {
  let blankW = 0;
  let blankL = 0;
  switch (type) {
    case 'three-side-seal':
      blankW = d.W;
      blankL = 2 * d.H + SA_INDICATIVE;
      break;
    case 'center-seal':
      blankW = 2 * d.W + d.OV;
      blankL = d.H + 2 * SA_INDICATIVE;
      break;
    case 'four-side-seal':
      // Two-ply blank — show one ply's lay-flat for size context; area is ×2.
      blankW = d.W + 2 * SA_INDICATIVE;
      blankL = d.H + 2 * SA_INDICATIVE;
      break;
    case 'stand-up':
      blankW = 2 * d.W;
      blankL = d.H + d.BG + SA_INDICATIVE;
      break;
    case 'side-gusset':
      blankW = 2 * d.W + 4 * d.SG;
      blankL = d.H + 2 * SA_INDICATIVE;
      break;
    case 'flat-bottom':
      blankW = 2 * d.W + 4 * d.SG;
      blankL = d.H + SA_INDICATIVE;
      break;
  }
  return `${Math.round(blankW)}×${Math.round(blankL)} mm`;
}

export function pouchFaceAreaCm2(d: PouchDrawDims): string {
  return `${Math.round((d.W * d.H) / 100)} cm²`;
}

/**
 * Returns true when the subtype has a "two-ply" or "wrapped tube" construction
 * worth noting in the status bar, since the displayed face area then differs
 * meaningfully from the cost basis.
 */
export function pouchConstructionNote(type: PouchConfiguratorType): string {
  switch (type) {
    case 'three-side-seal':
      return 'Single web folded — bottom is fold, top + 2 sides sealed';
    case 'center-seal':
      return 'Single web wrapped to a tube — back fin seal + top/bottom end seals';
    case 'four-side-seal':
      return 'Two die-cut plies — sealed on all 4 edges';
    case 'stand-up':
      return 'Front + back + bottom gusset (doypack)';
    case 'side-gusset':
      return 'Front + back + 2 side gussets (full height)';
    case 'flat-bottom':
      return 'Side-gusset body + folded bottom panel (box pouch)';
  }
}
