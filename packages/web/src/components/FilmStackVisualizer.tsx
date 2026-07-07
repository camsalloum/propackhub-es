import { useMemo, type CSSProperties } from 'react';
import { formatMicronDisplay } from '../lib/formatMicron';
import {
  isWhiteMaterial,
  substrateFilmHex,
} from '../lib/substrateFilmColor';

export type FilmLayer = {
  id: string | number;
  type?: string;
  material?: string;
  micron?: number;
  /** Physical thickness (µ) — substrate µ; ink/adhesive dry gsm ÷ density. */
  physicalMicron?: number;
  gsm?: number;
  family?: string | null;
  /** Display-currency material cost/kg — only when visibility allows. */
  costPerKg?: number | null;
  /** Display-currency area cost/m² from engine. */
  costPerM2?: number | null;
};

type Props = {
  layers: FilmLayer[];
  className?: string;
  /** Engine total construction µ — matches structure table when set. */
  totalMicron?: number | null;
  /** Display currency code for Contrib. header (e.g. AED). */
  displayCurrency?: string;
  /** When false, hide Contrib. column entirely. */
  showContrib?: boolean;
};

const STACK_STYLES = `
  @keyframes film-stack-ink-flow {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes film-stack-ink-sparkle {
    0%, 100% { opacity: 0.25; }
    50% { opacity: 0.7; }
  }

  .film-stack-ink {
    background: linear-gradient(
      90deg,
      #ff3366 0%,
      #ff9933 14%,
      #ffee33 28%,
      #33ff77 42%,
      #33ccff 57%,
      #9966ff 71%,
      #ff66cc 85%,
      #ff3366 100%
    );
    background-size: 300% 100%;
    animation: film-stack-ink-flow 4.5s linear infinite;
  }
  .film-stack-ink-0 { animation-duration: 4s; }
  .film-stack-ink-1 { animation-duration: 5s; animation-delay: -1.2s; }
  .film-stack-ink-2 { animation-duration: 3.8s; animation-delay: -2s; }
  .film-stack-ink-3 { animation-duration: 5.5s; animation-delay: -0.6s; }
  .film-stack-ink-4 { animation-duration: 4.2s; animation-delay: -3s; }

  .film-stack-ink::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(255,255,255,0.55) 0%,
      rgba(255,255,255,0.08) 35%,
      transparent 55%,
      rgba(0,0,0,0.06) 100%
    );
    pointer-events: none;
  }
  .film-stack-ink::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9) 0%, transparent 45%);
    animation: film-stack-ink-sparkle 2.2s ease-in-out infinite;
    pointer-events: none;
  }

  .film-stack-ink-white {
    background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 45%, #E2E8F0 100%);
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  }

  .film-stack-ink-black {
    background: linear-gradient(180deg, #64748B 0%, #334155 50%, #0F172A 100%);
  }

  .film-stack-metallized { background: #94A3B8; }
  .film-stack-paper { background: #E8DFD0; }
  .film-stack-natural { background: #E8DFD0; }
  .film-stack-adhesive { background: #D97706; }
  .film-stack-film { position: relative; overflow: hidden; }

  @media (prefers-reduced-motion: reduce) {
    .film-stack-ink,
    .film-stack-ink::after {
      animation: none !important;
    }
  }

  .film-stack-metrics {
    display: grid;
    align-items: stretch;
  }
  .film-stack-metrics--pct {
    grid-template-columns: 3rem 3rem;
  }
  .film-stack-metrics--full {
    grid-template-columns: 3rem 3rem 3.5rem 3.5rem;
  }
  @media (min-width: 640px) {
    .film-stack-metrics--pct {
      grid-template-columns: 3.25rem 3.25rem;
    }
    .film-stack-metrics--full {
      grid-template-columns: 3.25rem 3.25rem 3.75rem 3.75rem;
    }
  }
  .film-stack-metrics__head-cell,
  .film-stack-metrics__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .film-stack-metrics__head-stacked {
    flex-direction: column;
    gap: 0;
    line-height: 1.1;
    padding: 0.25rem 0;
  }
`;

function materialKey(layer: FilmLayer): string {
  return (layer.material || '').toUpperCase();
}

