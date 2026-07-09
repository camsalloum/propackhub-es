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
  SPECIALTY: 'Alu/Pap',
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

/** ALU micron grades — PB subgroups under Plain Aluminium Foil. */
export const ALU_PB_CROSSWALK = [
  { platformMasterKey: 'alu-foil-7', pbGrade: 'Plain Aluminium Foil — 7 µm' },
  { platformMasterKey: 'alu-foil-8', pbGrade: 'Plain Aluminium Foil — 8 µm' },
  { platformMasterKey: 'alu-foil-9', pbGrade: 'Plain Aluminium Foil — 9 µm' },
  { platformMasterKey: 'alu-foil-12', pbGrade: 'Plain Aluminium Foil — 12 µm' },
] as const;

/** BOPP grades — PB cat_desc; HS Glossy + Low SIT share one ES key. */
export const BOPP_PB_CROSSWALK = [
  { platformMasterKey: 'bopp-transparent-hs', pbGrade: 'BOPP Transparent HS Glossy' },
  { platformMasterKey: 'bopp-transparent-hs', pbGrade: 'BOPP Transparent HS Low SIT' },
  { platformMasterKey: 'bopp-transparent-nhs', pbGrade: 'BOPP Transparent NHS Regular' },
  { platformMasterKey: 'bopp-transparent-hr', pbGrade: 'BOPP Transparent NHS-HR' },
  { platformMasterKey: 'bopp-transparent-lg', pbGrade: 'BOPP Transparent Label Grade' },
  { platformMasterKey: 'bopp-white-lg', pbGrade: 'BOPP White Label Grade' },
  { platformMasterKey: 'bopp-matte-transparent', pbGrade: 'BOPP Transparent HS Matt' },
  { platformMasterKey: 'bopp-metalized', pbGrade: 'BOPP Metalized HS Regular' },
  { platformMasterKey: 'bopp-metalized-hb', pbGrade: 'BOPP Metalized HS High Barrier' },
  { platformMasterKey: 'bopp-pearlized', pbGrade: 'BOPP White Pearlised' },
] as const;

/** CPP grades — PB cat_desc alignment. */
export const CPP_PB_CROSSWALK = [
  { platformMasterKey: 'cpp-transparent', pbGrade: 'CPP Transparent HS' },
  { platformMasterKey: 'cpp-metalized', pbGrade: 'CPP Metalized HS' },
  { platformMasterKey: 'cpp-white', pbGrade: 'CPP White' },
  { platformMasterKey: 'cpp-retort', pbGrade: 'CPP Retort' },
  { platformMasterKey: 'cpp-high-seal-strength', pbGrade: 'CPP High Seal Strength' },
] as const;

/** PA (BOPA) grades — PB cat_desc alignment. */
export const PA_PB_CROSSWALK = [
  { platformMasterKey: 'bopa-transparent', pbGrade: 'BOPA Transparent' },
  { platformMasterKey: 'bopa-transparent-hb', pbGrade: 'BOPA Transparent HB' },
  { platformMasterKey: 'pa-pe', pbGrade: 'PA/PE' },
] as const;

/** PAP grades — PB cat_desc alignment (ES substrateFamily PAPER). */
export const PAP_PB_CROSSWALK = [
  { platformMasterKey: 'gp-paper', pbGrade: 'Greaseproof Paper' },
  { platformMasterKey: 'kraft-paper-white', pbGrade: 'Kraft Paper' },
  { platformMasterKey: 'c1s-paper', pbGrade: 'Coated Paper' },
  { platformMasterKey: 'coated-paper-pe', pbGrade: 'Coated Paper-PE' },
  { platformMasterKey: 'twist-wrap-paper', pbGrade: 'Twist Wrap Paper' },
  { platformMasterKey: 'kraft-paper-brown', pbGrade: 'Kraft Paper Brown' },
  { platformMasterKey: 'mg-paper', pbGrade: 'MG Paper' },
] as const;

/** SLEEVE shrink grades — ES substrateFamily SLEEVE (PB: PETC, PETG, PVC). */
export const SLEEVE_PB_CROSSWALK = [
  { platformMasterKey: 'pvc-shrink-normal-shrink-blown', pbGrade: 'PVC Blow Shrink' },
  { platformMasterKey: 'pvc-shrink-high-shrink-cast', pbGrade: 'PVC High Shrink Cast' },
  { platformMasterKey: 'pet-shrink', pbGrade: 'PET-G Shrink' },
  { platformMasterKey: 'c-pet-shrink', pbGrade: 'PET-C Shrink' },
] as const;

/** SPECIALTY (Alu/Pap butter laminates) — ES substrateFamily SPECIALTY. */
export const SPECIALTY_PB_CROSSWALK = [
  { platformMasterKey: '7alu-10pe-30-gp-paper', pbGrade: 'Alu Foil Paper · 80 (60µ)' },
  { platformMasterKey: '7alu-10pe-35paper-12pe', pbGrade: 'Alu Foil Paper · 75' },
  { platformMasterKey: '7alu-10pe-40paper-12pe', pbGrade: 'Alu Foil Paper · 80' },
  { platformMasterKey: '6.3alu-10pe-50paper-12pe', pbGrade: 'Alu Foil Paper · 95' },
] as const;

/** Master Data substrate tab id → PEBI sync family for review panel. */
export const PEBI_REVIEW_FAMILY_BY_TAB: Record<string, string> = {
  PET: 'PET',
  'Aluminium Foil': 'ALU',
  BOPP: 'BOPP',
  CPP: 'CPP',
  PA: 'PA',
  PAP: 'PAP',
  SLEEVE: 'SLEEVE',
  SPECIALTY: 'SPECIALTY',
};

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
  return sortPbCrosswalkRows(rows, PET_PB_CROSSWALK);
}

export function sortAluSubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  return sortPbCrosswalkRows(rows, ALU_PB_CROSSWALK);
}

export function sortBoppSubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  return sortPbCrosswalkRows(rows, BOPP_PB_CROSSWALK);
}

export function sortCppSubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  return sortPbCrosswalkRows(rows, CPP_PB_CROSSWALK);
}

export function sortPaSubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  return sortPbCrosswalkRows(rows, PA_PB_CROSSWALK);
}

export function sortPapSubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  return sortPbCrosswalkRows(rows, PAP_PB_CROSSWALK);
}

export function sortSleeveSubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  return sortPbCrosswalkRows(rows, SLEEVE_PB_CROSSWALK);
}

export function sortSpecialtySubstrateRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[]
): T[] {
  return sortPbCrosswalkRows(rows, SPECIALTY_PB_CROSSWALK);
}

function sortPbCrosswalkRows<T extends { key?: string; substrateGrade?: string | null }>(
  rows: T[],
  crosswalk: ReadonlyArray<{ platformMasterKey: string }>
): T[] {
  const pbOrder = new Map<string, number>();
  crosswalk.forEach((row, i) => pbOrder.set(row.platformMasterKey, i));

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
