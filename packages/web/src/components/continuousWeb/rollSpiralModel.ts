/**
 * Physical model of a wound film roll as an Archimedean spiral.
 *
 * A roll is NOT a stack of concentric circles. It is one continuous spiral
 * whose radius grows by one film-thickness `t` per turn:
 *
 *   r(Θ) = r0 + (t / 2π)·Θ          (Θ cumulative across all turns)
 *
 * A cut-off (CO) repeat occurs every fixed LENGTH of film along that spiral,
 * so the angular span of a repeat SHRINKS as the radius grows. Placing repeat
 * marks at equal angles (360° / N) is the bug this model exists to kill.
 *
 * Arc length to angle Θ (small-thickness approximation, exact enough here):
 *   s(Θ) ≈ r0·Θ + (t / 4π)·Θ²
 *
 * The k-th repeat sits where s(Θ_k) = k·CO, i.e. the quadratic
 *   (t / 4π)·Θ² + r0·Θ − k·CO = 0
 * solved as
 *   Θ_k = [ −r0 + √(r0² + (t/π)·k·CO) ] / (t / 2π)
 */

const TAU = Math.PI * 2;

export interface SpiralInput {
  /** Core outer diameter (mm) — inner radius of the wind. */
  coreDiameterMm: number;
  /** Finished roll outer diameter (mm). */
  outerDiameterMm: number;
  /** Total wound film length (mm). When known, film thickness is pinned to it. */
  filmLengthMm?: number;
  /** Cut-off / repeat length (mm). */
  cutOffMm?: number;
  /** Visible turns to assume when film length is unknown (schematic fallback). */
  fallbackTurns?: number;
}

export interface SpiralModel {
  /** Core (start) radius, mm. */
  r0: number;
  /** Outer (end) radius, mm. */
  R: number;
  /** Film thickness = radial growth per turn, mm. */
  t: number;
  /** Spiral constant b = t / 2π (radial growth per radian). */
  b: number;
  /** True total number of turns from core to OD. */
  turns: number;
  /** True total repeat count over the whole wind (filmLength / CO). */
  totalRepeats: number;
  /** Whether film thickness came from a real film length (vs schematic fallback). */
  fromLength: boolean;
  /** Radius (mm) at cumulative angle Θ (rad). */
  radiusAtTheta: (theta: number) => number;
  /** Arc length (mm) from wind start to cumulative angle Θ (rad). */
  arcLenAtTheta: (theta: number) => number;
  /** Cumulative angle Θ (rad) of the k-th cut-off repeat (k ≥ 1). */
  thetaAtRepeat: (k: number) => number;
}

/**
 * Film thickness from roll build-up: the film's edge cross-section (t × length)
 * equals the wound annulus area, so
 *   t = π·(rollOD² − coreOD²) / (4 · filmLength)
 */
export function filmThicknessMm(
  outerDiameterMm: number,
  coreDiameterMm: number,
  filmLengthMm: number
): number {
  if (filmLengthMm <= 0) return 0;
  const annulus = Math.PI * (outerDiameterMm ** 2 - coreDiameterMm ** 2);
  return annulus / (4 * filmLengthMm);
}

export function buildSpiralModel(input: SpiralInput): SpiralModel {
  const r0 = Math.max(0.1, input.coreDiameterMm / 2);
  const R = Math.max(r0 + 0.1, input.outerDiameterMm / 2);
  const fallbackTurns = Math.max(2, input.fallbackTurns ?? 28);

  const hasLength = !!input.filmLengthMm && input.filmLengthMm > 0;
  const t = hasLength
    ? Math.max(1e-6, filmThicknessMm(2 * R, 2 * r0, input.filmLengthMm!))
    : (R - r0) / fallbackTurns;
  const b = t / TAU;

  const thetaMax = (R - r0) / b;
  const arcLenAtTheta = (theta: number) => r0 * theta + (b / 2) * theta * theta;

  const CO = input.cutOffMm && input.cutOffMm > 0 ? input.cutOffMm : 0;
  const totalArcMm = hasLength ? input.filmLengthMm! : arcLenAtTheta(thetaMax);
  const totalRepeats = CO > 0 ? Math.floor(totalArcMm / CO) : 0;

  const thetaAtRepeat = (k: number) => {
    if (CO <= 0 || k <= 0) return 0;
    return (-r0 + Math.sqrt(r0 * r0 + 2 * b * k * CO)) / b;
  };

  return {
    r0,
    R,
    t,
    b,
    turns: thetaMax / TAU,
    totalRepeats,
    fromLength: hasLength,
    radiusAtTheta: (theta: number) => r0 + b * theta,
    arcLenAtTheta,
    thetaAtRepeat,
  };
}

export interface Pt2 {
  x: number;
  y: number;
}

/**
 * A continuous Archimedean spiral from the core to the OD, sampled for drawing.
 *
 * Real rolls have thousands of turns (radially sub-pixel), so drawing every
 * turn is impossible and pointless. This renders a REPRESENTATIVE spiral with a
 * readable number of visible turns — still one continuous growing curve (not
 * concentric rings), just at a legible winding pitch. Tick placement uses the
 * TRUE model above; this is only the winding texture.
 */
export function representativeSpiralPoints(
  r0: number,
  R: number,
  visibleTurns: number,
  pointsPerTurn = 48
): Pt2[] {
  const turns = Math.max(1, visibleTurns);
  const steps = Math.max(8, Math.round(turns * pointsPerTurn));
  const thetaMax = turns * TAU;
  const growth = (R - r0) / thetaMax;
  const pts: Pt2[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * thetaMax;
    const r = r0 + growth * theta;
    pts.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
  }
  return pts;
}
