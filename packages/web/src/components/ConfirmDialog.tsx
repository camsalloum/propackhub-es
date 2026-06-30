import { useId } from 'react';
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
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

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
