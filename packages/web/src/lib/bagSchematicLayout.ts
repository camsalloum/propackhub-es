/**
 * Shared layout math for bag schematics — SVG anchors for overlay inputs + drawing.
 */
import type { BagConfiguratorType } from './bagConfiguratorCatalog';

export const BAG_SVG_VW = 390;
export const BAG_SVG_VH = 360;
const PAD = { l: 55, r: 35, t: 18, b: 28 };

export function bagFitScale(W: number, H: number) {
  const aw = BAG_SVG_VW - PAD.l - PAD.r;
  const ah = BAG_SVG_VH - PAD.t - PAD.b;
  return Math.min(aw / Math.max(W, 1), ah / Math.max(H, 1), 1.2);
}

export function bagAnchor(dW: number, dH: number) {
  return {
    x: PAD.l + (BAG_SVG_VW - PAD.l - PAD.r - dW) / 2,
    y: PAD.t + (BAG_SVG_VH - PAD.t - PAD.b - dH) / 2,
  };
}

export type BagDimAnchor = { fieldId: string; x: number; y: number };

type V = Record<string, number>;

function dimAnchor(x1: number, y1: number, x2: number, y2: number, offset: number, horiz: boolean): BagDimAnchor {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ox = horiz ? 0 : offset;
  const oy = horiz ? offset : 0;
  return {
    fieldId: '',
    x: mx + ox,
    y: horiz ? my + oy + 14 : my + oy,
  };
}

export function computeBagDimAnchors(type: BagConfiguratorType, v: V): BagDimAnchor[] {
  switch (type) {
    case 'bottom-gusset':
      return anchorsBottomGusset(v);
    case 'side-gusset':
      return anchorsSideGusset(v);
    case 'courier':
      return anchorsCourier(v);
    case 'diaper':
      return anchorsDiaper(v);
    case 'industrial':
      return anchorsIndustrial(v);
    case 'loop':
      return anchorsLoop(v);
    case 'patch':
      return anchorsPatch(v);
    case 'punch':
      return anchorsPunch(v);
    case 'wicket':
      return anchorsWicket(v);
    default:
      return [];
  }
}

function anchorsBottomGusset(v: V): BagDimAnchor[] {
  const sc = bagFitScale(v.W, v.H + v.G);
  const dW = v.W * sc;
  const dH = v.H * sc;
  const dG = v.G * sc;
  const dF = v.F * sc;
  const { x, y } = bagAnchor(dW, dH + dG);
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, y + dH + dG + 14, x + dW, y + dH + dG + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y, x - 20, y + dH, -8, false), fieldId: 'H' },
  ];
  if (dG > 0) out.push({ ...dimAnchor(x + dW + 12, y + dH, x + dW + 12, y + dH + dG, 4, false), fieldId: 'G' });
  if (dF > 2) out.push({ ...dimAnchor(x + dW + 12, y, x + dW + 12, y + Math.min(dF, dH), 4, false), fieldId: 'F' });
  return out;
}

function anchorsSideGusset(v: V): BagDimAnchor[] {
  const dSG = Math.min(v.SG, v.W * 0.25);
  const sc = bagFitScale(v.W, v.H);
  const dW = v.W * sc;
  const dH = v.H * sc;
  const dg = dSG * sc;
  const dTS = Math.min(v.TS * sc, dH * 0.15);
  const { x, y } = bagAnchor(dW, dH);
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, y + dH + 14, x + dW, y + dH + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y, x - 20, y + dH, -8, false), fieldId: 'H' },
    { ...dimAnchor(x, y - 12, x + dg, y - 12, 0, true), fieldId: 'SG' },
  ];
  if (dTS > 2) out.push({ ...dimAnchor(x + dW + 12, y + dH - dTS, x + dW + 12, y + dH, 4, false), fieldId: 'TS' });
  return out;
}

