import { useMemo } from 'react';
import {
  bottleCapPath,
  bottleLayoutForBand,
  bottleNeckCapPath,
  bottleSilhouettePath,
  type ContainerBandPlacement,
} from '../../lib/containerBandViz';
import { DimH, DimV, Grid, W, mkT, useDrawAreaSize } from '../continuousWeb/webSvgPrimitives';

export function ContainerOnBottle({
  bodyDiameterMm,
  bandHeightMm,
  bandHeightLabel,
  widthDimLbl,
  placement,
  ariaLabel,
  gridId,
}: {
  bodyDiameterMm: number;
  bandHeightMm: number;
  bandHeightLabel: string;
  widthDimLbl: string;
  placement: ContainerBandPlacement;
  ariaLabel: string;
  gridId: string;
}) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(280, 360);
  const layout = useMemo(
    () => bottleLayoutForBand(bodyDiameterMm, bandHeightMm, placement),
    [bodyDiameterMm, bandHeightMm, placement]
  );

  return (
    <div ref={ref} className="w-full h-full min-h-[360px] flex items-stretch">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="block w-full h-full"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        <Grid w={vw} h={vh} id={gridId} />
        <DrawContainerOnBottle
          layout={layout}
          placement={placement}
          vw={vw}
          vh={vh}
          bandHeightLabel={bandHeightLabel}
          widthDimLbl={widthDimLbl}
        />
      </svg>
    </div>
  );
}

function DrawContainerOnBottle({
  layout,
  placement,
  vw,
  vh,
  bandHeightLabel,
  widthDimLbl,
}: {
  layout: ReturnType<typeof bottleLayoutForBand>;
  placement: ContainerBandPlacement;
  vw: number;
  vh: number;
  bandHeightLabel: string;
  widthDimLbl: string;
}) {
  const t = mkT(layout.bodyD, layout.totalH, vw, vh);
  const xL = t.px(0);
  const xR = t.px(layout.bodyD);
  const yBandTop = t.py(layout.bandTopY);
  const yBandBot = t.py(layout.bandBottomY);
  const bottlePath = bottleSilhouettePath(layout, t.px, t.py);
  const isTamper = placement === 'top';
  const { neckD, cx, capH, neckH } = layout;
  const xNeckL = t.px(cx - neckD / 2);
  const xNeckR = t.px(cx + neckD / 2);
  const xCapL = t.px(cx - neckD * 0.55);
  const xCapR = t.px(cx + neckD * 0.55);
  const yCap = t.py(0);
  const yNeckBot = t.py(capH + neckH);
  const neckStroke = W.stroke;
  const neckDash = '7,4';

  return (
    <>
      <path d={bottlePath} fill="#eef1f5" stroke="#94a3b8" strokeWidth={1.2} strokeLinejoin="round" />
      {isTamper && (
        <path
          d={bottleNeckCapPath(layout, t.px, t.py)}
          fill="none"
          stroke={neckStroke}
          strokeWidth={1.6}
          strokeDasharray={neckDash}
          opacity={0.45}
        />
      )}
      <rect
        x={xL}
        y={yBandTop}
        width={xR - xL}
        height={yBandBot - yBandTop}
        fill={W.fill}
        stroke={W.stroke}
        strokeWidth={W.sw}
        opacity={isTamper ? 0.78 : 0.92}
      />
      {isTamper && (
        <>
          <line
            x1={xNeckL}
            y1={yCap}
            x2={xNeckL}
            y2={yNeckBot}
            stroke={neckStroke}
            strokeWidth={2.2}
            strokeDasharray={neckDash}
            strokeLinecap="round"
          />
          <line
            x1={xNeckR}
            y1={yCap}
            x2={xNeckR}
            y2={yNeckBot}
            stroke={neckStroke}
            strokeWidth={2.2}
            strokeDasharray={neckDash}
            strokeLinecap="round"
          />
          <line
            x1={xCapL}
            y1={yCap}
            x2={xCapR}
            y2={yCap}
            stroke={neckStroke}
            strokeWidth={2}
            strokeDasharray={neckDash}
            strokeLinecap="round"
          />
          <line
            x1={xNeckR}
            y1={t.py(capH)}
            x2={xCapR}
            y2={yCap}
            stroke={neckStroke}
            strokeWidth={1.8}
            strokeDasharray={neckDash}
            strokeLinecap="round"
          />
          <line
            x1={xNeckL}
            y1={t.py(capH)}
            x2={xCapL}
            y2={yCap}
            stroke={neckStroke}
            strokeWidth={1.8}
            strokeDasharray={neckDash}
            strokeLinecap="round"
          />
        </>
      )}
      {isTamper && (
        <path
          d={bottleCapPath(layout, t.px, t.py)}
          fill="#eef1f5"
          stroke="#94a3b8"
          strokeWidth={1.1}
          strokeLinejoin="round"
        />
      )}
      <line
        x1={xL}
        y1={yBandTop}
        x2={xR}
        y2={yBandTop}
        stroke={W.stroke}
        strokeWidth={0.8}
        strokeDasharray="4,3"
        opacity={0.55}
      />
      <line
        x1={xL}
        y1={yBandBot}
        x2={xR}
        y2={yBandBot}
        stroke={W.stroke}
        strokeWidth={0.8}
        strokeDasharray="4,3"
        opacity={0.55}
      />
      <DimH x1={xL} x2={xR} yB={yBandBot} off={W.dimOff} lbl={widthDimLbl} above={false} />
      <DimV
        y1={yBandTop}
        y2={yBandBot}
        xB={xR}
        off={W.dimOff}
        lbl={bandHeightLabel}
        left={false}
      />
    </>
  );
}
