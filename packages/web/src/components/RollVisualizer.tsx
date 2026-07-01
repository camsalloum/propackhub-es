// Feature: es-ui-revamp — parametric roll dimension visualizer.
//
// A token-themed, presentational SVG that draws a flexible-packaging film roll
// to its real proportions and annotates the key dimensions an estimator cares
// about: roll Width (the wound web width / reel width), Outer Ø, and Core Ø.
//
// It is purely presentational (props in → SVG out), mirroring the conventions
// of LaminateVisualizer: token-backed strokes (`rgb(var(--color-*))`) so it
// re-themes with the app (including the new Industrial theme), `role="img"`
// with an aria-label, and graceful handling of missing / zero values.
//
// HOW THE LINE-ART IS BUILT (isometric construction):
//   - The barrel is a cylinder = two ellipses (the circular caps, which project
//     to ellipses) joined by the two silhouette tangent lines of the barrel.
//   - The wound film is a set of concentric ellipses on the front cap, stepping
//     from the outer radius down to the core hole.
//   - Everything is computed in 3D model space (mm) then projected with a fixed
//     isometric transform and auto-fitted into the viewport, so the drawing is
//     always to-scale relative to the supplied dimensions.

type Props = {
  /** Roll width = wound web width / reel width (the cylinder length), in mm. */
  widthMm: number;
  /** Outer diameter of the wound roll, in mm. */
  outerDiameterMm: number;
  /** Inner core diameter, in mm (typical: 76 = 3", 152 = 6"). */
  coreDiameterMm?: number;
  /** SVG pixel width. */
  width?: number;
  /** SVG pixel height. */
  height?: number;
  /** Draw dimension leaders + labels. */
  showDimensions?: boolean;
  /** Number of concentric "wound layer" rings drawn on the front face. */
  rings?: number;
  className?: string;
};

const COS30 = Math.cos(Math.PI / 6); // 0.8660254…
const SIN30 = Math.sin(Math.PI / 6); // 0.5

type Pt = { x: number; y: number };

/**
 * Isometric projection of a model point (x along the roll axis, y up, z depth)
 * to 2D. Y is negated so +x renders up-and-to-the-right (front cap lands at the
 * lower-left), matching the familiar "roll on a table" view.
 */
function project(x: number, y: number, z: number): Pt {
  return { x: (x - z) * COS30, y: y - (x + z) * SIN30 };
}

/** Sample a circle of radius r in the Y–Z plane at axial position `ax`. */
function ellipsePoints(ax: number, r: number, n = 72): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push(project(ax, r * Math.cos(t), r * Math.sin(t)));
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

