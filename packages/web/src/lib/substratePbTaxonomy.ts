/**
 * PEBI Item Master substrate families + grades (cat_desc).
 * Authoritative runtime data: mes_material_profile_configs in PEBI.
 * This file drives ES Master Data → Substrates family sub-tabs and PET normalization.
 */

export type SubstrateFamilyTab = {
  /** Tab id — PB family name or ES-only bucket id */
  id: string;
  label: string;
  /** ES `substrateFamily` values shown under this tab */
  esFamilies: string[];
};

/** PB film families (order matches PEBI Item Master). */
export const PB_SUBSTRATE_FAMILIES = [
  'Aluminium Foil',
  'Alu/Pap',
  'BOPP',
  'CPP',
  'PA',
  'PAP',
  'PE',
  'PET',
  'PETC',
  'PETG',
  'PVC',
] as const;

/** ES substrate family → PB family (null = ES-only grouping tab). */
export const ES_FAMILY_TO_PB: Record<string, string | null> = {
  BOPP: 'BOPP',
  PET: 'PET',
  PE: 'PE',
  CPP: 'CPP',
  PA: 'PA',
  ALU: 'Aluminium Foil',
  PAPER: 'PAP',
  SLEEVE: null,
  SPECIALTY: null,
};

/** Sub-tabs under Master Data → Substrates. */
export const SUBSTRATE_FAMILY_TABS: SubstrateFamilyTab[] = [
  ...PB_SUBSTRATE_FAMILIES.map((pb) => ({
    id: pb,
    label: pb,
    esFamilies: Object.entries(ES_FAMILY_TO_PB)
      .filter(([, mapped]) => mapped === pb)
      .map(([es]) => es),
  })),
  { id: 'SLEEVE', label: 'SLEEVE', esFamilies: ['SLEEVE'] },
  { id: 'SPECIALTY', label: 'SPECIALTY', esFamilies: ['SPECIALTY'] },
];

/** PET grades in PEBI (cat_desc) — Phase 4 Family 1. */
export const PB_PET_GRADES = [
  'PET Transparent  NF NB ChemTr.',
  'PET Transparent  HF NB',
  'PET Metalized  NF NB',
  'PET Metalized HF HB',
  'PET Metalized  HF NB',
  'PET White',
  'PET Matt NF ChemTr.',
  'PET Transparent  Twist',
  'PET Twist White',
  'PET Twist Metalized',
  'PET Adhesive Film',
] as const;

export type PetGradeCrosswalk = {
  platformMasterKey: string;
  pbGrade: (typeof PB_PET_GRADES)[number];
};

export const PET_PB_CROSSWALK: PetGradeCrosswalk[] = [
  { platformMasterKey: 'pet-transparent', pbGrade: 'PET Transparent  NF NB ChemTr.' },
  { platformMasterKey: 'pet-transparent-hr', pbGrade: 'PET Transparent  HF NB' },
  { platformMasterKey: 'pet-metalized', pbGrade: 'PET Metalized  NF NB' },
  { platformMasterKey: 'pet-metalized-hb', pbGrade: 'PET Metalized HF HB' },
  { platformMasterKey: 'pet-metalized-hf', pbGrade: 'PET Metalized  HF NB' },
  { platformMasterKey: 'pet-white', pbGrade: 'PET White' },
  { platformMasterKey: 'pet-matte', pbGrade: 'PET Matt NF ChemTr.' },
  { platformMasterKey: 'pet-twist-transparent', pbGrade: 'PET Transparent  Twist' },
  { platformMasterKey: 'pet-twist-white', pbGrade: 'PET Twist White' },
  { platformMasterKey: 'pet-twist-metalized', pbGrade: 'PET Twist Metalized' },
  { platformMasterKey: 'pet-adhesive-film', pbGrade: 'PET Adhesive Film' },
];

export function pbGradeKey(family: string, grade: string): string {
  return `${family}|${grade}`;
}

export function isPbLinkedRow(row: {
  externalSource?: string | null;
  externalId?: string | null;
}): boolean {
  return row.externalSource === 'pebi' && Boolean(row.externalId);
}

export function filterSubstrateMaterialsByFamilyTab<T extends { substrateFamily?: string | null }>(
  rows: T[],
  familyTabId: string
): T[] {
  const tab = SUBSTRATE_FAMILY_TABS.find((t) => t.id === familyTabId);
  if (!tab) return rows;
  if (tab.esFamilies.length === 0) return [];
  return rows.filter((m) => tab.esFamilies.includes(m.substrateFamily ?? ''));
}

export function sortPetSubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  const pbOrder = new Map<string, number>();
  PET_PB_CROSSWALK.forEach((row, i) => pbOrder.set(row.platformMasterKey, i));

  return [...rows].sort((a, b) => {
    const aKey = a.key ?? '';
    const bKey = b.key ?? '';
    const aPb = pbOrder.get(aKey);
    const bPb = pbOrder.get(bKey);
    if (aPb != null && bPb != null) return aPb - bPb;
    if (aPb != null) return -1;
    if (bPb != null) return 1;
    return (a.substrateGrade ?? '').localeCompare(b.substrateGrade ?? '');
  });
}
