import type { Estimate, Layer, Material } from './types';
import type { LayerMaterialRef } from './layer-stack';

export type InkPrintingProcess = 'flexo' | 'rotogravure';

/** Dry ink GSM ÷ ratio = on-press makeup solvent GSM (Excel model). Ratio from flexo/roto — not wide/narrow web. */
export const INK_SOLVENT_RATIO_FLEXO = 1.5;
export const INK_SOLVENT_RATIO_ROTOGRAVURE = 1.0;

const PE_FAMILY_CODES = new Set(['PE', 'LDPE', 'HDPE', 'MDPE', 'LLDPE', 'UHMWPE']);

function isPeSubstrate(material: Material): boolean {
  if (material.type !== 'substrate') return false;
  const fam = (material.substrateFamily ?? '').toUpperCase().trim();
  if (fam) {
    if (fam === 'PET' || fam === 'CPET' || fam.startsWith('PET ')) return false;
    if (PE_FAMILY_CODES.has(fam)) return true;
    if (fam === 'PE' || fam.startsWith('PE ')) return true;
  }
  const name = material.name.toUpperCase();
  if (/\bPET\b|\bCPET\b/.test(name) && !/\bLDPE|\bHDPE|\bMDPE|\bLLDPE/.test(name)) {
    return false;
  }
  return /\b(LDPE|HDPE|MDPE|LLDPE|UHMWPE)\b/.test(name);
}

/** PE stacks → flexo; PET/BOPP/PA/etc. → rotogravure (industry default). */
export function defaultInkPrintingProcess(
  layers: LayerMaterialRef[],
  materials: Map<string, Material> | Material[]
): InkPrintingProcess {
  const get = (id: string) =>
    materials instanceof Map
      ? materials.get(id)
      : (materials as Material[]).find((m) => m.id === id);

  const hasPe = layers.some((layer) => {
    const m = get(layer.materialId);
    return m ? isPeSubstrate(m) : false;
  });
  return hasPe ? 'flexo' : 'rotogravure';
}

export function inkSolventRatioForProcess(process: InkPrintingProcess): number {
  return process === 'flexo' ? INK_SOLVENT_RATIO_FLEXO : INK_SOLVENT_RATIO_ROTOGRAVURE;
}

export function resolveInkPrintingProcess(
  estimate: Estimate,
  materials: Map<string, Material>
): InkPrintingProcess {
  if (estimate.inkPrintingProcess) return estimate.inkPrintingProcess;
  return defaultInkPrintingProcess(estimate.layers, materials);
}

export function resolveInkSolventRatio(
  estimate: Estimate,
  materials: Map<string, Material>
): number {
  if (estimate.inkSolventRatio != null && estimate.inkSolventRatio > 0) {
    return estimate.inkSolventRatio;
  }
  return inkSolventRatioForProcess(resolveInkPrintingProcess(estimate, materials));
}

export function sumSbInkDryGsm(layers: Layer[], materials: Map<string, Material>): number {
  let dry = 0;
  layers.forEach((layer) => {
    const m = materials.get(layer.materialId);
    if (m?.type === 'ink' && m.isSolventBased) {
      dry += layer.gsm ?? layer.micron ?? 0;
    }
  });
  return dry;
}

export function calculateInkMakeupSolventCost(
  layers: Layer[],
  materials: Map<string, Material>,
  solventPrice: number,
  inkSolventRatio: number,
  totalGsm: number
): { costPerM2: number; costPerKg: number; dryInkGsm: number; makeupGsm: number } {
  const dryInkGsm = sumSbInkDryGsm(layers, materials);
  if (dryInkGsm <= 0 || inkSolventRatio <= 0) {
    return { costPerM2: 0, costPerKg: 0, dryInkGsm: 0, makeupGsm: 0 };
  }
  const makeupGsm = dryInkGsm / inkSolventRatio;
  const costPerM2 = (makeupGsm / 1000) * solventPrice;
  const costPerKg = totalGsm > 0 ? (costPerM2 / totalGsm) * 1000 : 0;
  return { costPerM2, costPerKg, dryInkGsm, makeupGsm };
}
