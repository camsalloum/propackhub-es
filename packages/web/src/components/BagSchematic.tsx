import { useEffect, useMemo, useRef, useState } from 'react';
import type { BagConfiguratorType } from '../lib/bagConfiguratorCatalog';
import { bagDrawDimsFromFields, type BagDrawDims } from '../lib/bagDrawDims';

const C = {
  bagFill: '#ddeeff',
  bagFold: '#c8dcf0',
  bagGusset: '#b8cfe8',
  bagDark: '#a0c0e0',
  bagStroke: '#2a6090',
  sw: 1.4,
  foldDash: '5,3',
  gussetDash: '4,3',
  dimLine: '#3d4a60',
  dimText: '#1c2333',
  dimFs: 12,
  arrow: 6,
  dimOff: 30,
  dimStep: 32,
};

function mkT(W: number, H: number, vw: number, vh: number) {
  const m = 0.22;
  const s = Math.min((vw * (1 - m * 2)) / Math.max(W, 1), (vh * (1 - m * 2)) / Math.max(H, 1));
  const ox = (vw - W * s) / 2;
  const oy = (vh - H * s) / 2;
  return {
    s,
    ox,
    oy,
    px: (x: number) => ox + x * s,
    py: (y: number) => oy + y * s,
    sc: (v: number) => v * s,
  };
}

