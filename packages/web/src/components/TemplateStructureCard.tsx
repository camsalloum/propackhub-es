import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Star } from 'lucide-react';
import { LaminateStack3D } from './LaminateStack3D';

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
  metaLine,
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [stackExpanded, setStackExpanded] = useState(false);

  useEffect(() => {
    if (!stackExpanded) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) {
        setStackExpanded(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [stackExpanded]);

  return (
    <div
      ref={cardRef}
      className="card !p-0 overflow-hidden flex flex-col h-full"
      data-interactive="true"
      data-stack-expanded={stackExpanded ? 'true' : undefined}
    >
      {layerCount > 0 && (
        <LaminateStack3D
          layers={layers}
          expanded={stackExpanded}
          onToggle={() => setStackExpanded((v) => !v)}
        />
      )}

      <div className="px-3 pt-2.5 pb-2 flex-1 min-w-0">
        {metaLine && (
          <div className="font-mono text-[10px] uppercase tracking-wide text-accent-text mb-0.5 truncate">
            {metaLine}
          </div>
        )}
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
