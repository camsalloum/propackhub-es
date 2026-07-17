/**
 * Premade pouch configurator — Family × Variant (v4).
 * Maps estimate pouch subtypes → schematic type + dimension JSON keys.
 *
 * Engine model: packages/engine/src/pouch-flat-sheet.ts
 * Reference: docs/POUCH_CLASSIFICATION_v4.md
 */

import { POUCH_SUBTYPE_TO_CONFIGURATOR as ENGINE_MAP } from '@es/engine';

/** Mirror of engine PouchConfiguratorType — kept local so web tsc works before dist rebuild. */
export type PouchConfiguratorType =
  | 'three-side-seal-flat'
  | 'three-side-seal-standing'
  | 'center-fold-seal-flat'
  | 'center-fold-seal-side-gusset'
  | 'center-fold-seal-standing'
  | 'half-fold-fusion-flat'
  | 'half-fold-fusion-standing'
  | 'side-weld-flat'
  | 'side-weld-side-gusset'
  | 'oblique-side-weld-trapezoid'
  | 'oblique-side-weld-triangle'
  | 'flat-bottom-box-standing';

export type PouchFamily =
  | 'three-side-seal'
  | 'center-fold-seal'
  | 'half-fold-fusion'
  | 'side-weld'
  | 'oblique-side-weld'
  | 'flat-bottom-box';

export function familyForPouchType(type: PouchConfiguratorType): PouchFamily {
  if (type.startsWith('three-side-seal')) return 'three-side-seal';
  if (type.startsWith('center-fold-seal')) return 'center-fold-seal';
  if (type.startsWith('half-fold-fusion')) return 'half-fold-fusion';
  if (type.startsWith('side-weld')) return 'side-weld';
  if (type.startsWith('oblique-side-weld')) return 'oblique-side-weld';
  return 'flat-bottom-box';
}

export interface PouchConfiguratorField {
  id: string;
  label: string;
  unit: 'mm' | 'deg';
  hint: string;
  dimensionKey: string;
  defaultVal: number;
  min?: number;
  max?: number;
}

export interface PouchConfiguratorConfig {
  type: PouchConfiguratorType;
  family: PouchFamily;
  label: string;
  desc: string;
  fields: PouchConfiguratorField[];
  separateBottomWeb: boolean;
}

/** DB productSubtype code → configurator type (engine is source of truth). */
export const POUCH_SUBTYPE_TO_CONFIGURATOR: Record<string, PouchConfiguratorType> = {
  ...ENGINE_MAP,
  pouch_tss_standing_kseal: 'three-side-seal-standing',
};

/** Dimension keys owned by the pouch schematic — hide from Job details spec row. */
export const POUCH_CONFIGURATOR_DIMENSION_KEYS = new Set([
  'openWidthMm',
  'openHeightMm',
  'bottomGussetMm',
  'sideGussetMm',
  'bottomSealWidthMm',
  'bottomDepthMm',
  'cutAngleDeg',
  'centerSealOverlapMm',
  'cornerRounded',
  'cornerRadiusMm',
  'bottomSealKseal',
]);

const field = (
  id: string,
  label: string,
  dimensionKey: string,
  unit: 'mm' | 'deg',
  defaultVal: number,
  hint: string,
  min?: number,
  max?: number
): PouchConfiguratorField => ({ id, label, unit, hint, dimensionKey, defaultVal, min, max });

