import { useCallback, useState } from 'react';

/** Templates page layout: 3D carousel vs wrapping page-scroll grid. */
export type TemplateBrowserView = 'carousel' | 'grid';

export const TEMPLATE_BROWSER_VIEW_KEY = 'es.templateBrowserView';
const DEFAULT_VIEW: TemplateBrowserView = 'carousel';

function readStoredView(): TemplateBrowserView {
  if (typeof localStorage === 'undefined') return DEFAULT_VIEW;
  try {
    const raw = localStorage.getItem(TEMPLATE_BROWSER_VIEW_KEY);
    return raw === 'grid' || raw === 'carousel' ? raw : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

export function useTemplateBrowserView() {
  const [view, setViewState] = useState<TemplateBrowserView>(readStoredView);

  const setView = useCallback((next: TemplateBrowserView) => {
    setViewState(next);
    try {
      localStorage.setItem(TEMPLATE_BROWSER_VIEW_KEY, next);
    } catch {
      // Ignore quota / private-mode failures — in-memory still works for the session.
    }
  }, []);

  return { view, setView };
}
