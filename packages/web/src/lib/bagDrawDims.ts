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

/** Indicative flat sheet size for status bar (not a die-line). */
export function bagFlatSheetLabel(d: BagDrawDims, type: BagConfiguratorType): string {
  const gusset = type === 'side-gusset' ? d.SG * 2 : d.G;
  const extra =
    type === 'courier'
      ? (d.FL > 0 ? d.FL : Math.round(d.H * 0.18))
      : type === 'loop'
        ? d.HL
        : type === 'wicket'
          ? d.LH
          : gusset / 2;
  return `${Math.round(d.W)}×${Math.round(d.H + extra)} mm`;
}

export function bagFaceAreaCm2(d: BagDrawDims): string {
  return `${Math.round((d.W * d.H) / 100)} cm²`;
}
