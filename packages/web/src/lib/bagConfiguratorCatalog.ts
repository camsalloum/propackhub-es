/**
 * Bag packaging configurator — ported from mes_packaging_configurator_v2.html
 * Maps estimate bag subtypes → schematic type + dimension JSON keys.
 */

export type BagConfiguratorType =
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
  bag_bottom_gusset_shopping: 'bottom-gusset',
  bag_side_gusset_shopping: 'side-gusset',
  bag_courier: 'courier',
  bag_diaper: 'diaper',
  bag_industrial: 'industrial',
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
      field('FL', 'Flap/seal (FL)', 'flapMm', 'mm', 50, 'Adhesive closure area'),
      field('POD', 'POD pocket', 'bagPodHeightMm', 'mm', 80, '0 = no POD pocket'),
    ],
  },
  diaper: {
    type: 'diaper',
    label: 'Diaper bag',
    desc: 'W × H × G (bottom) + neck cut NC. Often with handle & vent holes.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 500, 'Bag width flat'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 650, 'Total height'),
      field('G', 'Bottom gusset (G)', 'bottomGussetMm', 'mm', 180, 'Depth for bulky product'),
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
    desc: 'W × H × G + loop handle HL × HW.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 300, 'Bag body width'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 380, 'Bag body height'),
      field('G', 'Gusset (G)', 'bottomGussetMm', 'mm', 80, 'Bottom or side gusset'),
      field('HL', 'Handle length (HL)', 'handleLengthMm', 'mm', 260, 'Loop length'),
      field('HW', 'Handle width (HW)', 'bagHandleWidthMm', 'mm', 25, 'Loop width'),
    ],
  },
  patch: {
    type: 'patch',
    label: 'Patch handle',
    desc: 'W × H + patch PW × PH and handle hole HD.',
    fields: [
      field('W', 'Width (W)', 'openWidthMm', 'mm', 320, 'Bag width'),
      field('H', 'Height (H)', 'openHeightMm', 'mm', 400, 'Bag height'),
      field('G', 'Gusset (G)', 'sideGussetMm', 'mm', 60, 'Side or bottom gusset'),
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
    vals[f.id] = effectiveBagFieldValue(f, dimensions[f.dimensionKey]);
  }
  return vals;
}

/** Body dimensions must be > 0 for schematic + costing; 0 is treated as unset (template placeholders). */
function effectiveBagFieldValue(f: BagConfiguratorField, stored: number | undefined): number {
  if (stored != null && Number.isFinite(stored)) {
    if ((f.id === 'W' || f.id === 'H' || f.id === 'L') && stored <= 0) return f.defaultVal;
    // Tiny gusset values are usually stale placeholders (e.g. piecesPerCut leakage), not real specs.
    if ((f.id === 'G' || f.id === 'SG') && stored > 0 && stored < 5 && f.defaultVal >= 5) return f.defaultVal;
    return stored;
  }
  return f.defaultVal;
}

export function bagDefaultsPatchForSubtype(
  configType: BagConfiguratorType,
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const config = BAG_CONFIGURATOR_CATALOG[configType];
  const vals = bagFieldValuesFromDimensions(config, dimensions);
  return dimensionsPatchFromBagFields(config, vals);
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
