/** Labels parent PG / template context → order qty in kpcs (thousand pieces). */

export function isLabelsRollContext(input: {
  productType?: string;
  sourceTemplateKey?: string | null;
  jobName?: string | null;
  pebiParentPg?: string | null;
  dimensions?: Record<string, unknown>;
}): boolean {
  if (input.productType && input.productType !== 'roll') return false;
  const key = (input.sourceTemplateKey || '').toLowerCase();
  if (key.includes('label')) return true;
  const job = (input.jobName || '').toLowerCase();
  if (/\blabels?\b/.test(job)) return true;
  const pg = String(input.pebiParentPg || '').toLowerCase();
  if (pg.includes('label')) return true;
  const dims = input.dimensions || {};
  const tc = dims.templateClassification as Record<string, unknown> | undefined;
  const ec = dims.estimateClassification as Record<string, unknown> | undefined;
  const dimPg = String(tc?.pebiParentPg || tc?.parentPg || ec?.pebiParentPg || '').toLowerCase();
  if (dimPg.includes('label')) return true;
  return false;
}

/** Default order-quantity unit code for new estimates (tenant unit list must include the code). */
export function defaultOrderQuantityUnit(input: {
  productType: string;
  sourceTemplateKey?: string | null;
  jobName?: string | null;
  pebiParentPg?: string | null;
  dimensions?: Record<string, unknown>;
}): 'kpcs' | 'kgs' {
  if (input.productType === 'sleeve') return 'kpcs';
  if (input.productType === 'roll' && isLabelsRollContext(input)) return 'kpcs';
  return 'kgs';
}
