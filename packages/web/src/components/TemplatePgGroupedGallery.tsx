/**
 * Template gallery grouped by PEBI parent product group → variant subcards.
 * Mirrors BOM2 hierarchy (crm_product_groups → variants).
 */
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { TemplateGallery } from './TemplateGallery';
import type { TemplateBrowserView } from '../hooks/useTemplateBrowserView';

export interface PgGroupedItem {
  id: string;
  name: string;
  pebiParentPg?: string | null;
  displayOrder?: number | null;
}

function parentKey(item: PgGroupedItem): string {
  const pg = (item.pebiParentPg || '').trim();
  return pg || 'Other';
}

export function TemplatePgGroupedGallery<T extends PgGroupedItem>({
  items,
  view,
  ariaLabel,
  renderItem,
}: {
  items: T[];
  view: TemplateBrowserView;
  ariaLabel: string;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = parentKey(item);
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (a.displayOrder ?? 99) - (b.displayOrder ?? 99) || a.name.localeCompare(b.name),
      );
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (view === 'carousel') {
    return (
      <TemplateGallery
        view={view}
        items={items}
        getKey={(t) => t.id}
        ariaLabel={ariaLabel}
        renderItem={renderItem}
      />
    );
  }

  return (
    <div className="space-y-8" role="region" aria-label={ariaLabel}>
      {groups.map(([pg, variants]) => (
        <section key={pg} className="space-y-3">
          <header className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
            <h3 className="text-base font-display font-semibold text-brand m-0">{pg}</h3>
            <span className="text-xs text-text-secondary tabular-nums">
              {variants.length} variant{variants.length === 1 ? '' : 's'}
            </span>
          </header>
          <TemplateGallery
            view="grid"
            items={variants}
            getKey={(t) => t.id}
            ariaLabel={`${pg} variants`}
            renderItem={renderItem}
          />
        </section>
      ))}
    </div>
  );
}

export default TemplatePgGroupedGallery;