function anchorsCourier(v: V): BagDimAnchor[] {
  const sc = bagFitScale(v.W, v.L);
  const dW = v.W * sc;
  const dL = v.L * sc;
  const dFL = Math.min(v.FL * sc, dL * 0.2);
  const dPOD = Math.min(v.POD * sc, dL * 0.15);
  const { x, y } = bagAnchor(dW, dL);
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, y + dL + 14, x + dW, y + dL + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y, x - 20, y + dL, -8, false), fieldId: 'L' },
    { ...dimAnchor(x + dW + 12, y, x + dW + 12, y + dFL, 4, false), fieldId: 'FL' },
  ];
  if (dPOD > 2) out.push({ ...dimAnchor(x + dW + 12, y + dFL + 8, x + dW + 12, y + dFL + 8 + dPOD, 4, false), fieldId: 'POD' });
  return out;
}

function anchorsDiaper(v: V): BagDimAnchor[] {
  const sc = bagFitScale(v.W, v.H + v.G);
  const dW = v.W * sc;
  const dH = v.H * sc;
  const dG = v.G * sc;
  const dNC = Math.min(v.NC * sc, dH * 0.12);
  const { x, y } = bagAnchor(dW, dH + dG);
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, y + dH + dG + 14, x + dW, y + dH + dG + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y, x - 20, y + dH, -8, false), fieldId: 'H' },
  ];
  if (dG > 0) out.push({ ...dimAnchor(x + dW + 12, y + dH, x + dW + 12, y + dH + dG, 4, false), fieldId: 'G' });
  if (dNC > 2) out.push({ ...dimAnchor(x - 20, y, x - 20, y + dNC, -22, false), fieldId: 'NC' });
  if (v.VH > 0) out.push({ fieldId: 'VH', x: x + dW * 0.75, y: y + dH * 0.15 });
  return out;
}

function anchorsIndustrial(v: V): BagDimAnchor[] {
  const sc = bagFitScale(v.W + v.SG * 2, v.L);
  const dW = v.W * sc;
  const dL = v.L * sc;
  const dSG = v.SG * sc;
  const { x, y } = bagAnchor(dW + dSG * 2, dL);
  const vw = v.VLV > 0 ? Math.min(v.VLV * sc, dSG * 0.8) : 0;
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x + dSG, y + dL + 14, x + dSG + dW, y + dL + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y, x - 20, y + dL, -8, false), fieldId: 'L' },
  ];
  if (dSG > 0) out.push({ ...dimAnchor(x, y - 12, x + dSG, y - 12, 0, true), fieldId: 'SG' });
  if (vw > 0) out.push({ ...dimAnchor(x + dSG + dW * 0.35, y - vw * 0.4 - 10, x + dSG + dW * 0.65, y - vw * 0.4 - 10, 0, true), fieldId: 'VLV' });
  return out;
}

function anchorsLoop(v: V): BagDimAnchor[] {
  const loopH = Math.min(v.HL * 0.5, v.H * 0.3);
  const sc = bagFitScale(v.W, v.H + v.G + loopH);
  const dW = v.W * sc;
  const dH = v.H * sc;
  const dG = v.G * sc;
  const dHL = v.HL * sc * 0.5;
  const dHW = Math.min(v.HW * sc, dW * 0.06 + 4);
  const { x, y } = bagAnchor(dW, dH + dG + dHL);
  const by = y + dHL;
  const loop1x = x + dW * 0.28;
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, by + dH + dG + 14, x + dW, by + dH + dG + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, by, x - 20, by + dH, -8, false), fieldId: 'H' },
    { ...dimAnchor(loop1x - dHW, by - dHL - 10, loop1x + dHW, by - dHL - 10, 0, true), fieldId: 'HW' },
    { ...dimAnchor(x + dW + 12, by - dHL, x + dW + 12, by, 4, false), fieldId: 'HL' },
  ];
  if (dG > 0) out.push({ ...dimAnchor(x + dW + 12, by + dH, x + dW + 12, by + dH + dG, 4, false), fieldId: 'G' });
  return out;
}

