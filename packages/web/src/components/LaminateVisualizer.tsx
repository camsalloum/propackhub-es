type Layer = {
  id: string | number;
  type?: string;
  material?: string;
  micron?: number;
  gsm?: number;
};

type Props = {
  layers: Layer[];
  width?: number;
  height?: number;
  /** @deprecated use labelMode */
  showLabels?: boolean;
  labelMode?: 'material' | 'number' | 'none' | 'composition';
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  /** Composition mode: legend with % and gsm under the stack */
  showLegend?: boolean;
};

export function layerTypeColor(type?: string): string {
  if (type === 'substrate') return '#1D5FA3';
  if (type === 'ink') return '#9B4CA0';
  if (type === 'adhesive') return '#2E8B6E';
  return '#6B7280';
}

/**
 * Theme-independent neutral fill for the numbered sequence badges.
 *
 * Layer-type fills (blue/purple/green) collide with whatever theme shares that
 * hue (e.g. Forest Green's brand sits on top of the adhesive green). Since the
 * theme palette spans the whole wheel, no fixed *colored* fill can avoid every
 * theme. So in `number` mode the chip BODY is a fixed slate that matches none of
 * the 9 themes' brand/accent tokens, and the layer type is carried by the chip's
 * colored OUTLINE instead — keeping the type cue without ever coinciding with the
 * active theme's brand/button color.
 */
const SEQUENCE_CHIP_FILL = '#475569'; // slate-600
const SEQUENCE_CHIP_STROKE_WIDTH = 2;

function layerThickness(l: Layer): number {
  const micron = Number(l.micron || 0);
  if (micron > 0) return micron;
  const gsm = Number(l.gsm || 0);
  return gsm > 0 ? gsm : 1;
}

function layerShare(l: Layer, totalGsm: number, totalThickness: number): number {
  const gsm = Number(l.gsm || 0);
  if (totalGsm > 0 && gsm > 0) return gsm / totalGsm;
  return layerThickness(l) / Math.max(1, totalThickness);
}

function layerLabel(layer: Layer, i: number): string {
  return layer.material || layer.type || `Layer ${i + 1}`;
}

