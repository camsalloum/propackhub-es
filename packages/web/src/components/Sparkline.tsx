// Feature: es-ui-revamp (Phase 1.5) — token-themed sparkline.
//
// `Sparkline` renders a 1D series as a tiny inline area/line chart, themed via
// CSS variables so it picks up the active theme automatically. Built on
// Recharts (already added as a dep). No tooltips, no axes — purely visual.
//
// Renders a flat divider when the series is empty / single-point, keeping the
// surrounding card layout stable.

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
} from 'recharts';

export type SparklineTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SparklineProps {
  /** Numeric series. First element renders leftmost. */
  data: number[];
  /** Visual variant: filled area (default) or line only. */
  variant?: 'area' | 'line';
  /** Tone selects a token-backed stroke + fill color. */
  tone?: SparklineTone;
  /** Container height in px. Defaults to `40`. */
  height?: number;
  /** Container width — defaults to 100% of the parent. */
  width?: number | string;
  /** Stroke width in px. Defaults to `1.5`. */
  strokeWidth?: number;
  /** Optional className applied to the wrapping div. */
  className?: string;
}

/** Map a tone to the CSS variable it should resolve. */
function toneVar(tone: SparklineTone): string {
  switch (tone) {
    case 'success': return 'var(--color-success)';
    case 'warning': return 'var(--color-warning)';
    case 'danger':  return 'var(--color-danger)';
    case 'info':    return 'var(--color-info)';
    case 'neutral': return 'var(--neutral-9)';
    case 'accent':
    default:        return 'var(--color-accent)';
  }
}

export function Sparkline({
  data,
  variant = 'area',
  tone = 'accent',
  height = 40,
  width = '100%',
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div className={className} style={{ height, width }} aria-hidden="true" />
    );
  }

  const series = data.map((v, i) => ({ x: i, v: Number.isFinite(v) ? v : 0 }));
  const stroke = `rgb(${toneVar(tone)})`;
  const gradientId = `es-spark-${tone}-${variant}`;

  if (variant === 'line') {
    return (
      <div className={className} style={{ height, width }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={strokeWidth}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, width }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={stroke} stopOpacity={0.32} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Sparkline;
