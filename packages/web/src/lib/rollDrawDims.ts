/** Normalized mm values for roll schematic renderers. */
export interface RollDrawDims {
  RW: number;
  CO: number;
  PPC: number;
  rollSpec?: import('@es/engine').RollSpecResult;
}

export function isContinuousWebRoll(d: Pick<RollDrawDims, 'CO'>): boolean {
  return d.CO <= 0;
}

export function rollDrawDimsFromFields(
  vals: Record<string, number>,
  rollSpec?: import('@es/engine').RollSpecResult
): RollDrawDims {
  const RW = vals.RW > 0 ? vals.RW : 250;
  const CO =
    vals.CO != null && Number.isFinite(vals.CO) && vals.CO >= 0 ? vals.CO : 150;
  const PPC = Math.max(1, Math.round(vals.PPC ?? 1));
  return { RW, CO, PPC, rollSpec };
}

/** Area of one index cut (full web repeat). */
export function rollRepeatAreaCm2(d: RollDrawDims): string {
  if (isContinuousWebRoll(d)) return '—';
  return `${Math.round((d.RW * d.CO) / 100)} cm²`;
}

/** Film area attributed to one piece when multi-lane. */
export function rollPieceAreaCm2(d: RollDrawDims): string {
  if (isContinuousWebRoll(d)) return '—';
  const laneW = d.RW / d.PPC;
  return `${Math.round((laneW * d.CO) / 100)} cm²`;
}

export function rollFlatWebLabel(d: RollDrawDims): string {
  if (isContinuousWebRoll(d)) {
    return `${Math.round(d.RW)} mm · continuous web`;
  }
  if (d.PPC <= 1) return `${Math.round(d.RW)}×${Math.round(d.CO)} mm`;
  return `${Math.round(d.RW)}×${Math.round(d.CO)} mm · ${d.PPC} lanes`;
}

export function rollLaneWidthMm(d: RollDrawDims): number {
  return d.RW / d.PPC;
}

/** Schematic outer Ø for 3D roll drawing only — not a user-entered dimension. */
export function schematicOuterDiameterMm(widthMm: number, _cutoffMm: number): number {
  return Math.round(Math.max(widthMm * 1.35, 240));
}
