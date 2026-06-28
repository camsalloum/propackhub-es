/**
 * Bag packaging configurator — ported from mes_packaging_configurator_v2.html
 * Maps estimate bag subtypes → schematic type + dimension JSON keys.
 */

export type BagConfiguratorType =
  | 'gusseted'
  | 'bottom-gusset'
  | 'side-gusset'
  | 'courier'
  | 'diaper'
  | 'industrial'
  | 'loop'
  | 'patch'
  | 'punch'
  | 'wicket';

export interface BagConfiguratorField {
  id: string;
  label: string;
  unit: 'mm';
  hint: string;
  /** Persisted key in estimate dimensions JSON */
  dimensionKey: string;
  defaultVal: number;
}

export interface BagConfiguratorConfig {
  type: BagConfiguratorType;
  label: string;
  desc: string;
  fields: BagConfiguratorField[];
}

export const BAG_SUBTYPE_TO_CONFIGURATOR: Record<string, BagConfiguratorType> = {
  bag_gusseted_shopping: 'gusseted',
  // Industrial bag = flat / side-gusseted tube → unified gusseted formula.
  bag_industrial: 'gusseted',
  bag_bottom_gusset_shopping: 'bottom-gusset',
  bag_side_gusset_shopping: 'side-gusset',
  bag_courier: 'courier',
  bag_diaper: 'diaper',
  bag_loop_handle: 'loop',
  bag_patch_handle: 'patch',
  bag_punch_handle: 'punch',
  bag_wicket: 'wicket',
};

/** Dimension keys owned by the bag schematic — hide from Job details spec row */
export const BAG_CONFIGURATOR_DIMENSION_KEYS = new Set([
  'openWidthMm',
  'openHeightMm',
  'bottomGussetMm',
  'sideGussetMm',
  'flapMm',
  'handleLengthMm',
  'wicketMm',
  'bagTopFoldMm',
  'bagTopSealMm',
  'bagNeckCutMm',
  'bagVentHoleMm',
  'bagValveMm',
  'bagHandleWidthMm',
  'bagLoopWelded',
  'bagPatchWidthMm',
  'bagPatchHeightMm',
  'bagHandleHoleMm',
  'bagSlotWidthMm',
  'bagSlotHeightMm',
  'bagSlotFromTopMm',
  'bagWicketLipMm',
  'bagWicketSpacingMm',
  'bagWicketHoleMm',
  'bagPodHeightMm',
]);

const field = (
  id: string,
  label: string,
  dimensionKey: string,
  unit: 'mm',
  defaultVal: number,
  hint: string
): BagConfiguratorField => ({ id, label, unit, hint, dimensionKey, defaultVal });

