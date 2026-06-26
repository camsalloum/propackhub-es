import type { Material } from './types';

export type LayerMaterialRef = { materialId: string };

type MaterialLookup = Map<string, Material> | Material[] | Record<string, Material>;

function getMaterial(lookup: MaterialLookup, materialId: string): Material | undefined {
  if (lookup instanceof Map) return lookup.get(materialId);
  if (Array.isArray(lookup)) return lookup.find((m) => m.id === materialId);
  return lookup[materialId];
}

/** Narrow web when any ink layer is UV (non–solvent-based); otherwise wide web. */
export function derivePrintingWebClass(
  layers: LayerMaterialRef[],
  materials: MaterialLookup
): 'wide_web' | 'narrow_web' {
  const hasUvInk = layers.some((layer) => {
    const material = getMaterial(materials, layer.materialId);
    return material?.type === 'ink' && !material.isSolventBased;
  });
  return hasUvInk ? 'narrow_web' : 'wide_web';
}

/** True when any SB ink layer is in the stack (on-press makeup + cleaning). */
export function stackHasSbInk(
  layers: LayerMaterialRef[],
  materials: MaterialLookup
): boolean {
  return layers.some((layer) => {
    const material = getMaterial(materials, layer.materialId);
    return material?.type === 'ink' && Boolean(material.isSolventBased);
  });
}

/** Solvent mix applies when SB ink or SB adhesive is present in the stack. */
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
