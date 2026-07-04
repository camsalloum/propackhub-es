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
  /* Color movement is ink-only (print layer). Films / adhesives stay static. */
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

  /* Films / adhesives: flat solid fills only (no gradients). */
  .film-stack-metallized {
    background: #94A3B8;
  }

  .film-stack-paper {
    background: #E8DFD0;
  }

  .film-stack-natural {
    background: #E8DFD0;
  }

  .film-stack-adhesive {
    background: #D97706;
  }

  .film-stack-film {
    position: relative;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .film-stack-ink,
    .film-stack-ink::after {
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
  if (f.includes('PET')) return '#9FB4C8';
  if (f.includes('BOPP') || f.includes('OPP')) return '#E8EFF6';
  if (f.includes('AL') || f.includes('MET') || f.includes('FOIL')) return '#B8BFC8';
  if (f.includes('NY') || f.includes('PA')) return '#C4BFB6';
  if (f.includes('EVOH')) return '#E0D5C4';
  if (f.includes('PE')) return '#D1DAE6';
  return '#E8EDF4';
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
      style: { background: '#F8FAFC' },
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

  const { thicknessShares, thicknessPctLabels, gsmPctLabels, totalMicron, totalGsm } = useMemo(() => {
    const th = layers.map(layerThickness);
    const micronTotal = Math.max(1, th.reduce((a, b) => a + b, 0));
    const gsmVals = layers.map((l) => Number(l.gsm) || 0);
    const gsmTotal = gsmVals.reduce((a, b) => a + b, 0);
    const thicknessShares = th.map((t) => t / micronTotal);
    // Fall back to thickness share when GSM is missing so both columns stay defined.
    const gsmShares =
      gsmTotal > 0
        ? gsmVals.map((g) => (g > 0 ? g / gsmTotal : 0))
        : thicknessShares;
    return {
      thicknessShares,
      thicknessPctLabels: formatPercentLabels(thicknessShares),
      gsmPctLabels: formatPercentLabels(gsmShares),
      totalMicron: micronTotal,
      totalGsm: gsmTotal,
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
          <span>
            {layerCount} layers · {totalMicron.toFixed(1)} µ
            {totalGsm > 0 ? ` · ${totalGsm.toFixed(1)} gsm` : ''}
          </span>
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

          <div className="flex flex-col flex-1 min-h-0 min-w-0 border border-border/60 rounded-md overflow-hidden shadow-sm">
            <div className="shrink-0 flex items-center border-b border-border/50 bg-surface-raised">
              <div className="w-16 sm:w-[4.5rem] shrink-0 border-r border-border/40" aria-hidden />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2 px-2 py-1">
                <span className="text-[10px] text-text-secondary" />
                <span className="shrink-0 flex items-center gap-0 font-mono text-[10px] font-medium text-text-secondary tabular-nums">
                  <span className="w-11 text-right">µ</span>
                  <span className="w-11 text-right">GSM</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
              {layers.map((layer, i) => {
                const micron = Number(layer.micron || 0);
                const gsm = Number(layer.gsm || 0);
                const inkIdx = inkIndexById.get(layer.id) ?? 0;
                const appearance = layerAppearance(layer, inkIdx);
                const pctClass = `w-11 text-right font-mono font-bold tabular-nums leading-tight ${
                  dense ? 'text-[10px]' : 'text-xs'
                }`;

                return (
                  <div
                    key={String(layer.id)}
                    className="film-stack-row flex items-stretch border-b border-border/50 last:border-b-0 transition-[flex-grow] duration-500 ease-out"
                    style={{
                      // Grow by thickness share (edge view). Never shrink below label height.
                      flexGrow: thicknessShares[i],
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
                      <span className="shrink-0 flex items-center gap-0">
                        <span className={`${pctClass} ${inkPctClass(layer)}`}>
                          {thicknessPctLabels[i]}
                        </span>
                        <span className={`${pctClass} text-text-secondary`}>
                          {gsmPctLabels[i]}
                        </span>
                      </span>
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
