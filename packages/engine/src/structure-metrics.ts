import type { Layer, Material } from './types';

const DEFAULT_INK_ADHESIVE_DENSITY = 1.0;

/** Physical thickness (µm) of one layer — substrate µ as entered; ink/adhesive = dry gsm ÷ density. */
export function layerPhysicalThicknessMicron(layer: Layer, material: Material): number {
  if (material.type === 'substrate') {
    return layer.micron;
  }
  const dryGsm = layer.gsm ?? layer.micron ?? 0;
  const density =
    material.density > 0 ? material.density : DEFAULT_INK_ADHESIVE_DENSITY;
  return dryGsm / density;
}

/** Sum of substrate layer microns only (quote / gauge language). */
export function calculateSubstrateGaugeMicron(
  layers: Layer[],
  materials: Map<string, Material>
): number {
  return layers.reduce((sum, layer) => {
    const material = materials.get(layer.materialId);
    if (!material || material.type !== 'substrate') return sum;
    return sum + layer.micron;
  }, 0);
}

/** Total physical construction thickness (µm) — all layers, Option C. */
export function calculateTotalConstructionMicron(
  layers: Layer[],
  materials: Map<string, Material>
): number {
  return layers.reduce((sum, layer) => {
    const material = materials.get(layer.materialId);
    if (!material) return sum;
    return sum + layerPhysicalThicknessMicron(layer, material);
  }, 0);
}

/** Composite structure density (g/cm³) = total gsm ÷ total construction µ. */
export function calculateStructureDensity(
  totalGsm: number,
  totalConstructionMicron: number
): number {
  if (totalGsm <= 0 || totalConstructionMicron <= 0) return 0;
  return totalGsm / totalConstructionMicron;
}
