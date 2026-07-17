import { useMemo } from 'react';
import { calculatePouchFlatSheetAreaM2, type EstimateDimensions } from '@es/engine';
import type { PouchConfiguratorType } from '../lib/pouchConfiguratorCatalog';
import { C, dimLbl, mkT, DimH, DimV, Grid, useDrawAreaSize } from './bagSvgPrimitives';

/**
 * Flat-blank die-line view — film rectangle the engine costs (v4 webCount model).
 */

interface ExtraPiece {
  label: string;
  widthMm: number;
  lengthMm: number;
}

function extraPieces(type: PouchConfiguratorType, d: EstimateDimensions): ExtraPiece[] {
  const W = d.openWidthMm ?? 0;
  if (
    type === 'three-side-seal-standing' ||
    type === 'half-fold-fusion-standing'
  ) {
    const G = d.bottomGussetMm ?? 0;
    if (W > 0 && G > 0) return [{ label: 'Gusset / bottom panel', widthMm: W, lengthMm: G }];
  }
  if (type === 'flat-bottom-box-standing') {
    const D = d.bottomDepthMm ?? 0;
    if (W > 0 && D > 0) return [{ label: 'Bottom panel', widthMm: W, lengthMm: D }];
  }
  return [];
}

export function PouchFlatBlank({ type, dims }: { type: PouchConfiguratorType; dims: EstimateDimensions }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(280, 320);

  const result = useMemo(() => calculatePouchFlatSheetAreaM2(dims), [dims]);
  const extras = useMemo(() => extraPieces(type, dims), [type, dims]);

  const blankW = result.blankWidthMm;
  const blankL = result.blankLengthMm;

  const extrasStackH = extras.reduce((s, e) => s + e.lengthMm + 16, 0);
  const modelW = Math.max(blankL, ...extras.map((e) => e.widthMm), 1);
  const modelH = blankW + (extrasStackH > 0 ? 24 + extrasStackH : 0);

  if (blankW <= 0 || blankL <= 0) {
    return (
      <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] flex items-center justify-center text-xs text-mist">
        Enter pouch dimensions to see the flat blank
      </div>
    );
  }

  const t = mkT(modelW, modelH, vw, vh);
  let extraAcc = 0;
  const webNote =
    result.webCount > 1 ? `${result.webCount}× webs` : '1 web';

  return (
    <div ref={ref} className="w-full h-full min-h-[300px] bg-[#f8f9fb] relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
        <Grid w={vw} h={vh} id="pouch-blank-grid" />
        <BlankRect t={t} xMm={0} yMm={0} lengthMm={blankL} widthMm={blankW} multiWeb={result.webCount > 1} />
        <text
          x={t.px(blankL / 2)}
          y={t.py(0) - 8}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fontFamily="Segoe UI, system-ui, sans-serif"
          fill={C.dimText}
        >
          {webNote}
          {result.separateBottomWeb ? ' · separate bottom web' : ''}
        </text>

        {extras.map((e, i) => {
          const yOff = blankW + 24 + extraAcc;
          extraAcc += e.lengthMm + 16;
          return (
            <g key={i}>
              <BlankRect t={t} xMm={0} yMm={yOff} lengthMm={e.widthMm} widthMm={e.lengthMm} dashed showDims={false} />
              <text
                x={t.px(e.widthMm / 2)}
                y={t.py(yOff) - 6}
                fontSize={10}
                fontWeight={600}
                fontFamily="Segoe UI, system-ui, sans-serif"
                textAnchor="middle"
                fill={C.dimText}
              >
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
  dashed,
  multiWeb,
  showDims = true,
}: {
  t: ReturnType<typeof mkT>;
  xMm: number;
  yMm: number;
  lengthMm: number;
  widthMm: number;
  dashed?: boolean;
  multiWeb?: boolean;
  showDims?: boolean;
}) {
  const x0 = t.px(xMm), y0 = t.py(yMm), x1 = t.px(xMm + lengthMm), y1 = t.py(yMm + widthMm);
  return (
    <g>
      <rect
        x={x0}
        y={y0}
        width={x1 - x0}
        height={y1 - y0}
        fill={multiWeb ? '#e6efff' : C.blankFill}
        stroke={C.cutStroke}
        strokeWidth={1.6}
        strokeDasharray={dashed ? '5 3' : undefined}
      />
      {showDims && <DimH x1={x0} x2={x1} yB={y1} off={C.dimOff} lbl={dimLbl('blank L', lengthMm)} above={false} />}
      {showDims && <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl={dimLbl('blank W', widthMm)} />}
    </g>
  );
}
