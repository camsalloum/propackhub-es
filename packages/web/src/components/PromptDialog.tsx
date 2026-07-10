import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Overlay } from './Overlay';

export interface PromptDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/** Accessible text prompt (replaces window.prompt). */
export function PromptDialog({
  open,
  title,
  message,
  label = 'Name',
  defaultValue = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <Overlay open={open} onClose={onCancel} variant="modal" labelledBy={titleId}>
      <form
        className="bg-surface-overlay rounded-xl shadow-xl w-[min(28rem,calc(100vw-2rem))] flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (!trimmed) return;
          onConfirm(trimmed);
        }}
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 id={titleId} className="font-display font-semibold text-brand">
            {title}
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          {message != null && <div className="text-sm text-text-secondary">{message}</div>}
          <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-navy mb-1.5">
              {label}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="input w-full"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="submit" className="btn-primary" disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

export default PromptDialog;