function inkVariant(name: string): 'white' | 'black' | 'rainbow' {
  if (isWhiteMaterial(name)) return 'white';
  if (/BLACK/i.test(name)) return 'black';
  return 'rainbow';
}

type LayerAppearance = { className: string; style?: CSSProperties; darkText?: boolean };

function layerAppearance(layer: FilmLayer, inkIndex: number): LayerAppearance {
  const name = materialKey(layer);

  if (layer.type === 'ink') {
    const variant = inkVariant(name);
    if (variant === 'white') return { className: 'film-stack-ink-white', darkText: true };
    if (variant === 'black') return { className: 'film-stack-ink-black', darkText: false };
    return { className: `film-stack-ink film-stack-ink-${inkIndex % 5}`, darkText: false };
  }

  if (layer.type === 'adhesive') {
    return { className: 'film-stack-adhesive', darkText: false };
  }

  return {
    className: 'film-stack-film',
    style: { background: substrateFilmHex(layer.material || name, layer.family) },
    darkText: true,
  };
}

function inkLabelClass(layer: FilmLayer): string {
  if (layer.type !== 'ink') return 'font-semibold';
  const variant = inkVariant(materialKey(layer));
  if (variant === 'white') return 'font-semibold text-text-secondary';
  if (variant === 'black') return 'font-semibold text-text-primary';
  return 'font-semibold bg-gradient-to-r from-rose-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent';
}

function inkPctClass(layer: FilmLayer): string {
  if (layer.type !== 'ink') return 'text-brand';
  const variant = inkVariant(materialKey(layer));
  if (variant === 'rainbow') return 'text-accent-text';
  return 'text-brand';
}

function layerThickness(l: FilmLayer): number {
  if (l.physicalMicron != null && Number.isFinite(l.physicalMicron) && l.physicalMicron > 0) {
    return l.physicalMicron;
  }
  const micron = Number(l.micron || 0);
  if (micron > 0) return micron;
  const gsm = Number(l.gsm || 0);
  return gsm > 0 ? gsm : 1;
}

function layerLabel(layer: FilmLayer, i: number): string {
  return layer.material || layer.type || `Layer ${i + 1}`;
}

function typeLabel(type?: string): string {
  if (type === 'substrate') return 'Film';
  if (type === 'ink') return 'Ink';
  if (type === 'adhesive') return 'Adhesive';
  return type || 'Layer';
}

function formatPercentLabels(shares: number[]): string[] {
  if (shares.length === 0) return [];
  const SCALE = 10;
  const target = 100 * SCALE;
  const raw = shares.map((s) => s * target);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = target - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const adjusted = [...floors];
  for (let k = 0; k < remainder; k++) {
    adjusted[order[k % order.length].i]++;
  }
  return adjusted.map((t) => `${(t / SCALE).toFixed(1)}%`);
}

const IN_BAR_SHARE_MIN = 0.09;
/** Ink/adhesive are often thin µ but should still show labels inside the swatch. */
const THIN_LAYER_MIN_ROW_PX = 28;

function showInBarLabels(layer: FilmLayer, share: number): boolean {
  if (layer.type === 'ink' || layer.type === 'adhesive') return true;
  return share >= IN_BAR_SHARE_MIN;
}

