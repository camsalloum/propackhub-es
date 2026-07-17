import { useMemo } from 'react';
import type { PouchConfiguratorType } from '../lib/pouchConfiguratorCatalog';
import type { PouchAccessorySelection } from '@es/engine';
import { pouchDrawDimsFromFields, type PouchDrawDims } from '../lib/pouchDrawDims';
import { C, dimLbl, mkT, DimH, DimV, Grid, useDrawAreaSize } from './bagSvgPrimitives';

/**
 * Finished-pouch silhouette per v4 Family×Variant.
 * Landscape rotate so open view matches flat-blank orientation.
 * Accessories are drawn in local pouch coords (then rotate with the pouch)
 * so zipper sits across W at the open/fill end — not along a wrong edge.
 */
export function PouchSchematic({
  type,
  vals,
  accessories = [],
  bottomSealKseal = false,
}: {
  type: PouchConfiguratorType;
  vals: Record<string, number>;
  accessories?: PouchAccessorySelection[];
  /** K-seal = angled bottom corner welds (same film area as Doyen). */
  bottomSealKseal?: boolean;
}) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(280, 320);
  const d = useMemo(() => pouchDrawDimsFromFields(vals, type), [vals, type]);
  const enabledKinds = useMemo(
    () => new Set(accessories.filter((a) => a.enabled !== false).map((a) => a.kind)),
    [accessories]
  );
  const windowSel = useMemo(
    () => accessories.find((a) => a.kind === 'window' && a.enabled !== false),
    [accessories]
  );
  const zipFromTop =
    accessories.find((a) => a.kind === 'zipper' && a.enabled !== false)?.positionFromTopMm ?? 40;

  return (
    <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
        <Grid w={vw} h={vh} id="pouch-bg-grid" />
        <g transform={`translate(${vw} 0) rotate(90)`}>
          {renderSubtype(type, d, vh, vw, {
            kinds: enabledKinds,
            zipFromTopMm: zipFromTop,
            winX: windowSel?.windowPosXPct ?? 50,
            winY: windowSel?.windowPosYPct ?? 50,
            bottomSealKseal,
          })}
        </g>
      </svg>
    </div>
  );
}

type AccOpts = {
  kinds: Set<string>;
  zipFromTopMm: number;
  winX: number;
  winY: number;
  bottomSealKseal: boolean;
};

function renderSubtype(
  type: PouchConfiguratorType,
  d: PouchDrawDims,
  vw: number,
  vh: number,
  acc: AccOpts
) {
  switch (type) {
    case 'three-side-seal-flat':
      return <ThreeSideSealFlat d={d} vw={vw} vh={vh} acc={acc} />;
    case 'half-fold-fusion-flat':
    case 'side-weld-flat':
      return <FoldedFlat d={d} vw={vw} vh={vh} acc={acc} />;
    case 'center-fold-seal-flat':
      return <QuadSealFlat d={d} vw={vw} vh={vh} acc={acc} />;
    case 'three-side-seal-standing':
    case 'center-fold-seal-standing':
    case 'half-fold-fusion-standing':
      return <StandUp d={d} vw={vw} vh={vh} acc={acc} kseal={acc.bottomSealKseal} />;
    case 'center-fold-seal-side-gusset':
    case 'side-weld-side-gusset':
      return <SideGusset d={d} vw={vw} vh={vh} acc={acc} />;
    case 'flat-bottom-box-standing':
      return <FlatBottom d={d} vw={vw} vh={vh} acc={acc} />;
    case 'oblique-side-weld-trapezoid':
      return <ObliqueTrapezoid d={d} vw={vw} vh={vh} acc={acc} />;
    case 'oblique-side-weld-triangle':
      return <ObliqueTriangle d={d} vw={vw} vh={vh} acc={acc} />;
  }
}

/** Zipper across face width, near open/fill end (top of local coords). */
function LocalZipper({
  x0,
  x1,
  yTop,
  fromTopPx,
}: {
  x0: number;
  x1: number;
  yTop: number;
  fromTopPx: number;
}) {
  const y = yTop + fromTopPx;
  const stroke = '#7c3aed';
  return (
    <g aria-hidden>
      <line
        x1={x0 + 6}
        y1={y}
        x2={x1 - 6}
        y2={y}
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray="3 2"
      />
      <text
        x={(x0 + x1) / 2}
        y={y - 4}
        textAnchor="middle"
        fontSize={8}
        fontWeight={700}
        fontFamily="Segoe UI, system-ui, sans-serif"
        fill={stroke}
      >
        zip
      </text>
    </g>
  );
}

