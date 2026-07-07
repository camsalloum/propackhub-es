import { useId } from 'react';
import { useDrawAreaSize } from './webSvgPrimitives';

type Props = {
  /** Reel width (mm) — the AXIAL length of the roll along its rotation axis. */
  widthMm: number;
  outerDiameterMm: number;
  coreDiameterMm?: number;
  /** Total wound film length (m) — pins the spiral's turn count & repeat total. */
  filmLengthM?: number;
  width?: number;
  height?: number;
  showDimensions?: boolean;
  laneCount?: number;
  cutOffMm?: number;
  /** RW / LF label on the axial leader. */
  widthLabel?: string;
  showOuterDiameter?: boolean;
  fitContainer?: boolean;
  className?: string;
};

/** Mirror standalone reference geometry. */
const FORESHORTEN = 0.42;
const TAU = Math.PI * 2;

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M ${cx.toFixed(2)} ${(cy - ry).toFixed(2)}` +
    ` A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${cx.toFixed(2)} ${(cy + ry).toFixed(2)}` +
    ` A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${cx.toFixed(2)} ${(cy - ry).toFixed(2)} Z`
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function RollVisualizerSvg({
  widthMm,
  outerDiameterMm,
  coreDiameterMm,
  filmLengthM,
  width,
  height,
  showDimensions = true,
  laneCount = 1,
  cutOffMm,
  widthLabel = 'RW',
  showOuterDiameter = false,
}: Omit<Props, 'fitContainer' | 'className'> & { width: number; height: number }) {
  const uid = useId().replace(/:/g, '');

  const W = Math.max(1, widthMm);
  const OD = Math.max(1, outerDiameterMm);
  const CD = Math.max(1, coreDiameterMm && coreDiameterMm > 0 ? coreDiameterMm : outerDiameterMm * 0.16);
  const showCutOff = !!cutOffMm && cutOffMm > 0;
  const filmLenMm = filmLengthM && filmLengthM > 0 ? filmLengthM * 1000 : 0;
  const cutsOnRoll = showCutOff && filmLenMm > 0 ? Math.round(filmLenMm / cutOffMm!) : 0;

  // Mirror standalone sizing math.
  const leftMargin = showOuterDiameter ? 120 : 64;
  const rightMargin = 28;
  const topMargin = showDimensions ? 64 : 30;
  const bottomMargin = showDimensions ? 96 : 24;
  const drawableW = Math.max(1, width - leftMargin - rightMargin);
  const drawableH = Math.max(1, height - topMargin - bottomMargin);
  const scaleH = drawableH / OD;
  const scaleW = drawableW / (W + OD * FORESHORTEN);
  const scale = Math.max(1e-6, Math.min(scaleH, scaleW));

  const ry = (OD * scale) / 2;
  const rx = ry * FORESHORTEN;
  const ryCore = (CD * scale) / 2;
  const rxCore = ryCore * FORESHORTEN;

  const frontCx = leftMargin + rx + 10;
  const frontCy = topMargin + drawableH / 2;
  const backCx = frontCx + W * scale;
  const backCy = frontCy;

  const frontTop = { x: frontCx, y: frontCy - ry };
  const frontBottom = { x: frontCx, y: frontCy + ry };
  const backTop = { x: backCx, y: backCy - ry };
  const backBottom = { x: backCx, y: backCy + ry };

  const silhouette =
    `M ${frontTop.x.toFixed(2)} ${frontTop.y.toFixed(2)}` +
    ` L ${backTop.x.toFixed(2)} ${backTop.y.toFixed(2)}` +
    ` A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 1 ${backBottom.x.toFixed(2)} ${backBottom.y.toFixed(2)}` +
    ` L ${frontBottom.x.toFixed(2)} ${frontBottom.y.toFixed(2)}` +
    ` A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 1 ${frontTop.x.toFixed(2)} ${frontTop.y.toFixed(2)} Z`;

  const frontFace = ellipsePath(frontCx, frontCy, rx, ry);
  const coreFace = ellipsePath(frontCx, frontCy, rxCore, ryCore);

  // Same CO arc math as standalone.
  const Rmm = OD / 2;
  const trueAngle = showCutOff ? cutOffMm! / Rmm : 0;
  const dTheta = showCutOff ? Math.min(trueAngle, 2.0) : 0;
  // Place CO arc on upper-right face and keep label clear above the roll.
  const arcCenterAngle = -1.35;
  const a0 = arcCenterAngle - dTheta / 2;
  const a1 = arcCenterAngle + dTheta / 2;
  const arcP0 = { x: frontCx + rx * Math.cos(a0), y: frontCy + ry * Math.sin(a0) };
  const arcP1 = { x: frontCx + rx * Math.cos(a1), y: frontCy + ry * Math.sin(a1) };
  const arcPath =
    `M ${arcP0.x.toFixed(2)} ${arcP0.y.toFixed(2)}` +
    ` A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 1 ${arcP1.x.toFixed(2)} ${arcP1.y.toFixed(2)}`;

  const stroke = 'rgb(var(--color-text-secondary))';
  const strokeFaint = 'rgb(var(--color-border-strong))';
  const surface = 'rgb(var(--color-surface-raised))';
  const accent = 'rgb(var(--color-accent))';
  const labelColor = 'rgb(var(--color-text-primary))';
  const faceLeft = frontCx - rx;
  const faceTop = frontCy - ry;
  const faceBot = frontCy + ry;
  const odLeaderX = faceLeft - 22;
  const widthBaselineY = frontBottom.y + 42;
  const coMid = {
    x: frontCx + rx * Math.cos(arcCenterAngle),
    y: frontCy + ry * Math.sin(arcCenterAngle),
  };
  const coLabelX = Math.max(84, Math.min(width - 36, frontCx + rx * 1.2));
  const coLabelY = Math.max(14, faceTop - 32);

  const odRepeatCount = showCutOff ? Math.max(1, Math.round((TAU * Rmm) / cutOffMm!)) : 0;
  const repeatsLabel = showCutOff
    ? cutsOnRoll > 0
      ? `${cutsOnRoll.toLocaleString()} repeats`
      : `${odRepeatCount}/wrap`
    : '';
  const nLanes = Math.max(1, Math.min(Math.floor(laneCount) || 1, 12));
  const ariaLabel =
    `Film roll: ${widthLabel} ${fmt(widthMm)} mm axial, Ø ${fmt(outerDiameterMm)} mm` +
    (showCutOff ? `, cut-off ${fmt(cutOffMm!)} mm — ${repeatsLabel}` : '');

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
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1 L8 5 L2 9" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <linearGradient id={`${uid}-body`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={surface} />
          <stop offset="100%" stopColor="rgb(var(--color-border-strong))" stopOpacity={0.42} />
        </linearGradient>
        <radialGradient id={`${uid}-face`} cx="42%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="72%" stopColor={surface} />
          <stop offset="100%" stopColor="rgb(var(--color-border-strong))" stopOpacity={0.15} />
        </radialGradient>
      </defs>

      {/* Barrel */}
      <path d={silhouette} fill={`url(#${uid}-body)`} stroke={stroke} strokeWidth={1.1} />

      {/* Front face */}
      <path d={frontFace} fill={`url(#${uid}-face)`} stroke={stroke} strokeWidth={1.1} />

      {/* Core */}
      <path d={coreFace} fill="#d8b992" stroke="#a9814f" strokeWidth={1} />

      {/* CO arc and eye marks, same style as standalone */}
      {showCutOff && (
        <>
          <path d={arcPath} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <circle cx={arcP0.x} cy={arcP0.y} r={3.5} fill={accent} />
          <circle cx={arcP1.x} cy={arcP1.y} r={3.5} fill={accent} />
          <line
            x1={coMid.x}
            y1={coMid.y}
            x2={coLabelX - 6}
            y2={coLabelY + 8}
            stroke={accent}
            strokeWidth={0.8}
            strokeDasharray="3 3"
            opacity={0.8}
          />
        </>
      )}

      {showDimensions && (
        <g fontFamily="Inter, Arial, sans-serif" fontSize={11} fontWeight={600} fill={labelColor}>
          {showOuterDiameter && (
            <>
              <line x1={faceLeft} y1={faceTop} x2={odLeaderX} y2={faceTop} stroke={strokeFaint} strokeWidth={0.8} strokeDasharray="3 3" />
              <line x1={faceLeft} y1={faceBot} x2={odLeaderX} y2={faceBot} stroke={strokeFaint} strokeWidth={0.8} strokeDasharray="3 3" />
              <line x1={odLeaderX} y1={faceTop} x2={odLeaderX} y2={faceBot} stroke={accent} strokeWidth={1.25} />
              <text x={odLeaderX - 8} y={(faceTop + faceBot) / 2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-90 ${odLeaderX - 8} ${(faceTop + faceBot) / 2})`}>
                Ø {fmt(outerDiameterMm)} mm
              </text>
            </>
          )}

          {/* RW / LF width baseline (same as standalone concept). */}
          <line
            x1={frontBottom.x}
            y1={frontBottom.y}
            x2={frontBottom.x}
            y2={widthBaselineY}
            stroke={strokeFaint}
            strokeWidth={0.8}
            strokeDasharray="4 3"
          />
          <line
            x1={backBottom.x}
            y1={backBottom.y}
            x2={backBottom.x}
            y2={widthBaselineY}
            stroke={strokeFaint}
            strokeWidth={0.8}
            strokeDasharray="4 3"
          />
          <line
            x1={frontBottom.x + 4}
            y1={widthBaselineY}
            x2={backBottom.x - 4}
            y2={widthBaselineY}
            stroke={accent}
            strokeWidth={1.25}
            markerStart={`url(#${uid}-arrow)`}
            markerEnd={`url(#${uid}-arrow)`}
          />
          <text x={(frontBottom.x + backBottom.x) / 2} y={widthBaselineY + 14} textAnchor="middle" dominantBaseline="hanging">
            {widthLabel} {fmt(widthMm)} mm{nLanes > 1 ? ` (${nLanes}×${fmt(widthMm / nLanes)})` : ''}
          </text>

          {/* CO callout — same formula/count behavior as standalone. */}
          {showCutOff && (
            <>
              <text x={coLabelX} y={coLabelY} textAnchor="middle" fontSize={10} fontWeight={700} fill={accent}>
                CO {fmt(cutOffMm!)} mm
              </text>
              <text x={coLabelX} y={coLabelY + 14} textAnchor="middle" fontSize={10} fill={accent}>
                eye mark to eye mark
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
