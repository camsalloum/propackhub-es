// TemplateGallery — Standard / My Templates browser with two layouts:
//   carousel = TemplateDeck filling remaining viewport height (L/R only)
//   grid     = responsive wrap; page scrolls vertically

import type { ReactNode } from 'react';
import { TemplateDeck } from './TemplateDeck';
import type { TemplateBrowserView } from '../hooks/useTemplateBrowserView';

/** Wider cards so photoreal stack + actions fit without crowding. */
export const TEMPLATE_CARD_WIDTH = 400;

export function TemplateGallery<T>({
  items,
  getKey,
  renderItem,
  ariaLabel,
  view,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  ariaLabel: string;
  view: TemplateBrowserView;
}) {
  if (view === 'carousel') {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <TemplateDeck
          items={items}
          getKey={getKey}
          ariaLabel={ariaLabel}
          itemWidth={TEMPLATE_CARD_WIDTH}
          renderItem={renderItem}
          className="flex-1 min-h-0"
        />
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 list-none m-0 p-0">
      {items.map((item, index) => (
        <li key={getKey(item)} className="min-w-0">
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

export default TemplateGallery;
