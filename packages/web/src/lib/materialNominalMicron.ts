/** Materials whose grade encodes a standard gauge (e.g. alu-foil-9 → 9 µm). */

const ALU_FOIL_KEY_RE = /^alu-foil-(\d+)$/;
const MICRON_IN_NAME_RE = /(\d+(?:\.\d+)?)\s*µm/i;

export type MaterialNominalMicronInput = {
  platformMasterKey?: string | null;
  costingKey?: string | null;
  name?: string | null;
  substrateFamily?: string | null;
};

function materialKey(m: MaterialNominalMicronInput): string {
  return (m.platformMasterKey ?? m.costingKey ?? '').trim();
}

/** Nominal thickness when the grade key/name encodes it; null for open-gauge grades (PET, etc.). */
export function nominalMicronFromMaterial(m: MaterialNominalMicronInput): number | null {
  const key = materialKey(m);
  const keyMatch = key.match(ALU_FOIL_KEY_RE);
  if (keyMatch) {
    const n = Number(keyMatch[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  if (key === 'alu-foil' || key === 'aluminium-foil') return null;

  if ((m.substrateFamily ?? '').toUpperCase() === 'ALU') {
    const nameMatch = (m.name ?? '').match(MICRON_IN_NAME_RE);
    if (nameMatch) {
      const n = Number(nameMatch[1]);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  return null;
}

export function micronAfterMaterialChange(
  material: MaterialNominalMicronInput,
  currentMicron: number
): number {
  const nominal = nominalMicronFromMaterial(material);
  return nominal != null ? nominal : currentMicron;
}

export type LayerMaterialPatch = {
  materialId: string;
  materialName: string;
  costPerKgUsd: number;
  isSolventBased: boolean;
  hoover: string | null;
  micron: number;
  gsm: number;
};

export function layerFieldsFromMaterial(
  materialType: string,
  currentMicron: number,
  mat: MaterialNominalMicronInput & {
    id: string;
    name: string;
    costPerKgUsd: string | number;
    isSolventBased?: boolean;
    hoover?: string | null;
    density: string | number;
  }
): LayerMaterialPatch {
  const micron = micronAfterMaterialChange(mat, currentMicron);
  const density = parseFloat(String(mat.density)) || 0.9;
  const isSubstrate = materialType === 'substrate';
  return {
    materialId: mat.id,
    materialName: mat.name,
    costPerKgUsd: parseFloat(String(mat.costPerKgUsd)) || 0,
    isSolventBased: Boolean(mat.isSolventBased),
    hoover: mat.hoover ?? null,
    micron,
    gsm: isSubstrate ? micron * density : micron,
  };
}