export default function RollVisualizer({
  widthMm,
  outerDiameterMm,
  coreDiameterMm = 76,
  width = 280,
  height = 220,
  showDimensions = true,
  rings = 7,
  className,
}: Props) {
  const L = Math.max(1, widthMm);
  const R = Math.max(1, outerDiameterMm) / 2;
  const rCore = Math.max(0, Math.min(coreDiameterMm, outerDiameterMm * 0.95)) / 2;

  // --- Geometry in model space --------------------------------------------
  const frontOuter = ellipsePoints(0, R);
  const backOuter = ellipsePoints(L, R);
  const coreFront = ellipsePoints(0, rCore);

  // Concentric wound-layer rings between core and outer radius.
  const ringPaths: Pt[][] = [];
  const ringCount = Math.max(0, Math.min(rings, 24));
  for (let k = 1; k <= ringCount; k++) {
    const rk = rCore + ((R - rCore) * k) / (ringCount + 1);
    ringPaths.push(ellipsePoints(0, rk));
  }

  // Silhouette tangents: the two front/back ellipse points that are extremal
  // in the direction perpendicular to the on-screen axis vector.
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
    if (d > dMax) { dMax = d; iMax = i; }
    if (d < dMin) { dMin = d; iMin = i; }
  });

  // Front-cap vertical extremes (for the Outer Ø leader).
  let topI = 0;
  let botI = 0;
  frontOuter.forEach((p, i) => {
    if (p.y < frontOuter[topI].y) topI = i;
    if (p.y > frontOuter[botI].y) botI = i;
  });

  // --- Fit everything into the viewport -----------------------------------
  const all = [...frontOuter, ...backOuter, ...coreFront];
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  // Reserve extra left/bottom margin for dimension leaders.
  const padL = showDimensions ? 46 : 14;
  const padR = 14;
  const padT = 14;
  const padB = showDimensions ? 40 : 14;
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const scale = Math.min((width - padL - padR) / spanX, (height - padT - padB) / spanY);
  const offX = padL - minX * scale;
  const offY = padT - minY * scale;
  const T = (p: Pt): Pt => ({ x: p.x * scale + offX, y: p.y * scale + offY });

  const f = (pts: Pt[]) => pts.map(T);
  const fFrontOuter = f(frontOuter);
  const fBackOuter = f(backOuter);
  const fCore = f(coreFront);
  const fRings = ringPaths.map(f);

  const tMax = T(frontOuter[iMax]);
  const tMaxB = T(backOuter[iMax]);
  const tMin = T(frontOuter[iMin]);
  const tMinB = T(backOuter[iMin]);
  const top = T(frontOuter[topI]);
  const bot = T(frontOuter[botI]);

  // Barrel side polygon (masks back-cap lines crossing the body).
  const bodyPoly = toPath([tMax, tMaxB, tMinB, tMin]);

  const stroke = 'rgb(var(--color-text-secondary))';
  const strokeFaint = 'rgb(var(--color-border-strong))';
  const surface = 'rgb(var(--color-surface-raised))';
  const accent = 'rgb(var(--color-accent))';
  const labelColor = 'rgb(var(--color-text-primary))';

  // Dimension leader for Outer Ø, offset to the left of the front cap.
  const dimX = Math.min(top.x, bot.x) - 16;
  const coreLabelAt = T(project(0, 0, 0));

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Film roll: width ${fmt(widthMm)} mm, outer diameter ${fmt(
          outerDiameterMm,
        )} mm, core diameter ${fmt(coreDiameterMm)} mm`}
      >
        {/* Back cap (far rim) — faint */}
        <path d={toPath(fBackOuter)} fill="none" stroke={strokeFaint} strokeWidth={1} opacity={0.5} />
        {/* Barrel side fill to hide back lines, then outline tangents */}
        <path d={bodyPoly} fill={surface} stroke="none" />
        <line x1={tMax.x} y1={tMax.y} x2={tMaxB.x} y2={tMaxB.y} stroke={stroke} strokeWidth={1.25} />
        <line x1={tMin.x} y1={tMin.y} x2={tMinB.x} y2={tMinB.y} stroke={stroke} strokeWidth={1.25} />
        {/* Front cap disc */}
        <path d={toPath(fFrontOuter)} fill={surface} stroke={stroke} strokeWidth={1.5} />
        {/* Wound-layer rings */}
        {fRings.map((r, i) => (
          <path key={i} d={toPath(r)} fill="none" stroke={strokeFaint} strokeWidth={0.85} opacity={0.8} />
        ))}
        {/* Core hole */}
        {rCore > 0 && (
          <path d={toPath(fCore)} fill="rgb(var(--color-surface-sunken))" stroke={stroke} strokeWidth={1.25} />
        )}

        {showDimensions && (
          <g
            fontFamily="Inter, Arial, sans-serif"
            fontSize={11}
            fontWeight={600}
            fill={labelColor}
          >
            {/* Outer Ø — vertical leader at the left of the front cap */}
            <line x1={dimX} y1={top.y} x2={dimX} y2={bot.y} stroke={accent} strokeWidth={1.25} />
            <line x1={dimX - 4} y1={top.y} x2={dimX + 4} y2={top.y} stroke={accent} strokeWidth={1.25} />
            <line x1={dimX - 4} y1={bot.y} x2={dimX + 4} y2={bot.y} stroke={accent} strokeWidth={1.25} />
            <text
              x={dimX - 6}
              y={(top.y + bot.y) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(-90 ${dimX - 6} ${(top.y + bot.y) / 2})`}
            >
              Ø {fmt(outerDiameterMm)} mm
            </text>

            {/* Width — leader along the bottom silhouette */}
            <line
              x1={tMin.x}
              y1={tMin.y + 16}
              x2={tMinB.x}
              y2={tMinB.y + 16}
              stroke={accent}
              strokeWidth={1.25}
            />
            <line x1={tMin.x} y1={tMin.y + 12} x2={tMin.x} y2={tMin.y + 20} stroke={accent} strokeWidth={1.25} />
            <line x1={tMinB.x} y1={tMinB.y + 12} x2={tMinB.x} y2={tMinB.y + 20} stroke={accent} strokeWidth={1.25} />
            <text
              x={(tMin.x + tMinB.x) / 2}
              y={(tMin.y + tMinB.y) / 2 + 30}
              textAnchor="middle"
            >
              W {fmt(widthMm)} mm
            </text>

            {/* Core Ø label */}
            {rCore > 0 && (
              <text
                x={coreLabelAt.x}
                y={coreLabelAt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fontWeight={500}
                fill="rgb(var(--color-text-secondary))"
              >
                Ø{fmt(coreDiameterMm)}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
