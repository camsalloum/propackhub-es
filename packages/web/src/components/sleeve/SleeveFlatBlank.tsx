import { useMemo } from 'react';
import type { SleeveDrawDims } from '../../lib/sleeveDrawDims';
import { sleeveFormedDiameterMm } from '../../lib/sleeveDrawDims';
import { DimH, DimV, Grid, W, dimLbl, mkT, useDrawAreaSize } from '../continuousWeb/webSvgPrimitives';

const SEAM_MM = 4;

function DrawSleeveFlat({ d, vw, vh }: { d: SleeveDrawDims; vw: number; vh: number }) {
  const { LF, CO } = d;
  const t = mkT(LF, CO, vw, vh);
  const x0 = t.px(0);
  const y0 = t.py(0);
  const x1 = t.px(LF);
  const y1 = t.py(CO);
  const seam = Math.min(t.sc(SEAM_MM), (x1 - x0) * 0.08);
  const foldX = (x0 + x1) / 2;
  const tubeR = t.sc(sleeveFormedDiameterMm(d) / 2);
  const tubeCx = (x0 + x1) / 2;
  const tubeCy = y1 + Math.min(t.sc(40), vh * 0.12);

  return (
    <>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={W.fill} stroke={W.stroke} strokeWidth={W.sw} rx={2} />
      <rect x={x1 - seam} y={y0} width={seam} height={y1 - y0} fill={W.gusset} opacity={0.55} stroke="none" />
      <line
        x1={foldX}
        y1={y0}
        x2={foldX}
        y2={y1}
        stroke={W.stroke}
        strokeWidth={0.9}
        strokeDasharray="5,4"
        opacity={0.7}
      />
      <ellipse
        cx={tubeCx}
        cy={tubeCy}
        rx={tubeR}
        ry={tubeR * 0.35}
        fill="none"
        stroke={W.stroke}
        strokeWidth={1}
        opacity={0.45}
      />
      <DimH x1={x0} x2={x1} yB={y0} off={W.dimOff} lbl={dimLbl('LF', LF)} />
      <DimV y1={y0} y2={y1} xB={x0} off={W.dimOff} lbl={dimLbl('CO', CO)} />
    </>
  );
}

/** Flattened sleeve blank — horizontal LF × CO with seam strip. */
export function SleeveFlatBlank({ dims }: { dims: SleeveDrawDims }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(320, 360);
  const aria = useMemo(
    () => `Sleeve blank ${Math.round(dims.LF)} by ${Math.round(dims.CO)} mm lay-flat`,
    [dims.LF, dims.CO]
  );

  return (
    <div ref={ref} className="w-full h-full min-h-[360px] flex items-stretch">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="block w-full h-full"
        role="img"
        aria-label={aria}
        preserveAspectRatio="xMidYMid meet"
      >
        <Grid w={vw} h={vh} id="sleeve-flat-grid" />
        <DrawSleeveFlat d={dims} vw={vw} vh={vh} />
      </svg>
    </div>
  );
}