export const BAG_CONFIGURATOR_CATALOG: Record<BagConfiguratorType, BagConfiguratorConfig> = {
  gusseted: {
    type: 'gusseted',
    label: 'Gusseted shopping bag',
    desc: 'Unified bag: bottom gusset and/or side gussets (or flat). Tick the gussets you need. Blank: (2W + 4·SG) × (H + BG + SA).',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 400, 'Front panel width (one face)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 500, 'Mouth to bottom fold (excl. gusset)'),
      field('G', 'Bottom gusset (BG)', 'bottomGussetMm', 'mm', 120, 'Standing depth · 0 = none'),
      field('SG', 'Side gusset (SG)', 'sideGussetMm', 'mm', 0, 'Per side; depth = 2×SG · 0 = none'),
    ],
  },
  'bottom-gusset': {
    type: 'bottom-gusset',
    label: 'Bottom-gusset shopping',
    desc: 'W × H × G (bottom gusset) + top fold F. Spec: W × H × BG.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 400, 'Front panel width'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 500, 'Total bag height'),
      field('G', 'Bottom gusset (G)', 'bottomGussetMm', 'mm', 120, 'Depth when standing'),
      field('F', 'Top fold (F)', 'bagTopFoldMm', 'mm', 50, 'Seal/fold at top'),
    ],
  },
  'side-gusset': {
    type: 'side-gusset',
    label: 'Side-gusset shopping',
    desc: 'W × H × SG (each side) + top seal. Internal depth ≈ 2×SG.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 350, 'Front panel only'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 450, 'Bottom seal to top'),
      field('SG', 'Side gusset (SG)', 'sideGussetMm', 'mm', 80, 'One side; depth = 2×SG'),
      field('TS', 'Top seal (TS)', 'bagTopSealMm', 'mm', 20, 'Heat-seal width at top'),
    ],
  },
  courier: {
    type: 'courier',
    label: 'Courier bag',
    desc: 'W × L + flap overlap. Tamper-evident adhesive seal.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 250, 'Bag width'),
      field('L', 'Length (L)', 'openHeightMm', 'mm', 350, 'Full bag length'),
      field('FL', 'Flap/seal (FL)', 'flapMm', 'mm', 40, 'Peel-seal flap depth (~25–40mm)'),
      field('POD', 'POD pocket', 'bagPodHeightMm', 'mm', 80, '0 = no POD pocket'),
    ],
  },
  diaper: {
    type: 'diaper',
    label: 'Diaper bag',
    desc: 'W × H × G (bottom) + neck cut NC. Often with handle & vent holes.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 500, 'Front panel width (one face)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 650, 'Total height'),
      field('G', 'Bottom gusset (G)', 'bottomGussetMm', 'mm', 180, 'Depth for bulky product'),
      field('F', 'Top fold (F)', 'bagTopFoldMm', 'mm', 50, 'Perforation / seal zone at top'),
      field('NC', 'Neck cut (NC)', 'bagNeckCutMm', 'mm', 60, 'Top opening cutout'),
      field('VH', 'Vent holes (Ø)', 'bagVentHoleMm', 'mm', 6, '0 = none'),
    ],
  },
  industrial: {
    type: 'industrial',
    label: 'Industrial bag',
    desc: 'W × L × SG (side gusset) + valve or open mouth.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 400, 'Flat tube width'),
      field('L', 'Length (L)', 'openHeightMm', 'mm', 700, 'Bag length'),
      field('SG', 'Side gusset (SG)', 'sideGussetMm', 'mm', 100, 'Each side gusset'),
      field('VLV', 'Valve (VLV)', 'bagValveMm', 'mm', 80, '0 = open mouth'),
    ],
  },
  loop: {
    type: 'loop',
    label: 'Loop handle',
    desc: 'W × H × G + loop handle HL × HW. Welded strip adds handle film; die-cut does not.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 300, 'Front panel width (one face)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 380, 'Bag body height'),
      field('G', 'Bottom gusset (BG)', 'bottomGussetMm', 'mm', 80, 'Standing depth · 0 = none'),
      field('HL', 'Handle length (HL)', 'handleLengthMm', 'mm', 260, 'Loop length'),
      field('HW', 'Handle width (HW)', 'bagHandleWidthMm', 'mm', 25, 'Ribbon width (~15–40mm)'),
    ],
  },
  patch: {
    type: 'patch',
    label: 'Patch handle',
    desc: 'Bottom-gusset (or flat/side) body + reinforcement patch PW × PH and handle hole HD.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 320, 'Front panel width (one face)'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 400, 'Bag height'),
      field('G', 'Bottom gusset (BG)', 'bottomGussetMm', 'mm', 80, 'Standing depth · 0 = flat'),
      field('PW', 'Patch width (PW)', 'bagPatchWidthMm', 'mm', 120, 'Reinforcement patch W'),
      field('PH', 'Patch height (PH)', 'bagPatchHeightMm', 'mm', 80, 'Reinforcement patch H'),
      field('HD', 'Handle hole (HD)', 'bagHandleHoleMm', 'mm', 30, 'Punched hole diameter'),
    ],
  },
  punch: {
    type: 'punch',
    label: 'Punch/die-cut handle',
    desc: 'W × H + die-cut slot SW × SH, position PT from top.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 280, 'Bag width'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 360, 'Bag height'),
      field('G', 'Gusset (G)', 'sideGussetMm', 'mm', 0, '0 = flat bag'),
      field('SW', 'Slot width (SW)', 'bagSlotWidthMm', 'mm', 120, 'Die-cut slot width'),
      field('SH', 'Slot height (SH)', 'bagSlotHeightMm', 'mm', 25, 'Slot height'),
      field('PT', 'Slot from top (PT)', 'bagSlotFromTopMm', 'mm', 20, 'Distance slot to top'),
    ],
  },
  wicket: {
    type: 'wicket',
    label: 'Wicket bag',
    desc: 'W × H + wicket lip LH, hole spacing WS, gusset G.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 300, 'Bag width'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 400, 'Bag body height'),
      field('G', 'Bottom gusset (G)', 'bottomGussetMm', 'mm', 80, '0 = flat bottom'),
      field('LH', 'Lip/header (LH)', 'bagWicketLipMm', 'mm', 40, 'Wicket header strip'),
      field('WS', 'Wicket spacing', 'bagWicketSpacingMm', 'mm', 76, 'Industry std: 76.2 mm'),
      field('WD', 'Wicket hole Ø', 'bagWicketHoleMm', 'mm', 8, 'Hole diameter'),
    ],
  },
};

