import { useEffect, useMemo, useState } from 'react';
import { EstimateProcessesPanel, type EstimateProcessRow } from './EstimateProcessesPanel';
import type { ProcessOption } from '../lib/masterDataReference';

type Props = {
  open: boolean;
  diffLines: string[];
  processes: EstimateProcessRow[];
  processOptions: ProcessOption[];
  onChange: (rows: EstimateProcessRow[]) => void;
  onConfirm: (rows: EstimateProcessRow[], edited: boolean) => void;
  onCancel: () => void;
};

function rowsKey(rows: EstimateProcessRow[]): string {
  return rows
    .map(
      (r) =>
        `${String(r.processKey ?? r.name).toLowerCase()}:${r.enabled !== false ? 1 : 0}:${r.processQuantity ?? 1}`
    )
    .sort()
    .join('|');
}

/** Phase 3 — confirm (and optionally edit) processes after a structure fork. */
export function ConfirmProcessesModal({
  open,
  diffLines,
  processes,
  processOptions,
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const [baseline, setBaseline] = useState(() => rowsKey(processes));
  useEffect(() => {
    if (open) setBaseline(rowsKey(processes));
    // Capture baseline only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const edited = useMemo(() => rowsKey(processes) !== baseline, [processes, baseline]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-processes-title"
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto !p-0 shadow-xl"
      >
        <div className="p-5 border-b border-border">
          <h2 id="confirm-processes-title" className="text-lg font-display font-semibold text-navy">
            Confirm processes
          </h2>
          {diffLines.length > 0 ? (
            <ul className="mt-2 text-sm text-text-secondary space-y-0.5">
              {diffLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="p-4">
          <EstimateProcessesPanel
            processes={processes}
            processOptions={processOptions}
            layerCount={Math.max(1, processes.length)}
            onChange={onChange}
            isCustomized
            structureForked
          />
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onConfirm(processes, edited)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