function LocalWindow({
  x0,
  y0,
  x1,
  y1,
  winX,
  winY,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  winX: number;
  winY: number;
}) {
  const pw = x1 - x0;
  const ph = y1 - y0;
  const winW = pw * 0.35;
  const winH = ph * 0.28;
  const cx = Math.min(Math.max(x0 + (pw * winX) / 100 - winW / 2, x0), x1 - winW);
  const cy = Math.min(Math.max(y0 + (ph * winY) / 100 - winH / 2, y0), y1 - winH);
  return (
    <rect
      x={cx}
      y={cy}
      width={winW}
      height={winH}
      rx={4}
      fill="#ffffff"
      fillOpacity={0.35}
      stroke="#7c3aed"
      strokeWidth={1.4}
      strokeDasharray="4 3"
    />
  );
}

function LocalExtras({
  x0,
  y0,
  x1,
  y1,
  acc,
  t,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  acc: AccOpts;
  t: ReturnType<typeof mkT>;
}) {
  const stroke = '#7c3aed';
  const cx = (x0 + x1) / 2;
  return (
    <g>
      {acc.kinds.has('zipper') && (
        <LocalZipper x0={x0} x1={x1} yTop={y0} fromTopPx={Math.max(10, t.sc(acc.zipFromTopMm))} />
      )}
      {acc.kinds.has('window') && (
        <LocalWindow x0={x0} y0={y0} x1={x1} y1={y1} winX={acc.winX} winY={acc.winY} />
      )}
      {(acc.kinds.has('handle') || acc.kinds.has('hanging_hole')) && (
        <rect
          x={cx - (x1 - x0) * 0.12}
          y={y0 + Math.max(8, t.sc(12))}
          width={(x1 - x0) * 0.24}
          height={6}
          rx={3}
          fill="#ffffff"
          stroke={stroke}
          strokeWidth={1.4}
        />
      )}
      {acc.kinds.has('tear_notch') && (
        <path
          d={`M ${x1 - 2} ${y0 + t.sc(28)} L ${x1 + 8} ${y0 + t.sc(28) - 5} L ${x1 + 8} ${y0 + t.sc(28) + 5} Z`}
          fill={stroke}
        />
      )}
      {acc.kinds.has('spout') && (
        <g>
          <rect x={cx - 5} y={y0 - 16} width={10} height={16} rx={2} fill="#ffffff" stroke={stroke} strokeWidth={1.6} />
          <rect x={cx - 7} y={y0 - 22} width={14} height={7} rx={2} fill={stroke} />
        </g>
      )}
      {acc.kinds.has('valve') && (
        <g>
          <circle cx={x1 - 16} cy={y0 + (y1 - y0) * 0.22} r={6} fill="#ffffff" stroke={stroke} strokeWidth={1.6} />
          <circle cx={x1 - 16} cy={y0 + (y1 - y0) * 0.22} r={2} fill={stroke} />
        </g>
      )}
    </g>
  );
}

/**
 * Three-Side-Seal Flat — industry + v4:
 * seals on LEFT, RIGHT, BOTTOM; TOP open for fill.
 */
function ThreeSideSealFlat({
  d,
  vw,
  vh,
  acc,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
}) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0),
    y0 = t.py(0),
    x1 = t.px(d.W),
    y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(5));
  return (
    <g>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      {/* Side seals */}
      <line x1={x0 + sealW} y1={y0} x2={x0 + sealW} y2={y1} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      <line x1={x1 - sealW} y1={y0} x2={x1 - sealW} y2={y1} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      {/* Bottom seal only — top stays OPEN for fill */}
      <rect x={x0} y={y1 - sealW} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      {/* Open-top marker */}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={C.bagStroke} strokeWidth={1.5} strokeDasharray="5 4" />
      <text
        x={(x0 + x1) / 2}
        y={y0 - 6}
        textAnchor="middle"
        fontSize={9}
        fontFamily="Segoe UI, system-ui, sans-serif"
        fill={C.dimText}
      >
        open (fill)
      </text>
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('L', d.H)} />
      <LocalExtras x0={x0} y0={y0} x1={x1} y1={y1} acc={acc} t={t} />
    </g>
  );
}

