import type { BagConfiguratorType } from './bagConfiguratorCatalog';

/** Normalized mm values for 2D schematic renderers (Bolt-style). */
export interface BagDrawDims {
  W: number;
  H: number;
  G: number;
  F: number;
  SG: number;
  HL: number;
  FL: number;
  LH: number;
}

export function bagDrawDimsFromFields(vals: Record<string, number>): BagDrawDims {
  const W = vals.W > 0 ? vals.W : 400;
  const Hraw = vals.H ?? vals.L;
  const H = Hraw != null && Hraw > 0 ? Hraw : 500;
  return {
    W,
    H,
    G: Math.max(0, vals.G ?? 0),
    F: Math.max(0, vals.F ?? vals.TS ?? 0),
    SG: Math.max(0, vals.SG ?? 0),
    HL: Math.max(0, vals.HL ?? 0),
    FL: Math.max(0, vals.FL ?? 0),
    LH: Math.max(0, vals.LH ?? 0),
  };
}

/**
 * Indicative flat sheet size for status bar (mirrors engine bag-flat-sheet.ts).
 * blankWidth = 2W (+4SG when side gusset); blankLength = H + BG + SA (or H + 2SA).
 * SA shown as the engine default (10 mm). Not a production die-line.
 */
const SA_INDICATIVE = 10;
export function bagFlatSheetLabel(d: BagDrawDims, type: BagConfiguratorType): string {
  // Courier is a single-web fold-up: width = W, length = 2H + flap + SA.
  if (type === 'courier') {
    const fl = d.FL > 0 ? d.FL : Math.round(d.H * 0.18);
    return `${Math.round(d.W)}×${Math.round(2 * d.H + fl + SA_INDICATIVE)} mm`;
  }
  // All other bags: two-web blank.
  const hasSide = type === 'side-gusset' || type === 'industrial' || (type === 'gusseted' && d.SG > 0);
  const hasBottom =
    type === 'bottom-gusset' ||
    type === 'diaper' ||
    (type === 'gusseted' && d.G > 0) ||
    ((type === 'wicket' || type === 'loop' || type === 'patch') && d.G > 0);
  const blankW = 2 * d.W + (hasSide ? 4 * d.SG : 0);
  const lipOrFold =
    (type === 'wicket' ? d.LH : 0) + (type === 'loop' ? d.HL : 0);
  const blankL =
    (hasBottom ? d.H + d.G + SA_INDICATIVE : d.H + 2 * SA_INDICATIVE) + lipOrFold;
  return `${Math.round(blankW)}×${Math.round(blankL)} mm`;
}

export function bagFaceAreaCm2(d: BagDrawDims): string {
  return `${Math.round((d.W * d.H) / 100)} cm²`;
}
