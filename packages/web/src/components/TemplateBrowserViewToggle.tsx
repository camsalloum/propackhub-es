import { GalleryHorizontal, LayoutGrid } from 'lucide-react';
import type { TemplateBrowserView } from '../hooks/useTemplateBrowserView';

export function TemplateBrowserViewToggle({
  value,
  onChange,
}: {
  value: TemplateBrowserView;
  onChange: (view: TemplateBrowserView) => void;
}) {
  const btn =
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-focus-ring))]';
  const active = 'bg-accent text-white';
  const idle = 'text-text-secondary hover:text-text-primary';

  return (
    <div
      role="group"
      aria-label="Template layout"
      className="inline-flex rounded-lg border border-border bg-surface-raised p-0.5"
    >
      <button
        type="button"
        aria-pressed={value === 'carousel'}
        className={`${btn} ${value === 'carousel' ? active : idle}`}
        onClick={() => onChange('carousel')}
      >
        <GalleryHorizontal className="w-3.5 h-3.5" aria-hidden />
        Scroll
      </button>
      <button
        type="button"
        aria-pressed={value === 'grid'}
        className={`${btn} ${value === 'grid' ? active : idle}`}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
        Grid
      </button>
    </div>
  );
}