export const POUCH_CONFIGURATOR_CATALOG: Record<PouchConfiguratorType, PouchConfiguratorConfig> = {
  'three-side-seal-flat': {
    type: 'three-side-seal-flat',
    family: 'three-side-seal',
    label: 'Three-Side-Seal — Flat',
    desc: 'Two separate webs, sealed on 3 sides, top open for fill. webCount = 2.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 150, 'Finished face width', 75, 600),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 200, 'Finished height / length', 60, 500),
    ],
  },
  'three-side-seal-standing': {
    type: 'three-side-seal-standing',
    family: 'three-side-seal',
    label: 'Three-Side-Seal — Standing',
    desc: 'Two webs + bottom gusset panel (separateBottomWeb). Doyen or K-seal bottom weld (same film area).',
    separateBottomWeb: true,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 110, 'Finished face width', 60, 250),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 220, 'Finished height', 120, 540),
      field('G', 'Bottom gusset (G)', 'bottomGussetMm', 'mm', 45, 'Bottom gusset depth', 20, 70),
    ],
  },
  'center-fold-seal-flat': {
    type: 'center-fold-seal-flat',
    family: 'center-fold-seal',
    label: 'Center-Fold-Seal — Flat (Quad)',
    desc: 'One web folded to a center back seam — quad-seal look from 1 web, not two.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 140, 'Finished face width', 35, 350),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 180, 'Finished height', 60, 500),
      field('S1', 'Bottom seal (S1)', 'bottomSealWidthMm', 'mm', 12, 'Bottom seal width', 5, 50),
    ],
  },
  'center-fold-seal-side-gusset': {
    type: 'center-fold-seal-side-gusset',
    family: 'center-fold-seal',
    label: 'Center-Fold-Seal — Side Gusset',
    desc: 'Single web; side folds add to flat width. flatWidth = W + 2G.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 150, 'Face width', 55, 350),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 200, 'Finished height', 60, 500),
      field('G', 'Side gusset (G)', 'sideGussetMm', 'mm', 35, 'Side gusset fold width', 10, 80),
      field('S1', 'Bottom seal (S1)', 'bottomSealWidthMm', 'mm', 12, 'Bottom seal width', 5, 50),
    ],
  },
  'center-fold-seal-standing': {
    type: 'center-fold-seal-standing',
    family: 'center-fold-seal',
    label: 'Center-Fold-Seal — Standing',
    desc: 'Single web standing pouch. flatHeight = L + G/2.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 130, 'Face width', 60, 250),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 200, 'Finished height', 120, 270),
      field('G', 'Bottom gusset (G)', 'bottomGussetMm', 'mm', 40, 'Bottom gusset depth', 20, 70),
    ],
  },
  'half-fold-fusion-flat': {
    type: 'half-fold-fusion-flat',
    family: 'half-fold-fusion',
    label: 'Half-Fold-Fusion — Flat',
    desc: 'One web V-folded in half; fold is one full side. flatWidth = 2W.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 150, 'Face width', 60, 450),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 280, 'Finished height', 200, 600),
    ],
  },
  'half-fold-fusion-standing': {
    type: 'half-fold-fusion-standing',
    family: 'half-fold-fusion',
    label: 'Half-Fold-Fusion — Standing',
    desc: 'V-fold + bottom gusset; may use independently printed bottom web.',
    separateBottomWeb: true,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 150, 'Face width', 60, 450),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 300, 'Finished height (max ≈ 600 − G)', 200, 600),
      field('G', 'Bottom gusset (G)', 'bottomGussetMm', 'mm', 55, 'Bottom gusset depth', 25, 100),
    ],
  },
  'side-weld-flat': {
    type: 'side-weld-flat',
    family: 'side-weld',
    label: 'Side-Weld — Flat',
    desc: 'Heat-seal and cut — lowest complexity. webCount = 1.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 180, 'Finished width', 70, 500),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 220, 'Finished height', 100, 400),
    ],
  },
  'side-weld-side-gusset': {
    type: 'side-weld-side-gusset',
    family: 'side-weld',
    label: 'Side-Weld — Side Gusset',
    desc: 'Side-weld with fold-in gusset. flatWidth = W + 2G, flatHeight = L − G.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 180, 'Finished width', 70, 500),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 220, 'Finished height (max ≈ 400 − G)', 100, 400),
      field('G', 'Gusset (G)', 'sideGussetMm', 'mm', 45, 'Gusset depth', 30, 70),
    ],
  },
  'oblique-side-weld-trapezoid': {
    type: 'oblique-side-weld-trapezoid',
    family: 'oblique-side-weld',
    label: 'Oblique-Side-Weld — Trapezoid',
    desc: 'Angled seal-and-cut. Cut angle is scrap — not in base flat area.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Top width (W)', 'openWidthMm', 'mm', 450, 'Top width', 300, 700),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 400, 'Height', 200, 650),
      field('A', 'Cut angle', 'cutAngleDeg', 'deg', 10, 'Angled trim (scrap factor)', 0, 20),
    ],
  },
  'oblique-side-weld-triangle': {
    type: 'oblique-side-weld-triangle',
    family: 'oblique-side-weld',
    label: 'Oblique-Side-Weld — Triangle',
    desc: 'Extreme angle converging to a point. Produce / flowers / sandwiches.',
    separateBottomWeb: false,
    fields: [
      field('W', 'Base width (W)', 'openWidthMm', 'mm', 450, 'Base width', 300, 700),
      field('L', 'Height (L)', 'openHeightMm', 'mm', 400, 'Height', 200, 650),
    ],
  },
  'flat-bottom-box-standing': {
    type: 'flat-bottom-box-standing',
    family: 'flat-bottom-box',
    label: 'Flat-Bottom Box — Standing',
    desc: 'Front + back + separate flat bottom insert. webCount = 3 + W×D panel.',
    separateBottomWeb: true,
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 130, 'Face width', 90, 194),
      field('D', 'Bottom depth (D)', 'bottomDepthMm', 'mm', 90, 'Bottom panel depth', 74, 114),
      field('L', 'Height (H)', 'openHeightMm', 'mm', 280, 'Body height', 200, 600),
    ],
  },
};

