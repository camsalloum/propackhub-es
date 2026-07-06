import { useId } from 'react';
import { useDrawAreaSize } from './webSvgPrimitives';

type Props = {
  widthMm: number;
  outerDiameterMm: number;
  coreDiameterMm?: number;
  width?: number;
  height?: number;
  showDimensions?: boolean;
  rings?: number;
  laneCount?: number;
  cutOffMm?: number;
  /** Repeats around roll circumference (from roll spec). Falls back to π×OD/CO. */
  wrapCount?: number;
  /** RW / LF label on the width leader (estimator configurator). */
  widthLabel?: string;
  /** Hide outer-Ø leader — estimation does not collect OD. */
  showOuterDiameter?: boolean;
  /** Fill parent via ResizeObserver (configurator panels). */
  fitContainer?: boolean;
  className?: string;
};

/**
 * Upright oblique cylinder projection (classic "film roll" 3/4 view).
 * Front face is a vertical ellipse; the body recedes up-and-right.
 * - u = horizontal circle coord, foreshortened (minor axis)
 * - v = vertical circle coord, full height (major axis)
 * - ax = axial position along the roll width (screen: right & up)
 */
const AXX = 0.86; // screen x per mm of width
const AXY = -0.42; // screen y per mm of width (up)
const EU = 0.58; // face horizontal foreshorten (ellipse minor axis)
const BACK_SCALE = 0.9; // subtle perspective taper so the far cap doesn't look enlarged
/** RW/OD below this → label-style narrow roll (face-dominant layout). */
const NARROW_ROLL_ASPECT = 0.14;
/** Schematic axial depth as fraction of OD when the real RW is too thin to read. */
const NARROW_AXIAL_OD_FRACTION = 0.32;
const TAU = Math.PI * 2;

type Pt = { x: number; y: number };

type RollProjection = {
  project: (ax: number, u: number, v: number) => Pt;
  gPhi: number;
  visT0: number;
  visT1: number;
  barrelVisible: (th: number) => boolean;
};

function rollProjection(axx: number, axy: number, eu: number): RollProjection {
  const gPhi = Math.atan2(-axy, axx / eu);
  return {
    project(ax, u, v) {
      return { x: ax * axx + u * eu, y: ax * axy - v };
    },
    gPhi,
    visT0: gPhi - Math.PI / 2,
    visT1: gPhi + Math.PI / 2,
    barrelVisible(th: number) {
      return Math.cos(th - gPhi) > 0.04;
    },
  };
}

const OBLIQUE_PROJ = rollProjection(AXX, AXY, EU);

function ellipsePoints(
  proj: RollProjection['project'],
  ax: number,
  r: number,
  n = 120
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    pts.push(proj(ax, r * Math.cos(t), r * Math.sin(t)));
  }
  return pts;
}

function ellipseArc(
  proj: RollProjection['project'],
  ax: number,
  r: number,
  t0: number,
  t1: number,
  n = 40
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    pts.push(proj(ax, r * Math.cos(t), r * Math.sin(t)));
  }
  return pts;
}

