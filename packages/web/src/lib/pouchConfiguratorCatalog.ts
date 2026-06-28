/**
 * Pouch packaging configurator — sister to bagConfiguratorCatalog.ts.
 * Maps estimate pouch subtypes → schematic type + dimension JSON keys.
 *
 * Engine model: see packages/engine/src/pouch-flat-sheet.ts.
 * Costing reference: docs/POUCH_COSTING_RESEARCH.md.
 */

export type PouchConfiguratorType =
  | 'three-side-seal'
  | 'center-seal'
  | 'four-side-seal'
  | 'stand-up'
  | 'side-gusset'
  | 'flat-bottom';

export interface PouchConfiguratorField {
  id: string;
  label: string;
  unit: 'mm';
  hint: string;
  /** Persisted key in estimate dimensions JSON */
  dimensionKey: string;
  defaultVal: number;
}

export interface PouchConfiguratorConfig {
  type: PouchConfiguratorType;
  label: string;
  desc: string;
  fields: PouchConfiguratorField[];
}

/** DB productSubtype code → configurator type. Includes legacy aliases. */
export const POUCH_SUBTYPE_TO_CONFIGURATOR: Record<string, PouchConfiguratorType> = {
  // Canonical codes
  pouch_three_side_seal: 'three-side-seal',
  pouch_center_seal: 'center-seal',
  pouch_four_side_seal: 'four-side-seal',
  pouch_stand_up: 'stand-up',
  pouch_side_gusset: 'side-gusset',
  pouch_flat_bottom: 'flat-bottom',
  // Existing DB codes (productCatalog / Master-Data defaults)
  pouch_3_side_seal: 'three-side-seal',
  pouch_3_side_seal_zip: 'three-side-seal',
  pouch_stand_up_zip: 'stand-up',
  pouch_kseal_stand_up: 'stand-up',
  pouch_kseal_stand_up_zip: 'stand-up',
  pouch_gusset: 'side-gusset',
  pouch_4_side_seal: 'four-side-seal',
  // Legacy aliases
  pouch_pillow: 'center-seal',
  pouch_doypack: 'stand-up',
  pouch_box: 'flat-bottom',
};

/** Dimension keys owned by the pouch schematic — hide from Job details spec row. */
export const POUCH_CONFIGURATOR_DIMENSION_KEYS = new Set([
  'openWidthMm',
  'openHeightMm',
  'bottomGussetMm',
  'sideGussetMm',
  'centerSealOverlapMm',
  'bottomDepthMm',
]);

const field = (
  id: string,
  label: string,
  dimensionKey: string,
  unit: 'mm',
  defaultVal: number,
  hint: string
): PouchConfiguratorField => ({ id, label, unit, hint, dimensionKey, defaultVal });

/**
 * Six canonical pouch subtypes. Formulas in pouch-flat-sheet.ts, derived
 * in docs/POUCH_COSTING_RESEARCH.md.
 *
 * W is **seal-inclusive** (= slit/layflat web width) for all subtypes except
 * 4-side seal — where the two plies are separate die-cuts and SA is added on
 * both axes. This convention is surfaced in field hints.
 */
