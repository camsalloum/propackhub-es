import { describe, expect, it } from 'vitest';
import {
  computeRollSpec,
  computeRollSpecFromWeight,
  coreOdMm,
  filmLengthMFromWeight,
  filmWeightKgFromOd,
  rollOdMmFromWeight,
  weightKgForTargetOd,
} from './roll-after-slitting';

describe('roll-after-slitting', () => {
  const base = {
    reelWidthMm: 250,
    cutoffMm: 100,
    piecesPerCut: 1,
    totalGsm: 115,
    filmDensityGcm3: 1.0,
    coreInsideDiameterMm: 76.2,
    coreThicknessMm: 12,
  };

  it('core OD = inside + 2×thickness', () => {
    expect(coreOdMm(76.2, 12)).toBeCloseTo(100.2, 1);
  });

  it('weight → OD → weight round-trip', () => {
    const coreOd = coreOdMm(base.coreInsideDiameterMm, base.coreThicknessMm);
    const w = 63.39;
    const od = rollOdMmFromWeight(w, coreOd, base.reelWidthMm, base.filmDensityGcm3);
    const w2 = filmWeightKgFromOd(od, coreOd, base.reelWidthMm, base.filmDensityGcm3);
    expect(w2).toBeCloseTo(w, 1);
    expect(od).toBeGreaterThan(coreOd);
  });

  it('length from weight and GSM', () => {
    const len = filmLengthMFromWeight(63.39, 250, 115);
    expect(len).toBeCloseTo(2208, -1);
  });

  it('computeRollSpecFromWeight returns pieces and wraps', () => {
    const r = computeRollSpecFromWeight({ ...base, requiredRollWeightKg: 63.39 });
    expect(r.filmOnRollLengthM).toBeGreaterThan(1000);
    expect(r.piecesPerRoll).toBeGreaterThan(0);
    expect(r.wrapsPerCircumference).toBeGreaterThan(0);
    expect(r.rollOutsideDiameterMm).toBeGreaterThan(r.coreOdMm);
    expect(r.coreWeightKg).toBeGreaterThan(0);
    expect(r.totalRollWeightKg).toBeCloseTo(r.filmOnRollWeightKg + r.coreWeightKg, 5);
  });

  it('OD-driven spec matches weight at target OD', () => {
    const coreOd = coreOdMm(152.4, 12);
    const spec = computeRollSpec({
      reelWidthMm: 800,
      cutoffMm: 200,
      totalGsm: 50,
      filmDensityGcm3: 1,
      coreInsideDiameterMm: 152.4,
      coreThicknessMm: 12,
      requiredRollWeightKg: 0,
      rollOutsideDiameterMm: 600,
      driver: 'od',
    });
    expect(spec.rollOutsideDiameterMm).toBeCloseTo(600, 0);
    expect(spec.filmOnRollWeightKg).toBeGreaterThan(0);
    expect(spec.filmOnRollWeightKg).toBeCloseTo(
      filmWeightKgFromOd(600, coreOd, 800, 1),
      1
    );
  });

  it('weightKgForTargetOd matches forward weight at target OD', () => {
    const w = weightKgForTargetOd(600, 800, 50, 1.0, 152.4, 12);
    const spec = computeRollSpecFromWeight({
      reelWidthMm: 800,
      cutoffMm: 200,
      totalGsm: 50,
      filmDensityGcm3: 1,
      coreInsideDiameterMm: 152.4,
      coreThicknessMm: 12,
      requiredRollWeightKg: w,
    });
    expect(spec.rollOutsideDiameterMm).toBeCloseTo(600, 0);
  });
});