/** Half-Fold / Side-Weld flat — bottom is a fold or weld; top open. */
function FoldedFlat({
  d,
  vw,
  vh,
  acc,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
}) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0),
    y0 = t.py(0),
    x1 = t.px(d.W),
    y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(5));
  return (
    <g>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      <line x1={x0 + sealW} y1={y0} x2={x0 + sealW} y2={y1} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      <line x1={x1 - sealW} y1={y0} x2={x1 - sealW} y2={y1} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke={C.bagStroke} strokeWidth={3.2} strokeLinecap="round" />
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={C.bagStroke} strokeWidth={1.5} strokeDasharray="5 4" />
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('L', d.H)} />
      <LocalExtras x0={x0} y0={y0} x1={x1} y1={y1} acc={acc} t={t} />
    </g>
  );
}

function QuadSealFlat({
  d,
  vw,
  vh,
  acc,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
}) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0),
    y0 = t.py(0),
    x1 = t.px(d.W),
    y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(6));
  return (
    <g>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} strokeDasharray="6 4" />
      <rect x={x0} y={y0} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x0} y={y1 - sealW} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x0} y={y0} width={sealW} height={y1 - y0} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x1 - sealW} y={y0} width={sealW} height={y1 - y0} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <text x={(x0 + x1) / 2} y={y0 - 8} textAnchor="middle" fontSize={9} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>
        1 web · quad-seal look
      </text>
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('L', d.H)} />
      <LocalExtras x0={x0} y0={y0} x1={x1} y1={y1} acc={acc} t={t} />
    </g>
  );
}

/**
 * Stand-up: Doyen = rounded U gusset; K-seal = angled K corner welds (~30°).
 * Film area identical (W,L,G) — style is weld pattern only.
 */
function StandUp({
  d,
  vw,
  vh,
  acc,
  kseal,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
  kseal: boolean;
}) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0),
    y0 = t.py(0),
    x1 = t.px(d.W),
    y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(5));
  const gussetY = y1 - t.sc(d.BG);
  const curveX = (x1 - x0) * 0.18;
  const kRise = Math.min((y1 - gussetY) * 0.85, t.sc(Math.max(20, d.BG * 0.7)));

  return (
    <g>
      {kseal ? (
        <path
          d={`M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${gussetY} L ${x1} ${y1} L ${x0} ${y1} L ${x0} ${gussetY} Z`}
          fill={C.bagFill}
          stroke={C.bagStroke}
          strokeWidth={C.sw}
        />
      ) : (
        <path
          d={`M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${gussetY} Q ${x1} ${y1} ${x1 - curveX} ${y1} L ${x0 + curveX} ${y1} Q ${x0} ${y1} ${x0} ${gussetY} Z`}
          fill={C.bagFill}
          stroke={C.bagStroke}
          strokeWidth={C.sw}
        />
      )}
      {d.BG > 0 && (
        <rect x={x0} y={gussetY} width={x1 - x0} height={Math.max(1, y1 - gussetY - 1)} fill={C.bagGusset} opacity={0.55} />
      )}
      {/* Side seals stop above gusset */}
      <line x1={x0 + sealW} y1={y0} x2={x0 + sealW} y2={gussetY} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      <line x1={x1 - sealW} y1={y0} x2={x1 - sealW} y2={gussetY} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      {/* Top open for fill (premade) */}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={C.bagStroke} strokeWidth={1.5} strokeDasharray="5 4" />
      {kseal && d.BG > 0 ? (
        <g>
          {/* Angled K welds ~30° from bottom corners */}
          <line x1={x0} y1={y1} x2={x0 + (x1 - x0) * 0.28} y2={y1 - kRise} stroke={C.sealStroke} strokeWidth={2.2} />
          <line x1={x1} y1={y1} x2={x1 - (x1 - x0) * 0.28} y2={y1 - kRise} stroke={C.sealStroke} strokeWidth={2.2} />
          <line x1={x0} y1={y1} x2={x1} y2={y1} stroke={C.sealStroke} strokeWidth={1.6} />
          <text x={(x0 + x1) / 2} y={y1 + 14} textAnchor="middle" fontSize={9} fontWeight={600} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>
            K-seal
          </text>
        </g>
      ) : (
        d.BG > 0 && (
          <line
            x1={x0 + (x1 - x0) * 0.12}
            y1={gussetY}
            x2={x1 - (x1 - x0) * 0.12}
            y2={gussetY}
            stroke={C.bagStroke}
            strokeWidth={1.2}
            strokeDasharray={C.foldDash}
          />
        )
      )}
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('L', d.H)} />
      {d.BG > 0 && (
        <DimV y1={gussetY} y2={y1} xB={x1} off={C.dimOff * 0.6} lbl={dimLbl('G', d.BG)} left={false} />
      )}
      <LocalExtras x0={x0} y0={y0} x1={x1} y1={y1} acc={acc} t={t} />
    </g>
  );
}

