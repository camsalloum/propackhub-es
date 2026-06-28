import { useMemo } from 'react';
import type { PouchConfiguratorType } from '../lib/pouchConfiguratorCatalog';
import { pouchDrawDimsFromFields, type PouchDrawDims } from '../lib/pouchDrawDims';
import { C, dimLbl, mkT, DimH, DimV, Grid, useDrawAreaSize } from './bagSvgPrimitives';

/**
 * Finished-pouch silhouette per subtype — the lay-flat / finished view.
 * Companion view (the flat blank die-line) lives in PouchFlatBlank.tsx.
 *
 * Drawing model: each subtype reports an outer "shape box" of width W (mm) and
 * height H' (mm) — H' includes any vertical extent shown in the silhouette
 * (e.g., stand-up shows the gusset apex). The transform fits that box into the
 * viewport.
 */
export function PouchSchematic({
  type,
  vals,
}: {
  type: PouchConfiguratorType;
  vals: Record<string, number>;
}) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(280, 320);
  const d = useMemo(() => pouchDrawDimsFromFields(vals), [vals]);

  return (
    <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
        <Grid w={vw} h={vh} id="pouch-bg-grid" />
        {renderSubtype(type, d, vw, vh)}
      </svg>
    </div>
  );
}

function renderSubtype(type: PouchConfiguratorType, d: PouchDrawDims, vw: number, vh: number) {
  switch (type) {
    case 'three-side-seal': return <ThreeSideSeal d={d} vw={vw} vh={vh} />;
    case 'center-seal':     return <CenterSeal    d={d} vw={vw} vh={vh} />;
    case 'four-side-seal':  return <FourSideSeal  d={d} vw={vw} vh={vh} />;
    case 'stand-up':        return <StandUp       d={d} vw={vw} vh={vh} />;
    case 'side-gusset':     return <SideGusset    d={d} vw={vw} vh={vh} />;
    case 'flat-bottom':     return <FlatBottom    d={d} vw={vw} vh={vh} />;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 3-side seal
// ────────────────────────────────────────────────────────────────────────────
function ThreeSideSeal({ d, vw, vh }: { d: PouchDrawDims; vw: number; vh: number }) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0), y0 = t.py(0), x1 = t.px(d.W), y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(5));
  return (
    <g>
      {/* Pouch face */}
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      {/* Side seals (within W) — dashed gusset color */}
      <line x1={x0 + sealW} y1={y0} x2={x0 + sealW} y2={y1} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      <line x1={x1 - sealW} y1={y0} x2={x1 - sealW} y2={y1} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      {/* Top seal — orange band */}
      <rect x={x0} y={y0} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      {/* Bottom fold — solid bar */}
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke={C.bagStroke} strokeWidth={3.2} strokeLinecap="round" />
      {/* Dim arrows */}
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('H', d.H)} />
    </g>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Center seal (pillow / VFFS) — show face + small back-overlap callout
// ────────────────────────────────────────────────────────────────────────────
function CenterSeal({ d, vw, vh }: { d: PouchDrawDims; vw: number; vh: number }) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0), y0 = t.py(0), x1 = t.px(d.W), y1 = t.py(d.H);
  const sealH = Math.max(3, t.sc(8));
  return (
    <g>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      {/* Top + bottom end seals */}
      <rect x={x0} y={y0} width={x1 - x0} height={sealH} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x0} y={y1 - sealH} width={x1 - x0} height={sealH} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      {/* Back-seam center line */}
      <line x1={(x0 + x1) / 2} y1={y0 + sealH} x2={(x0 + x1) / 2} y2={y1 - sealH} stroke={C.bagDark} strokeWidth={1} strokeDasharray={C.foldDash} />
      <text x={(x0 + x1) / 2} y={y0 + sealH + 13} textAnchor="middle" fontSize={9} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>back fin seal</text>
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('H', d.H)} />
      {d.OV > 0 && (
        <text x={x1 + 8} y={(y0 + y1) / 2} fontSize={10} fontWeight={600} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>OV={Math.round(d.OV)}mm</text>
      )}
    </g>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 4-side seal — dashed border on all 4 edges
// ────────────────────────────────────────────────────────────────────────────
function FourSideSeal({ d, vw, vh }: { d: PouchDrawDims; vw: number; vh: number }) {
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0), y0 = t.py(0), x1 = t.px(d.W), y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(6));
  return (
    <g>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} strokeDasharray="6 4" />
      {/* Seal bands on all 4 edges */}
      <rect x={x0} y={y0} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x0} y={y1 - sealW} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x0} y={y0} width={sealW} height={y1 - y0} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x1 - sealW} y={y0} width={sealW} height={y1 - y0} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('H', d.H)} />
      <text x={(x0 + x1) / 2} y={y0 - 8} textAnchor="middle" fontSize={9} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>2 plies · 4 seals</text>
    </g>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stand-up (doypack) — gusset shown as tinted band at the bottom
