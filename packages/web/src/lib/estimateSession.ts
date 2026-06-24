/** Session pointer: which estimate the user last saved for a given template. */

const key = (templateKey: string) => `es:workingEstimate:${templateKey}`;

export function setWorkingEstimateForTemplate(templateKey: string, estimateId: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(key(templateKey), estimateId);
}

export function getWorkingEstimateForTemplate(templateKey: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(key(templateKey));
}

export function clearWorkingEstimateForTemplate(templateKey: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(key(templateKey));
}