function SideGusset({
  d,
  vw,
  vh,
  acc,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
}) {
  const totalW = d.W + 2 * d.SG;
  const t = mkT(totalW, d.H, vw, vh);
  const x0 = t.px(0);
  const xg1 = t.px(d.SG);
  const xg2 = t.px(d.SG + d.W);
  const x1 = t.px(totalW);
  const y0 = t.py(0),
    y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(5));
  return (
    <g>
      {d.SG > 0 && (
        <rect x={x0} y={y0} width={xg1 - x0} height={y1 - y0} fill={C.bagGusset} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
      )}
      <rect x={xg1} y={y0} width={xg2 - xg1} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      {d.SG > 0 && (
        <rect x={xg2} y={y0} width={x1 - xg2} height={y1 - y0} fill={C.bagGusset} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
      )}
      <rect x={x0} y={y0} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x0} y={y1 - sealW} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <DimH x1={xg1} x2={xg2} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('L', d.H)} />
      {d.SG > 0 && (
        <DimH x1={x0} x2={xg1} yB={y0} off={C.dimOff * 0.6} lbl={dimLbl('G', d.SG)} above />
      )}
      <LocalExtras x0={xg1} y0={y0} x1={xg2} y1={y1} acc={acc} t={t} />
    </g>
  );
}

function FlatBottom({
  d,
  vw,
  vh,
  acc,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
}) {
  const totalH = d.H + d.D;
  const t = mkT(d.W, totalH, vw, vh);
  const x0 = t.px(0),
    x1 = t.px(d.W);
  const y0 = t.py(0),
    yMid = t.py(d.H),
    y1 = t.py(totalH);
  return (
    <g>
      <rect x={x0} y={y0} width={x1 - x0} height={yMid - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      {d.D > 0 && (
        <rect x={x0} y={yMid} width={x1 - x0} height={y1 - yMid} fill={C.bagFold} stroke={C.bagStroke} strokeWidth={1.2} strokeDasharray={C.foldDash} />
      )}
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={C.bagStroke} strokeWidth={1.5} strokeDasharray="5 4" />
      <DimH x1={x0} x2={x1} yB={yMid} off={C.dimOff * 0.6} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={yMid} xB={x0} off={C.dimOff} lbl={dimLbl('H', d.H)} />
      {d.D > 0 && (
        <DimV y1={yMid} y2={y1} xB={x1} off={C.dimOff * 0.6} lbl={dimLbl('D', d.D)} left={false} />
      )}
      <LocalExtras x0={x0} y0={y0} x1={x1} y1={yMid} acc={acc} t={t} />
    </g>
  );
}

function ObliqueTrapezoid({
  d,
  vw,
  vh,
  acc,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
}) {
  const taper = Math.min(d.W * 0.22, d.W * 0.5 * Math.tan((((d.A || 10) * Math.PI) / 180)) * 4);
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0),
    x1 = t.px(d.W),
    y0 = t.py(0),
    y1 = t.py(d.H);
  const inset = t.sc(taper);
  return (
    <g>
      <path
        d={`M ${x0 + inset} ${y0} L ${x1 - inset} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`}
        fill={C.bagFill}
        stroke={C.bagStroke}
        strokeWidth={C.sw}
      />
      <DimH x1={x0 + inset} x2={x1 - inset} yB={y0} off={C.dimOff * 0.6} lbl={dimLbl('W', d.W)} above />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('L', d.H)} />
      <LocalExtras x0={x0 + inset} y0={y0} x1={x1 - inset} y1={y1} acc={acc} t={t} />
    </g>
  );
}

function ObliqueTriangle({
  d,
  vw,
  vh,
  acc,
}: {
  d: PouchDrawDims;
  vw: number;
  vh: number;
  acc: AccOpts;
}) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0),
    x1 = t.px(d.W),
    y0 = t.py(0),
    y1 = t.py(d.H);
  const cx = (x0 + x1) / 2;
  return (
    <g>
      <path d={`M ${cx} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z`} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('L', d.H)} />
      <LocalExtras x0={x0} y0={y0} x1={x1} y1={y1} acc={acc} t={t} />
    </g>
  );
}
