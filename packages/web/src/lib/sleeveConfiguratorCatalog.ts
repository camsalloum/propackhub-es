/**
 * Sleeve packaging configurator — seamed tube (no subtypes).
 * Lay-flat drives product size; reelWidthMm is synced for engine costing.
 */

import {
  containerBandPlacementCode,
  containerBandPlacementFromCode,
  type ContainerBandPlacement,
} from './containerBandViz';

export interface SleeveConfiguratorField {
  id: string;
  label: string;
  unit: 'mm';
  hint: string;
  dimensionKey: string;
  defaultVal: number;
}

export interface SleeveConfiguratorConfig {
  fields: SleeveConfiguratorField[];
}

export const SLEEVE_DEFAULTS = { LF: 100, CO: 60 } as const;

export const SLEEVE_CONFIGURATOR_DIMENSION_KEYS = new Set([
  'layFlatValue',
  'cutoffMm',
  'reelWidthMm',
  'sleeveBandPlacement',
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
  hint: string
): SleeveConfiguratorField => ({ id, label, unit: 'mm', hint, dimensionKey, defaultVal });

export const SLEEVE_CONFIGURATOR: SleeveConfiguratorConfig = {
  fields: [
    field('LF', 'Lay-flat (LF)', 'layFlatValue', SLEEVE_DEFAULTS.LF, 'Flat width of one sleeve blank (collapsed tube + seam)'),
    field('CO', 'Cut-off (CO)', 'cutoffMm', SLEEVE_DEFAULTS.CO, 'Sleeve height along the container axis'),
  ],
};

export function sleeveBandPlacementFromDimensions(
  dimensions: Record<string, number | undefined>
): ContainerBandPlacement {
  return containerBandPlacementFromCode(dimensions.sleeveBandPlacement);
}

export function sleeveFieldValuesFromDimensions(
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const f of SLEEVE_CONFIGURATOR.fields) {
    const stored = dimensions[f.dimensionKey];
    const ok = stored != null && Number.isFinite(stored) && stored > 0;
    vals[f.id] = ok ? (stored as number) : f.defaultVal;
  }
  vals.placement = containerBandPlacementCode(sleeveBandPlacementFromDimensions(dimensions));
  return vals;
}

export function seedSleeveDimensionPatch(
  dimensions: Record<string, number | undefined>
): Record<string, number> {
  const patch: Record<string, number> = {
    numberOfUps: 1,
    extraPrintingTrimMm: 0,
    piecesPerCut: 1,
  };
  if (dimensions.sleeveBandPlacement == null || !Number.isFinite(dimensions.sleeveBandPlacement)) {
    patch.sleeveBandPlacement = containerBandPlacementCode('full');
  }
  for (const f of SLEEVE_CONFIGURATOR.fields) {
    const prevVal = dimensions[f.dimensionKey];
    const shouldReplace = prevVal == null || !Number.isFinite(prevVal) || (prevVal ?? 0) <= 0;
    if (shouldReplace) patch[f.dimensionKey] = f.defaultVal;
  }
  const lf = patch.layFlatValue ?? dimensions.layFlatValue;
  if (lf != null && Number.isFinite(lf) && lf > 0) {
    const rw = dimensions.reelWidthMm;
    if (rw == null || !Number.isFinite(rw) || rw <= 0) patch.reelWidthMm = lf;
  }
  return patch;
}

/** Persist lay-flat as reel width for engine pieces/kg + LM/kg. */
export function sleeveDimensionsPatchFromFields(
  fieldId: string,
  value: number,
  fieldVals: Record<string, number>
): Record<string, number> {
  const f = SLEEVE_CONFIGURATOR.fields.find((x) => x.id === fieldId);
  if (!f) return {};
  const patch: Record<string, number> = { [f.dimensionKey]: value };
  const lf = fieldId === 'LF' ? value : fieldVals.LF;
  if (lf > 0) patch.reelWidthMm = lf;
  return patch;
}
