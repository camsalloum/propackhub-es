export type RequotePriceChange = {
  materialId: string;
  materialName: string;
  deltaPct: number;
  materialStale?: boolean;
};

/** Re-quote banner only when library prices moved or a material was removed. */
export function meaningfulRequotePriceChanges(
  changes: RequotePriceChange[] | null | undefined
): RequotePriceChange[] {
  return (changes ?? []).filter(
    (pc) => pc.materialStale || Math.abs(Number(pc.deltaPct) || 0) >= 0.05
  );
}
