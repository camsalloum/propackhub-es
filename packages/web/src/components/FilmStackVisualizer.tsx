import { useMemo, type CSSProperties } from 'react';

export type FilmLayer = {
  id: string | number;
  type?: string;
  material?: string;
  micron?: number;
  gsm?: number;
  family?: string | null;
};

type Props = {
  layers: FilmLayer[];
  className?: string;
};

const STACK_STYLES = `
  @keyframes film-stack-ink-flow {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes film-stack-sheen {
    0%, 100% { transform: translateX(-120%); opacity: 0; }
    45% { opacity: 0.55; }
    55% { opacity: 0.35; }
    100% { transform: translateX(120%); }
  }
  @keyframes film-stack-adhesive-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.08); }
  }
  @keyframes film-stack-row-in {
    from { opacity: 0; transform: translateX(-6px); }
    to { opacity: 1; transform: translateX(0); }
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

  .film-stack-metallized {
    background: linear-gradient(
      180deg,
      #E2E8F0 0%,
      #94A3B8 35%,
      #64748B 55%,
      #CBD5E1 75%,
      #F1F5F9 100%
    );
    animation: film-stack-adhesive-pulse 4s ease-in-out infinite;
  }
  .film-stack-metallized::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      transparent 25%,
      rgba(255, 255, 255, 0.75) 46%,
      rgba(255, 255, 255, 0.2) 54%,
      transparent 70%
    );
    animation: film-stack-sheen 3.5s ease-in-out infinite;
    pointer-events: none;
  }

  .film-stack-paper {
    background: linear-gradient(180deg, #FAF6EE 0%, #E8DFD0 45%, #C9B896 100%);
  }
  .film-stack-paper::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(0, 0, 0, 0.03) 3px,
      rgba(0, 0, 0, 0.03) 4px
    );
    pointer-events: none;
  }

  .film-stack-natural {
    background: linear-gradient(180deg, #F5F0E8 0%, #E8DFD0 50%, #C9BAA0 100%);
  }

  .film-stack-adhesive {
    background: linear-gradient(135deg, #fde68a 0%, #d97706 45%, #92400e 100%);
    animation: film-stack-adhesive-pulse 3.5s ease-in-out infinite;
  }
  .film-stack-adhesive::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 50%);
    pointer-events: none;
  }

  .film-stack-film {
    position: relative;
    overflow: hidden;
  }
  .film-stack-film::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      transparent 35%,
      rgba(255,255,255,0.5) 48%,
      rgba(255,255,255,0.15) 52%,
      transparent 65%
    );
    animation: film-stack-sheen 5s ease-in-out infinite;
    pointer-events: none;
  }

  .film-stack-row {
    animation: film-stack-row-in 0.4s ease-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    .film-stack-ink,
    .film-stack-adhesive,
    .film-stack-metallized,
    .film-stack-metallized::after,
    .film-stack-film::after,
    .film-stack-ink::after,
    .film-stack-row {
      animation: none !important;
    }
  }
`;

function materialKey(layer: FilmLayer): string {
  return (layer.material || '').toUpperCase();
}

function isMetallizedName(name: string): boolean {
  return /\d*ALU|AL\/|VMPET|VMOPP|METALL|METPET|METBOPP|FOIL|SILVER|ALUMIN/i.test(name);
}

function isPaperName(name: string): boolean {
  return /PAPER|KRAFT|C1S|C2S|MG\s*PAPER|GP\s*PAPER|BOARD/i.test(name);
}

function isWhiteName(name: string): boolean {
  return /WHITE|OPAQUE/i.test(name);
}

function isNaturalName(name: string): boolean {
  return /NATURAL/i.test(name) && !isWhiteName(name);
}

function inkVariant(name: string): 'white' | 'black' | 'rainbow' {
  if (isWhiteName(name)) return 'white';
  if (/BLACK/i.test(name)) return 'black';
  return 'rainbow';
}

function substrateBg(family?: string | null): string {
  const f = (family || '').toUpperCase();
  if (f.includes('PET')) return 'linear-gradient(180deg, #C5D4E3 0%, #9FB4C8 55%, #7A96AD 100%)';
  if (f.includes('BOPP') || f.includes('OPP')) return 'linear-gradient(180deg, #FAFCFE 0%, #E8EFF6 55%, #D2DDE8 100%)';
  if (f.includes('AL') || f.includes('MET') || f.includes('FOIL')) return 'linear-gradient(180deg, #E8EAED 0%, #B8BFC8 55%, #8A939E 100%)';
  if (f.includes('NY') || f.includes('PA')) return 'linear-gradient(180deg, #E0DDD6 0%, #C4BFB6 55%, #A8A39A 100%)';
  if (f.includes('EVOH')) return 'linear-gradient(180deg, #F5F0E8 0%, #E0D5C4 55%, #C9BAA5 100%)';
  return 'linear-gradient(180deg, #F8FAFC 0%, #E8EDF4 55%, #D1DAE6 100%)';
}

type LayerAppearance = { className: string; style?: CSSProperties };

