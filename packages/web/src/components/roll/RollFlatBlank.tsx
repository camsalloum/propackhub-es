import { useMemo } from 'react';
import type { RollDrawDims } from '../../lib/rollDrawDims';
import { isContinuousWebRoll, rollLaneWidthMm } from '../../lib/rollDrawDims';
import { DimH, DimV, Grid, W, dimLbl, mkT, useDrawAreaSize } from '../continuousWeb/webSvgPrimitives';

/** Schematic machine-direction length for continuous web (display only). */
const CONTINUOUS_MD_RATIO = 5;

function DrawRollFlat({ d, vw, vh }: { d: RollDrawDims; vw: number; vh: number }) {
  const { RW, CO, PPC } = d;
  const continuous = isContinuousWebRoll(d);

  if (continuous) {
    const mdMm = RW * CONTINUOUS_MD_RATIO;
    const t = mkT(RW, mdMm, vw, vh);
    const x0 = t.px(0);
    const y0 = t.py(0);
    const x1 = t.px(RW);
    const y1 = t.py(mdMm);
    return (
      <>
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={W.fill} stroke={W.stroke} strokeWidth={W.sw} rx={2} />
        <line
          x1={(x0 + x1) / 2}
          y1={y1 + 10}
          x2={x1 - 8}
          y2={y1 + 10}
          stroke="#64748b"
          strokeWidth={1}
          markerEnd="url(#roll-md-arrow)"
        />
        <text x={(x0 + x1) / 2} y={y1 + 24} textAnchor="middle" fontSize={10} fill="#64748b">
          Machine direction
        </text>
        <DimH x1={x0} x2={x1} yB={y0} off={W.dimOff} lbl={dimLbl('RW', RW)} />
      </>
    );
  }

  const t = mkT(RW, CO, vw, vh);
  const x0 = t.px(0);
  const y0 = t.py(0);
  const x1 = t.px(RW);
  const y1 = t.py(CO);
  const laneW = rollLaneWidthMm(d);
  const lanes = Math.max(1, PPC);

  return (
    <>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={W.fill} stroke={W.stroke} strokeWidth={W.sw} rx={2} />
      {lanes > 1 &&
        Array.from({ length: lanes - 1 }, (_, i) => {
          const lx = t.px(laneW * (i + 1));
          return (
            <line
              key={i}
              x1={lx}
              y1={y0}
              x2={lx}
              y2={y1}
              stroke={W.stroke}
              strokeWidth={1}
              strokeDasharray="6,4"
            />
          );
        })}
      {lanes > 1 &&
        Array.from({ length: lanes }, (_, i) => {
          const lx0 = t.px(laneW * i);
          const lx1 = t.px(laneW * (i + 1));
          const cx = (lx0 + lx1) / 2;
          return (
            <text
              key={`lbl-${i}`}
              x={cx}
              y={(y0 + y1) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={600}
              fill="#64748b"
              opacity={0.85}
            >
              {i + 1}
            </text>
          );
        })}
      <DimH x1={x0} x2={x1} yB={y0} off={W.dimOff} lbl={dimLbl('RW', RW)} />
      <DimV y1={y0} y2={y1} xB={x0} off={W.dimOff} lbl={dimLbl('CO', CO)} />
      {lanes > 1 && (
        <DimH
          x1={x0}
          x2={t.px(laneW)}
          yB={y1}
          off={W.dimOff}
          lbl={dimLbl('lane', laneW)}
          above={false}
        />
      )}
    </>
  );
}

/** Unrolled web — horizontal RW × CO; vertical lanes when pieces per cut &gt; 1. */
export function RollFlatBlank({ dims }: { dims: RollDrawDims }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(320, 360);
  const aria = useMemo(() => {
    if (isContinuousWebRoll(dims)) {
      return `Continuous web, reel width ${Math.round(dims.RW)} mm`;
    }
    return dims.PPC > 1
      ? `Flat web ${Math.round(dims.RW)} by ${Math.round(dims.CO)} mm, ${dims.PPC} lanes`
      : `Flat web ${Math.round(dims.RW)} by ${Math.round(dims.CO)} mm`;
  }, [dims]);

  return (
    <div ref={ref} className="w-full h-full min-h-[360px] relative">
      <svg
        className="absolute inset-0 block w-full h-full"
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label={aria}
      >
        <defs>
          <marker id="roll-md-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#64748b" />
          </marker>
        </defs>
        <Grid w={vw} h={vh} id="roll-flat-grid" />
        <DrawRollFlat d={dims} vw={vw} vh={vh} />
      </svg>
    </div>
  );
}
