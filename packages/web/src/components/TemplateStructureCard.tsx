import { Pencil, Trash2, Star } from 'lucide-react';
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
  badge,
  layers,
  layerCount,
  busy,
  showEditStructure,
  showSaveToMyTemplates,
  showCloneToPlatformStandard,
  showDelete,
  onCreateEstimate,
  onEditStructure,
  onSaveToMyTemplates,
  onCloneToPlatformStandard,
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
  /** Show "Clone to standard…" (platform_admin only). */
  showCloneToPlatformStandard?: boolean;
  showDelete?: boolean;
  onCreateEstimate: () => void;
  onEditStructure?: () => void;
  onSaveToMyTemplates?: () => void;
  onCloneToPlatformStandard?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    // Token-backed surface/border/elevation via the shared `.card` class
    // (R9.1). `!p-0` keeps the layer visualizer edge-to-edge while inner
    // sections own their padding. `data-interactive="true"` enables the
    // index.css elevation + translateY hover/focus micro-interaction that
    // reverts on leave/blur within --motion-micro (R9.3); `tabIndex={0}`
    // makes the card keyboard-focusable so the `.card:focus-visible` outline
    // (≥3:1, R9.4) and focus micro-interaction apply.
    <div
      className="card !p-0 overflow-hidden flex flex-col h-full"
      data-interactive="true"
      tabIndex={0}
    >
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
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-sm font-semibold text-brand truncate">{name}</h4>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-surface-base/80 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary shrink-0">
              {badge}
            </span>
          )}
        </div>
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
          {/* Admin-only: platform_admin can clone any template into a new standard. */}
          {showCloneToPlatformStandard && onCloneToPlatformStandard && (
            <button
              type="button"
              className="btn-secondary text-xs flex-1 min-w-[7rem] inline-flex items-center justify-center gap-1 py-2"
              disabled={busy}
              onClick={onCloneToPlatformStandard}
              title="Clone this template into a new platform standard visible to every tenant"
            >
              <Star className="w-3 h-3" />
              Clone to standard…
            </button>
          )}
          {showDelete && onDelete && (
            <button
              type="button"
              className="p-2 rounded text-text-secondary hover:text-danger hover:bg-danger/10 shrink-0"
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