function DimH({
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
  const a = C.arrow;
  const eS = yB + (above ? -4 : 4);
  const eE = yD + (above ? -6 : 6);
  const mx = (x1 + x2) / 2;
  return (
    <g opacity={0.92}>
      <line x1={x1} y1={eS} x2={x1} y2={eE} stroke={C.dimLine} strokeWidth={0.8} />
      <line x1={x2} y1={eS} x2={x2} y2={eE} stroke={C.dimLine} strokeWidth={0.8} />
      <line x1={x1} y1={yD} x2={x2} y2={yD} stroke={C.dimLine} strokeWidth={0.8} />
      <polygon points={`${x1},${yD} ${x1 + a},${yD - a / 2} ${x1 + a},${yD + a / 2}`} fill={C.dimLine} />
      <polygon points={`${x2},${yD} ${x2 - a},${yD - a / 2} ${x2 - a},${yD + a / 2}`} fill={C.dimLine} />
      <text
        x={mx}
        y={yD + (above ? -5 : 14)}
        textAnchor="middle"
        fontFamily="Segoe UI, system-ui, sans-serif"
        fontSize={C.dimFs}
        fontWeight={700}
        fill={C.dimText}
      >
        {lbl}
      </text>
    </g>
  );
}

function DimV({
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
  const a = C.arrow;
  const eS = xB + (left ? -4 : 4);
  const eE = xD + (left ? -6 : 6);
  const my = (y1 + y2) / 2;
  const lx = xD + (left ? -6 : 6);
  return (
    <g opacity={0.92}>
      <line x1={eS} y1={y1} x2={eE} y2={y1} stroke={C.dimLine} strokeWidth={0.8} />
      <line x1={eS} y1={y2} x2={eE} y2={y2} stroke={C.dimLine} strokeWidth={0.8} />
      <line x1={xD} y1={y1} x2={xD} y2={y2} stroke={C.dimLine} strokeWidth={0.8} />
      <polygon points={`${xD},${y1} ${xD - a / 2},${y1 + a} ${xD + a / 2},${y1 + a}`} fill={C.dimLine} />
      <polygon points={`${xD},${y2} ${xD - a / 2},${y2 - a} ${xD + a / 2},${y2 - a}`} fill={C.dimLine} />
      <text
        x={lx}
        y={my}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Segoe UI, system-ui, sans-serif"
        fontSize={C.dimFs}
        fontWeight={700}
        fill={C.dimText}
        transform={`rotate(-90, ${lx}, ${my})`}
      >
        {lbl}
      </text>
    </g>
  );
}

function Grid({ w, h }: { w: number; h: number }) {
  return (
    <>
      <defs>
        <pattern id="bag-bg-grid" width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#bag-bg-grid)" />
    </>
  );
}

function DrawBottomGusset({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, G, F } = d;
  const t = mkT(W, H, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(0);
  const y1 = t.py(H);
  const yF = t.py(F);
  const yG = t.py(H - G / 2);
  const bW = x1 - x0;
  const gOff = Math.min(t.sc(G / 2) * 0.5, t.sc(W * 0.12));
  return (
    <>
      <g>
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={1} />
        {F > 0 && (
          <>
            <rect x={x0} y={y0} width={bW} height={yF - y0} fill={C.bagFold} stroke="none" />
            <line x1={x0} y1={yF} x2={x1} y2={yF} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
          </>
        )}
        {G > 0 && (
          <>
            <path
              d={`M${x0},${y1} L${x0 + gOff},${yG} L${x1 - gOff},${yG} L${x1},${y1}Z`}
              fill={C.bagGusset}
              stroke="none"
            />
            <line x1={x0} y1={y1} x2={x1} y2={yG} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
            <line x1={x0} y1={y1} x2={x0 + gOff} y2={yG} stroke={C.bagStroke} strokeWidth={C.sw} />
            <line x1={x1} y1={y1} x2={x1 - gOff} y2={yG} stroke={C.bagStroke} strokeWidth={C.sw} />
            <line
              x1={(x0 + x1) / 2}
              y1={y1}
              x2={(x0 + x1) / 2}
              y2={yG}
              stroke={C.bagStroke}
              strokeWidth={0.8}
              strokeDasharray="3,3"
            />
          </>
        )}
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill="none" stroke={C.bagStroke} strokeWidth={C.sw} rx={1} />
      </g>
      <DimH x1={x0} x2={x1} yB={y0} off={C.dimOff} lbl="W" />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl="H" />
      {G > 0 && <DimV y1={yG} y2={y1} xB={x1} off={C.dimOff} lbl="G" left={false} />}
      {F > 0 && <DimV y1={y0} y2={yF} xB={x0} off={C.dimOff + C.dimStep} lbl="F" />}
    </>
  );
}

function DrawSideGusset({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, F, SG } = d;
  const t = mkT(W, H, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(0);
  const y1 = t.py(H);
  const yF = t.py(F);
  const bW = x1 - x0;
  const sg = t.sc(SG);
  return (
    <>
      <g>
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={1} />
        {F > 0 && (
          <>
            <rect x={x0} y={y0} width={bW} height={yF - y0} fill={C.bagFold} />
            <line x1={x0} y1={yF} x2={x1} y2={yF} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
          </>
        )}
        <rect x={x0} y={y0} width={sg} height={y1 - y0} fill={C.bagGusset} opacity={0.5} />
        <rect x={x1 - sg} y={y0} width={sg} height={y1 - y0} fill={C.bagGusset} opacity={0.5} />
        <line x1={x0 + sg} y1={y0} x2={x0 + sg} y2={y1} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
        <line x1={x1 - sg} y1={y0} x2={x1 - sg} y2={y1} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill="none" stroke={C.bagStroke} strokeWidth={C.sw} rx={1} />
      </g>
      <DimH x1={x0} x2={x1} yB={y0} off={C.dimOff} lbl="W" />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl="H" />
      <DimH x1={x0} x2={x0 + sg} yB={y1} off={C.dimOff} lbl="SG" above={false} />
      {F > 0 && <DimV y1={y0} y2={yF} xB={x1} off={C.dimOff} lbl="TS" left={false} />}
    </>
  );
}

function DrawCourier({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, FL } = d;
  const flap = FL > 0 ? FL : Math.round(H * 0.18);
  const t = mkT(W, H + flap, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(0);
  const y1 = t.py(H + flap);
  const yFlap = t.py(flap);
  const bW = x1 - x0;
  const fp = `${x0},${yFlap} ${x0},${y0} ${x1},${y0} ${x1},${yFlap} ${(x0 + x1) / 2 + t.sc(W * 0.12)},${yFlap + t.sc(flap * 0.35)}`;
  const stripH = t.sc(flap * 0.15);
  return (
    <>
      <g>
        <rect x={x0} y={yFlap} width={bW} height={y1 - yFlap} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
        <polygon points={fp} fill={C.bagFold} stroke={C.bagStroke} strokeWidth={C.sw} />
        <rect
          x={x0 + 4}
          y={y0 + t.sc(flap * 0.65)}
          width={bW - 8}
          height={stripH}
          fill="#ffd580"
          stroke="#c49a00"
          strokeWidth={0.8}
          rx={2}
        />
        <line x1={x0} y1={yFlap} x2={x1} y2={yFlap} stroke={C.bagStroke} strokeWidth={1.5} />
      </g>
      <DimH x1={x0} x2={x1} yB={yFlap} off={C.dimOff} lbl="W" />
      <DimV y1={yFlap} y2={y1} xB={x0} off={C.dimOff} lbl="L" />
      <DimV y1={y0} y2={yFlap} xB={x1} off={C.dimOff} lbl="FL" left={false} />
    </>
  );
}

function DrawDiaper({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, G, F } = d;
  const t = mkT(W, H, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(0);
  const y1 = t.py(H);
  const bW = x1 - x0;
  const yF = t.py(F);
  const yG = G > 0 ? t.py(H - G / 2) : y1;
  const gOff = G > 0 ? Math.min(t.sc(G / 2) * 0.5, t.sc(W * 0.12)) : 0;
  return (
    <>
      <g>
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
        {F > 0 && (
          <>
            <rect x={x0} y={y0} width={bW} height={yF - y0} fill={C.bagFold} />
            {Array.from({ length: 12 }, (_, i) => {
              const tx = x0 + (bW / 13) * (i + 0.5);
              return (
                <rect
                  key={i}
                  x={tx - 2}
                  y={y0 + 3}
                  width={4}
                  height={yF - y0 - 6}
                  fill="#9ec8f0"
                  stroke="#5a90c0"
                  strokeWidth={0.5}
                  rx={1}
                />
              );
            })}
            <line x1={x0} y1={yF} x2={x1} y2={yF} stroke={C.bagStroke} strokeWidth={1.5} />
          </>
        )}
        {G > 0 && (
          <>
            <path d={`M${x0},${y1} L${x0 + gOff},${yG} L${x1 - gOff},${yG} L${x1},${y1}Z`} fill={C.bagGusset} />
            <line x1={x0} y1={y1} x2={x1} y2={yG} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
            <line x1={x0} y1={y1} x2={x0 + gOff} y2={yG} stroke={C.bagStroke} strokeWidth={C.sw} />
            <line x1={x1} y1={y1} x2={x1 - gOff} y2={yG} stroke={C.bagStroke} strokeWidth={C.sw} />
          </>
        )}
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill="none" stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
      </g>
      <DimH x1={x0} x2={x1} yB={y0} off={C.dimOff} lbl="W" />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl="H" />
      {G > 0 && <DimV y1={yG} y2={y1} xB={x1} off={C.dimOff} lbl="G" left={false} />}
      {F > 0 && <DimV y1={y0} y2={yF} xB={x0} off={C.dimOff + C.dimStep} lbl="F" />}
    </>
  );
}

function DrawIndustrial({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, SG } = d;
  const totalW = W + SG * 2;
  const t = mkT(totalW, H, vw, vh);
  const dW = t.sc(W);
  const dSG = t.sc(SG);
  const x = t.px(SG);
  const x0 = x;
  const x1 = x + dW;
  const y0 = t.py(0);
  const y1 = t.py(H);
  const bodyW = x1 - x0;
  return (
    <>
      <g>
        <rect x={x0} y={y0} width={bodyW} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={2} />
        {dSG > 0 && (
          <>
            <rect x={t.px(0)} y={y0} width={dSG} height={y1 - y0} fill={C.bagGusset} opacity={0.55} />
            <rect x={x1} y={y0} width={dSG} height={y1 - y0} fill={C.bagGusset} opacity={0.55} />
            <line x1={x0} y1={y0} x2={x0} y2={y1} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
            <line x1={x1} y1={y0} x2={x1} y2={y1} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.gussetDash} />
          </>
        )}
        <rect
          x={x0 + bodyW * 0.35}
          y={y0 - t.sc(H * 0.04)}
          width={bodyW * 0.3}
          height={t.sc(H * 0.04)}
          fill="#d4e8f8"
          stroke={C.bagStroke}
          strokeWidth={1}
          rx={2}
        />
        <rect x={x0} y={y0} width={bodyW} height={y1 - y0} fill="none" stroke={C.bagStroke} strokeWidth={2} />
      </g>
      <DimH x1={x0} x2={x1} yB={y0} off={C.dimOff} lbl="W" />
      <DimV y1={y0} y2={y1} xB={t.px(0)} off={C.dimOff} lbl="L" />
      {dSG > 0 && <DimH x1={t.px(0)} x2={x0} yB={y0} off={C.dimOff} lbl="SG" above={false} />}
    </>
  );
}

function DrawLoop({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, F, HL } = d;
  const totalH = H + HL;
  const t = mkT(W, totalH, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(HL);
  const y1 = t.py(totalH);
  const yF = t.py(HL + F);
  const bW = x1 - x0;
  const hLoop = t.sc(HL);
  const lw = t.sc(W * 0.18);
  const lx1 = x0 + t.sc(W * 0.15);
  const lx2 = lx1 + lw;
  const rx1 = x1 - t.sc(W * 0.15) - lw;
  const rx2 = rx1 + lw;
  const loopPath = (a: number, b: number) =>
    `M${a},${y0} C${a},${y0 - hLoop} ${b},${y0 - hLoop} ${b},${y0}`;
  return (
    <>
      <g>
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
        {F > 0 && (
          <>
            <rect x={x0} y={y0} width={bW} height={yF - y0} fill={C.bagFold} />
            <line x1={x0} y1={yF} x2={x1} y2={yF} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
          </>
        )}
        <path d={loopPath(lx1, lx2)} fill="none" stroke={C.bagStroke} strokeWidth={5} strokeLinecap="round" />
        <path d={loopPath(lx1, lx2)} fill="none" stroke={C.bagFill} strokeWidth={3} strokeLinecap="round" />
        <path d={loopPath(rx1, rx2)} fill="none" stroke={C.bagStroke} strokeWidth={5} strokeLinecap="round" />
        <path d={loopPath(rx1, rx2)} fill="none" stroke={C.bagFill} strokeWidth={3} strokeLinecap="round" />
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill="none" stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
      </g>
      <DimH x1={x0} x2={x1} yB={y0} off={C.dimOff} lbl="W" />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl="H" />
      <DimV y1={t.py(0)} y2={y0} xB={x1} off={C.dimOff} lbl="HL" left={false} />
    </>
  );
}

function DrawPatch({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, F } = d;
  const t = mkT(W, H, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(0);
  const y1 = t.py(H);
  const yF = t.py(F);
  const bW = x1 - x0;
  const pw = t.sc(W * 0.28);
  const ph = t.sc(H * 0.08);
  const px0 = x0 + bW * 0.5 - pw * 0.5;
  const holeW = pw * 0.6;
  const holeH = ph * 0.5;
  return (
    <>
      <g>
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
        {F > 0 && (
          <>
            <rect x={x0} y={y0} width={bW} height={yF - y0} fill={C.bagFold} />
            <line x1={x0} y1={yF} x2={x1} y2={yF} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
          </>
        )}
        <rect x={px0} y={y0 + 4} width={pw} height={ph} fill={C.bagDark} stroke={C.bagStroke} strokeWidth={1} rx={3} />
        <rect
          x={px0 + pw * 0.2}
          y={y0 + 4 + ph * 0.25}
          width={holeW}
          height={holeH}
          fill="#f8f9fb"
          stroke={C.bagStroke}
          strokeWidth={0.8}
          rx={Math.min(holeW, holeH) * 0.4}
        />
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill="none" stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
      </g>
      <DimH x1={x0} x2={x1} yB={y0} off={C.dimOff} lbl="W" />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl="H" />
    </>
  );
}

function DrawPunch({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, F } = d;
  const t = mkT(W, H, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(0);
  const y1 = t.py(H);
  const yF = t.py(F);
  const bW = x1 - x0;
  const r = Math.min(t.sc(W * 0.1), t.sc(H * 0.07));
  const cy = y0 + t.sc(H * 0.05);
  return (
    <>
      <g>
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
        {F > 0 && (
          <>
            <rect x={x0} y={y0} width={bW} height={yF - y0} fill={C.bagFold} />
            <line x1={x0} y1={yF} x2={x1} y2={yF} stroke={C.bagStroke} strokeWidth={1} strokeDasharray={C.foldDash} />
          </>
        )}
        {[x0 + bW * 0.3, x0 + bW * 0.7].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={cy} r={r} fill="#f8f9fb" stroke={C.bagStroke} strokeWidth={1.5} />
            <circle cx={cx} cy={cy} r={r * 0.3} fill={C.bagGusset} />
          </g>
        ))}
        <rect x={x0} y={y0} width={bW} height={y1 - y0} fill="none" stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
      </g>
      <DimH x1={x0} x2={x1} yB={y0} off={C.dimOff} lbl="W" />
      <DimV y1={y0} y2={y1} xB={x0} off={C.dimOff} lbl="H" />
    </>
  );
}

function DrawWicket({ d, vw, vh }: { d: BagDrawDims; vw: number; vh: number }) {
  const { W, H, LH } = d;
  const lip = LH > 0 ? LH : Math.round(H * 0.1);
  const t = mkT(W, H + lip, vw, vh);
  const x0 = t.px(0);
  const x1 = t.px(W);
  const y0 = t.py(0);
  const y1 = t.py(H + lip);
  const yLip = t.py(lip);
  const bW = x1 - x0;
  const wicketH = yLip - y0;
  const rodY = y0 + wicketH * 0.3;
  return (
    <>
      <g>
        <rect x={x0} y={yLip} width={bW} height={y1 - yLip} fill={C.bagFill} stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
        <rect x={x0} y={y0} width={bW} height={wicketH} fill={C.bagDark} opacity={0.6} />
        <line x1={x0 + 8} y1={rodY} x2={x1 - 8} y2={rodY} stroke="#4a5568" strokeWidth={2} strokeLinecap="round" />
        <circle cx={x0 + 14} cy={rodY} r={5} fill="#c0c8d0" stroke="#6a7588" strokeWidth={1} />
        <circle cx={x1 - 14} cy={rodY} r={5} fill="#c0c8d0" stroke="#6a7588" strokeWidth={1} />
        <rect x={x0} y={yLip} width={bW} height={y1 - yLip} fill="none" stroke={C.bagStroke} strokeWidth={C.sw} rx={2} />
      </g>
      <DimH x1={x0} x2={x1} yB={yLip} off={C.dimOff} lbl="W" />
      <DimV y1={yLip} y2={y1} xB={x0} off={C.dimOff} lbl="H" />
      <DimV y1={y0} y2={yLip} xB={x1} off={C.dimOff} lbl="LH" left={false} />
    </>
  );
}

const DRAWERS: Record<BagConfiguratorType, React.FC<{ d: BagDrawDims; vw: number; vh: number }>> = {
  'bottom-gusset': DrawBottomGusset,
  'side-gusset': DrawSideGusset,
  courier: DrawCourier,
  diaper: DrawDiaper,
  industrial: DrawIndustrial,
  loop: DrawLoop,
  patch: DrawPatch,
  punch: DrawPunch,
  wicket: DrawWicket,
};

function useDrawAreaSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 360 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(r.width, 320), h: Math.max(r.height, 280) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

/** Live 2D bag preview — dimension labels only; values edited in the input row above. */
export function BagSchematic({ type, vals }: { type: BagConfiguratorType; vals: Record<string, number> }) {
  const { ref, w: vw, h: vh } = useDrawAreaSize();
  const d = useMemo(() => bagDrawDimsFromFields(vals), [vals]);
  const Drawer = DRAWERS[type];

  return (
    <div ref={ref} className="w-full h-full min-h-[360px] flex items-stretch">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="block w-full h-full"
        role="img"
        aria-label={`${type} bag schematic`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Grid w={vw} h={vh} />
        <Drawer d={d} vw={vw} vh={vh} />
      </svg>
    </div>
  );
}
