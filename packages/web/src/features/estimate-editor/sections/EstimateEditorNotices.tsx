import { AlertCircle } from 'lucide-react';

export type PriceChangeRow = {
  materialId: string;
  materialName: string;
  deltaPct: number;
  materialStale?: boolean;
};

export type EstimateEditorNoticesProps = {
  loadError: string | null;
  onRetryMaterials: () => void;
  saveNotice: string | null;
  onDismissSaveNotice: () => void;
  editorError: string | null;
  onDismissEditorError: () => void;
  priceChanges: PriceChangeRow[];
  onDismissPriceChanges: () => void;
  requoteWarnings: string[];
};

/** Load / save / editor error toasts and requote price-change banner. */
export function EstimateEditorNotices({
  loadError,
  onRetryMaterials,
  saveNotice,
  onDismissSaveNotice,
  editorError,
  onDismissEditorError,
  priceChanges,
  onDismissPriceChanges,
  requoteWarnings,
}: EstimateEditorNoticesProps) {
  return (
    <>
      {loadError && (
        <div className="mb-4 card bg-warning/10 border border-warning/30 text-sm text-warning flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>{loadError}</span>
          <button type="button" className="btn-secondary text-sm" onClick={onRetryMaterials}>
            Retry materials
          </button>
        </div>
      )}
      {saveNotice && (
        <div className="mb-4 card bg-success/10 border border-success/30 text-sm text-success flex items-center justify-between gap-2">
          <span>{saveNotice}</span>
          <button
            type="button"
            className="text-success/80 hover:text-success"
            onClick={onDismissSaveNotice}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {editorError && (
        <div
          className="mb-4 card bg-danger/10 border border-danger/30 text-sm text-danger flex items-center justify-between gap-2"
          role="alert"
        >
          <span className="inline-flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{editorError}</span>
          </span>
          <button
            type="button"
            className="text-danger/80 hover:text-danger"
            onClick={onDismissEditorError}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* BUG-8: requote price-change banner — shown after navigating from a requote */}
      {priceChanges.length > 0 && (
        <div className="mb-4 card bg-warning/10 border border-warning/30 text-sm text-warning">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">Price changes vs original quote</p>
            <button
              type="button"
              className="text-warning/80 hover:text-warning"
              onClick={onDismissPriceChanges}
            >
              ✕
            </button>
          </div>
          <div className="space-y-1">
            {priceChanges.map((pc) => (
              <div key={pc.materialId} className="flex justify-between text-xs gap-2">
                <span className="text-ink">{pc.materialName}</span>
                <span
                  className={
                    pc.materialStale
                      ? 'text-danger'
                      : pc.deltaPct > 0
                        ? 'text-danger'
                        : 'text-success'
                  }
                >
                  {pc.materialStale
                    ? '⚠ Removed from library'
                    : `${pc.deltaPct > 0 ? '+' : ''}${pc.deltaPct.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>
          {requoteWarnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-warning/30 space-y-1">
              {requoteWarnings.map((w, i) => (
                <p key={i} className="text-xs text-warning">
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
