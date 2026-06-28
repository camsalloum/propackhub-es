import { useMemo } from 'react';
import { calculateBagFlatSheetAreaM2, type EstimateDimensions } from '@es/engine';
import type { BagConfiguratorType } from '../lib/bagConfiguratorCatalog';
import { C, dimLbl, mkT, DimH, DimV, Grid, useDrawAreaSize } from './bagSvgPrimitives';

const SA_DEFAULT = 10;

interface Band {
  h: number;
  kind: 'seal' | 'body' | 'gusset' | 'fold' | 'lip' | 'flap' | 'pocket';
  label?: string;
}
interface Panel {
  w: number;
  kind: 'face' | 'gusset';
}

/** Width panels (left→right) for two-web blanks. */
function widthPanels(W: number, SG: number): Panel[] {
  if (SG > 0) {
    // Cut-open side-gusset tube: half-gusset | front | full gusset | back | half-gusset
    return [
      { w: SG, kind: 'gusset' },
      { w: W, kind: 'face' },
      { w: 2 * SG, kind: 'gusset' },
      { w: W, kind: 'face' },
      { w: SG, kind: 'gusset' },
    ];
  }
  return [
    { w: W, kind: 'face' },
    { w: W, kind: 'face' },
  ];
}

/** Length bands (top→bottom) per type. Sums to the engine cut length. */
function lengthBands(
  type: BagConfiguratorType,
  d: { H: number; BG: number; SA: number; TF: number; LH: number }
): Band[] {
  const { H, BG, SA, TF, LH } = d;
  const topSeal: Band = { h: SA, kind: 'seal', label: 'SA' };
  const body: Band = { h: H, kind: 'body' };
  const bottom: Band = BG > 0 ? { h: BG, kind: 'gusset', label: 'BG' } : { h: SA, kind: 'seal', label: 'SA' };

  switch (type) {
    case 'diaper':
      return ([
        { h: TF, kind: 'fold', label: 'TF' },
        topSeal,
        body,
        { h: BG, kind: 'gusset', label: 'BG' },
      ] as Band[]).filter((b) => b.h > 0);
    case 'wicket':
      return ([{ h: LH, kind: 'lip', label: 'LH' }, topSeal, body, bottom] as Band[]).filter((b) => b.h > 0);
    case 'loop':
      // body blank only = SA + H + BG (handles drawn as separate pieces)
      return [topSeal, body, ...(BG > 0 ? [{ h: BG, kind: 'gusset' as const, label: 'BG' }] : [])];
    default:
      return [topSeal, body, bottom];
  }
}

interface ExtraPiece {
  w: number;
  h: number;
  label: string;
  count: number;
}

/** Separate film pieces drawn beside the body blank (handles, patch). */
function extraPieces(type: BagConfiguratorType, d: EstimateDimensions): ExtraPiece[] {
  if (type === 'loop') {
    const welded = (d.bagLoopWelded ?? 1) !== 0;
    const HW = d.bagHandleWidthMm && d.bagHandleWidthMm > 0 ? d.bagHandleWidthMm : 25;
    const HL = d.handleLengthMm ?? 0;
    if (welded && HL > 0) return [{ w: HW, h: HL, label: 'Handle', count: 2 }];
  }
  if (type === 'patch') {
    const PW = d.bagPatchWidthMm ?? 0;
    const PH = d.bagPatchHeightMm ?? 0;
    if (PW > 0 && PH > 0) return [{ w: PW, h: PH, label: 'Patch', count: 1 }];
  }
  return [];
}

function fillFor(kind: Band['kind'] | Panel['kind']): string {
  switch (kind) {
    case 'seal':
      return C.sealBand;
    case 'gusset':
      return C.bagGusset;
    case 'fold':
      return C.bagFold;
    case 'lip':
      return C.bagDark;
    case 'flap':
      return C.bagFold;
    case 'pocket':
      return C.bagGusset;
    default:
      return C.blankFill;
  }
}

