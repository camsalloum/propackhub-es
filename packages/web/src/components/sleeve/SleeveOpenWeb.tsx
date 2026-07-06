import { useMemo } from 'react';
import type { SleeveDrawDims } from '../../lib/sleeveDrawDims';
import { SLEEVE_SEAM_OVERLAP_MM } from '../../lib/sleeveDrawDims';
import { DimH, DimV, Grid, W, dimLbl, mkT, useDrawAreaSize } from '../continuousWeb/webSvgPrimitives';

function DrawSleeveOpenWeb({ d, vw, vh }: { d: SleeveDrawDims; vw: number; vh: number }) {
  const { LF, CO, openWebWidthMm: OW } = d;
  const seam = SLEEVE_SEAM_OVERLAP_MM;
  const dimPad = 72;
  const t = mkT(OW, CO + dimPad, vw, vh);
  const x0 = t.px(0);
  const y0 = t.py(0);
  const x1 = t.px(OW);
  const y1 = t.py(CO);
  const xLf1 = t.px(LF);
  const xLf2 = t.px(LF * 2);
  const seamW = t.px(OW) - xLf2;

  return (
    <>
      <rect x={x0} y={y0} width={xLf1 - x0} height={y1 - y0} fill={W.fill} stroke={W.stroke} strokeWidth={W.sw} rx={2} />
      <rect
        x={xLf1}
        y={y0}
        width={xLf2 - xLf1}
        height={y1 - y0}
        fill={W.fill}
        stroke={W.stroke}
        strokeWidth={W.sw}
        rx={2}
      />
      <rect x={xLf2} y={y0} width={seamW} height={y1 - y0} fill={W.gusset} opacity={0.6} stroke={W.stroke} strokeWidth={W.sw} rx={1} />
      <line
        x1={xLf1}
        y1={y0}
        x2={xLf1}
        y2={y1}
        stroke={W.stroke}
        strokeWidth={0.9}
        strokeDasharray="5,4"
        opacity={0.55}
      />
      <DimH x1={x0} x2={xLf1} yB={y0} off={W.dimOff} lbl={dimLbl('LF', LF)} />
      <DimH x1={xLf1} x2={xLf2} yB={y0} off={W.dimOff + 18} lbl={dimLbl('LF', LF)} />
      <DimH x1={xLf2} x2={x1} yB={y0} off={W.dimOff + 36} lbl={`seam ${seam}mm`} />
      <DimH x1={x0} x2={x1} yB={y0} off={W.dimOff + 54} lbl={dimLbl('OW', OW)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={W.dimOff} lbl={dimLbl('CO', CO)} />
    </>
  );
}

/** Open web on press — 2×LF + seam before seaming. */
export function SleeveOpenWeb({ dims }: { dims: SleeveDrawDims }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(320, 360);
  const aria = useMemo(
    () => `Sleeve open web ${Math.round(dims.openWebWidthMm)} by ${Math.round(dims.CO)} mm`,
    [dims.openWebWidthMm, dims.CO]
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
        <Grid w={vw} h={vh} id="sleeve-open-web-grid" />
        <DrawSleeveOpenWeb d={dims} vw={vw} vh={vh} />
      </svg>
    </div>
  );
}
