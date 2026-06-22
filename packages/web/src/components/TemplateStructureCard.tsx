import { Pencil, Trash2 } from 'lucide-react';
import LaminateVisualizer from './LaminateVisualizer';

export interface TemplateCardLayer {
  id: string;
  type: string;
  material: string;
  micron: number;
}

export function TemplateStructureCard({
  name,
  layers,
  layerCount,
  instantiating,
  allowEdit,
  onUse,
  onEdit,
  onDelete,
  deleting,
}: {
  name: string;
  /** unused — kept for API compat */ metaLine?: string;
  /** unused — kept for API compat */ templateKey?: string | null;
  /** unused — kept for API compat */ badge?: string;
  /** unused — kept for API compat */ templateKeyTitle?: string;
  layers: TemplateCardLayer[];
  layerCount: number;
  instantiating?: boolean;
  allowEdit?: boolean;
  onUse: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white hover:border-gold/40 hover:shadow-sm transition-all overflow-hidden">
      {/* Colored laminate bar */}
      {layerCount > 0 && (
        <LaminateVisualizer
          layers={layers}
          width={360}
          height={32}
          orientation="horizontal"
          labelMode="number"
          className="w-full"
        />
      )}

      {/* Name row + actions */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex-1 min-w-0 text-left rounded active:bg-slate/40"
          disabled={instantiating}
          onClick={onUse}
        >
          <h4 className="text-sm font-semibold text-navy truncate">{name}</h4>
        </button>

        {allowEdit && (
          <div className="flex shrink-0 gap-0.5">
            {onEdit && (
              <button
                type="button"
                className="p-1.5 rounded text-mist hover:text-navy hover:bg-slate/80 flex items-center justify-center"
                onClick={onEdit}
                aria-label="Edit template"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="p-1.5 rounded text-mist hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                disabled={deleting}
                onClick={onDelete}
                aria-label="Delete template"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
