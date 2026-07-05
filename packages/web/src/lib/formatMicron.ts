/** Display micron truncated to 2 decimals (no rounding). */
export function formatMicronDisplay(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return '—';
  const truncated = Math.trunc(v * 100) / 100;
  return truncated.toFixed(2);
}