export default function FilmStackVisualizer({
  layers,
  className,
  totalMicron: totalMicronProp,
  displayCurrency = 'USD',
  showContrib = false,
}: Props) {
  const inkIndexById = useMemo(() => {
    const map = new Map<string | number, number>();
    let n = 0;
    for (const l of layers) {
      if (l.type === 'ink') map.set(l.id, n++);
    }
    return map;
  }, [layers]);

  const layerCount = layers.length;

  const {
    thicknessShares,
    thicknessPctLabels,
    gsmPctLabels,
    totalMicron,
    totalGsm,
    contribKgValues,
    contribM2Values,
    contribKgTitles,
    contribM2Titles,
  } = useMemo(() => {
    const th = layers.map(layerThickness);
    const micronTotal = Math.max(1, th.reduce((a, b) => a + b, 0));
    const gsmVals = layers.map((l) => Number(l.gsm) || 0);
    const gsmTotal = gsmVals.reduce((a, b) => a + b, 0);
    const thicknessShares = th.map((t) => t / micronTotal);
    const gsmShares =
      gsmTotal > 0 ? gsmVals.map((g) => (g > 0 ? g / gsmTotal : 0)) : thicknessShares;

    const matCostPerKg = layers.reduce((sum, l) => {
      const c = Number(l.costPerKg);
      return sum + (Number.isFinite(c) ? c : 0);
    }, 0);

    const contribKgValues = layers.map((l) => {
      if (gsmTotal <= 0 || !showContrib) return null;
      const gsm = Number(l.gsm) || 0;
      const cost = Number(l.costPerKg);
      if (!Number.isFinite(cost)) return null;
      return (gsm / gsmTotal) * cost;
    });

    const contribM2Values = layers.map((l) => {
      if (!showContrib) return null;
      const c = Number(l.costPerM2);
      return Number.isFinite(c) && c > 0 ? c : null;
    });

    const contribKgTitles = layers.map((l, i) => {
      const v = contribKgValues[i];
      if (v == null || gsmTotal <= 0) return undefined;
      const gsm = Number(l.gsm) || 0;
      const cost = Number(l.costPerKg) || 0;
      return `${gsm.toFixed(1)}/${gsmTotal.toFixed(1)} GSM × ${cost.toFixed(2)} = ${v.toFixed(2)}`;
    });

    const contribM2Titles = contribM2Values.map((v) =>
      v == null ? undefined : `${displayCurrency}/m²: ${v.toFixed(4)}`
    );

    void matCostPerKg;

    return {
      thicknessShares,
      thicknessPctLabels: formatPercentLabels(thicknessShares),
      gsmPctLabels: formatPercentLabels(gsmShares),
      totalMicron:
        totalMicronProp != null && Number.isFinite(totalMicronProp) && totalMicronProp > 0
          ? totalMicronProp
          : micronTotal,
      totalGsm: gsmTotal,
      contribKgValues,
      contribM2Values,
      contribKgTitles,
      contribM2Titles,
    };
  }, [layers, showContrib, displayCurrency, totalMicronProp]);

  const dense = layerCount > 5;
  const metricsGridClass = showContrib
    ? 'film-stack-metrics film-stack-metrics--full shrink-0'
    : 'film-stack-metrics film-stack-metrics--pct shrink-0';

  if (layerCount === 0) {
    return (
      <div className={`flex h-full min-h-0 items-center justify-center bg-surface-raised ${className ?? ''}`}>
        <p className="text-sm text-text-secondary px-4 text-center">
          Add layers to preview build-up
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{STACK_STYLES}</style>
      <div className={`flex h-full w-full min-h-0 flex-col bg-surface-raised ${className ?? ''}`}>
        <div className="flex flex-1 min-h-0 px-2 py-2 gap-2">
          <div className="w-5 shrink-0 flex items-center justify-center">
            <span
              className="text-[10px] text-text-secondary font-mono whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {formatMicronDisplay(totalMicron)} µ
            </span>
          </div>

          <div className="flex flex-col flex-1 min-h-0 min-w-0 border border-border/60 rounded-md overflow-hidden shadow-sm">
            <div className="shrink-0 flex items-stretch border-b border-border/50 bg-surface-raised">
              <div className="w-[5.5rem] sm:w-24 shrink-0 border-r border-border/40" aria-hidden />
              <div className="flex-1 min-w-0 px-2 py-1.5 flex items-center text-[11px] text-text-secondary tabular-nums">
                {layerCount} layers · {formatMicronDisplay(totalMicron)} µ
                {totalGsm > 0 ? ` · ${totalGsm.toFixed(1)} gsm` : ''}
              </div>
              <div
                className={`${metricsGridClass} shrink-0 font-mono text-[10px] font-medium text-text-secondary tabular-nums`}
              >
                <span className="film-stack-metrics__head-cell film-stack-metrics__head-stacked border-r border-border/30 bg-surface-sunken/40">
                  <span>µ</span>
                  <span className="text-[9px] font-normal opacity-75">%</span>
                </span>
                <span className="film-stack-metrics__head-cell film-stack-metrics__head-stacked border-r border-border/30 bg-surface-sunken/40">
                  <span>GSM</span>
                  <span className="text-[9px] font-normal opacity-75">%</span>
                </span>
                {showContrib && (
                  <>
                    <span className="film-stack-metrics__head-cell film-stack-metrics__head-stacked border-r border-border/30 bg-success/5">
                      <span>{displayCurrency}/kg</span>
                    </span>
                    <span className="film-stack-metrics__head-cell film-stack-metrics__head-stacked bg-success/5">
                      <span>{displayCurrency}/m²</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
              {layers.map((layer, i) => {
                const displayMicron =
                  layer.physicalMicron != null && Number.isFinite(layer.physicalMicron) && layer.physicalMicron > 0
                    ? layer.physicalMicron
                    : Number(layer.micron || 0);
                const micron = displayMicron;
                const gsm = Number(layer.gsm || 0);
                const inkIdx = inkIndexById.get(layer.id) ?? 0;
                const appearance = layerAppearance(layer, inkIdx);
                const share = thicknessShares[i];
                const thinLayer = layer.type === 'ink' || layer.type === 'adhesive';
                const inBar = showInBarLabels(layer, share);
                const cellClass = `film-stack-metrics__cell font-mono font-semibold tabular-nums leading-tight ${
                  dense ? 'text-[11px]' : 'text-xs'
                }`;
                const contribKg = contribKgValues[i];
                const contribM2 = contribM2Values[i];

                return (
                  <div
                    key={String(layer.id)}
                    className="film-stack-row flex items-stretch border-b border-border/50 last:border-b-0 transition-[flex-grow] duration-500 ease-out"
                    style={{
                      flexGrow: share,
                      flexShrink: 0,
                      flexBasis: 'auto',
                      minHeight: thinLayer ? THIN_LAYER_MIN_ROW_PX : undefined,
                      animationDelay: `${i * 0.05}s`,
                    }}
                    title={layerLabel(layer, i)}
                  >
                    <div
                      className={`w-[5.5rem] sm:w-24 shrink-0 border-r border-border/40 relative overflow-hidden flex items-center justify-center ${appearance.className}`}
                      style={appearance.style}
                      aria-hidden
                    >
                      {inBar && (
                        <span
                          className={`relative z-10 text-center font-mono leading-none px-0.5 ${
                            appearance.darkText ? 'text-slate-800' : 'text-white'
                          } ${thinLayer && share < IN_BAR_SHARE_MIN ? 'text-[8px]' : dense ? 'text-[9px]' : 'text-[10px]'}`}
                        >
                          {micron > 0 && (
                            <span className="block font-semibold">{formatMicronDisplay(micron)}µ</span>
                          )}
                          {gsm > 0 && <span className="block opacity-90">{gsm.toFixed(1)}g</span>}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1 bg-surface-raised">
                      <p className={`leading-snug text-brand min-w-0 flex-1 ${dense ? 'text-[11px]' : 'text-[13px]'}`}>
                        <span className="text-text-secondary font-medium">{i + 1}.</span>{' '}
                        <span className={inkLabelClass(layer)}>{layerLabel(layer, i)}</span>
                        <span className="text-text-secondary font-normal">
                          {' '}
                          · {typeLabel(layer.type)}
                          {!inBar && micron > 0 ? ` · ${formatMicronDisplay(micron)}µ` : ''}
                          {!inBar && gsm > 0 ? ` · ${gsm.toFixed(1)} gsm` : ''}
                        </span>
                      </p>
                      <div className={metricsGridClass}>
                        <span className={`${cellClass} ${inkPctClass(layer)} border-r border-border/20`}>
                          {thicknessPctLabels[i]}
                        </span>
                        <span className={`${cellClass} text-text-secondary border-r border-border/20`}>
                          {gsmPctLabels[i]}
                        </span>
                        {showContrib && (
                          <>
                            <span
                              className={`${cellClass} text-brand border-r border-border/20`}
                              title={contribKgTitles[i]}
                            >
                              {contribKg == null ? '—' : contribKg.toFixed(2)}
                            </span>
                            <span className={`${cellClass} text-brand`} title={contribM2Titles[i]}>
                              {contribM2 == null ? '—' : contribM2.toFixed(4)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
