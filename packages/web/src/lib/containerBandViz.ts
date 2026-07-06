/** Vertical placement of a sleeve or label band on a schematic container. */
export type ContainerBandPlacement = 'full' | 'middle' | 'top';

export const CONTAINER_BAND_PLACEMENTS: ContainerBandPlacement[] = ['full', 'middle', 'top'];

export const CONTAINER_BAND_PLACEMENT_LABELS: Record<ContainerBandPlacement, string> = {
  full: 'Full',
  middle: 'Middle',
  top: 'Cap / tamper',
};

/** Persisted in dimensions JSONB as 0 | 1 | 2. */
export const CONTAINER_BAND_PLACEMENT_CODE: Record<ContainerBandPlacement, number> = {
  full: 0,
  middle: 1,
  top: 2,
};

const CODE_TO_PLACEMENT: ContainerBandPlacement[] = ['full', 'middle', 'top'];

export function containerBandPlacementFromCode(code: number | undefined): ContainerBandPlacement {
  return CODE_TO_PLACEMENT[code ?? 0] ?? 'full';
}

export function containerBandPlacementCode(placement: ContainerBandPlacement): number {
  return CONTAINER_BAND_PLACEMENT_CODE[placement];
}

export interface BottleLayoutMm {
  bodyD: number;
  bandH: number;
  capH: number;
  neckH: number;
  shoulderH: number;
  baseH: number;
  bodyTopY: number;
  bodyBottomY: number;
  bandTopY: number;
  bandBottomY: number;
  totalH: number;
  neckD: number;
  cx: number;
}

export function bottleLayoutForBand(
  bodyD: number,
  bandH: number,
  placement: ContainerBandPlacement
): BottleLayoutMm {
  const neckH = Math.max(bandH * 0.22, bodyD * 0.12);
  const shoulderH = bodyD * 0.16;
  const capH = neckH * 0.4;
  const baseH = bodyD * 0.08;
  const neckD = bodyD * 0.32;
  const cx = bodyD / 2;
  const shoulderTopY = capH + neckH;
  const bodyTopY = shoulderTopY + shoulderH;
  const bodySpan =
    placement === 'full'
      ? Math.max(bandH, bodyD * 0.5)
      : Math.max(bandH * 1.85, bodyD * 0.65);
  const bodyBottomY = bodyTopY + bodySpan;

  let bandTopY: number;
  let bandBottomY: number;
  if (placement === 'top') {
    bandTopY = shoulderTopY - bandH * 0.12;
    bandBottomY = bandTopY + bandH;
    const shoulderMax = bodyTopY + shoulderH * 0.35;
    if (bandBottomY > shoulderMax) {
      bandBottomY = shoulderMax;
      bandTopY = bandBottomY - bandH;
    }
  } else if (placement === 'middle') {
    bandTopY = bodyTopY + (bodyBottomY - bodyTopY - bandH) / 2;
    bandBottomY = bandTopY + bandH;
  } else {
    bandTopY = bodyTopY;
    bandBottomY = bodyTopY + bandH;
  }

  const totalH = Math.max(bodyBottomY + baseH, bandBottomY + baseH * 0.5, capH + neckH + bandH);

  return {
    bodyD,
    bandH,
    capH,
    neckH,
    shoulderH,
    baseH,
    bodyTopY,
    bodyBottomY,
    bandTopY,
    bandBottomY,
    totalH,
    neckD,
    cx,
  };
}

export function bottleSilhouettePath(
  layout: BottleLayoutMm,
  px: (x: number) => number,
  py: (y: number) => number
): string {
  const { bodyD, capH, neckH, bodyTopY, bodyBottomY, totalH, neckD, cx } = layout;
  const xL = px(0);
  const xR = px(bodyD);
  const yCap = py(0);
  const yNeckBot = py(capH + neckH);
  const yShoulderBot = py(bodyTopY);
  const yBodyBot = py(bodyBottomY);
  const yBase = py(totalH);
  const xNeckL = px(cx - neckD / 2);
  const xNeckR = px(cx + neckD / 2);
  const xCapL = px(cx - neckD * 0.55);
  const xCapR = px(cx + neckD * 0.55);

  return [
    `M ${xCapL} ${yCap}`,
    `L ${xCapR} ${yCap}`,
    `L ${xNeckR} ${py(capH)}`,
    `L ${xNeckR} ${yNeckBot}`,
    `Q ${xR} ${yNeckBot} ${xR} ${yShoulderBot}`,
    `L ${xR} ${yBodyBot}`,
    `Q ${xR} ${yBase} ${px(cx)} ${yBase}`,
    `Q ${xL} ${yBase} ${xL} ${yBodyBot}`,
    `L ${xL} ${yShoulderBot}`,
    `Q ${xL} ${yNeckBot} ${xNeckL} ${yNeckBot}`,
    `L ${xNeckL} ${py(capH)}`,
    'Z',
  ].join(' ');
}

/** Neck + cap outline for tamper sleeve (drawn dashed behind the shoulder band). */
export function bottleNeckCapPath(
  layout: BottleLayoutMm,
  px: (x: number) => number,
  py: (y: number) => number
): string {
  const { capH, neckH, neckD, cx } = layout;
  const xNeckL = px(cx - neckD / 2);
  const xNeckR = px(cx + neckD / 2);
  const xCapL = px(cx - neckD * 0.55);
  const xCapR = px(cx + neckD * 0.55);
  const yCap = py(0);
  const yNeckBot = py(capH + neckH);

  return [
    `M ${xCapL} ${yCap}`,
    `L ${xCapR} ${yCap}`,
    `L ${xNeckR} ${py(capH)}`,
    `L ${xNeckR} ${yNeckBot}`,
    `L ${xNeckL} ${yNeckBot}`,
    `L ${xNeckL} ${py(capH)}`,
    'Z',
  ].join(' ');
}

export function bottleCapPath(
  layout: BottleLayoutMm,
  px: (x: number) => number,
  py: (y: number) => number
): string {
  const { capH, neckD, cx } = layout;
  const xCapL = px(cx - neckD * 0.55);
  const xCapR = px(cx + neckD * 0.55);
  return `M ${xCapL} ${py(0)} L ${xCapR} ${py(0)} L ${px(cx + neckD * 0.42)} ${py(capH)} L ${px(cx - neckD * 0.42)} ${py(capH)} Z`;
}
