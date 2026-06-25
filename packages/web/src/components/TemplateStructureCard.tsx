import { Pencil, Trash2 } from 'lucide-react';
import LaminateVisualizer from './LaminateVisualizer';

export interface TemplateCardLayer {
  id: string;
  type: string;
  material: string;
  micron: number;
}

/**
 * Structure library card — no whole-card click.
 * Templates hold layer stack only (no customer). User picks an explicit action.
 */
export function TemplateStructureCard({
  name,
  layers,
  layerCount,
  busy,
  showEditStructure,
  showSaveToMyTemplates,
  showDelete,
  onCreateEstimate,
  onEditStructure,
  onSaveToMyTemplates,
  onDelete,
  deleting,
}: {
  name: string;
  metaLine?: string;
  templateKey?: string | null;
  badge?: string;
  templateKeyTitle?: string;
  layers: TemplateCardLayer[];
  layerCount: number;
  busy?: boolean;
  showEditStructure?: boolean;
  showSaveToMyTemplates?: boolean;
  showDelete?: boolean;
  onCreateEstimate: () => void;
  onEditStructure?: () => void;
  onSaveToMyTemplates?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden flex flex-col h-full">
      {layerCount > 0 && (
        <LaminateVisualizer
          layers={layers}
          width={360}
          height={32}
          orientation="horizontal"
          labelMode="number"
          className="w-full pointer-events-none"
        />
      )}

      <div className="px-3 pt-2.5 pb-2 flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-navy truncate">{name}</h4>
        <p className="text-xs text-mist mt-0.5">Structure only — no customer</p>
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-border/80 space-y-2">
        <button
          type="button"
          className="btn-primary w-full text-sm py-2"
          disabled={busy}
          onClick={onCreateEstimate}
        >
          {busy ? 'Creating estimate…' : 'Create estimate'}
        </button>

        <div className="flex flex-wrap gap-1.5">
          {showEditStructure && onEditStructure && (
            <button
              type="button"
              className="btn-secondary text-xs flex-1 min-w-[7rem] inline-flex items-center justify-center gap-1 py-2"
              disabled={busy}
              onClick={onEditStructure}
            >
              <Pencil className="w-3 h-3" />
              Edit structure
            </button>
          )}
          {showSaveToMyTemplates && onSaveToMyTemplates && (
            <button
              type="button"
              className="btn-secondary text-xs flex-1 min-w-[7rem] py-2"
              disabled={busy}
              onClick={onSaveToMyTemplates}
            >
              Save to My Templates
            </button>
          )}
          {showDelete && onDelete && (
            <button
              type="button"
              className="p-2 rounded text-mist hover:text-red-600 hover:bg-red-50 shrink-0"
              disabled={deleting || busy}
              onClick={onDelete}
              aria-label="Delete structure"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
