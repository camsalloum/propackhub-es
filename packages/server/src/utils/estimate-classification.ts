/** Snapshot stored on estimates.dimensions for list filtering (mirrors web templateCatalog). */

export type StructureTier = 'mono' | 'duplex' | 'triplex' | 'quadriplex';

export interface EstimateClassificationSnapshot {
  materialClass: 'PE' | 'Non PE' | null;
  isPrinted: boolean;
  structure: StructureTier;
  productType: string;
}

interface LayerLike {
  layer_type?: string;
  materialType?: string;
}

function substrateCount(layers: LayerLike[]): number {
  return layers.filter((l) => (l.layer_type || l.materialType) === 'substrate').length;
}

export function deriveStructureTierFromSubstrates(count: number): StructureTier {
  if (count >= 4) return 'quadriplex';
  if (count === 3) return 'triplex';
  if (count >= 2) return 'duplex';
  return 'mono';
}

function isPrintedStack(layers: LayerLike[], jobName?: string | null): boolean {
  if (/printed/i.test(jobName || '')) return true;
  return layers.some((l) => (l.layer_type || l.materialType) === 'ink');
}

export function buildEstimateClassificationSnapshot(input: {
  jobName?: string | null;
  productType: string;
  materialClass?: string | null;
  layers: LayerLike[];
}): EstimateClassificationSnapshot {
  const mc = input.materialClass?.trim();
  const materialClass: EstimateClassificationSnapshot['materialClass'] =
    mc === 'PE' ? 'PE' : mc === 'Non PE' ? 'Non PE' : null;

  return {
    materialClass,
    isPrinted: isPrintedStack(input.layers, input.jobName),
    structure: deriveStructureTierFromSubstrates(substrateCount(input.layers)),
    productType: input.productType,
  };
}

export function stripConfigureFromTemplateFlag(
  dimensions: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const base =
    dimensions && typeof dimensions === 'object' && !Array.isArray(dimensions)
      ? { ...dimensions }
      : {};
  delete base.configureFromTemplate;
  return base;
}

export function mergeEstimateDimensionsClassification(
  dimensions: Record<string, unknown> | null | undefined,
  snapshot: EstimateClassificationSnapshot
): Record<string, unknown> {
  const base = stripConfigureFromTemplateFlag(dimensions);
  return { ...base, estimateClassification: snapshot };
}
