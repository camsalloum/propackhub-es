import { SLEEVE_DEFAULTS } from './sleeveConfiguratorCatalog';
import {
  containerBandPlacementFromCode,
  type ContainerBandPlacement,
} from './containerBandViz';

/** Normalized mm values for sleeve schematic renderers. */
export interface SleeveDrawDims {
  LF: number;
  CO: number;
  placement: ContainerBandPlacement;
  /** Open web on press = 2×LF + seam overlap (open-web panel only). */
  openWebWidthMm: number;
  rollSpec?: import('@es/engine').RollSpecResult;
}

/** Seam allowance on the open sleeve blank (mm). */
export const SLEEVE_SEAM_OVERLAP_MM = 6;

export function sleeveOpenWebWidthMm(lf: number, seamOverlapMm = SLEEVE_SEAM_OVERLAP_MM): number {
  return 2 * lf + seamOverlapMm;
}

export function sleeveDrawDimsFromFields(
  vals: Record<string, number>,
  rollSpec?: import('@es/engine').RollSpecResult
): SleeveDrawDims {
  const LF = vals.LF > 0 ? vals.LF : SLEEVE_DEFAULTS.LF;
  const CO = vals.CO > 0 ? vals.CO : SLEEVE_DEFAULTS.CO;
  const placement = containerBandPlacementFromCode(vals.placement);
  return { LF, CO, placement, openWebWidthMm: sleeveOpenWebWidthMm(LF), rollSpec };
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
