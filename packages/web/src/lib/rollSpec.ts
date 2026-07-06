import {
  CORE_INSIDE_MM_BY_INCH,
  DEFAULT_CORE_INCH,
  DEFAULT_CORE_THICKNESS_MM,
  DEFAULT_TARGET_OD_MM,
  type CoreInchPreset,
  type RollSpecDriver,
  type RollSpecResult,
  computeRollSpec,
  weightKgForTargetOd,
} from '@es/engine';

export {
  CORE_INSIDE_MM_BY_INCH,
  DEFAULT_CORE_INCH,
  DEFAULT_CORE_THICKNESS_MM,
  DEFAULT_TARGET_OD_MM,
  type CoreInchPreset,
  type RollSpecDriver,
  type RollSpecResult,
};

/** 1 = OD-driven, 0 or absent = weight-driven. */
export const ROLL_SPEC_OD_DRIVEN = 1;

export const ROLL_SPEC_DIMENSION_KEYS = [
  'coreInsideDiameterMm',
  'coreThicknessMm',
  'requiredRollWeightKg',
  'rollOutsideDiameterMm',
  'rollSpecOdDriven',
] as const;

export function coreInchFromInsideMm(insideMm: number): CoreInchPreset {
  const entries = Object.entries(CORE_INSIDE_MM_BY_INCH) as [string, number][];
  let best: CoreInchPreset = DEFAULT_CORE_INCH;
  let bestDiff = Infinity;
  for (const [inch, mm] of entries) {
    const d = Math.abs(insideMm - mm);
    if (d < bestDiff) {
      bestDiff = d;
      best = Number(inch) as CoreInchPreset;
    }
  }
  return best;
}

export function rollSpecDriverFromDimensions(
  dimensions: Record<string, number | undefined>
): RollSpecDriver {
  return dimensions.rollSpecOdDriven === ROLL_SPEC_OD_DRIVEN ? 'od' : 'weight';
}

export function rollSpecFromDimensions(
  dimensions: Record<string, number | undefined>,
  structure: { totalGsm: number; filmDensityGcm3: number },
  reelWidthMm: number,
  cutoffMm: number,
  piecesPerCut = 1
): RollSpecResult {
  const coreInside =
    dimensions.coreInsideDiameterMm != null && dimensions.coreInsideDiameterMm > 0
      ? dimensions.coreInsideDiameterMm
      : CORE_INSIDE_MM_BY_INCH[DEFAULT_CORE_INCH];
  const coreThickness =
    dimensions.coreThicknessMm != null && dimensions.coreThicknessMm >= 0
      ? dimensions.coreThicknessMm
      : DEFAULT_CORE_THICKNESS_MM;
  const driver = rollSpecDriverFromDimensions(dimensions);
  const storedOd =
    dimensions.rollOutsideDiameterMm != null && dimensions.rollOutsideDiameterMm > 0
      ? dimensions.rollOutsideDiameterMm
      : DEFAULT_TARGET_OD_MM;
  const weight =
    dimensions.requiredRollWeightKg != null && dimensions.requiredRollWeightKg > 0
      ? dimensions.requiredRollWeightKg
      : weightKgForTargetOd(
          DEFAULT_TARGET_OD_MM,
          reelWidthMm,
          structure.totalGsm,
          structure.filmDensityGcm3,
          coreInside,
          coreThickness
        );

  return computeRollSpec({
    reelWidthMm,
    cutoffMm,
    piecesPerCut,
    totalGsm: structure.totalGsm,
    filmDensityGcm3: structure.filmDensityGcm3,
    coreInsideDiameterMm: coreInside,
    coreThicknessMm: coreThickness,
    requiredRollWeightKg: weight,
    rollOutsideDiameterMm: storedOd,
    driver,
  });
}

export function seedRollSpecPatch(
  dimensions: Record<string, number | undefined>,
  reelWidthMm: number,
  totalGsm: number,
  filmDensityGcm3: number
): Record<string, number> {
  const patch: Record<string, number> = {};
  if (dimensions.coreInsideDiameterMm == null || dimensions.coreInsideDiameterMm <= 0) {
    patch.coreInsideDiameterMm = CORE_INSIDE_MM_BY_INCH[DEFAULT_CORE_INCH];
  }
  if (dimensions.coreThicknessMm == null || !Number.isFinite(dimensions.coreThicknessMm)) {
    patch.coreThicknessMm = DEFAULT_CORE_THICKNESS_MM;
  }
  if (dimensions.rollSpecOdDriven == null) {
    patch.rollSpecOdDriven = 0;
  }
  if (dimensions.requiredRollWeightKg == null || dimensions.requiredRollWeightKg <= 0) {
    const coreInside = patch.coreInsideDiameterMm ?? dimensions.coreInsideDiameterMm ?? CORE_INSIDE_MM_BY_INCH[6];
    const coreThickness = patch.coreThicknessMm ?? dimensions.coreThicknessMm ?? DEFAULT_CORE_THICKNESS_MM;
    patch.requiredRollWeightKg = weightKgForTargetOd(
      DEFAULT_TARGET_OD_MM,
      Math.max(1, reelWidthMm),
      Math.max(1, totalGsm),
      filmDensityGcm3,
      coreInside,
      coreThickness
    );
  }
  return patch;
}

export function patchNetFilmWeightKg(kg: number): Record<string, number> {
  return { requiredRollWeightKg: Math.max(1, Math.round(kg)), rollSpecOdDriven: 0 };
}

export function patchRollOdMm(odMm: number, coreOdMm: number): Record<string, number> {
  return {
    rollOutsideDiameterMm: Math.max(Math.round(coreOdMm), Math.round(odMm)),
    rollSpecOdDriven: ROLL_SPEC_OD_DRIVEN,
  };
}

export function formatRollSpecWeight(kg: number): string {
  return `${kg.toFixed(2)} kg`;
}

export function formatRollSpecLength(m: number): string {
  return `${Math.round(m).toLocaleString()} m`;
}