// ────────────────────────────────────────────────────────────────────────────
function StandUp({ d, vw, vh }: { d: PouchDrawDims; vw: number; vh: number }) {
  // Show the gusset band carved from the bottom of H, like the configurator.
  const t = mkT(d.W, d.H, vw, vh);
  const x0 = t.px(0), y0 = t.py(0), x1 = t.px(d.W), y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(5));
  const gussetY = y1 - t.sc(d.BG);
  const curveX = (x1 - x0) * 0.18;
  return (
    <g>
      {/* Body silhouette with rounded bottom corners */}
      <path
        d={`M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${gussetY} Q ${x1} ${y1} ${x1 - curveX} ${y1} L ${x0 + curveX} ${y1} Q ${x0} ${y1} ${x0} ${gussetY} Z`}
        fill={C.bagFill}
        stroke={C.bagStroke}
        strokeWidth={C.sw}
      />
      {/* Gusset band (tinted) */}
      {d.BG > 0 && (
        <rect x={x0} y={gussetY} width={x1 - x0} height={y1 - gussetY - 1} fill={C.bagGusset} opacity={0.65} />
      )}
      {/* Side seals (within W) */}
      <line x1={x0 + sealW} y1={y0} x2={x0 + sealW} y2={gussetY} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      <line x1={x1 - sealW} y1={y0} x2={x1 - sealW} y2={gussetY} stroke={C.bagGusset} strokeWidth={1.5} strokeDasharray={C.gussetDash} />
      {/* Top seal */}
      <rect x={x0} y={y0} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      {/* Gusset fold line */}
      {d.BG > 0 && (
        <line x1={x0 + (x1 - x0) * 0.12} y1={gussetY} x2={x1 - (x1 - x0) * 0.12} y2={gussetY} stroke={C.bagStroke} strokeWidth={1.2} strokeDasharray={C.foldDash} />
      )}
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('H', d.H)} />
      {d.BG > 0 && (
        <DimV y1={gussetY} y2={y1} xB={x1} off={C.dimOff * 0.6} lbl={dimLbl('BG', d.BG)} left={false} />
      )}
    </g>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Side-gusset — show the lay-flat tube: tinted side bands + central face
// ────────────────────────────────────────────────────────────────────────────
function SideGusset({ d, vw, vh }: { d: PouchDrawDims; vw: number; vh: number }) {
  // Visual width includes the two gusset bands; depth (per side) = SG
  const totalW = d.W + 2 * d.SG;
  const t = mkT(totalW, d.H, vw, vh);
  const x0 = t.px(0);
  const xg1 = t.px(d.SG);
  const xg2 = t.px(d.SG + d.W);
  const x1 = t.px(totalW);
  const y0 = t.py(0), y1 = t.py(d.H);
  const sealW = Math.max(3, t.sc(5));
  return (
    <g>
      {/* Left gusset band */}
      {d.SG > 0 && (
        <rect x={x0} y={y0} width={xg1 - x0} height={y1 - y0} fill={C.bagGusset} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
      )}
      {/* Face */}
      <rect x={xg1} y={y0} width={xg2 - xg1} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      {/* Right gusset band */}
      {d.SG > 0 && (
        <rect x={xg2} y={y0} width={x1 - xg2} height={y1 - y0} fill={C.bagGusset} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
      )}
      {/* Top + bottom seals */}
      <rect x={x0} y={y0} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <rect x={x0} y={y1 - sealW} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      {/* Gusset fold lines (vertical, at SG/2 mark inside each band) */}
      {d.SG > 0 && (
        <>
          <line x1={(x0 + xg1) / 2} y1={y0} x2={(x0 + xg1) / 2} y2={y1} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
          <line x1={(xg2 + x1) / 2} y1={y0} x2={(xg2 + x1) / 2} y2={y1} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
        </>
      )}
      <DimH x1={xg1} x2={xg2} yB={y1} off={C.dimOff} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('H', d.H)} />
      {d.SG > 0 && (
        <DimH x1={x0} x2={xg1} yB={y0} off={C.dimOff * 0.6} lbl={dimLbl('SG', d.SG)} above={true} />
      )}
    </g>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Flat-bottom (box pouch) — side-gusset body + bottom panel callout
// ────────────────────────────────────────────────────────────────────────────
function FlatBottom({ d, vw, vh }: { d: PouchDrawDims; vw: number; vh: number }) {
  const totalW = d.W + 2 * d.SG;
  const totalH = d.H + d.D;
  const t = mkT(totalW, totalH, vw, vh);
  const x0 = t.px(0);
  const xg1 = t.px(d.SG);
  const xg2 = t.px(d.SG + d.W);
  const x1 = t.px(totalW);
  const y0 = t.py(0), yMid = t.py(d.H), y1 = t.py(totalH);
  const sealW = Math.max(3, t.sc(5));
  return (
    <g>
      {/* Body (side-gusset) */}
      {d.SG > 0 && (
        <rect x={x0} y={y0} width={xg1 - x0} height={yMid - y0} fill={C.bagGusset} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
      )}
      <rect x={xg1} y={y0} width={xg2 - xg1} height={yMid - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} />
      {d.SG > 0 && (
        <rect x={xg2} y={y0} width={x1 - xg2} height={yMid - y0} fill={C.bagGusset} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
      )}
      {/* Bottom panel (folded base) */}
      {d.D > 0 && (
        <rect x={xg1} y={yMid} width={xg2 - xg1} height={y1 - yMid} fill={C.bagFold} stroke={C.bagStroke} strokeWidth={1.2} strokeDasharray={C.foldDash} />
      )}
      {/* Top seal */}
      <rect x={x0} y={y0} width={x1 - x0} height={sealW} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.8} />
      <DimH x1={xg1} x2={xg2} yB={yMid} off={C.dimOff * 0.6} lbl={dimLbl('W', d.W)} above={false} />
      <DimV y1={y0} y2={yMid} xB={x0} off={C.dimOff} lbl={dimLbl('H', d.H)} />
      {d.SG > 0 && (
        <DimH x1={x0} x2={xg1} yB={y0} off={C.dimOff * 0.6} lbl={dimLbl('SG', d.SG)} above={true} />
      )}
      {d.D > 0 && (
        <DimV y1={yMid} y2={y1} xB={x1} off={C.dimOff * 0.6} lbl={dimLbl('D', d.D)} left={false} />
      )}
    </g>
  );
}