function toPath(pts: Pt[], close = true): string {
  if (pts.length === 0) return '';
  const head = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  const rest = pts.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return `${head} ${rest}${close ? ' Z' : ''}`;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function RollVisualizerSvg({
  widthMm,
  outerDiameterMm,
  coreDiameterMm,
  width,
  height,
  showDimensions = true,
  rings = 16,
  laneCount = 1,
  cutOffMm,
  wrapCount,
  widthLabel = 'RW',
  showOuterDiameter = false,
}: Omit<Props, 'fitContainer' | 'className'> & { width: number; height: number }) {
  const uid = useId().replace(/:/g, '');
  const slender = widthMm / Math.max(outerDiameterMm, 1);
  const isNarrowRoll = slender < NARROW_ROLL_ASPECT;
  const axialMm = isNarrowRoll
    ? Math.max(widthMm, outerDiameterMm * NARROW_AXIAL_OD_FRACTION)
    : widthMm;
  const L = Math.max(1, axialMm);
  const { project, visT0, visT1, barrelVisible } = OBLIQUE_PROJ;
  const backScale = BACK_SCALE;

  const R = Math.max(1, outerDiameterMm) / 2;
  const coreMm = coreDiameterMm ?? outerDiameterMm * 0.16;
  const rCore = Math.max(0, Math.min(coreMm, outerDiameterMm * 0.9)) / 2;
  const rCoreInner = rCore * 0.6;

  const Rb = R * backScale;
  const scaleAt = (ax: number) => 1 + (backScale - 1) * (ax / L);

  const frontOuter = ellipsePoints(project, 0, R);
  const backOuter = ellipsePoints(project, L, Rb);
  const coreOuter = ellipsePoints(project, 0, rCore);
  const coreInner = ellipsePoints(project, 0, rCoreInner);

  // Concentric windings on the front face.
  const ringPaths: Pt[][] = [];
  const ringBudget = isNarrowRoll ? 8 : 30;
  const ringCount = Math.max(0, Math.min(rings, ringBudget));
  for (let i = 1; i <= ringCount; i++) {
    const t = i / (ringCount + 1);
    const eased = 1 - (1 - t) ** 1.7;
    ringPaths.push(ellipsePoints(project, 0, rCore + (R - rCore) * eased));
  }

  // Silhouette generators (where the cylinder outline touches the ellipse).
  const a0 = project(0, 0, 0);
  const a1 = project(L, 0, 0);
  const axis = { x: a1.x - a0.x, y: a1.y - a0.y };
  const perp = { x: -axis.y, y: axis.x };
  let iMax = 0;
  let iMin = 0;
  let dMax = -Infinity;
  let dMin = Infinity;
  frontOuter.forEach((p, i) => {
    const d = (p.x - a0.x) * perp.x + (p.y - a0.y) * perp.y;
    if (d > dMax) {
      dMax = d;
      iMax = i;
    }
    if (d < dMin) {
      dMin = d;
      iMin = i;
    }
  });

  const nLanes = Math.max(1, Math.min(Math.floor(laneCount) || 1, 12));
  const laneWidthMm = L / nLanes;
  const laneDividerPaths: Pt[][] = [];
  if (nLanes > 1) {
    for (let k = 1; k < nLanes; k++) {
      const ax = (L * k) / nLanes;
      // Only the viewer-facing arc of each slit circle (hide the part behind the barrel).
      laneDividerPaths.push(ellipseArc(project, ax, R * scaleAt(ax), visT0, visT1, 44));
    }
  }

  // Cut-off: rim ticks + axial lines; subsample when many repeats (narrow label rolls).
  const showCutOff = !!cutOffMm && cutOffMm > 0;
  const circumference = TAU * R;
  const cutOffCount = showCutOff
    ? wrapCount != null && wrapCount > 0
      ? wrapCount
      : Math.max(1, Math.min(60, Math.round(circumference / cutOffMm!)))
    : 0;
  const maxRimTicks = isNarrowRoll ? 8 : 36;
  const tickStep = cutOffCount > maxRimTicks ? Math.ceil(cutOffCount / maxRimTicks) : 1;

  // Highlighted repeat: snap to a real tick gap in the visible upper-right.
  const targetMid = Math.PI / 6;
  const kHi = showCutOff ? Math.max(0, Math.min(cutOffCount - 1, Math.round((targetMid / TAU) * cutOffCount - 0.5))) : 0;
  const thA = (kHi / cutOffCount) * TAU;
  const thB = ((kHi + 1) / cutOffCount) * TAU;
  const coHighlight = showCutOff ? ellipseArc(project, 0, R, thA, thB, 24) : [];
  const coHighlightBack = showCutOff ? ellipseArc(project, L, Rb, thA, thB, 24) : [];

  const cutOffTicks: { p1: Pt; p2: Pt; strong: boolean }[] = [];
  const cutOffAxial: { a: Pt; b: Pt; strong: boolean }[] = [];
  if (showCutOff) {
    const tickDepth = R * 0.09;
    for (let m = 0; m < cutOffCount; m++) {
      const isBoundary = m === kHi || m === (kHi + 1) % cutOffCount;
      if (!isBoundary && m % tickStep !== 0) continue;
      const t = (m / cutOffCount) * TAU;
      cutOffTicks.push({
        p1: project(0, (R + (isBoundary ? tickDepth * 0.8 : 0)) * Math.cos(t), (R + (isBoundary ? tickDepth * 0.8 : 0)) * Math.sin(t)),
        p2: project(0, (R - (isBoundary ? tickDepth * 1.6 : tickDepth)) * Math.cos(t), (R - (isBoundary ? tickDepth * 1.6 : tickDepth)) * Math.sin(t)),
        strong: isBoundary,
      });
      if (barrelVisible(t) && (!isNarrowRoll || isBoundary)) {
        cutOffAxial.push({
          a: project(0, R * Math.cos(t), R * Math.sin(t)),
          b: project(L, Rb * Math.cos(t), Rb * Math.sin(t)),
          strong: isBoundary,
        });
      }
    }
  }

  // Fit.
  const all = [...frontOuter, ...backOuter];
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const WIDTH_SIDE_GAP = 28;
  const WIDTH_LABEL_BELOW = 16;
  const padLeft = 20;
  const padRight = showDimensions ? WIDTH_SIDE_GAP + 16 : 20;
  const padBottom = showDimensions ? 42 : 20;
  const coLabelReserve = showCutOff && showDimensions ? 24 : 0;
  const padTop = padBottom + coLabelReserve;
  const scale = Math.min((width - padLeft - padRight) / spanX, (height - padTop - padBottom) / spanY);
  const offX = padLeft - minX * scale;
  const offY = padTop - minY * scale;
  const T = (p: Pt): Pt => ({ x: p.x * scale + offX, y: p.y * scale + offY });

  const f = (pts: Pt[]) => pts.map(T);
  const fFrontOuter = f(frontOuter);
  const fCoreOuter = f(coreOuter);
  const fCoreInner = f(coreInner);
  const fRings = ringPaths.map(f);
  const fLaneDividers = laneDividerPaths.map(f);
  const fCoHighlight = f(coHighlight);
  const fCoHighlightBack = f(coHighlightBack);
  const fCutOffAxial = cutOffAxial.map((l) => ({ a: T(l.a), b: T(l.b), strong: l.strong }));

  const tMax = T(frontOuter[iMax]);
  const tMaxB = T(backOuter[iMax]);
  const tMin = T(frontOuter[iMin]);
  const tMinB = T(backOuter[iMin]);

  // Width dimension uses the lower silhouette generator (front → back).
  const maxIsBottom = tMax.y > tMin.y;
  const wF = maxIsBottom ? tMax : tMin;
  const wB = maxIsBottom ? tMaxB : tMinB;

  // Complete cylinder: fill the body to the curved far rim (not a flat chord),
  // so the back reads as a full rounded roll end instead of a cut.
  const axisLen = Math.hypot(axis.x, axis.y) || 1;
  const dHat = { x: axis.x / axisLen, y: axis.y / axisLen };
  const backCenterS = T(project(L, 0, 0));
  const backPtS = (th: number) => T(project(L, Rb * Math.cos(th), Rb * Math.sin(th)));
  const sOf = (th: number) => {
    const P = backPtS(th);
    return (P.x - backCenterS.x) * dHat.x + (P.y - backCenterS.y) * dHat.y;
  };
  const thMax = (iMax / frontOuter.length) * TAU;
  const thMin = (iMin / frontOuter.length) * TAU;
  let sweep = (((thMin - thMax) % TAU) + TAU) % TAU;
  if (sOf(thMax + sweep / 2) < 0) sweep -= TAU;
  const FAR_STEPS = 60;
  const backFarArc: Pt[] = [];
  for (let k = 0; k <= FAR_STEPS; k++) backFarArc.push(backPtS(thMax + sweep * (k / FAR_STEPS)));

  const bodyPath = toPath([tMax, ...backFarArc, tMin]);

  const stroke = 'rgb(var(--color-text-secondary))';
  const strokeFaint = 'rgb(var(--color-border-strong))';
  const surface = 'rgb(var(--color-surface-raised))';
  const accent = 'rgb(var(--color-accent))';
  const labelColor = 'rgb(var(--color-text-primary))';
  const coreFill = '#c9a56f';
  const coreInnerFill = '#8a6a3a';

  const WIDTH_TICK_HALF = 4;

  const faceLeft = Math.min(...fFrontOuter.map((p) => p.x));
  const faceTop = Math.min(...fFrontOuter.map((p) => p.y));
  const faceBot = Math.max(...fFrontOuter.map((p) => p.y));
  const odLeaderX = faceLeft - 22;

  const ariaExtras =
    (nLanes > 1 ? `, ${nLanes} lanes of ${fmt(laneWidthMm)} mm` : '') +
    (showCutOff ? `, cut-off ${fmt(cutOffMm!)} mm (${cutOffCount} per wrap)` : '');
  const ariaLabel = showOuterDiameter
    ? `Film roll: width ${fmt(widthMm)} mm, outer diameter ${fmt(outerDiameterMm)} mm${ariaExtras}`
    : `Film roll: ${widthLabel} ${fmt(widthMm)} mm${ariaExtras}`;

  const coHighlightMid = fCoHighlight.length
    ? fCoHighlight[Math.floor(fCoHighlight.length / 2)]
    : null;

  // CO callout: always above the roll bbox, aligned with the highlighted repeat (all roll types).
  const rollScreenPts = [...fFrontOuter, tMax, tMin, tMaxB, tMinB, ...backFarArc];
  const rollTop = Math.min(...rollScreenPts.map((p) => p.y));
  const rollLeft = Math.min(...rollScreenPts.map((p) => p.x));
  const rollRight = Math.max(...rollScreenPts.map((p) => p.x));
  const CO_LABEL_ABOVE = 10;
  let coLabelX = width / 2;
  let coLabelY = Math.max(12, rollTop - CO_LABEL_ABOVE);
  let coLeaderEnd: Pt | null = null;
  if (coHighlightMid) {
    const textPad = 58;
    coLabelX = Math.max(rollLeft + textPad, Math.min(rollRight - textPad, coHighlightMid.x));
    coLabelY = Math.max(12, rollTop - CO_LABEL_ABOVE);
    coLeaderEnd = { x: coLabelX, y: rollTop - 2 };
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="block w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`${uid}-body`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={surface} />
          <stop offset="100%" stopColor="rgb(var(--color-border-strong))" stopOpacity={isNarrowRoll ? 0.55 : 0.4} />
        </linearGradient>
        <radialGradient id={`${uid}-face`} cx={isNarrowRoll ? '38%' : '42%'} cy={isNarrowRoll ? '36%' : '40%'} r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="72%" stopColor={surface} />
          <stop offset="100%" stopColor="rgb(var(--color-border-strong))" stopOpacity={isNarrowRoll ? 0.35 : 0} />
        </radialGradient>
      </defs>

      {/* Cylinder body (filled to the curved far rim) */}
      <path d={bodyPath} fill={`url(#${uid}-body)`} stroke="none" />
      <line x1={tMax.x} y1={tMax.y} x2={tMaxB.x} y2={tMaxB.y} stroke={stroke} strokeWidth={isNarrowRoll ? 1.65 : 1.3} />
      <line x1={tMin.x} y1={tMin.y} x2={tMinB.x} y2={tMinB.y} stroke={stroke} strokeWidth={isNarrowRoll ? 1.65 : 1.3} />
      {/* Far rim (visible rounded back edge) */}
      <path d={toPath(backFarArc, false)} fill="none" stroke={stroke} strokeWidth={isNarrowRoll ? 1.65 : 1.3} />

      {/* PPC slit lines around the barrel (viewer-facing arc only) */}
      {fLaneDividers.map((arc, i) => (
        <path key={`lane-${i}`} d={toPath(arc, false)} fill="none" stroke={stroke} strokeWidth={1} strokeDasharray="4 3" opacity={0.45} />
      ))}

      {/* Cut-off repeat lines running along the barrel (perspective) */}
      {showCutOff &&
        fCutOffAxial.map((l, i) => (
          <line
            key={`coax-${i}`}
            x1={l.a.x}
            y1={l.a.y}
            x2={l.b.x}
            y2={l.b.y}
            stroke={l.strong ? accent : stroke}
            strokeWidth={l.strong ? 1.5 : 0.6}
            opacity={l.strong ? 0.95 : 0.28}
          />
        ))}
      {/* Highlighted repeat — back edge of the band */}
      {fCoHighlightBack.length > 1 && (
        <path d={toPath(fCoHighlightBack, false)} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.85} />
      )}

      {/* Front face + windings */}
      <path d={toPath(fFrontOuter)} fill={`url(#${uid}-face)`} stroke={stroke} strokeWidth={1.4} />
      {fRings.map((r, i) => (
        <path key={i} d={toPath(r)} fill="none" stroke={strokeFaint} strokeWidth={0.7} opacity={0.6} />
      ))}

      {/* Core */}
      {rCore > 0 && (
        <>
          <path d={toPath(fCoreOuter)} fill={coreFill} stroke={strokeFaint} strokeWidth={1} />
          <path d={toPath(fCoreInner)} fill={coreInnerFill} opacity={0.5} />
        </>
      )}

      {/* Cut-off rim ticks */}
      {showCutOff &&
        cutOffTicks.map((tk, i) => {
          const p1 = T(tk.p1);
          const p2 = T(tk.p2);
          return (
            <line
              key={`co-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={accent}
              strokeWidth={tk.strong ? 1.6 : 0.9}
              opacity={tk.strong ? 1 : 0.7}
            />
          );
        })}

      {/* One cut-off highlighted on the rim */}
      {fCoHighlight.length > 1 && (
        <path d={toPath(fCoHighlight, false)} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" />
      )}

      {showDimensions && (
        <g fontFamily="Inter, Arial, sans-serif" fontSize={11} fontWeight={600} fill={labelColor}>
          {/* Outer Ø (optional) */}
          {showOuterDiameter && (
            <>
              <line x1={faceLeft} y1={faceTop} x2={odLeaderX} y2={faceTop} stroke={strokeFaint} strokeWidth={0.8} strokeDasharray="3 3" />
              <line x1={faceLeft} y1={faceBot} x2={odLeaderX} y2={faceBot} stroke={strokeFaint} strokeWidth={0.8} strokeDasharray="3 3" />
              <line x1={odLeaderX} y1={faceTop} x2={odLeaderX} y2={faceBot} stroke={accent} strokeWidth={1.25} />
              <line x1={odLeaderX - 4} y1={faceTop} x2={odLeaderX + 4} y2={faceTop} stroke={accent} strokeWidth={1.25} />
              <line x1={odLeaderX - 4} y1={faceBot} x2={odLeaderX + 4} y2={faceBot} stroke={accent} strokeWidth={1.25} />
              <text
                x={odLeaderX - 8}
                y={(faceTop + faceBot) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(-90 ${odLeaderX - 8} ${(faceTop + faceBot) / 2})`}
              >
                Ø {fmt(outerDiameterMm)} mm
              </text>
            </>
          )}

          {/* Roll width (RW / LF / OW) — bottom edge, offset to the right */}
          {(() => {
            const dx = wB.x - wF.x;
            const dy = wB.y - wF.y;
            const shiftX = rollRight + WIDTH_SIDE_GAP - Math.max(wF.x, wB.x);
            const dimF = { x: wF.x + shiftX, y: wF.y };
            const dimB = { x: wB.x + shiftX, y: wB.y };
            const tickDx = (-dy / (Math.hypot(dx, dy) || 1)) * WIDTH_TICK_HALF;
            const tickDy = (dx / (Math.hypot(dx, dy) || 1)) * WIDTH_TICK_HALF;
            const dimBotY = Math.max(dimF.y, dimB.y);
            const labelX = (dimF.x + dimB.x) / 2;
            const labelY = dimBotY + WIDTH_LABEL_BELOW;
            const widthLbl = `${widthLabel} ${fmt(widthMm)} mm${nLanes > 1 ? ` (${nLanes}×${fmt(laneWidthMm)})` : ''}`;
            return (
              <>
                <line
                  x1={wF.x}
                  y1={wF.y}
                  x2={dimF.x}
                  y2={wF.y}
                  stroke={strokeFaint}
                  strokeWidth={0.8}
                  strokeDasharray="4 3"
                />
                <line
                  x1={wB.x}
                  y1={wB.y}
                  x2={dimB.x}
                  y2={wB.y}
                  stroke={strokeFaint}
                  strokeWidth={0.8}
                  strokeDasharray="4 3"
                />
                <line x1={dimF.x} y1={dimF.y} x2={dimB.x} y2={dimB.y} stroke={accent} strokeWidth={1.25} />
                <line
                  x1={dimF.x - tickDx}
                  y1={dimF.y - tickDy}
                  x2={dimF.x + tickDx}
                  y2={dimF.y + tickDy}
                  stroke={accent}
                  strokeWidth={1.25}
                />
                <line
                  x1={dimB.x - tickDx}
                  y1={dimB.y - tickDy}
                  x2={dimB.x + tickDx}
                  y2={dimB.y + tickDy}
                  stroke={accent}
                  strokeWidth={1.25}
                />
                {nLanes > 1 &&
                  Array.from({ length: nLanes - 1 }, (_, k) => k + 1).map((k) => {
                    const t = k / nLanes;
                    const lx = dimF.x + t * (dimB.x - dimF.x);
                    const ly = dimF.y + t * (dimB.y - dimF.y);
                    return (
                      <line
                        key={`lanetick-${k}`}
                        x1={lx - tickDx * 0.75}
                        y1={ly - tickDy * 0.75}
                        x2={lx + tickDx * 0.75}
                        y2={ly + tickDy * 0.75}
                        stroke={accent}
                        strokeWidth={1}
                        opacity={0.7}
                      />
                    );
                  })}
                <line
                  x1={labelX}
                  y1={dimBotY}
                  x2={labelX}
                  y2={labelY - 4}
                  stroke={strokeFaint}
                  strokeWidth={0.8}
                  strokeDasharray="4 3"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fontSize={isNarrowRoll ? 10 : 11}
                >
                  {widthLbl}
                </text>
              </>
            );
          })()}

          {/* Cut-off callout with leader — all rolls */}
          {showCutOff && (
            <>
              {coHighlightMid && coLeaderEnd && (
                <line
                  x1={coHighlightMid.x}
                  y1={coHighlightMid.y}
                  x2={coLeaderEnd.x}
                  y2={coLeaderEnd.y}
                  stroke={accent}
                  strokeWidth={0.9}
                  opacity={0.6}
                  strokeDasharray="3 2"
                />
              )}
              <text
                x={coLabelX}
                y={coLabelY}
                textAnchor="middle"
                dominantBaseline="auto"
                fontSize={10}
                fontWeight={700}
                fill={accent}
              >
                CO {fmt(cutOffMm!)} mm × {cutOffCount}/wrap
              </text>
            </>
          )}
        </g>
      )}
    </svg>
  );
}

export function RollVisualizer({
  width = 280,
  height = 220,
  fitContainer = false,
  className,
  ...rest
}: Props) {
  const { ref, w, h } = useDrawAreaSize(320, 360);
  const svgW = fitContainer ? w : width;
  const svgH = fitContainer ? h : height;

  if (fitContainer) {
    return (
      <div ref={ref} className={className ?? 'w-full h-full min-h-[320px]'}>
        <RollVisualizerSvg {...rest} width={svgW} height={svgH} />
      </div>
    );
  }

  return (
    <div className={className}>
      <RollVisualizerSvg {...rest} width={svgW} height={svgH} />
    </div>
  );
}

export default RollVisualizer;
