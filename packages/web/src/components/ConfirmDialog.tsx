import { useId, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Overlay } from './Overlay';

/**
 * ConfirmDialog — reusable confirmation modal for destructive or irreversible
 * actions (delete, discard, etc.). Built on the accessible Overlay primitive
 * (focus trap, Escape/scrim close, reduced-motion aware).
 *
 * Use for any action that needs an explicit "are you sure?" gate so the same
 * look and keyboard behavior is shared app-wide.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Body copy explaining what will happen. */
  message: React.ReactNode;
  /** Confirm button label. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true, styles the confirm button as destructive (danger). */
  destructive?: boolean;
  /** Shows a spinner + disables buttons while the action runs. */
  busy?: boolean;
  /** When set, positions the dialog beside the trigger instead of screen center. */
  anchorRect?: DOMRect | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function anchoredStyle(rect: DOMRect): { top: number; left: number; width: number } {
  const width = Math.min(320, window.innerWidth - 16);
  const gap = 8;
  const estimatedHeight = 168;
  let top = rect.bottom + gap;
  if (top + estimatedHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - estimatedHeight - gap);
  }
  let left = rect.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  return { top, left, width };
}

function AnchoredConfirm({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  busy,
  anchorRect,
  titleId,
  onConfirm,
  onCancel,
}: ConfirmDialogProps & { titleId: string }) {
  const [mounted, setMounted] = useState(open);

  useLayoutEffect(() => {
    if (open) setMounted(true);
    else {
      const t = window.setTimeout(() => setMounted(false), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const position = useMemo(
    () => (anchorRect ? anchoredStyle(anchorRect) : null),
    [anchorRect]
  );

  if (!mounted || !open || !position || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]" onClick={busy ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-surface-overlay rounded-xl shadow-xl border border-border flex flex-col"
        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border">
          <h2 id={titleId} className="font-display font-semibold text-brand text-sm">
            {title}
          </h2>
        </div>
        <div className="px-4 py-3 text-sm text-text-secondary">{message}</div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button type="button" className="btn-secondary text-xs py-1.5 px-2.5" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${destructive ? 'btn-danger' : 'btn-primary'} text-xs py-1.5 px-2.5 inline-flex items-center gap-1.5`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  anchorRect = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  if (anchorRect) {
    return (
      <AnchoredConfirm
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        destructive={destructive}
        busy={busy}
        anchorRect={anchorRect}
        titleId={titleId}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <Overlay open={open} onClose={busy ? () => {} : onCancel} variant="modal" labelledBy={titleId}>
      <div className="bg-surface-overlay rounded-xl shadow-xl w-[min(28rem,calc(100vw-2rem))] flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h2 id={titleId} className="font-display font-semibold text-brand">
            {title}
          </h2>
        </div>
        <div className="px-5 py-4 text-sm text-text-secondary">{message}</div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${destructive ? 'btn-danger' : 'btn-primary'} inline-flex items-center gap-2`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export default ConfirmDialog;
