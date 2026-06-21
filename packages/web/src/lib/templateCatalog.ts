export type TemplateCatalogFilter =
  | 'all'
  | 'pe_plain'
  | 'pe_printed'
  | 'non_pe_plain'
  | 'non_pe_printed'
  | 'labels'
  | 'sleeves'
  | 'duplex'
  | 'triplex'
  | 'quadriplex'
  | 'other';

export const TEMPLATE_CATALOG_FILTERS: Array<{ id: TemplateCatalogFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pe_plain', label: 'PE · Plain' },
  { id: 'pe_printed', label: 'PE · Printed' },
  { id: 'non_pe_plain', label: 'Non PE · Plain' },
  { id: 'non_pe_printed', label: 'Non PE · Printed' },
  { id: 'labels', label: 'Labels' },
  { id: 'sleeves', label: 'Sleeves' },
  { id: 'duplex', label: 'Duplex' },
  { id: 'triplex', label: 'Triplex' },
  { id: 'quadriplex', label: 'Quadriplex' },
  { id: 'other', label: 'Other' },
];

export interface TemplateCatalogInput {
  name: string;
  productType?: string | null;
  pebiParentPg?: string | null;
  materialClass?: string | null;
  structureType?: string | null;
  defaultLayers?: Array<{ layer_type?: string }> | null;
  isStandard?: boolean;
}

function substrateCount(layers?: TemplateCatalogInput['defaultLayers']): number {
  return (layers || []).filter((l) => l.layer_type === 'substrate').length;
}

function isPrintedTemplate(t: TemplateCatalogInput): boolean {
  if (/printed/i.test(t.name)) return true;
  return (t.defaultLayers || []).some((l) => l.layer_type === 'ink');
}

/** Catalog bucket for standard-template filtering (PRD parent PG taxonomy). */
export function deriveTemplateCatalogKey(t: TemplateCatalogInput): TemplateCatalogFilter {
  const name = t.name.toLowerCase();
  const pg = (t.pebiParentPg || '').toLowerCase();

  if (pg.includes('labels') || name === 'labels') return 'labels';
  if (t.productType === 'sleeve' || pg.includes('shrink sleeves') || name.includes('sleeve')) {
    return 'sleeves';
  }

  if (name.includes('quadriplex') || name.includes('quad')) return 'quadriplex';
  if (name.includes('triplex')) return 'triplex';
  if (name.includes('duplex')) return 'duplex';

  const substrates = substrateCount(t.defaultLayers);
  if (substrates >= 4) return 'quadriplex';
  if (substrates === 3) return 'triplex';
  if (substrates >= 2 && t.structureType === 'Multilayer') return 'duplex';

  const mc = t.materialClass?.trim();
  const printed = isPrintedTemplate(t);

  if (mc === 'PE' && !printed) return 'pe_plain';
  if (mc === 'PE' && printed) return 'pe_printed';
  if (mc === 'Non PE' && !printed) return 'non_pe_plain';
  if (mc === 'Non PE' && printed) return 'non_pe_printed';

  return 'other';
}

export function matchesCatalogFilter(
  template: TemplateCatalogInput,
  filter: TemplateCatalogFilter
): boolean {
  if (filter === 'all') return true;
  return deriveTemplateCatalogKey(template) === filter;
}

export type TemplateStructureTier = 'mono' | 'duplex' | 'triplex' | 'quadriplex';

export interface TemplateClassification {
  materialClass: 'PE' | 'Non PE' | null;
  isPrinted: boolean;
  structure: TemplateStructureTier;
}

/** Derive the 3-axis classification used by the picker grid. */
export function getTemplateClassification(t: TemplateCatalogInput): TemplateClassification {
  const mc = t.materialClass?.trim();
  const materialClass: TemplateClassification['materialClass'] =
    mc === 'PE' ? 'PE' : mc === 'Non PE' ? 'Non PE' : null;

  const isPrinted = isPrintedTemplate(t);

  const substrates = substrateCount(t.defaultLayers);
  let structure: TemplateStructureTier = 'mono';
  if (t.structureType === 'Multilayer') {
    if (substrates >= 4) structure = 'quadriplex';
    else if (substrates === 3) structure = 'triplex';
    else structure = 'duplex';
  }

  return { materialClass, isPrinted, structure };
}

export interface ClassFilter {
  materialClass: 'PE' | 'Non PE' | null;
  isPrinted: boolean | null;
  structure: TemplateStructureTier | null;
}

/** Returns true when a template matches every non-null axis in the filter. */
export function matchesClassFilter(t: TemplateCatalogInput, f: ClassFilter): boolean {
  const cls = getTemplateClassification(t);
  if (f.materialClass !== null && cls.materialClass !== f.materialClass) return false;
  if (f.isPrinted !== null && cls.isPrinted !== f.isPrinted) return false;
  if (f.structure !== null && cls.structure !== f.structure) return false;
  return true;
}
