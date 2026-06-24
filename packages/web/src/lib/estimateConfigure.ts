/** Validation + dimension cleanup for template → estimate configure flow. */

export function dimensionsForSave(
  dimensions: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...dimensions };
  delete next.configureFromTemplate;
  return next;
}

export function estimateNeedsConfiguration(dimensions?: Record<string, unknown> | null): boolean {
  return Boolean(dimensions?.configureFromTemplate);
}

export function validateConfiguredEstimate(input: {
  layers: Array<{ micron: number }>;
  productType: string;
  dimensions: Record<string, unknown>;
}): string | null {
  if (input.layers.length === 0) return 'Add at least one layer.';
  if (input.layers.some((l) => !l.micron || l.micron <= 0)) {
    return 'Set thickness (µ) for every layer in Structure.';
  }

  if (input.productType === 'roll' || input.productType === 'sleeve') {
    const w = Number(input.dimensions.reelWidthMm || 0);
    const c = Number(input.dimensions.cutoffMm || 0);
    if (w <= 0 || c <= 0) return 'Set reel width and cutoff in Dimensions.';
  }

  if (input.productType === 'pouch' || input.productType === 'bag') {
    const w = Number(input.dimensions.openWidthMm || 0);
    const h = Number(input.dimensions.openHeightMm || 0);
    if (w <= 0 || h <= 0) return 'Set width and height in Dimensions.';
  }

  return null;
}
