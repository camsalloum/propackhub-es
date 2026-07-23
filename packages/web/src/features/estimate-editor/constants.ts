import { DEFAULT_MASTER_REFERENCE } from '../../lib/masterDataReference';

export const DEFAULT_PRODUCT_TYPE_OPTIONS = DEFAULT_MASTER_REFERENCE.productTypeOptions;
export const DEFAULT_UNIT_OPTIONS = DEFAULT_MASTER_REFERENCE.unitOptions;

/** Fallback unit-code → basis for legacy units stored without metadata. */
export const LEGACY_UNIT_BASIS: Record<string, string> = {
  kgs: 'kg', kg: 'kg', kpcs: 'pieces', sqm: 'sqm', lm: 'lm', roll_500_lm: 'lm',
};

/** EXW = buyer collects — no freight; charge is always 0 and locked. */
export const isExwDelivery = (term: string | null | undefined) =>
  String(term ?? '').trim().toUpperCase() === 'EXW';

export const LAYER_TYPE_LABELS: Record<string, string> = {
  substrate: 'Substrate',
  ink: 'Ink & Coating',
  adhesive: 'Adhesive',
};

/** Short labels for the fixed-width structure table Type column */
export const LAYER_TYPE_TABLE_LABELS: Record<string, string> = {
  substrate: 'Substrate',
  ink: 'Ink',
  adhesive: 'Adhesive',
};
