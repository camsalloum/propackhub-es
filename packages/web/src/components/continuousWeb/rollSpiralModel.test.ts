import { describe, it, expect } from 'vitest';
import { buildSpiralModel, filmThicknessMm } from './rollSpiralModel';

const TAU = Math.PI * 2;

describe('rollSpiralModel', () => {
  // RW 50 / CO 125 defaults: 6" core (176.4 mm OD), 600 mm roll OD, ~5166 m film.
  const input = {
    coreDiameterMm: 176.4,
    outerDiameterMm: 600,
    filmLengthMm: 5_166_000,
    cutOffMm: 125,
  };

  it('derives film thickness from roll build-up', () => {
    const t = filmThicknessMm(600, 176.4, 5_166_000);
    expect(t).toBeGreaterThan(0.04);
    expect(t).toBeLessThan(0.06); // ~50 microns
  });

  it('total repeats ≈ filmLength / CO (not a hardcoded number)', () => {
    const m = buildSpiralModel(input);
    expect(m.totalRepeats).toBe(Math.floor(5_166_000 / 125));
    expect(m.totalRepeats).toBeGreaterThan(40_000);
  });

  it('repeat angular spacing SHRINKS as k increases (the anti-fixed-angle check)', () => {
    const m = buildSpiralModel(input);
    const dTheta = (k: number) => m.thetaAtRepeat(k) - m.thetaAtRepeat(k - 1);
    const near = dTheta(2);
    const mid = dTheta(1000);
    const outer = dTheta(m.totalRepeats - 1);
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(outer);
    // Never equal spacing (that would be the bug).
    expect(near - outer).toBeGreaterThan(0.2);
  });

  it('the k-th repeat sits at arc length k·CO along the spiral', () => {
    const m = buildSpiralModel(input);
    for (const k of [1, 50, 5000, m.totalRepeats - 1]) {
      const s = m.arcLenAtTheta(m.thetaAtRepeat(k));
      expect(s).toBeCloseTo(k * 125, 0);
    }
  });

  it('radius grows by one film-thickness per full turn', () => {
    const m = buildSpiralModel(input);
    const r1 = m.radiusAtTheta(TAU);
    const r2 = m.radiusAtTheta(2 * TAU);
    expect(r2 - r1).toBeCloseTo(m.t, 6);
  });

  it('spiral spans exactly core → OD', () => {
    const m = buildSpiralModel(input);
    expect(m.r0).toBeCloseTo(88.2, 1);
    expect(m.R).toBeCloseTo(300, 1);
    expect(m.radiusAtTheta(m.turns * TAU)).toBeCloseTo(300, 0);
  });

  it('falls back to a schematic thickness when film length is unknown', () => {
    const m = buildSpiralModel({ coreDiameterMm: 176.4, outerDiameterMm: 600, cutOffMm: 125, fallbackTurns: 20 });
    expect(m.fromLength).toBe(false);
    expect(m.turns).toBeCloseTo(20, 0);
    expect(m.totalRepeats).toBeGreaterThan(0);
  });

  it('no cut-off → no repeats', () => {
    const m = buildSpiralModel({ coreDiameterMm: 176.4, outerDiameterMm: 600, filmLengthMm: 5_166_000 });
    expect(m.totalRepeats).toBe(0);
  });
});
