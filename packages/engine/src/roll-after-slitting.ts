/** Standard core inside diameters (mm) — 3", 5", 6". */
export const CORE_INSIDE_MM_BY_INCH = {
  3: 76.2,
  5: 127,
  6: 152.4,
} as const;

export type CoreInchPreset = keyof typeof CORE_INSIDE_MM_BY_INCH;

export const DEFAULT_CORE_INCH: CoreInchPreset = 6;
export const DEFAULT_CORE_THICKNESS_MM = 12;
export const DEFAULT_TARGET_OD_MM = 600;
/** Cardboard core density (g/cm³) for total roll weight. */
export const DEFAULT_CORE_DENSITY_GCM3 = 0.75;

export type RollSpecDriver = 'weight' | 'od';

export interface RollSpecInput {
  reelWidthMm: number;
  cutoffMm: number;
  piecesPerCut?: number;
  totalGsm: number;
  filmDensityGcm3: number;
  coreInsideDiameterMm: number;
  coreThicknessMm: number;
  requiredRollWeightKg: number;
  rollOutsideDiameterMm?: number;
  driver?: RollSpecDriver;
  coreDensityGcm3?: number;
}

export interface RollSpecResult {
  coreOdMm: number;
  rollOutsideDiameterMm: number;
  filmOnRollWeightKg: number;
  coreWeightKg: number;
  totalRollWeightKg: number;
  filmOnRollLengthM: number;
  piecesPerRoll: number;
  wrapsPerCircumference: number;
}

export function coreOdMm(coreInsideDiameterMm: number, coreThicknessMm: number): number {
  return Math.max(0, coreInsideDiameterMm) + 2 * Math.max(0, coreThicknessMm);
}

export function effectiveFilmDensityGcm3(totalGsm: number, filmDensityGcm3: number): number {
  if (filmDensityGcm3 > 0) return filmDensityGcm3;
  if (totalGsm > 0) return totalGsm / 50;
  return 1;
}

/** Film weight on roll (kg) from outer OD — Laravel / legacy parity. */
export function filmWeightKgFromOd(
  rollOdMm: number,
  coreOd: number,
  reelWidthMm: number,
  filmDensityGcm3: number
): number {
  if (rollOdMm <= 0 || reelWidthMm <= 0 || filmDensityGcm3 <= 0) return 0;
  const rOuterCm = rollOdMm / 2 / 10;
  const rInnerCm = coreOd / 2 / 10;
  const wCm = reelWidthMm / 10;
  if (rOuterCm <= rInnerCm) return 0;
  return (Math.PI * (rOuterCm ** 2 - rInnerCm ** 2) * wCm * filmDensityGcm3) / 1000;
}

/** Roll OD (mm) from required film weight (kg). */
export function rollOdMmFromWeight(
  weightKg: number,
  coreOd: number,
  reelWidthMm: number,
  filmDensityGcm3: number
): number {
  if (weightKg <= 0 || reelWidthMm <= 0 || filmDensityGcm3 <= 0) return coreOd;
  const wCm = reelWidthMm / 10;
  const rInnerCm = coreOd / 2 / 10;
  const areaCm2 = (weightKg * 1000) / filmDensityGcm3 / wCm;
  const rOuterCm = Math.sqrt(areaCm2 / Math.PI + rInnerCm ** 2);
  return Math.max(coreOd, rOuterCm * 2 * 10);
}

/** Film length on roll (m) from weight and GSM. */
export function filmLengthMFromWeight(weightKg: number, reelWidthMm: number, totalGsm: number): number {
  if (weightKg <= 0 || reelWidthMm <= 0 || totalGsm <= 0) return 0;
  return (weightKg * 1_000_000) / (reelWidthMm * totalGsm);
}

export function piecesPerRoll(lengthM: number, cutoffMm: number, piecesPerCut = 1): number {
  if (lengthM <= 0 || cutoffMm <= 0) return 0;
  return Math.floor((lengthM * 1000) / cutoffMm) * Math.max(1, piecesPerCut);
}

