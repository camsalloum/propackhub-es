/** Last saved estimate for a standard template (localStorage survives browser restarts). */

const key = (templateKey: string) => `es:workingEstimate:${templateKey}`;

export function setWorkingEstimateForTemplate(templateKey: string, estimateId: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key(templateKey), estimateId);
}

export function getWorkingEstimateForTemplate(templateKey: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key(templateKey));
}

export function clearWorkingEstimateForTemplate(templateKey: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key(templateKey));
}