/** Courier single-web flat blank: width = W, length = FL + H + H + SA + POD. */
function CourierBlank({ d, vw, vh }: { d: EstimateDimensions; vw: number; vh: number }) {
  const W = d.openWidthMm ?? 0;
  const H = d.openHeightMm ?? 0;
  const FL = d.flapMm ?? 0;
  const SA = d.sealAllowanceMm ?? SA_DEFAULT;
  const POD = d.bagPodHeightMm ?? 0;
  const bands: Band[] = ([
    { h: FL, kind: 'flap', label: 'FL' },
    { h: H, kind: 'body' },
    { h: H, kind: 'body' },
    { h: SA, kind: 'seal', label: 'SA' },
    { h: POD, kind: 'pocket', label: 'POD' },
  ] as Band[]).filter((b) => b.h > 0);
  const totalL = bands.reduce((s, b) => s + b.h, 0);
  const t = mkT(W, totalL, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  let yAcc = 0;
  const segs = bands.map((b) => {
    const yTop = yAcc;
    yAcc += b.h;
    return { b, yTop, yBot: yAcc };
  });
  // Fold line sits between the two body panels (back/front).
  const foldY = FL + H;
  return (
    <>
      {segs.map((s, i) => (
        <rect
          key={i}
          x={x0}
          y={t.py(s.yTop)}
          width={x1 - x0}
          height={t.sc(s.b.h)}
          fill={fillFor(s.b.kind)}
          opacity={s.b.kind === 'body' ? 1 : 0.85}
        />
      ))}
      <line x1={x0} y1={t.py(foldY)} x2={x1} y2={t.py(foldY)} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
      <rect x={x0} y={t.py(0)} width={x1 - x0} height={t.sc(totalL)} fill="none" stroke={C.cutStroke} strokeWidth={C.sw} />
      <DimH x1={x0} x2={x1} yB={t.py(0)} off={C.dimOff} lbl={dimLbl('W', W)} />
      <DimV y1={t.py(0)} y2={t.py(totalL)} xB={x0} off={C.dimOff} lbl={`Blank L=${Math.round(totalL)}mm`} />
      {FL > 0 && <DimV y1={t.py(0)} y2={t.py(FL)} xB={x1} off={C.dimOff} lbl={dimLbl('FL', FL)} left={false} />}
      {POD > 0 && <DimV y1={t.py(totalL - POD)} y2={t.py(totalL)} xB={x1} off={C.dimOff} lbl={dimLbl('POD', POD)} left={false} />}
    </>
  );
}

/** Two-web flat blank (gusseted family, loop body, patch body, diaper, wicket, etc.). */
function TwoWebBlank({
  type,
  d,
  blankWidthMm,
  blankLengthMm,
  vw,
  vh,
}: {
  type: BagConfiguratorType;
  d: EstimateDimensions;
  blankWidthMm: number;
  blankLengthMm: number;
  vw: number;
  vh: number;
}) {
  const W = d.openWidthMm ?? 0;
  const H = d.openHeightMm ?? 0;
  const BG = d.bottomGussetMm ?? 0;
  const SG = d.sideGussetMm ?? 0;
  const SA = d.sealAllowanceMm ?? SA_DEFAULT;
  const TF = d.bagTopFoldMm ?? 0;
  const LH = d.bagWicketLipMm ?? 0;

  const panels = widthPanels(W, SG);
  const bands = lengthBands(type, { H, BG, SA, TF, LH });
  const extras = extraPieces(type, d);

  // Model box includes the body blank plus any extra pieces stacked to the right.
  const gap = Math.max(blankWidthMm * 0.08, 30);
  const extraColW = extras.length ? Math.max(...extras.map((e) => e.w)) : 0;
  const extraColH = extras.reduce((s, e) => s + e.h * e.count + gap * (e.count - 1), 0) + (extras.length ? gap : 0);
  const modelW = blankWidthMm + (extras.length ? gap + extraColW : 0);
  const modelH = Math.max(blankLengthMm, extraColH);
  const t = mkT(modelW, modelH, vw, vh);

  const bx0 = t.px(0);
  const by0 = t.py(0);

  // Width panel boundaries (x positions in mm).
  const xEdges: number[] = [0];
  panels.forEach((p) => xEdges.push(xEdges[xEdges.length - 1] + p.w));
  // Length band boundaries (y positions in mm).
  const yEdges: number[] = [0];
  bands.forEach((b) => yEdges.push(yEdges[yEdges.length - 1] + b.h));

  return (
    <>
      {/* Base blank fill */}
      <rect x={bx0} y={by0} width={t.sc(blankWidthMm)} height={t.sc(blankLengthMm)} fill={C.blankFill} />

      {/* Horizontal length bands (seal / gusset / fold / lip) across full width */}
      {bands.map((b, i) => {
        if (b.kind === 'body') return null;
        return (
          <rect
            key={`b${i}`}
            x={bx0}
            y={t.py(yEdges[i])}
            width={t.sc(blankWidthMm)}
            height={t.sc(b.h)}
            fill={fillFor(b.kind)}
            opacity={0.8}
          />
        );
      })}

      {/* Vertical side-gusset panels across full length */}
      {SG > 0 &&
        panels.map((p, i) =>
          p.kind === 'gusset' ? (
            <rect
              key={`g${i}`}
              x={t.px(xEdges[i])}
              y={by0}
              width={t.sc(p.w)}
              height={t.sc(blankLengthMm)}
              fill={C.bagGusset}
              opacity={0.45}
            />
          ) : null
        )}

      {/* Internal fold lines: panel boundaries (vertical) */}
      {SG > 0
        ? xEdges.slice(1, -1).map((x, i) => (
            <line
              key={`vf${i}`}
              x1={t.px(x)}
              y1={by0}
              x2={t.px(x)}
              y2={t.py(blankLengthMm)}
              stroke={C.bagStroke}
              strokeWidth={1}
              strokeDasharray={C.gussetDash}
            />
          ))
        : (
            <line
              x1={t.px(W)}
              y1={by0}
              x2={t.px(W)}
              y2={t.py(blankLengthMm)}
              stroke={C.bagStroke}
              strokeWidth={1}
              strokeDasharray={C.foldDash}
            />
          )}

      {/* Band separator lines (horizontal) */}
      {yEdges.slice(1, -1).map((y, i) => (
        <line
          key={`hf${i}`}
          x1={bx0}
          y1={t.py(y)}
          x2={t.px(blankWidthMm)}
          y2={t.py(y)}
          stroke={C.bagStroke}
          strokeWidth={0.9}
          strokeDasharray={C.foldDash}
        />
      ))}

      {/* Wicket holes in the lip band */}
      {type === 'wicket' &&
        LH > 0 &&
        [0.5].map(() => {
          const cyMm = LH / 2;
          const cy = t.py(cyMm);
          const r = Math.max(t.sc(Math.min(LH, blankWidthMm) * 0.12), 2);
          return [0.5, 1.5, 2.5].map((k) => {
            const cx = bx0 + (t.sc(blankWidthMm) / 3) * k;
            return <circle key={`wh${k}`} cx={cx} cy={cy} r={r} fill="#f8f9fb" stroke={C.bagStroke} strokeWidth={1} />;
          });
        })}

      {/* Cut outline on top */}
      <rect
        x={bx0}
        y={by0}
        width={t.sc(blankWidthMm)}
        height={t.sc(blankLengthMm)}
        fill="none"
        stroke={C.cutStroke}
        strokeWidth={C.sw}
      />

      {/* Extra pieces (loop handles / patch) stacked to the right */}
      {extras.map((e, ei) => {
        const colX = blankWidthMm + gap;
        const items = [];
        let yCursor = 0;
        for (let k = 0; k < e.count; k++) {
          const yTop = yCursor;
          yCursor += e.h + gap;
          items.push(
            <g key={`e${ei}-${k}`}>
              <rect
                x={t.px(colX)}
                y={t.py(yTop)}
                width={t.sc(e.w)}
                height={t.sc(e.h)}
                fill={C.bagGusset}
                stroke={C.cutStroke}
                strokeWidth={C.sw}
                opacity={0.9}
                rx={2}
              />
              <text
                x={t.px(colX) + t.sc(e.w) / 2}
                y={t.py(yTop) + 14}
                textAnchor="middle"
                fontFamily="Segoe UI, system-ui, sans-serif"
                fontSize={10}
                fontWeight={700}
                fill={C.dimText}
              >
                {e.count > 1 ? `${e.label} ${k + 1}` : e.label}
              </text>
            </g>
          );
        }
        return (
          <g key={`ec${ei}`}>
            {items}
            <DimH
              x1={t.px(colX)}
              x2={t.px(colX + e.w)}
              yB={t.py(0)}
              off={18}
              lbl={`${Math.round(e.w)}×${Math.round(e.h)}`}
            />
          </g>
        );
      })}

      {/* Overall blank dimensions */}
      <DimH x1={bx0} x2={t.px(blankWidthMm)} yB={by0} off={C.dimOff} lbl={`Blank W=${Math.round(blankWidthMm)}mm`} />
      <DimV y1={by0} y2={t.py(blankLengthMm)} xB={bx0} off={C.dimOff} lbl={`Blank L=${Math.round(blankLengthMm)}mm`} />

      {/* One face width marker (W) under the first face panel */}
      {(() => {
        const faceStart = SG > 0 ? SG : 0;
        return (
          <DimH
            x1={t.px(faceStart)}
            x2={t.px(faceStart + W)}
            yB={t.py(blankLengthMm)}
            off={C.dimOff}
            lbl={dimLbl('W', W)}
            above={false}
          />
        );
      })()}

      {/* Side gusset width marker */}
      {SG > 0 && (
        <DimH
          x1={t.px(0)}
          x2={t.px(SG)}
          yB={t.py(blankLengthMm)}
          off={C.dimOff + C.dimStep}
          lbl={dimLbl('SG', SG)}
          above={false}
        />
      )}
    </>
  );
}

/**
 * Flat-blank die-line view. The OUTER blank size comes straight from the engine
 * (calculateBagFlatSheetAreaM2) so the drawing always matches the costed area.
 *
 * NOTE (estimate vs. production): this blank is INDICATIVE — it shows only the material
 * that drives cost (blank area × GSM). True production die-line parameters — bleed,
 * register / print marks, knife & cut tolerances, gripper / lead-edge and other
 * machine-specific allowances — are intentionally NOT modelled in this blank. They are
 * EXCLUDED from the flat blank and instead accounted for in the WASTE calculation
 * (per-material waste %). Detailed die-line tooling specs are captured at the MES
 * production stage, not during estimation — do not add them to this estimate view.
 */
export function BagFlatBlank({ type, dims }: { type: BagConfiguratorType; dims: EstimateDimensions }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize(320, 360);

  const blank = useMemo(() => calculateBagFlatSheetAreaM2(dims), [dims]);

  const hasBlank = blank.areaM2 > 0 && blank.blankWidthMm > 0 && blank.blankLengthMm > 0;

  return (
    <div ref={ref} className="w-full h-full min-h-[360px] flex items-stretch">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="block w-full h-full"
        role="img"
        aria-label={`${type} flat blank die-line`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Grid w={vw} h={vh} id="bag-flat-grid" />
        {hasBlank ? (
          type === 'courier' ? (
            <CourierBlank d={dims} vw={vw} vh={vh} />
          ) : (
            <TwoWebBlank
              type={type}
              d={dims}
              blankWidthMm={blank.blankWidthMm}
              blankLengthMm={blank.blankLengthMm}
              vw={vw}
              vh={vh}
            />
          )
        ) : (
          <text
            x={vw / 2}
            y={vh / 2}
            textAnchor="middle"
            fontFamily="Segoe UI, system-ui, sans-serif"
            fontSize={13}
            fill="#94a3b8"
          >
            Enter dimensions to preview the flat blank
          </text>
        )}
      </svg>
    </div>
  );
}
