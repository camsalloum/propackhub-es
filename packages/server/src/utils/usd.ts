/** Round USD amounts to 2 decimal places (x.xx). */
export function roundUsd(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
