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
  labelMode?: 'material' | 'number' | 'none';
  orientation?: 'vertical' | 'horizontal';
  className?: string;
};

export function layerTypeColor(type?: string): string {
  if (type === 'substrate') return '#1D5FA3';
  if (type === 'ink') return '#9B4CA0';
  if (type === 'adhesive') return '#2E8B6E';
  return '#6B7280';
}

function layerThickness(l: Layer): number {
  const micron = Number(l.micron || 0);
  if (micron > 0) return micron;
  const gsm = Number(l.gsm || 0);
  return gsm > 0 ? gsm : 1;
}

export default function LaminateVisualizer({
  layers,
  width = 220,
  height = 180,
  showLabels,
  labelMode,
  orientation = 'vertical',
  className,
}: Props) {
  const resolvedLabelMode =
    labelMode ?? (showLabels === false ? 'none' : showLabels === true ? 'material' : 'material');

  const thicknesses = layers.map(layerThickness);
  const total = Math.max(1, thicknesses.reduce((s, t) => s + t, 0));
  const gap = 2;
  const pad = 8;

  if (orientation === 'horizontal') {
    const available = width - pad * 2 - gap * Math.max(0, layers.length - 1);
    let x = pad;
    const barHeight = height - pad * 2;
    const segments = layers.map((layer, i) => {
      const w = Math.max(1, Math.round((thicknesses[i] / total) * available));
      const seg = { layer, x, w, i };
      x += w + gap;
      return seg;
    });

    const fontSize = Math.max(10, Math.min(14, Math.round(height / 3)));

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        role="img"
        aria-label="Layer stack"
      >
        <rect x={0} y={0} width={width} height={height} rx={6} fill="#F8FAFC" stroke="#E6E9EE" />
        {segments.map(({ layer, x, w, i }) => (
          <g key={String(layer.id)}>
            <rect
              x={x}
              y={pad}
              width={w}
              height={barHeight}
              rx={3}
              fill={layerTypeColor(layer.type)}
              opacity={layer.type === 'ink' ? 0.9 : 1}
            />
            {resolvedLabelMode === 'number' && (
              <text
                x={x + w / 2}
                y={pad + barHeight / 2}
                fill="#ffffff"
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
                fill="#ffffff"
                fontSize={Math.max(8, fontSize - 2)}
                fontFamily="Inter, Arial, sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {(layer.material || layer.type || `Layer ${i + 1}`).slice(0, Math.max(4, Math.floor(w / 8)))}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  }

  const available = height - pad * 2 - gap * Math.max(0, layers.length - 1);
  let y = pad;
  const barWidth = width - pad * 2;
  const segments = layers.map((layer, i) => {
    const h = Math.max(1, Math.round((thicknesses[i] / total) * available));
    const seg = { layer, y, h, i };
    y += h + gap;
    return seg;
  });

  const fontSize = Math.max(10, Math.min(14, Math.round(width / 5)));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Layer stack"
    >
      <rect x={0} y={0} width={width} height={height} rx={6} fill="#F8FAFC" stroke="#E6E9EE" />
      {segments.map(({ layer, y, h, i }) => (
        <g key={String(layer.id)}>
          <rect
            x={pad}
            y={y}
            width={barWidth}
            height={h}
            rx={3}
            fill={layerTypeColor(layer.type)}
            opacity={layer.type === 'ink' ? 0.9 : 1}
          />
          {resolvedLabelMode === 'number' && (
            <text
              x={pad + barWidth / 2}
              y={y + h / 2}
              fill="#ffffff"
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
              fill="#ffffff"
              fontSize={Math.max(8, fontSize - 1)}
              fontFamily="Inter, Arial, sans-serif"
              dominantBaseline="middle"
            >
              {(layer.material || layer.type || `Layer ${i + 1}`).slice(0, Math.max(6, Math.floor(barWidth / 10)))}
              {layer.micron ? ` · ${layer.micron}µ` : ''}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
