/** Split laminate structure summary into display lines (no ellipsis). */
export function structureDisplayLines(summary: string | null | undefined): string[] {
  const raw = String(summary ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}
