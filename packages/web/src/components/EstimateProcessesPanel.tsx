import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { ProcessOption } from '../lib/masterDataReference';

export type EstimateProcessRow = {
  name: string;
  processKey?: string | null;
  enabled: boolean;
  processQuantity: number;
  costPerHour?: number;
  speedBasis?: string;
  speedValue?: number;
  setupHours?: number;
  costPerKgUsd?: number;
};

type Props = {
  processes: EstimateProcessRow[];
  processOptions: ProcessOption[];
  layerCount: number;
  onChange: (processes: EstimateProcessRow[]) => void;
  /** Scratch builds must pick processes; template quotes arrive pre-filled. */
  hint?: string;
  /** Phase 2: True when estimate layers differ from template or processes were manually edited */
  isCustomized?: boolean;
  /** Phase 3: True when structure differs from template (enables State 2→3 transition) */
  structureForked?: boolean;
  /** Phase 4: Callback to lock in derived processes as customized */
  onCustomize?: () => void;
};

export function EstimateProcessesPanel({
  processes,
  processOptions,
  layerCount,
  onChange,
  hint,
  isCustomized = true,
  structureForked = false,
  onCustomize,
}: Props) {
  const [open, setOpen] = useState(layerCount > 4);
  const locked = !isCustomized;
  const isDerivedFromLayers = structureForked && !isCustomized;

  const findRow = (code: string) =>
    processes.find(
      (p) =>
        String(p.processKey ?? '').toLowerCase() === code.toLowerCase() ||
        String(p.name ?? '').toLowerCase() === code.toLowerCase()
    );

  const toggleProcess = (code: string) => {
    const opt = processOptions.find((o) => o.code === code);
    const existing = findRow(code);
    if (existing) {
      onChange(
        processes.map((p) =>
          p === existing ? { ...p, enabled: !p.enabled } : p
        )
      );
      return;
    }
    onChange([
      ...processes,
      {
        name: opt?.label ?? code,
        processKey: code,
        enabled: true,
        processQuantity: 1,
      },
    ]);
  };

  const setQuantity = (code: string, quantity: number) => {
    const val = Math.max(1, Math.round(quantity) || 1);
    onChange(
      processes.map((p) =>
        String(p.processKey ?? '').toLowerCase() === code.toLowerCase()
          ? { ...p, processQuantity: val }
          : p
      )
    );
  };

  const enabledCount = processes.filter((p) => p.enabled !== false).length;

  return (
    <section className="card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-display font-semibold text-navy">Processes</h3>
            {locked && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-info/10 text-info rounded" title="Locked to template — use 'Snap back' to revert">
                <Lock className="w-3 h-3" />
                Template
              </span>
            )}
            {isDerivedFromLayers && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber/10 text-amber-700 rounded" title="Auto-derived from your current layer structure — not yet locked in">
                ✓ Derived from layers
              </span>
            )}
          </div>
          {hint ? <p className="text-xs text-text-secondary mt-0.5">{hint}</p> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDerivedFromLayers && onCustomize && (
            <button
              type="button"
              className="text-xs font-medium px-3 py-1.5 rounded bg-brand text-white hover:bg-brand/90 transition-colors"
              onClick={onCustomize}
              title="Lock in these process selections so they won't change if you modify layers"
            >
              Lock in changes
            </button>
          )}
          <button
            type="button"
            className="text-xs text-accent-text font-medium shrink-0 disabled:opacity-50"
            onClick={() => setOpen((v) => !v)}
            disabled={locked}
          >
            {open ? 'Hide advanced ▲' : 'Customise ▼'}
          </button>
        </div>
      </div>

      {!open && (
        <div className="flex flex-wrap gap-2">
          {processOptions
            .filter((opt) => findRow(opt.code)?.enabled)
            .map((opt) => {
              const row = findRow(opt.code)!;
              const qty = Math.max(1, row.processQuantity || 1);
              return (
                <span
                  key={opt.code}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand"
                  title={opt.description}
                >
                  {opt.label}
                  {qty > 1 ? ` ×${qty}` : ''}
                </span>
              );
            })}
          {enabledCount === 0 && (
            <span className="text-xs text-amber-700">
              Select at least one process before quantity slabs and pricing.
            </span>
          )}
        </div>
      )}

      {(open || layerCount > 4) && (
        <div className="p-3 rounded-lg border border-border bg-surface-base/20 space-y-2">
          {layerCount > 4 && !open && (
            <p className="text-xs text-text-secondary mb-2">
              Complex structure ({layerCount} layers) — verify all processes apply.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-3">
            {processOptions.map((opt) => {
              const row = findRow(opt.code);
              const isEnabled = row?.enabled ?? false;
              return (
                <div key={opt.code} className="flex flex-col gap-1">
                  <label
                    className={`inline-flex items-start gap-2 text-sm cursor-pointer ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={opt.description}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={isEnabled}
                      onChange={() => toggleProcess(opt.code)}
                      disabled={locked}
                    />
                    <span>
                      <span className="font-medium text-brand">{opt.label}</span>
                      <span className="block text-xs text-text-secondary">{opt.description}</span>
                    </span>
                  </label>
                  {isEnabled && (
                    <div className="pl-6 flex items-center gap-1.5">
                      <label className="text-xs text-text-secondary whitespace-nowrap">×</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="input !min-h-[26px] !py-0 !px-1.5 text-xs w-16 font-mono"
                        value={row?.processQuantity ?? 1}
                        onChange={(e) => setQuantity(opt.code, Number(e.target.value))}
                        disabled={locked}
                        title={locked ? 'Locked to template — use Snap back to edit' : "Number of times this process is applied (e.g. 2 for double-lamination)"}
                      />
                      <span className="text-xs text-text-secondary">times</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