export const POUCH_CONFIGURATOR_CATALOG: Record<PouchConfiguratorType, PouchConfiguratorConfig> = {
  'three-side-seal': {
    type: 'three-side-seal',
    label: '3-Side Seal',
    desc: 'Single web folded in half: bottom fold, two side seals, top seal after fill. Blank: W × (2H + SA).',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 120, 'Face width (seal-inclusive — equals slit web width)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 180, 'Usable cavity height (excludes top seal lip)'),
    ],
  },
  'center-seal': {
    type: 'center-seal',
    label: 'Center Seal (Pillow / VFFS)',
    desc: 'Single web wrapped into a tube with a back fin/lap seal; top + bottom end seals. Blank: (2W + OV) × (H + 2·SA).',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 120, 'Lay-flat face width (tube circumference = 2W)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 200, 'Usable cavity height (excludes top + bottom end seals)'),
      field('OV', 'Back-seal overlap (OV)', 'centerSealOverlapMm', 'mm', 10, 'Fin/lap seal overlap at back · typ. 6–25 mm'),
    ],
  },
  'four-side-seal': {
    type: 'four-side-seal',
    label: '4-Side Seal',
    desc: 'Two separate plies (front + back die-cut) sealed on all four edges. Blank: 2 × (W + 2·SA) × (H + 2·SA).',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 130, 'Usable face width (separate plies — SA added on both axes)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 180, 'Usable face height'),
    ],
  },
  'stand-up': {
    type: 'stand-up',
    label: 'Stand-Up (Doypack)',
    desc: 'Front + back + W-shaped bottom gusset; top sealed after fill. Blank: 2W × (H + BG + SA).',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 110, 'Face width (seal-inclusive)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 190, 'Usable cavity height (excludes top seal lip)'),
      field('BG', 'Bottom gusset (BG)', 'bottomGussetMm', 'mm', 50, 'Formed depth — bag stands BG tall when filled'),
    ],
  },
  'side-gusset': {
    type: 'side-gusset',
    label: 'Side Gusset',
    desc: 'Front + back + two side gussets running full height; top + bottom seals. Blank: (2W + 4·SG) × (H + 2·SA).',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 110, 'Front face width (one panel)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 190, 'Usable cavity height (excludes top + bottom seals)'),
      field('SG', 'Side gusset (SG)', 'sideGussetMm', 'mm', 35, 'Per side; internal depth = 2×SG'),
    ],
  },
  'flat-bottom': {
    type: 'flat-bottom',
    label: 'Flat-Bottom (Box Pouch)',
    desc: 'Side-gusset body + folded rectangular bottom. Blank: (2W + 4·SG) × (H + SA) + (W × D) bottom panel.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 110, 'Front face width'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 170, 'Body height (excludes top seal; bottom seal absorbed in D)'),
      field('SG', 'Side gusset (SG)', 'sideGussetMm', 'mm', 35, 'Per side; internal depth = 2×SG'),
      field('D', 'Bottom depth (D)', 'bottomDepthMm', 'mm', 45, 'Folded flat base depth · typ. ≈ 2×SG'),
    ],
  },
};

export function configuratorTypeForPouchSubtype(
  subtypeCode: string | null | undefined
): PouchConfiguratorType | null {
  if (!subtypeCode) return null;
  return POUCH_SUBTYPE_TO_CONFIGURATOR[subtypeCode] ?? null;
}

export function pouchFieldValuesFromDimensions(
  config: PouchConfiguratorConfig,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const f of config.fields) {
    const stored = dimensions[f.dimensionKey];
    // Body dimensions (W/H) must be positive — fall back to the logical default
    // when missing, non-finite, or 0 (a zero-size pouch is never valid).
    const isBody = f.id === 'W' || f.id === 'H';
    const ok =
      stored != null && Number.isFinite(stored) && (!isBody || stored > 0);
    vals[f.id] = ok ? (stored as number) : f.defaultVal;
  }
  return vals;
}

/**
 * Legacy pouch subtype codes → canonical code. Existing estimates/templates
 * stored under legacy aliases resolve to the canonical option in the picker.
 */
export const LEGACY_POUCH_SUBTYPE_ALIASES: Record<string, string> = {
  pouch_pillow: 'pouch_center_seal',
  pouch_doypack: 'pouch_stand_up',
  pouch_box: 'pouch_flat_bottom',
};

export function canonicalPouchSubtype(code: string | null | undefined): string | null {
  if (!code) return code ?? null;
  return LEGACY_POUCH_SUBTYPE_ALIASES[code] ?? code;
}

/** One-time / subtype-change seeding only — never use while displaying user edits. */
export function seedPouchDimensionPatch(
  configType: PouchConfiguratorType,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const config = POUCH_CONFIGURATOR_CATALOG[configType];
  const patch: Record<string, number> = {};
  for (const f of config.fields) {
    const prevVal = dimensions[f.dimensionKey];
    const bodyDim = f.id === 'W' || f.id === 'H';
    const shouldReplace =
      prevVal == null ||
      !Number.isFinite(prevVal) ||
      (bodyDim && (prevVal ?? 0) <= 0);
    if (shouldReplace) patch[f.dimensionKey] = f.defaultVal;
  }
  return patch;
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
