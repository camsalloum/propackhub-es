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
  showLabels?: boolean;
};

const colorForType = (type?: string) => {
  if (type === 'substrate') return '#1D5FA3';
  if (type === 'ink') return '#9B4CA0';
  if (type === 'adhesive') return '#2E8B6E';
  return '#6B7280';
};

export default function LaminateVisualizer({ layers, width = 220, height = 180, showLabels = true }: Props) {
  // Compute a thickness metric for each layer. Prefer micron; fallback to gsm.
  const thicknesses = layers.map((l) => {
    const micron = Number(l.micron || 0);
    if (micron > 0) return micron;
    const gsm = Number(l.gsm || 0);
    // approximate micron from gsm using density ~1 (safe fallback)
    return gsm > 0 ? gsm : 1;
  });

  const total = Math.max(1, thicknesses.reduce((s, t) => s + t, 0));

  // Vertical stacking: compute heights
  const gap = 2;
  const available = height - gap * (layers.length - 1);
  const rects = layers.map((l, i) => {
    const h = Math.max(6, Math.round((thicknesses[i] / total) * available));
    return { layer: l, h };
  });

  // Compute y positions (top to bottom)
  let y = 0;
  const positioned = rects.map((r) => {
    const pos = { ...r, y };
    y += r.h + gap;
    return pos;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Laminate stack visualizer">
      <rect x={0} y={0} width={width} height={height} rx={6} fill="#F8FAFC" stroke="#E6E9EE" />
      {positioned.map((p, idx) => (
        <g key={String(p.layer.id)}>
          <rect
            x={8}
            y={p.y + 8}
            width={width - 16}
            height={p.h}
            rx={4}
            fill={colorForType(p.layer.type)}
            opacity={p.layer.type === 'ink' ? 0.85 : 1}
          />
          {showLabels && (
            <text x={12} y={p.y + 8 + Math.max(12, Math.round(p.h / 2))} fill="#ffffff" fontSize={11} fontFamily="Inter, Arial, sans-serif">
              {p.layer.material || p.layer.type || `Layer ${idx + 1}`} • {p.layer.micron ? `${p.layer.micron}µ` : `${p.layer.gsm || '-'} GSM`}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