function layerAppearance(layer: FilmLayer, inkIndex: number): LayerAppearance {
  const name = materialKey(layer);

  if (layer.type === 'ink') {
    const variant = inkVariant(name);
    if (variant === 'white') return { className: 'film-stack-ink-white' };
    if (variant === 'black') return { className: 'film-stack-ink-black' };
    return { className: `film-stack-ink film-stack-ink-${inkIndex % 5}` };
  }

  if (layer.type === 'adhesive') {
    return { className: 'film-stack-adhesive' };
  }

  if (isMetallizedName(name)) {
    return { className: 'film-stack-metallized' };
  }
  if (isPaperName(name)) {
    return { className: 'film-stack-paper' };
  }
  if (isWhiteName(name)) {
    return {
      className: 'film-stack-film',
      style: { background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 55%, #E2E8F0 100%)' },
    };
  }
  if (isNaturalName(name)) {
    return { className: 'film-stack-natural' };
  }

  return { className: 'film-stack-film', style: { background: substrateBg(layer.family) } };
}

function inkLabelClass(layer: FilmLayer): string {
  if (layer.type !== 'ink') return 'font-semibold';
  const variant = inkVariant(materialKey(layer));
  if (variant === 'white') return 'font-semibold text-text-secondary';
  if (variant === 'black') return 'font-semibold text-text-primary';
  // Rainbow ink: the gradient itself is intentional domain art (represents
  // multi-color CMYK printing), not a theme color — keep verbatim.
  return 'font-semibold bg-gradient-to-r from-rose-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent';
}

function inkPctClass(layer: FilmLayer): string {
  if (layer.type !== 'ink') return 'text-brand';
  const variant = inkVariant(materialKey(layer));
  if (variant === 'rainbow') return 'text-accent-text';
  return 'text-brand';
}

function layerThickness(l: FilmLayer): number {
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

/** One decimal place per layer; largest-remainder adjustment so displayed values sum to 100.0%. */
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

export default function FilmStackVisualizer({ layers, className }: Props) {
  const inkIndexById = useMemo(() => {
    const map = new Map<string | number, number>();
    let n = 0;
    for (const l of layers) {
      if (l.type === 'ink') map.set(l.id, n++);
    }
    return map;
  }, [layers]);

  const layerCount = layers.length;

  const { shares, pctLabels, totalMicron } = useMemo(() => {
    const gsmTotal = layers.reduce((s, l) => s + (Number(l.gsm) || 0), 0);
    const th = layers.map(layerThickness);
    const micronTotal = Math.max(1, th.reduce((a, b) => a + b, 0));
    const s = layers.map((l, i) => {
      const gsm = Number(l.gsm || 0);
      if (gsmTotal > 0 && gsm > 0) return gsm / gsmTotal;
      return th[i] / micronTotal;
    });
    return {
      shares: s,
      pctLabels: formatPercentLabels(s),
      totalMicron: micronTotal,
    };
  }, [layers]);

  const dense = layerCount > 5;

  if (layerCount === 0) {
    return (
      <div className={`flex h-full min-h-0 items-center justify-center bg-surface-raised ${className ?? ''}`}>
        <p className="text-sm text-text-secondary px-4 text-center">
          Add layers to preview build-up
          <span className="block text-xs mt-1">Up to 4 films · 3 adhesives · unlimited ink &amp; coating</span>
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{STACK_STYLES}</style>
      <div className={`flex h-full w-full min-h-0 flex-col bg-surface-raised ${className ?? ''}`}>
        <div className="shrink-0 px-3 pt-2 pb-1 flex justify-between text-[10px] text-text-secondary">
          <span>Edge · thickness</span>
          <span>{layerCount} layers · {totalMicron.toFixed(1)} µ</span>
        </div>

        <div className="flex flex-1 min-h-0 px-2 pb-2 gap-2">
          <div className="w-5 shrink-0 flex items-center justify-center">
            <span
              className="text-[9px] text-text-secondary font-mono whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {totalMicron.toFixed(1)} µ
            </span>
          </div>

          <div className="flex flex-col flex-1 min-h-0 min-w-0 border border-border/60 rounded-md overflow-y-auto shadow-sm">
            {layers.map((layer, i) => {
              const micron = Number(layer.micron || 0);
              const gsm = Number(layer.gsm || 0);
              const inkIdx = inkIndexById.get(layer.id) ?? 0;
              const pctStr = pctLabels[i];
              const appearance = layerAppearance(layer, inkIdx);

              return (
                <div
                  key={String(layer.id)}
                  className="film-stack-row flex items-stretch border-b border-border/50 last:border-b-0 transition-[flex-grow] duration-500 ease-out"
                  style={{
                    // Grow proportionally to share, but never shrink below the
                    // label's natural height (flex-shrink:0 + basis:auto) so thin
                    // layers (e.g. 3% ink) can't collapse and overlap the next row.
                    // The container scrolls (overflow-y-auto) if the stack is taller
                    // than the panel. This keeps the cross-section accurate for thick
                    // layers while guaranteeing legible, non-overlapping labels at any
                    // zoom or screen size.
                    flexGrow: shares[i],
                    flexShrink: 0,
                    flexBasis: 'auto',
                    animationDelay: `${i * 0.05}s`,
                  }}
                  title={layerLabel(layer, i)}
                >
                  <div
                    className={`w-16 sm:w-[4.5rem] shrink-0 border-r border-border/40 relative overflow-hidden ${appearance.className}`}
                    style={appearance.style}
                    aria-hidden
                  />

                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2 px-2 py-1 bg-surface-raised">
                    <p className={`leading-tight text-brand min-w-0 ${dense ? 'text-[10px]' : 'text-xs'}`}>
                      <span className="text-text-secondary font-medium">{i + 1}.</span>{' '}
                      <span className={inkLabelClass(layer)}>
                        {layerLabel(layer, i)}
                      </span>
                      <span className="text-text-secondary font-normal">
                        {' '}· {typeLabel(layer.type)}
                        {micron > 0 ? ` · ${micron}µ` : ''}
                        {gsm > 0 ? ` · ${gsm.toFixed(1)} gsm` : ''}
                      </span>
                    </p>
                    <span
                      className={`shrink-0 font-mono font-bold tabular-nums leading-tight ${
                        dense ? 'text-[10px]' : 'text-xs'
                      } ${inkPctClass(layer)}`}
                    >
                      {pctStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
