import { useRef, useState, useEffect } from 'react';

export const W = {
  fill: '#ddeeff',
  fold: '#c8dcf0',
  gusset: '#b8cfe8',
  stroke: '#2a6090',
  dimLine: '#3d4a60',
  dimText: '#1c2333',
  dimFs: 11,
  arrow: 6,
  dimOff: 28,
  sw: 1.4,
};

export function dimLbl(id: string, mm: number) {
  return `${id}=${Math.round(mm)}mm`;
}

export function mkT(Wmm: number, Hmm: number, vw: number, vh: number) {
  const m = 0.18;
  const s = Math.min((vw * (1 - m * 2)) / Math.max(Wmm, 1), (vh * (1 - m * 2)) / Math.max(Hmm, 1));
  const ox = (vw - Wmm * s) / 2;
  const oy = (vh - Hmm * s) / 2;
  return {
    s,
    ox,
    oy,
    px: (x: number) => ox + x * s,
    py: (y: number) => oy + y * s,
    sc: (v: number) => v * s,
  };
}

export function DimH({
  x1,
  x2,
  yB,
  off,
  lbl,
  above = true,
}: {
  x1: number;
  x2: number;
  yB: number;
  off: number;
  lbl: string;
  above?: boolean;
}) {
  const yD = yB + (above ? -off : off);
  const a = W.arrow;
  const eS = yB + (above ? -4 : 4);
  const eE = yD + (above ? -6 : 6);
  const mx = (x1 + x2) / 2;
  return (
    <g opacity={0.92}>
      <line x1={x1} y1={eS} x2={x1} y2={eE} stroke={W.dimLine} strokeWidth={0.8} />
      <line x1={x2} y1={eS} x2={x2} y2={eE} stroke={W.dimLine} strokeWidth={0.8} />
      <line x1={x1} y1={yD} x2={x2} y2={yD} stroke={W.dimLine} strokeWidth={0.8} />
      <polygon points={`${x1},${yD} ${x1 + a},${yD - a / 2} ${x1 + a},${yD + a / 2}`} fill={W.dimLine} />
      <polygon points={`${x2},${yD} ${x2 - a},${yD - a / 2} ${x2 - a},${yD + a / 2}`} fill={W.dimLine} />
      <text
        x={mx}
        y={yD + (above ? -5 : 14)}
        textAnchor="middle"
        fontFamily="Segoe UI, system-ui, sans-serif"
        fontSize={W.dimFs}
        fontWeight={700}
        fill={W.dimText}
      >
        {lbl}
      </text>
    </g>
  );
}

export function DimV({
  y1,
  y2,
  xB,
  off,
  lbl,
  left = true,
}: {
  y1: number;
  y2: number;
  xB: number;
  off: number;
  lbl: string;
  left?: boolean;
}) {
  const xD = xB + (left ? -off : off);
  const a = W.arrow;
  const eS = xB + (left ? -4 : 4);
  const eE = xD + (left ? -6 : 6);
  const my = (y1 + y2) / 2;
  const lx = xD + (left ? -6 : 6);
  return (
    <g opacity={0.92}>
      <line x1={eS} y1={y1} x2={eE} y2={y1} stroke={W.dimLine} strokeWidth={0.8} />
      <line x1={eS} y1={y2} x2={eE} y2={y2} stroke={W.dimLine} strokeWidth={0.8} />
      <line x1={xD} y1={y1} x2={xD} y2={y2} stroke={W.dimLine} strokeWidth={0.8} />
      <polygon points={`${xD},${y1} ${xD - a / 2},${y1 + a} ${xD + a / 2},${y1 + a}`} fill={W.dimLine} />
      <polygon points={`${xD},${y2} ${xD - a / 2},${y2 - a} ${xD + a / 2},${y2 - a}`} fill={W.dimLine} />
      <text
        x={lx}
        y={my}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Segoe UI, system-ui, sans-serif"
        fontSize={W.dimFs}
        fontWeight={700}
        fill={W.dimText}
        transform={`rotate(-90, ${lx}, ${my})`}
      >
        {lbl}
      </text>
    </g>
  );
}

export function Grid({ w, h, id = 'web-bg-grid' }: { w: number; h: number; id?: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width={w} height={h} fill={`url(#${id})`} />
    </>
  );
}

export function useDrawAreaSize(minW = 280, minH = 280) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 480, h: 340 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(r.width, minW), h: Math.max(r.height, minH) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minW, minH]);
  return { ref, ...size };
}
