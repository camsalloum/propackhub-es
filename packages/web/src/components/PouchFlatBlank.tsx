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

  // Compose a layout box wide enough to also fit any extras alongside
  const extraW = extras.reduce((s, e) => s + e.widthMm + 16, 0); // 16mm gap each
  const modelW = blankW + (extraW > 0 ? 24 + extraW : 0); // 24mm gap before extras
  const modelH = Math.max(blankL, ...extras.map((e) => e.lengthMm));

  if (blankW <= 0 || blankL <= 0) {
    return (
      <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] flex items-center justify-center text-xs text-mist">
        Enter pouch dimensions to see the flat blank
      </div>
    );
  }

  const t = mkT(modelW, modelH, vw, vh);
  const bands = lengthBands(type, dims, blankL);

  return (
    <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
        <Grid w={vw} h={vh} id="pouch-blank-grid" />

        {/* Body blank rectangle */}
        <BlankRect t={t} xMm={0} yMm={0} wMm={blankW} hMm={blankL} bands={bands} subtype={type} />

        {/* Extras (e.g. flat-bottom bottom panel) */}
        {extras.map((e, i) => {
          const xOff = blankW + 24 + extras.slice(0, i).reduce((s, p) => s + p.widthMm + 16, 0);
          return (
            <g key={i}>
              <BlankRect t={t} xMm={xOff} yMm={0} wMm={e.widthMm} hMm={e.lengthMm} bands={[]} subtype={type} dashed />
              <text x={t.px(xOff + e.widthMm / 2)} y={t.py(0) - 6} fontSize={10} fontWeight={600} fontFamily="Segoe UI, system-ui, sans-serif" textAnchor="middle" fill={C.dimText}>
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
  wMm,
  hMm,
  bands,
  subtype,
  dashed,
}: {
  t: ReturnType<typeof mkT>;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  bands: Band[];
  subtype: PouchConfiguratorType;
  dashed?: boolean;
}) {
  const x0 = t.px(xMm), y0 = t.py(yMm), x1 = t.px(xMm + wMm), y1 = t.py(yMm + hMm);
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
      {/* Bands */}
      {bands.map((b, i) => {
        const yb0 = t.py(yMm + b.fromMm);
        const yb1 = t.py(yMm + b.toMm);
        if (b.kind === 'seal') {
          return (
            <g key={i}>
              <rect x={x0} y={yb0} width={x1 - x0} height={Math.max(2, yb1 - yb0)} fill={C.sealBand} stroke={C.sealStroke} strokeWidth={0.6} opacity={0.85} />
              <text x={(x0 + x1) / 2} y={(yb0 + yb1) / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={600} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>{b.label}</text>
            </g>
          );
        }
        return (
          <g key={i}>
            <line x1={x0} y1={yb0} x2={x1} y2={yb0} stroke={C.bagStroke} strokeWidth={1.2} strokeDasharray={C.foldDash} />
            <text x={(x0 + x1) / 2} y={yb0 - 4} textAnchor="middle" fontSize={9} fontFamily="Segoe UI, system-ui, sans-serif" fill={C.dimText}>{b.label}</text>
          </g>
        );
      })}
      {/* Dim arrows */}
      <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('blank W', wMm)} above={false} />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('blank L', hMm)} />
    </g>
  );
}
