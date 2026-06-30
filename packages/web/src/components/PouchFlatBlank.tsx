import { useMemo } from 'react';
import { calculatePouchFlatSheetAreaM2, type EstimateDimensions } from '@es/engine';
import type { PouchConfiguratorType } from '../lib/pouchConfiguratorCatalog';
import { C, dimLbl, mkT, DimH, DimV, Grid, useDrawAreaSize } from './bagSvgPrimitives';

/**
 * Flat-blank die-line view — the actual film rectangle the engine costs.
 * Reads the same dimensions the engine uses (via calculatePouchFlatSheetAreaM2)
 * so the UI label and the cost basis can never drift.
 *
 * Conventions: seal allowance (SA) is engine default 10 mm unless overridden.
 * Bands shown:
 *   - cut/seal stroke = engine blank perimeter
 *   - seal band tint  = machine-direction (SA-consuming) edges
 *   - fold marker     = cross-direction folds (no SA)
 *   - extras (bottom panel) shown as a separate piece next to the body blank
 */
const SA_DEFAULT = 10;

interface ExtraPiece {
  label: string;
  widthMm: number;
  lengthMm: number;
}

function extraPieces(type: PouchConfiguratorType, d: EstimateDimensions): ExtraPiece[] {
  if (type === 'flat-bottom') {
    const W = d.openWidthMm ?? 0;
    const D = d.bottomDepthMm ?? 0;
    if (W > 0 && D > 0) return [{ label: 'Bottom panel', widthMm: W, lengthMm: D }];
  }
  return [];
}

/** Band on the blank — top seal land, bottom seal land, or fold marker. */
interface Band {
  fromMm: number; // distance from top of blank (mm)
  toMm: number;
  kind: 'seal' | 'fold';
  label: string;
}

function lengthBands(type: PouchConfiguratorType, d: EstimateDimensions, blankLengthMm: number): Band[] {
  const SA = d.sealAllowanceMm ?? SA_DEFAULT;
  const H = d.openHeightMm ?? 0;
  const BG = d.bottomGussetMm ?? 0;
  const bands: Band[] = [];

  switch (type) {
    case 'three-side-seal':
      // [SA top seal] [2H folded body] — bottom is a fold, no SA
      bands.push({ fromMm: 0, toMm: SA, kind: 'seal', label: 'top seal' });
      bands.push({ fromMm: H, toMm: H, kind: 'fold', label: 'fold (bottom)' });
      break;
    case 'center-seal':
      bands.push({ fromMm: 0, toMm: SA, kind: 'seal', label: 'top end seal' });
      bands.push({ fromMm: blankLengthMm - SA, toMm: blankLengthMm, kind: 'seal', label: 'bottom end seal' });
      break;
    case 'four-side-seal':
      bands.push({ fromMm: 0, toMm: SA, kind: 'seal', label: 'top seal' });
      bands.push({ fromMm: blankLengthMm - SA, toMm: blankLengthMm, kind: 'seal', label: 'bottom seal' });
      break;
    case 'stand-up':
      bands.push({ fromMm: 0, toMm: SA, kind: 'seal', label: 'top seal' });
      if (BG > 0) {
        bands.push({ fromMm: blankLengthMm - BG, toMm: blankLengthMm, kind: 'fold', label: 'bottom gusset' });
      }
      break;
    case 'side-gusset':
      bands.push({ fromMm: 0, toMm: SA, kind: 'seal', label: 'top seal' });
      bands.push({ fromMm: blankLengthMm - SA, toMm: blankLengthMm, kind: 'seal', label: 'bottom seal' });
      break;
    case 'flat-bottom':
      bands.push({ fromMm: 0, toMm: SA, kind: 'seal', label: 'top seal' });
      break;
  }
  return bands;
}

