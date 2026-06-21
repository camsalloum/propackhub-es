import { Loader2, Pencil, Trash2 } from 'lucide-react';
import LaminateVisualizer from './LaminateVisualizer';

export interface TemplateCardLayer {
  id: string;
  type: string;
  material: string;
  micron: number;
}

export function TemplateStructureCard({
  name,
  metaLine,
  templateKey,
  badge,
  layers,
  layerCount,
  instantiating,
  allowEdit,
  templateKeyTitle,
  onUse,
  onEdit,
  onDelete,
  deleting,
}: {
  name: string;
  metaLine: string;
  templateKey?: string | null;
  badge?: string;
  layers: TemplateCardLayer[];
  layerCount: number;
  instantiating?: boolean;
  allowEdit?: boolean;
  templateKeyTitle?: string;
  onUse: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white hover:border-gold/40 hover:shadow-sm transition-all">
      <div className="p-4">
        {layerCount > 0 && (
          <div className="mb-3">
            <LaminateVisualizer
              layers={layers}
              width={360}
              height={40}
              orientation="horizontal"
              labelMode="number"
              className="w-full h-10"
            />
            <p className="text-xs text-mist mt-1">
              {layerCount} layer{layerCount === 1 ? '' : 's'} · structure only
            </p>
          </div>
        )}

        <div className="flex items-start gap-2 sm:gap-3">
          <button
            type="button"
            className="flex flex-1 min-w-0 text-left min-h-[48px] rounded-lg active:bg-slate/40 -m-1 p-1"
            disabled={instantiating}
            onClick={onUse}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold text-navy leading-snug">{name}</h4>
                {badge && (
                  <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate text-mist">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-mist mt-1 leading-relaxed">{metaLine}</p>
              {templateKey && (
                <p
                  className="text-xs font-mono text-mist mt-2 leading-relaxed break-all"
                  title={templateKeyTitle}
                >
                  {templateKey}
                </p>
              )}
              {instantiating && (
                <p className="text-sm text-gold mt-2 flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating estimate…
                </p>
              )}
            </div>
          </button>
          {allowEdit && (
            <div className="flex shrink-0 gap-1">
              {onEdit && (
                <button
                  type="button"
                  className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-mist hover:text-navy hover:bg-slate/80 flex items-center justify-center"
                  onClick={onEdit}
                  aria-label="Edit template"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-mist hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                  disabled={deleting}
                  onClick={onDelete}
                  aria-label="Delete template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
