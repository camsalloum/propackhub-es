import { useMemo } from 'react';
import type { PouchConfiguratorType } from '../lib/pouchConfiguratorCatalog';
import type { PouchAccessorySelection } from '@es/engine';
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
  accessories = [],
}: {
  type: PouchConfiguratorType;
  vals: Record<string, number>;
  accessories?: PouchAccessorySelection[];
}) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(280, 320);
  const d = useMemo(() => pouchDrawDimsFromFields(vals), [vals]);
  const enabledKinds = useMemo(
    () => new Set(accessories.filter((a) => a.enabled !== false).map((a) => a.kind)),
    [accessories]
  );
  const windowSel = useMemo(
    () => accessories.find((a) => a.kind === 'window' && a.enabled !== false),
    [accessories]
  );

  return (
    <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
        <Grid w={vw} h={vh} id="pouch-bg-grid" />
        {/* Open/finished pouch drawn in LANDSCAPE: the silhouette is laid out in a
            portrait space (vh×vw) then rotated 90° so the pouch reads horizontally,
            matching the flat-blank view beside it. */}
        <g transform={`translate(${vw} 0) rotate(90)`}>
          {renderSubtype(type, d, vh, vw)}
          <AccessoryGlyphs
            kinds={enabledKinds}
            vw={vh}
            vh={vw}
            winX={windowSel?.windowPosXPct ?? 50}
            winY={windowSel?.windowPosYPct ?? 50}
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Accessory overlay — draws zipper / spout / valve / window / handle glyphs over
 * the centred pouch. Anchored in viewport space (the pouch always sits in the
 * central ~56% due to the mkT margin), so it works for every subtype without
 * coupling to each one's local geometry.
 */
function AccessoryGlyphs({ kinds, vw, vh, winX = 50, winY = 50 }: { kinds: Set<string>; vw: number; vh: number; winX?: number; winY?: number }) {
  if (kinds.size === 0) return null;
  const fx0 = vw * 0.24, fx1 = vw * 0.76;
  const fy0 = vh * 0.24, fy1 = vh * 0.76;
  const pw = fx1 - fx0, ph = fy1 - fy0;
  const cx = (fx0 + fx1) / 2;
  const stroke = '#7c3aed'; // distinct accent so glyphs read against the blue pouch
  return (
    <g aria-hidden>
      {/* Zipper — dashed line near the top with a "zip" tag */}
      {kinds.has('zipper') && (
        <g>
          <line x1={fx0 + 6} y1={fy0 + ph * 0.14} x2={fx1 - 6} y2={fy0 + ph * 0.14} stroke={stroke} strokeWidth={2} strokeDasharray="3 2" />
          <text x={fx1 - 6} y={fy0 + ph * 0.14 - 4} textAnchor="end" fontSize={8} fontWeight={700} fontFamily="Segoe UI, system-ui, sans-serif" fill={stroke}>zip</text>
        </g>
      )}
      {/* Spout — neck + cap at top centre */}
      {kinds.has('spout') && (
        <g>
          <rect x={cx - 5} y={fy0 - 16} width={10} height={16} rx={2} fill="#ffffff" stroke={stroke} strokeWidth={1.6} />
          <rect x={cx - 7} y={fy0 - 22} width={14} height={7} rx={2} fill={stroke} />
        </g>
      )}
      {/* Degassing valve — small circle near top-right */}
      {kinds.has('valve') && (
        <g>
          <circle cx={fx1 - 16} cy={fy0 + ph * 0.26} r={6} fill="#ffffff" stroke={stroke} strokeWidth={1.6} />
          <circle cx={fx1 - 16} cy={fy0 + ph * 0.26} r={2} fill={stroke} />
        </g>
      )}
      {/* Window — dashed rounded rect positioned by the chosen X/Y % of the face */}
      {kinds.has('window') && (() => {
        const winW = pw * 0.4;
        const winH = ph * 0.3;
        const cxw = Math.min(Math.max(fx0 + pw * (winX / 100) - winW / 2, fx0), fx1 - winW);
        const cyw = Math.min(Math.max(fy0 + ph * (winY / 100) - winH / 2, fy0), fy1 - winH);
        return (
          <rect x={cxw} y={cyw} width={winW} height={winH} rx={4} fill="#ffffff" fillOpacity={0.35} stroke={stroke} strokeWidth={1.4} strokeDasharray="4 3" />
        );
      })()}
      {/* Handle — slot cut-out near the top */}
      {kinds.has('handle') && (
        <rect x={cx - pw * 0.12} y={fy0 + ph * 0.05} width={pw * 0.24} height={6} rx={3} fill="#ffffff" stroke={stroke} strokeWidth={1.4} />
      )}
    </g>
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
