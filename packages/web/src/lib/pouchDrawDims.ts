import { calculatePouchFlatGeom } from '@es/engine';
import type { PouchConfiguratorType } from './pouchConfiguratorCatalog';

/** Normalized mm values for 2D schematic + flat-blank renderers. */
export interface PouchDrawDims {
  W: number;
  H: number;
  BG: number;
  SG: number;
  D: number;
  S1: number;
  A: number;
}

function usesSideGusset(type?: PouchConfiguratorType | null): boolean {
  return type === 'center-fold-seal-side-gusset' || type === 'side-weld-side-gusset';
}

export function pouchDrawDimsFromFields(
  vals: Record<string, number>,
  type?: PouchConfiguratorType | null
): PouchDrawDims {
  const W = vals.W > 0 ? vals.W : 110;
  const H = (vals.L ?? vals.H) != null && (vals.L ?? vals.H)! > 0 ? (vals.L ?? vals.H)! : 190;
  const g = Math.max(0, vals.G ?? 0);
  const side = usesSideGusset(type);
  return {
    W,
    H,
    BG: side ? Math.max(0, vals.BG ?? 0) : Math.max(0, vals.BG ?? g),
    SG: side ? Math.max(0, vals.SG ?? g) : Math.max(0, vals.SG ?? 0),
    D: Math.max(0, vals.D ?? 0),
    S1: Math.max(0, vals.S1 ?? 12),
    A: Math.max(0, vals.A ?? 0),
  };
}

/**
 * Indicative flat-sheet size — mirrors engine calculatePouchFlatGeom.
 */
export function pouchFlatSheetLabel(d: PouchDrawDims, type: PouchConfiguratorType): string {
  const G = usesSideGusset(type) ? d.SG : d.BG;
  const geom = calculatePouchFlatGeom(type, {
    W: d.W,
    L: d.H,
    G,
    S1: d.S1,
    D: d.D,
  });
  const webs = geom.webCount > 1 ? ` · ${geom.webCount} webs` : '';
  const extra =
    geom.extraPanelArea > 0 ? ` + panel ${Math.round(geom.extraPanelArea / 100)} cm²` : '';
  return `${Math.round(geom.flatWidth)}×${Math.round(geom.flatHeight)} mm${webs}${extra}`;
}

export function pouchFaceAreaCm2(d: PouchDrawDims): string {
  return `${Math.round((d.W * d.H) / 100)} cm²`;
}

export function pouchConstructionNote(type: PouchConfiguratorType): string {
  switch (type) {
    case 'three-side-seal-flat':
      return 'Two webs sealed on 3 sides — top open for fill (webCount = 2)';
    case 'three-side-seal-standing':
      return 'Two webs + separate bottom gusset panel (separateBottomWeb)';
    case 'center-fold-seal-flat':
      return 'One web folded to center back seam — quad-seal look, film-efficient';
    case 'center-fold-seal-side-gusset':
      return 'One web; side gussets add to flat width (W + 2G)';
    case 'center-fold-seal-standing':
      return 'One web standing — flat height = L + G/2';
    case 'half-fold-fusion-flat':
      return 'One web V-folded in half — fold is one full side (flatWidth = 2W)';
    case 'half-fold-fusion-standing':
      return 'V-fold + bottom gusset; bottom web may be independently printed';
    case 'side-weld-flat':
      return 'Side-weld seal-and-cut — lowest complexity (webCount = 1)';
    case 'side-weld-side-gusset':
      return 'Side-weld with fold-in gusset';
    case 'oblique-side-weld-trapezoid':
      return 'Oblique angled cut (trapezoid) — trim is scrap, not base area';
    case 'oblique-side-weld-triangle':
      return 'Oblique triangle profile — trim is scrap, not base area';
    case 'flat-bottom-box-standing':
      return 'Front + back + flat bottom insert (webCount = 3, separateBottomWeb)';
    default:
      return 'Premade pouch blank';
  }
}
