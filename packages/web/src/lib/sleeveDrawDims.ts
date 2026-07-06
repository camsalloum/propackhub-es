/** Normalized mm values for sleeve schematic renderers. */
export interface SleeveDrawDims {
  LF: number;
  CO: number;
  /** Open web on press = 2×LF + seam overlap (wound 3D view only). */
  openWebWidthMm: number;
  rollSpec?: import('@es/engine').RollSpecResult;
}

/** Seam allowance on the open sleeve blank (mm). */
export const SLEEVE_SEAM_OVERLAP_MM = 4;

export function sleeveOpenWebWidthMm(lf: number, seamOverlapMm = SLEEVE_SEAM_OVERLAP_MM): number {
  return 2 * lf + seamOverlapMm;
}

export function sleeveDrawDimsFromFields(
  vals: Record<string, number>,
  rollSpec?: import('@es/engine').RollSpecResult
): SleeveDrawDims {
  const LF = vals.LF > 0 ? vals.LF : 400;
  const CO = vals.CO > 0 ? vals.CO : 300;
  return { LF, CO, openWebWidthMm: sleeveOpenWebWidthMm(LF), rollSpec };
}

export function sleeveBlankAreaCm2(d: SleeveDrawDims): string {
  return `${Math.round((d.LF * d.CO) / 100)} cm²`;
}

export function sleeveFlatBlankLabel(d: SleeveDrawDims): string {
  return `${Math.round(d.LF)}×${Math.round(d.CO)} mm`;
}

/** Indicative formed tube Ø when seamed (LF ≈ π × D). */
export function sleeveFormedDiameterMm(d: SleeveDrawDims): number {
  return d.LF / Math.PI;
}

export function sleeveFormedDiameterLabel(d: SleeveDrawDims): string {
  return `≈ Ø ${Math.round(sleeveFormedDiameterMm(d))} mm`;
}