export const POUCH_FAMILY_LABELS: Record<PouchFamily, string> = {
  'three-side-seal': 'Three-Side-Seal',
  'center-fold-seal': 'Center-Fold-Seal',
  'half-fold-fusion': 'Half-Fold-Fusion',
  'side-weld': 'Side-Weld',
  'oblique-side-weld': 'Oblique-Side-Weld',
  'flat-bottom-box': 'Flat-Bottom Box',
};

export function configuratorTypeForPouchSubtype(
  subtypeCode: string | null | undefined
): PouchConfiguratorType | null {
  if (!subtypeCode) return null;
  const canon = LEGACY_POUCH_SUBTYPE_ALIASES[subtypeCode] ?? subtypeCode;
  return POUCH_SUBTYPE_TO_CONFIGURATOR[canon] ?? POUCH_SUBTYPE_TO_CONFIGURATOR[subtypeCode] ?? null;
}

export function pouchFieldValuesFromDimensions(
  config: PouchConfiguratorConfig,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const f of config.fields) {
    const stored = dimensions[f.dimensionKey];
    const isBody = f.id === 'W' || f.id === 'L';
    const ok = stored != null && Number.isFinite(stored) && (!isBody || stored > 0);
    vals[f.id] = ok ? (stored as number) : f.defaultVal;
  }
  return vals;
}

/** Legacy productSubtype codes → v4 canonical codes for the picker. */
export const LEGACY_POUCH_SUBTYPE_ALIASES: Record<string, string> = {
  pouch_3_side_seal: 'pouch_tss_flat',
  pouch_three_side_seal: 'pouch_tss_flat',
  pouch_3_side_seal_zip: 'pouch_tss_flat',
  pouch_stand_up: 'pouch_tss_standing',
  pouch_stand_up_zip: 'pouch_tss_standing',
  pouch_kseal_stand_up: 'pouch_tss_standing_kseal',
  pouch_kseal_stand_up_zip: 'pouch_tss_standing_kseal',
  pouch_doypack: 'pouch_tss_standing',
  pouch_center_seal: 'pouch_cfs_flat',
  pouch_pillow: 'pouch_cfs_flat',
  pouch_4_side_seal: 'pouch_cfs_flat',
  pouch_four_side_seal: 'pouch_cfs_flat',
  pouch_gusset: 'pouch_cfs_side_gusset',
  pouch_side_gusset: 'pouch_cfs_side_gusset',
  pouch_flat_bottom: 'pouch_fbb_standing',
  pouch_box: 'pouch_fbb_standing',
};

export function canonicalPouchSubtype(code: string | null | undefined): string | null {
  if (!code) return code ?? null;
  return LEGACY_POUCH_SUBTYPE_ALIASES[code] ?? code;
}

export function seedPouchDimensionPatch(
  configType: PouchConfiguratorType,
  dimensions: Record<string, number | undefined>,
  opts?: { bottomSealKseal?: boolean }
): Record<string, number> {
  const config = POUCH_CONFIGURATOR_CATALOG[configType];
  const patch: Record<string, number> = {};
  for (const f of config.fields) {
    const prevVal = dimensions[f.dimensionKey];
    const bodyDim = f.id === 'W' || f.id === 'L';
    const shouldReplace =
      prevVal == null || !Number.isFinite(prevVal) || (bodyDim && (prevVal ?? 0) <= 0);
    if (shouldReplace) patch[f.dimensionKey] = f.defaultVal;
  }
  if (opts?.bottomSealKseal) {
    patch.bottomSealKseal = 1;
  } else if (
    configType === 'three-side-seal-standing' ||
    configType === 'center-fold-seal-standing' ||
    configType === 'half-fold-fusion-standing'
  ) {
    // Only clear when explicitly seeding a non-K subtype via subtype change.
    if (opts && opts.bottomSealKseal === false) patch.bottomSealKseal = 0;
  }
  return patch;
}