export function configuratorTypeForBagSubtype(subtypeCode: string | null | undefined): BagConfiguratorType | null {
  if (!subtypeCode) return null;
  return BAG_SUBTYPE_TO_CONFIGURATOR[subtypeCode] ?? null;
}

export function bagFieldValuesFromDimensions(
  config: BagConfiguratorConfig,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const f of config.fields) {
    const stored = dimensions[f.dimensionKey];
    // Body dimensions (W/H/L) must always be a positive size — fall back to the logical
    // default when missing, non-finite, or 0 (a 0-width/height bag is never valid).
    const isBody = f.id === 'W' || f.id === 'H' || f.id === 'L';
    const ok =
      stored != null && Number.isFinite(stored) && (!isBody || stored > 0);
    vals[f.id] = ok ? (stored as number) : f.defaultVal;
  }
  return vals;
}

/**
 * Legacy bag subtype codes → unified canonical code. Existing estimates/templates that
 * stored the split gusset subtypes resolve to the merged "Gusseted Shopping Bag" so the
 * picker shows the right (active) option instead of falling back to "Select type…".
 */
export const LEGACY_BAG_SUBTYPE_ALIASES: Record<string, string> = {
  bag_bottom_gusset_shopping: 'bag_gusseted_shopping',
  bag_side_gusset_shopping: 'bag_gusseted_shopping',
};

export function canonicalBagSubtype(code: string | null | undefined): string | null {
  if (!code) return code ?? null;
  return LEGACY_BAG_SUBTYPE_ALIASES[code] ?? code;
}

/** One-time / subtype-change seeding only — never use while displaying user edits. */
export function seedBagDimensionPatch(
  configType: BagConfiguratorType,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const config = BAG_CONFIGURATOR_CATALOG[configType];
  const patch: Record<string, number> = {};
  for (const f of config.fields) {
    const prevVal = dimensions[f.dimensionKey];
    const bodyDim = f.id === 'W' || f.id === 'H' || f.id === 'L';
    const gussetDim = f.id === 'G' || f.id === 'SG';
    const shouldReplace =
      prevVal == null ||
      !Number.isFinite(prevVal) ||
      (bodyDim && (prevVal ?? 0) <= 0) ||
      (gussetDim && prevVal != null && prevVal > 0 && prevVal < 5 && f.defaultVal >= 5) ||
      (f.dimensionKey.startsWith('bag') && prevVal == null);
    if (shouldReplace) patch[f.dimensionKey] = f.defaultVal;
  }
  return patch;
}

export function bagDefaultsPatchForSubtype(
  configType: BagConfiguratorType,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  return seedBagDimensionPatch(configType, dimensions);
}

export function dimensionsPatchFromBagFields(
  config: BagConfiguratorConfig,
  vals: Record<string, number>
): Record<string, number> {
  const patch: Record<string, number> = {};
  for (const f of config.fields) {
    const v = vals[f.id];
    if (v != null && Number.isFinite(v)) patch[f.dimensionKey] = v;
  }
  return patch;
}