export function wrapsPerCircumference(rollOdMm: number, cutoffMm: number, max = 60): number {
  if (rollOdMm <= 0 || cutoffMm <= 0) return 0;
  return Math.max(1, Math.min(max, Math.round((Math.PI * rollOdMm) / cutoffMm)));
}

/** Cardboard core weight (kg) from annulus volume × density. */
export function coreWeightKg(
  coreInsideDiameterMm: number,
  coreThicknessMm: number,
  reelWidthMm: number,
  coreDensityGcm3 = DEFAULT_CORE_DENSITY_GCM3
): number {
  const coreOd = coreOdMm(coreInsideDiameterMm, coreThicknessMm);
  if (reelWidthMm <= 0 || coreOd <= coreInsideDiameterMm || coreDensityGcm3 <= 0) return 0;
  const rOuterCm = coreOd / 2 / 10;
  const rInnerCm = Math.max(0, coreInsideDiameterMm) / 2 / 10;
  const wCm = reelWidthMm / 10;
  return (Math.PI * (rOuterCm ** 2 - rInnerCm ** 2) * wCm * coreDensityGcm3) / 1000;
}

/** Weight- or OD-driven roll spec; net film + core + total roll weight. */
export function computeRollSpec(input: RollSpecInput): RollSpecResult {
  const coreOd = coreOdMm(input.coreInsideDiameterMm, input.coreThicknessMm);
  const density = effectiveFilmDensityGcm3(input.totalGsm, input.filmDensityGcm3);
  const driver = input.driver ?? 'weight';
  const targetOd = input.rollOutsideDiameterMm ?? 0;

  let weight: number;
  let od: number;

  if (driver === 'od' && targetOd > coreOd) {
    od = targetOd;
    weight = filmWeightKgFromOd(od, coreOd, input.reelWidthMm, density);
  } else {
    weight = Math.max(0, input.requiredRollWeightKg);
    od = rollOdMmFromWeight(weight, coreOd, input.reelWidthMm, density);
  }

  const length = filmLengthMFromWeight(weight, input.reelWidthMm, input.totalGsm);
  const ppc = Math.max(1, input.piecesPerCut ?? 1);
  const coreW = coreWeightKg(
    input.coreInsideDiameterMm,
    input.coreThicknessMm,
    input.reelWidthMm,
    input.coreDensityGcm3
  );

  return {
    coreOdMm: coreOd,
    rollOutsideDiameterMm: od,
    filmOnRollWeightKg: weight,
    coreWeightKg: coreW,
    totalRollWeightKg: weight + coreW,
    filmOnRollLengthM: length,
    piecesPerRoll: piecesPerRoll(length, input.cutoffMm, ppc),
    wrapsPerCircumference: wrapsPerCircumference(od, input.cutoffMm),
  };
}

/** Primary path: user enters film weight → derive OD, length, pieces. */
export function computeRollSpecFromWeight(input: RollSpecInput): RollSpecResult {
  return computeRollSpec({ ...input, driver: 'weight' });
}

/** OD-driven path: user enters roll OD → derive net film weight. */
export function computeRollSpecFromOd(
  input: Omit<RollSpecInput, 'driver' | 'requiredRollWeightKg'> & {
    rollOutsideDiameterMm: number;
    requiredRollWeightKg?: number;
  }
): RollSpecResult {
  return computeRollSpec({
    ...input,
    requiredRollWeightKg: input.requiredRollWeightKg ?? 0,
    driver: 'od',
  });
}

/** Seed default weight for a target OD (e.g. 600 mm labels default). */
export function weightKgForTargetOd(
  targetOdMm: number,
  reelWidthMm: number,
  totalGsm: number,
  filmDensityGcm3: number,
  coreInsideDiameterMm: number,
  coreThicknessMm: number
): number {
  const coreOd = coreOdMm(coreInsideDiameterMm, coreThicknessMm);
  const density = effectiveFilmDensityGcm3(totalGsm, filmDensityGcm3);
  return filmWeightKgFromOd(targetOdMm, coreOd, reelWidthMm, density);
}