/** Seed patch when the productSubtype code is known (handles K-seal flag). */
export function seedPouchDimensionPatchForSubtype(
  subtypeCode: string | null | undefined,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const configType = configuratorTypeForPouchSubtype(subtypeCode);
  if (!configType) return {};
  const code = canonicalPouchSubtype(subtypeCode) ?? subtypeCode ?? '';
  const kseal =
    code === 'pouch_tss_standing_kseal' ||
    code === 'pouch_kseal_stand_up' ||
    code === 'pouch_kseal_stand_up_zip';
  return seedPouchDimensionPatch(configType, dimensions, {
    bottomSealKseal: kseal ? true : code === 'pouch_tss_standing' ? false : undefined,
  });
}

export function pouchDefaultsPatchForSubtype(
  configType: PouchConfiguratorType,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  return seedPouchDimensionPatch(configType, dimensions);
}

export function dimensionsPatchFromPouchFields(
  config: PouchConfiguratorConfig,
  vals: Record<string, number>
): Record<string, number> {
  const patch: Record<string, number> = {};
  for (const f of config.fields) {
    const v = vals[f.id];
    if (v != null && Number.isFinite(v)) patch[f.dimensionKey] = v;
  }
  return patch;
}

// ── Accessories (v4) — never their own pouch type ───────────────────────────

export type PouchAccessoryKind =
  | 'zipper'
  | 'spout'
  | 'valve'
  | 'window'
  | 'handle'
  | 'tear_notch'
  | 'laser_score'
  | 'easy_peel'
  | 'hanging_hole';

export interface PouchAccessoryMeta {
  kind: PouchAccessoryKind;
  label: string;
  basis: 'per_meter' | 'per_piece' | 'per_m2' | 'tooling';
  hint: string;
}

export const POUCH_ACCESSORY_META: Record<PouchAccessoryKind, PouchAccessoryMeta> = {
  zipper: { kind: 'zipper', label: 'Zipper', basis: 'per_meter', hint: 'Resealable zip — priced per metre (≈ pouch width).' },
  spout: { kind: 'spout', label: 'Spout + cap', basis: 'per_piece', hint: 'Fitment for liquids — priced per unit.' },
  valve: { kind: 'valve', label: 'Degassing valve', basis: 'per_piece', hint: 'One-way coffee valve — priced per unit.' },
  window: { kind: 'window', label: 'Window / patch', basis: 'per_m2', hint: 'Transparent patch — adds film area.' },
  handle: { kind: 'handle', label: 'Handle', basis: 'per_piece', hint: 'Carry handle — priced per unit.' },
  tear_notch: { kind: 'tear_notch', label: 'Tear notch', basis: 'tooling', hint: 'Die-notch opening assist.' },
  laser_score: { kind: 'laser_score', label: 'Laser score', basis: 'tooling', hint: 'Partial-depth tear line — laser station.' },
  easy_peel: { kind: 'easy_peel', label: 'Easy peel seal', basis: 'tooling', hint: 'Peelable sealant layer — not a notch/score.' },
  hanging_hole: { kind: 'hanging_hole', label: 'Hanging hole', basis: 'per_piece', hint: 'Euro slot / round / oblong — header zone.' },
};

/** Accessory applicability by Family (v4 §4). */
const ACCESSORY_BY_FAMILY: Record<PouchFamily, PouchAccessoryKind[]> = {
  'three-side-seal': ['zipper', 'tear_notch', 'laser_score', 'easy_peel', 'hanging_hole', 'window'],
  'center-fold-seal': ['zipper', 'spout', 'tear_notch', 'laser_score', 'easy_peel', 'hanging_hole', 'window'],
  'half-fold-fusion': ['zipper', 'spout', 'valve', 'tear_notch', 'laser_score', 'easy_peel', 'hanging_hole', 'window'],
  'side-weld': ['tear_notch', 'laser_score', 'easy_peel'],
  'oblique-side-weld': ['tear_notch', 'laser_score', 'easy_peel'],
  'flat-bottom-box': ['spout', 'valve', 'tear_notch', 'laser_score', 'easy_peel', 'window', 'handle'],
};

export function accessoriesForPouchType(type: PouchConfiguratorType | null | undefined): PouchAccessoryKind[] {
  if (!type) return [];
  return ACCESSORY_BY_FAMILY[familyForPouchType(type)] ?? [];
}
