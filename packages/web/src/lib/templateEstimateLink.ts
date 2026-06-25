import { apiClient } from './api';

export type StructureTemplateLike = {
  id: string;
  name?: string;
  templateKey?: string | null;
  defaultDimensions?: Record<string, unknown> | null;
};

/** Draft estimate to reopen for a structure template (My Templates browse / standard resume). */
export async function findDraftEstimateForStructure(
  template: StructureTemplateLike
): Promise<{ id: string } | null> {
  const templateKey = template.templateKey?.trim();
  if (templateKey) {
    const byKey = await apiClient.getLatestDraftForTemplate(templateKey);
    if (byKey?.id) return { id: byKey.id };
  }

  const sourceEstimateId = template.defaultDimensions?.sourceEstimateId;
  if (typeof sourceEstimateId === 'string' && sourceEstimateId.length > 0) {
    try {
      const est = await apiClient.getEstimate(sourceEstimateId);
      if (est?.id && est.status === 'draft') return { id: est.id };
    } catch {
      // Estimate removed or inaccessible — fall through.
    }
  }

  const name = template.name?.trim();
  if (name) {
    const drafts = await apiClient.getEstimates({ status: 'draft', limit: 50 });
    const matches = drafts.filter(
      (e) => (e.jobName || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (matches.length === 1 && matches[0]?.id) {
      return { id: matches[0].id };
    }
  }

  return null;
}
