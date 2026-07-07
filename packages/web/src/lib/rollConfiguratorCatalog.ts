/**
 * Roll packaging configurator — continuous web (no subtypes).
 * Maps estimate dimensions → schematic fields. Ups/trim stay at engine defaults.
 */

export interface RollConfiguratorField {
  id: string;
  label: string;
  unit: 'mm' | 'pcs';
  hint: string;
  dimensionKey: string;
  defaultVal: number;
}

export interface RollConfiguratorConfig {
  fields: RollConfiguratorField[];
}

/** Default RW / CO / PPC for general roll templates (printed / converted). */
export const ROLL_DEFAULTS_GENERAL = { RW: 250, CO: 150, PPC: 1 } as const;

/** Default RW / CO / PPC for label roll templates. */
export const ROLL_DEFAULTS_LABELS = { RW: 35, CO: 180, PPC: 1 } as const;

/** Unprinted continuous web — no cut-off repeat, no pieces/kg. */
export const ROLL_DEFAULTS_CONTINUOUS = { RW: 250, CO: 0, PPC: 1 } as const;

/** Keys owned by the roll configurator — hide from Job details spec row. */
export const ROLL_CONFIGURATOR_DIMENSION_KEYS = new Set([
  'reelWidthMm',
  'cutoffMm',
  'piecesPerCut',
  'coreInsideDiameterMm',
  'coreThicknessMm',
  'requiredRollWeightKg',
  'rollOutsideDiameterMm',
  'rollSpecOdDriven',
]);

const field = (
  id: string,
  label: string,
  dimensionKey: string,
  defaultVal: number,
  hint: string,
  unit: 'mm' | 'pcs' = 'mm'
): RollConfiguratorField => ({ id, label, unit, hint, dimensionKey, defaultVal });

export const ROLL_CONFIGURATOR: RollConfiguratorConfig = {
  fields: [
    field(
      'RW',
      'Reel width (RW)',
      'reelWidthMm',
      ROLL_DEFAULTS_GENERAL.RW,
      'Wound web width on the core (cross-direction)'
    ),
    field(
      'CO',
      'Cut-off (CO)',
      'cutoffMm',
      ROLL_DEFAULTS_GENERAL.CO,
      'Repeat along the web · 0 = continuous (no pieces)'
    ),
    field(
      'PPC',
      'Pieces per cut',
      'piecesPerCut',
      ROLL_DEFAULTS_GENERAL.PPC,
      'Lanes across the web in one cut · 1 = full width',
      'pcs'
    ),
  ],
};

export function rollConfiguratorDefaults(
  isLabels = false,
  continuousWeb = false
): { RW: number; CO: number; PPC: number } {
  if (isLabels) return { ...ROLL_DEFAULTS_LABELS };
  if (continuousWeb) return { ...ROLL_DEFAULTS_CONTINUOUS };
  return { ...ROLL_DEFAULTS_GENERAL };
}

/** Printed-roll CO scales with reel width; plain continuous web keeps CO = 0. */
export function defaultCutoffMm(
  reelWidthMm: number,
  options?: { isLabels?: boolean; continuousWeb?: boolean }
): number {
  if (options?.continuousWeb) return 0;
  const rw = Number.isFinite(reelWidthMm) && reelWidthMm > 0 ? reelWidthMm : rollConfiguratorDefaults(options?.isLabels).RW;
  const base = rollConfiguratorDefaults(options?.isLabels);
  const ratio = base.CO / base.RW;
  return Math.max(20, Math.round(rw * ratio));
}

/** True when estimate/template context is the Labels parent PG. */
export { isLabelsRollContext, defaultOrderQuantityUnit } from '@es/engine';

export function rollFieldValuesFromDimensions(
  dimensions: Record<string, number | undefined>,
  options?: { isLabels?: boolean; continuousWeb?: boolean }
): Record<string, number> {
  const continuousWeb = options?.continuousWeb ?? false;
  const defs = rollConfiguratorDefaults(options?.isLabels ?? false, continuousWeb);
  const vals: Record<string, number> = {};
  for (const f of ROLL_CONFIGURATOR.fields) {
    const stored = dimensions[f.dimensionKey];
    const isRw = f.id === 'RW';
    const isCo = f.id === 'CO';
    const isPpc = f.id === 'PPC';
    const ok =
      stored != null &&
      Number.isFinite(stored) &&
      (!isRw || stored > 0) &&
      (!isCo || (continuousWeb ? stored >= 0 : stored > 0)) &&
      (!isPpc || stored >= 1);
    vals[f.id] = ok ? (stored as number) : defs[f.id as keyof typeof defs];
  }
  if (
    !continuousWeb &&
    (dimensions.cutoffMm == null ||
      !Number.isFinite(dimensions.cutoffMm) ||
      dimensions.cutoffMm <= 0)
  ) {
    vals.CO = defaultCutoffMm(vals.RW, options);
  }
  return vals;
}

export function seedRollDimensionPatch(
  dimensions: Record<string, number | undefined>,
  options?: { isLabels?: boolean; continuousWeb?: boolean }
): Record<string, number> {
  const continuousWeb = options?.continuousWeb ?? false;
  const defs = rollConfiguratorDefaults(options?.isLabels ?? false, continuousWeb);
  const patch: Record<string, number> = {
    numberOfUps: 1,
    extraPrintingTrimMm: 0,
  };
  const rwForCo =
    dimensions.reelWidthMm != null && Number.isFinite(dimensions.reelWidthMm) && dimensions.reelWidthMm > 0
      ? dimensions.reelWidthMm
      : defs.RW;
  for (const f of ROLL_CONFIGURATOR.fields) {
    const prevVal = dimensions[f.dimensionKey];
    const shouldReplace =
      f.id === 'RW'
        ? prevVal == null || !Number.isFinite(prevVal) || prevVal <= 0
        : f.id === 'CO'
          ? continuousWeb
            ? prevVal == null || !Number.isFinite(prevVal) || prevVal < 0
            : prevVal == null || !Number.isFinite(prevVal) || prevVal <= 0
          : f.id === 'PPC'
            ? prevVal == null || !Number.isFinite(prevVal) || prevVal < 1
            : prevVal == null || !Number.isFinite(prevVal);
    if (!shouldReplace) continue;
    patch[f.dimensionKey] =
      f.id === 'CO' && !continuousWeb
        ? defaultCutoffMm(rwForCo, options)
        : defs[f.id as keyof typeof defs];
  }
  return patch;
}

export function isContinuousWebCutoff(cutoffMm: number | undefined): boolean {
  return cutoffMm != null && Number.isFinite(cutoffMm) && cutoffMm <= 0;
}
