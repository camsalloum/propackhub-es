import type { Material } from './types';

export type LayerMaterialRef = { materialId: string };

type MaterialLookup = Map<string, Material> | Material[] | Record<string, Material>;

function getMaterial(lookup: MaterialLookup, materialId: string): Material | undefined {
  if (lookup instanceof Map) return lookup.get(materialId);
  if (Array.isArray(lookup)) return lookup.find((m) => m.id === materialId);
  return lookup[materialId];
}

/**
 * Legacy persistence label — derived from ink layers, **not** a costing input.
 * UV ink in stack → `narrow_web`; SB-only or no ink → `wide_web`.
 * Costing uses `isSolventBased` on each ink/adhesive row + `inkPrintingProcess` for SB makeup.
 */
export function derivePrintingWebClass(
  layers: LayerMaterialRef[],
  materials: MaterialLookup
): 'wide_web' | 'narrow_web' {
  return stackHasUvInk(layers, materials) ? 'narrow_web' : 'wide_web';
}

/** True when any ink layer is UV (non–solvent-based). */
export function stackHasUvInk(
  layers: LayerMaterialRef[],
  materials: MaterialLookup
): boolean {
  return layers.some((layer) => {
    const material = getMaterial(materials, layer.materialId);
    return material?.type === 'ink' && !material.isSolventBased;
  });
}

/** True when any ink layer is solvent-based (SB). Drives ink makeup + press cleaning. */
export function stackHasSbInk(
  layers: LayerMaterialRef[],
  materials: MaterialLookup
): boolean {
  return layers.some((layer) => {
    const material = getMaterial(materials, layer.materialId);
    return material?.type === 'ink' && Boolean(material.isSolventBased);
  });
}

/**
 * Solvent-mix block applies when SB ink and/or SB adhesive is in the stack.
 * UV ink alone does not trigger lamination or ink-makeup solvent; SB adhesive still does.
 */
export function stackNeedsSolventMix(
  layers: LayerMaterialRef[],
  materials: MaterialLookup
): boolean {
  return layers.some((layer) => {
    const material = getMaterial(materials, layer.materialId);
    if (!material) return false;
    return (
      (material.type === 'ink' || material.type === 'adhesive') &&
      Boolean(material.isSolventBased)
    );
  });
}