export default function LaminateVisualizer({
  layers,
  width = 220,
  height = 180,
  showLabels,
  labelMode,
  orientation = 'vertical',
  className,
  showLegend = true,
}: Props) {
  const resolvedLabelMode =
    labelMode ??
    (showLabels === false ? 'none' : showLabels === true ? 'material' : 'material');

  const thicknesses = layers.map(layerThickness);
  const totalThickness = Math.max(1, thicknesses.reduce((s, t) => s + t, 0));
  const totalGsm = layers.reduce((s, l) => s + (Number(l.gsm) || 0), 0);
  const shares = layers.map((l) => layerShare(l, totalGsm, totalThickness));
  const gap = 2;
  const pad = 8;

  const legend =
    resolvedLabelMode === 'composition' && showLegend && layers.length > 0 ? (
      <ul className="mt-3 space-y-1.5 text-xs w-full">
        {layers.map((layer, i) => {
          const pct = shares[i] * 100;
          const gsm = Number(layer.gsm) || 0;
          return (
            <li key={String(layer.id)} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: layerTypeColor(layer.type) }}
                aria-hidden
              />
              <span className="text-brand truncate flex-1" title={layerLabel(layer, i)}>
                {layerLabel(layer, i)}
              </span>
              <span className="font-mono font-semibold text-brand tabular-nums shrink-0">
                {pct.toFixed(pct >= 10 ? 0 : 1)}%
              </span>
              {gsm > 0 && (
                <span className="font-mono text-text-secondary tabular-nums shrink-0 w-12 text-right">
                  {gsm.toFixed(1)} gsm
                </span>
              )}
            </li>
          );
        })}
      </ul>
    ) : null;

  if (orientation === 'horizontal') {
    const available = width - pad * 2 - gap * Math.max(0, layers.length - 1);
    let x = pad;
    const barHeight = height - pad * 2;
    const segments = layers.map((layer, i) => {
      const w = Math.max(1, Math.round((thicknesses[i] / totalThickness) * available));
      const seg = { layer, x, w, i };
      x += w + gap;
      return seg;
    });

    const fontSize = Math.max(10, Math.min(14, Math.round(height / 3)));

    return (
      <div className={className}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Layer stack"
        >
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={6}
            style={{ fill: 'rgb(var(--color-surface-base))', stroke: 'rgb(var(--color-border))' }}
          />
          {segments.map(({ layer, x, w, i }) => (
            <g key={String(layer.id)}>
              <rect
                x={x}
                y={pad}
                width={w}
                height={barHeight}
                rx={3}
                fill={resolvedLabelMode === 'number' ? SEQUENCE_CHIP_FILL : layerTypeColor(layer.type)}
                stroke={resolvedLabelMode === 'number' ? layerTypeColor(layer.type) : undefined}
                strokeWidth={resolvedLabelMode === 'number' ? SEQUENCE_CHIP_STROKE_WIDTH : undefined}
                opacity={layer.type === 'ink' && resolvedLabelMode !== 'number' ? 0.92 : 1}
              />
              {resolvedLabelMode === 'composition' && w >= 22 && (
                <text
                  x={x + w / 2}
                  y={pad + barHeight / 2}
                  fill="#FFFFFF"
                  fontSize={Math.max(8, fontSize - 1)}
                  fontWeight={700}
                  fontFamily="Inter, Arial, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {(shares[i] * 100).toFixed(shares[i] >= 0.1 ? 0 : 1)}%
                </text>
              )}
              {resolvedLabelMode === 'number' && (
                <text
                  x={x + w / 2}
                  y={pad + barHeight / 2}
                  fill="#FFFFFF"
                  fontSize={fontSize}
                  fontWeight={600}
                  fontFamily="Inter, Arial, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {i + 1}
                </text>
              )}
              {resolvedLabelMode === 'material' && w >= 28 && (
                <text
                  x={x + w / 2}
                  y={pad + barHeight / 2}
                  fill="#FFFFFF"
                  fontSize={Math.max(8, fontSize - 2)}
                  fontFamily="Inter, Arial, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {layerLabel(layer, i).slice(0, Math.max(4, Math.floor(w / 8)))}
                </text>
              )}
            </g>
          ))}
        </svg>
        {legend}
      </div>
    );
  }

  const available = height - pad * 2 - gap * Math.max(0, layers.length - 1);
  let y = pad;
  const barWidth = width - pad * 2;
  const segments = layers.map((layer, i) => {
    const h = Math.max(1, Math.round((thicknesses[i] / totalThickness) * available));
    const seg = { layer, y, h, i };
    y += h + gap;
    return seg;
  });

  const fontSize = Math.max(10, Math.min(14, Math.round(width / 5)));

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Layer stack cross-section"
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={6}
          style={{ fill: 'rgb(var(--color-surface-base))', stroke: 'rgb(var(--color-border))' }}
        />
        {segments.map(({ layer, y, h, i }) => {
          const pct = shares[i] * 100;
          const pctLabel = pct >= 10 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
          return (
            <g key={String(layer.id)}>
              <rect
                x={pad}
                y={y}
                width={barWidth}
                height={h}
                rx={3}
                fill={resolvedLabelMode === 'number' ? SEQUENCE_CHIP_FILL : layerTypeColor(layer.type)}
                stroke={resolvedLabelMode === 'number' ? layerTypeColor(layer.type) : undefined}
                strokeWidth={resolvedLabelMode === 'number' ? SEQUENCE_CHIP_STROKE_WIDTH : undefined}
                opacity={layer.type === 'ink' && resolvedLabelMode !== 'number' ? 0.92 : 1}
              />
              {resolvedLabelMode === 'composition' && h >= 16 && (
                <>
                  {h >= 26 && (
                    <text
                      x={pad + 6}
                      y={y + h / 2 - (h >= 36 ? 6 : 0)}
                      fill="#FFFFFF"
                      fontSize={Math.max(8, fontSize - 2)}
                      fontWeight={500}
                      fontFamily="Inter, Arial, sans-serif"
                      dominantBaseline="middle"
                    >
                      {layerLabel(layer, i).slice(0, Math.max(8, Math.floor(barWidth / 9)))}
                    </text>
                  )}
                  <text
                    x={pad + barWidth - 6}
                    y={y + h / 2 + (h >= 36 ? 6 : 0)}
                    fill="#FFFFFF"
                    fontSize={Math.max(9, fontSize - 1)}
                    fontWeight={700}
                    fontFamily="Inter, Arial, sans-serif"
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {pctLabel}
                  </text>
                </>
              )}
              {resolvedLabelMode === 'number' && (
                <text
                  x={pad + barWidth / 2}
                  y={y + h / 2}
                  fill="#FFFFFF"
                  fontSize={fontSize}
                  fontWeight={600}
                  fontFamily="Inter, Arial, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {i + 1}
                </text>
              )}
              {resolvedLabelMode === 'material' && h >= 14 && (
                <text
                  x={pad + 4}
                  y={y + h / 2}
                  fill="#FFFFFF"
                  fontSize={Math.max(8, fontSize - 1)}
                  fontFamily="Inter, Arial, sans-serif"
                  dominantBaseline="middle"
                >
                  {layerLabel(layer, i).slice(0, Math.max(6, Math.floor(barWidth / 10)))}
                  {layer.micron ? ` · ${layer.micron}µ` : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {legend}
    </div>
  );
}