function anchorsPatch(v: V): BagDimAnchor[] {
  const sc = bagFitScale(v.W, v.H);
  const dW = v.W * sc;
  const dH = v.H * sc;
  const dG = v.G * sc;
  const { x, y } = bagAnchor(dW, dH);
  const pw = Math.min(v.PW * sc, dW * 0.7);
  const ph = Math.min(v.PH * sc, dH * 0.3);
  const px = x + (dW - pw) / 2;
  const py = y + dH * 0.05;
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, y + dH + 14, x + dW, y + dH + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y, x - 20, y + dH, -8, false), fieldId: 'H' },
    { ...dimAnchor(px, py - 10, px + pw, py - 10, 0, true), fieldId: 'PW' },
    { ...dimAnchor(x + dW + 12, py, x + dW + 12, py + ph, 4, false), fieldId: 'PH' },
    { fieldId: 'HD', x: px + pw / 2, y: py + ph / 2 },
  ];
  if (dG > 0) out.push({ ...dimAnchor(x, y - 12, x + dG, y - 12, 0, true), fieldId: 'G' });
  return out;
}

function anchorsPunch(v: V): BagDimAnchor[] {
  const sc = bagFitScale(v.W, v.H);
  const dW = v.W * sc;
  const dH = v.H * sc;
  const dG = v.G * sc;
  const { x, y } = bagAnchor(dW, dH);
  const sw = Math.min(v.SW * sc, dW * 0.65);
  const sh = Math.min(v.SH * sc, dH * 0.15);
  const pt = Math.min(v.PT * sc, dH * 0.12);
  const sx = x + (dW - sw) / 2;
  const sy = y + pt;
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, y + dH + 14, x + dW, y + dH + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y, x - 20, y + dH, -8, false), fieldId: 'H' },
    { ...dimAnchor(sx, sy - 10, sx + sw, sy - 10, 0, true), fieldId: 'SW' },
    { ...dimAnchor(x + dW + 12, sy, x + dW + 12, sy + sh, 4, false), fieldId: 'SH' },
    { ...dimAnchor(x - 20, y, x - 20, y + pt, -22, false), fieldId: 'PT' },
  ];
  if (dG > 0) out.push({ ...dimAnchor(x, y - 12, x + dG, y - 12, 0, true), fieldId: 'G' });
  return out;
}

function anchorsWicket(v: V): BagDimAnchor[] {
  const sc = bagFitScale(v.W, v.H + v.G + v.LH);
  const dW = v.W * sc;
  const dH = v.H * sc;
  const dG = v.G * sc;
  const dLH = v.LH * sc;
  const { x, y } = bagAnchor(dW, dH + dG + dLH);
  const out: BagDimAnchor[] = [
    { ...dimAnchor(x, y + dLH + dH + dG + 14, x + dW, y + dLH + dH + dG + 14, 0, true), fieldId: 'W' },
    { ...dimAnchor(x - 20, y + dLH, x - 20, y + dLH + dH, -8, false), fieldId: 'H' },
    { ...dimAnchor(x + dW + 12, y, x + dW + 12, y + dLH, 4, false), fieldId: 'LH' },
    { fieldId: 'WS', x: x + dW / 2, y: y + dLH / 2 },
    { fieldId: 'WD', x: x + dW * 0.7, y: y + dLH / 2 },
  ];
  if (dG > 0) out.push({ ...dimAnchor(x + dW + 12, y + dLH + dH, x + dW + 12, y + dLH + dH + dG, 4, false), fieldId: 'G' });
  return out;
}

/** Fields without a schematic anchor — shown in the fallback row below the drawing. */
export function bagFieldsWithoutAnchors(fieldIds: string[], anchoredIds: Set<string>): string[] {
  return fieldIds.filter((id) => !anchoredIds.has(id));
}