export function PouchFlatBlank({ type, dims }: { type: PouchConfiguratorType; dims: EstimateDimensions }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(280, 320);

  const result = useMemo(() => calculatePouchFlatSheetAreaM2(dims), [dims]);
  const extras = useMemo(() => extraPieces(type, dims), [type, dims]);

  const blankW = result.blankWidthMm;
  const blankL = result.blankLengthMm;

  // Landscape orientation: the blank LENGTH runs horizontally (machine direction)
  // and the WIDTH runs vertically. The elongated film blank reads like an
  // unrolled web and fills the side-by-side panel far better than a tall portrait
  // strip. Extras (e.g. the flat-bottom panel) stack underneath the body blank.
  const extrasStackH = extras.reduce((s, e) => s + e.lengthMm + 16, 0); // 16mm gap each
  const modelW = Math.max(blankL, ...extras.map((e) => e.widthMm));
  const modelH = blankW + (extrasStackH > 0 ? 24 + extrasStackH : 0); // 24mm gap before extras

  if (blankW <= 0 || blankL <= 0) {
    return (
      <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] flex items-center justify-center text-xs text-mist">
        Enter pouch dimensions to see the flat blank
      </div>
    );
  }

  const t = mkT(modelW, modelH, vw, vh);
  const bands = lengthBands(type, dims, blankL);

  const accKinds = new Set(
    (dims.accessories ?? []).filter((a) => a.enabled !== false).map((a) => a.kind)
  );
  const accStroke = '#7c3aed';
  const SA = dims.sealAllowanceMm ?? SA_DEFAULT;

  let extraAcc = 0;

  return (
    <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
        <Grid w={vw} h={vh} id="pouch-blank-grid" />

        {/* Body blank rectangle — length horizontal, width vertical */}
        <BlankRect t={t} xMm={0} yMm={0} lengthMm={blankL} widthMm={blankW} bands={bands} subtype={type} />

        {/* Accessory glyphs on the blank: zipper (just inside the top seal) + window patch */}
        {accKinds.has('zipper') && (
          <g aria-hidden>
            <line
              x1={t.px(SA + 8)} y1={t.py(0)} x2={t.px(SA + 8)} y2={t.py(blankW)}
              stroke={accStroke} strokeWidth={2} strokeDasharray="4 3"
            />
            <text x={t.px(SA + 8)} y={t.py(0) - 4} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily="Segoe UI, system-ui, sans-serif" fill={accStroke}>zipper</text>
          </g>
        )}
        {(() => {
          const win = (dims.accessories ?? []).find((a) => a.kind === 'window' && a.enabled !== false);
          if (!win) return null;
          const wW = blankL * 0.18;
          const wH = blankW * 0.4;
          const cxMm = blankL * ((win.windowPosXPct ?? 50) / 100);
          const cyMm = blankW * ((win.windowPosYPct ?? 50) / 100);
          const xMm = Math.min(Math.max(cxMm - wW / 2, 0), Math.max(0, blankL - wW));
          const yMm = Math.min(Math.max(cyMm - wH / 2, 0), Math.max(0, blankW - wH));
          return (
            <rect
              x={t.px(xMm)} y={t.py(yMm)}
              width={t.sc(wW)} height={t.sc(wH)}
              rx={4} fill="#ffffff" fillOpacity={0.35} stroke={accStroke} strokeWidth={1.4} strokeDasharray="4 3"
            />
          );
        })()}


        {/* Extras (e.g. flat-bottom bottom panel) stacked below the body blank */}
        {extras.map((e, i) => {
          const yOff = blankW + 24 + extraAcc;
          extraAcc += e.lengthMm + 16;
          return (
            <g key={i}>
              <BlankRect t={t} xMm={0} yMm={yOff} lengthMm={e.widthMm} widthMm={e.lengthMm} bands={[]} subtype={type} dashed showDims={false} />
              <text x={t.px(e.widthMm / 2)} y={t.py(yOff) - 6} fontSize={10} fontWeight={600} fontFamily="Segoe UI, system-ui, sans-serif" textAnchor="middle" fill={C.dimText}>
                {e.label} {Math.round(e.widthMm)}×{Math.round(e.lengthMm)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BlankRect({
  t,
  xMm,
  yMm,
  lengthMm,
  widthMm,
  bands,
  subtype,
  dashed,
  showDims = true,
}: {
  t: ReturnType<typeof mkT>;
  xMm: number;
  yMm: number;
  /** Extent along the horizontal (machine-direction) axis. */
  lengthMm: number;
  /** Extent along the vertical axis. */
  widthMm: number;
  bands: Band[];
  subtype: PouchConfiguratorType;
  dashed?: boolean;
  showDims?: boolean;
}) {
  const x0 = t.px(xMm), y0 = t.py(yMm), x1 = t.px(xMm + lengthMm), y1 = t.py(yMm + widthMm);
  const blankColor = subtype === 'four-side-seal' ? '#e6efff' : C.blankFill;
  return (
    <g>
      <rect
        x={x0}
        y={y0}
        width={x1 - x0}
        height={y1 - y0}
        fill={blankColor}
        stroke={C.cutStroke}
        strokeWidth={1.6}
        strokeDasharray={dashed ? '5 3' : undefined}
      />
      {/* Bands run along the length (horizontal) axis */}
      {bands.map((b, i) => {
        const xb0 = t.px(xMm + b.fromMm);
        const xb1 = t.px(xMm + b.toMm);
        if (b.kind === 'seal') {
          const cx = (xb0 + xb1) / 2;
          const cy = (y0 + y1) / 2;
          return (
            <g key={i}>
              <rect x={xb0} y={y0} width={Math.max(2, xb1 - xb0)} height={y1 - y0} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.6} opacity={0.85} />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={600}
                fontFamily="Segoe UI, system-ui, sans-serif"
                fill={C.dimText}
                transform={`rotate(-90, ${cx}, ${cy})`}
              >
                {b.label}
              </text>
            </g>
          );
        }
        return (
          <g key={i}>
            <line x1={xb0} y1={y0} x2={xb0} y2={y1} stroke={C.bagStroke} strokeWidth={1.2} strokeDasharray={C.foldDash} />
            <text x={xb0} y={y0 - 4} textAnchor="middle" fontSize={9} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>{b.label}</text>
          </g>
        );
      })}
      {/* Dim arrows — length along the bottom, width up the left edge */}
      {showDims && <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('blank L', lengthMm)} above={false} />}
      {showDims && <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('blank W', widthMm)} />}
    </g>
  );
}
