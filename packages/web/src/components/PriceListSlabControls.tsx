import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { WasteBand } from '@es/engine';
import { customSlabRangesFromBreakpoints } from '@es/engine';
import {
  bandKey,
  formatCustomSlabRange,
  predefinedSlabLabels,
  UNIT_LABELS,
  type PriceListUnit,
  type SlabMode,
  type UnitConversionInput,
} from '../lib/priceListPricing';

type Props = {
  mode: SlabMode;
  onModeChange: (mode: SlabMode) => void;
  unit: PriceListUnit | '';
  activeBands: WasteBand[];
  selectedKeys: Set<string>;
  onToggleBand: (key: string) => void;
  onSelectAllBands: () => void;
  onClearBands: () => void;
  customSlabs: number[];
  onCustomSlabsChange: (slabs: number[]) => void;
  onFillFromBands?: () => void;
  /** Structure metrics used to show predefined bands in the selected unit. */
  unitConversion?: UnitConversionInput | null;
};

function parseSlabInput(raw: string): number[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export default function PriceListSlabControls({
  mode,
  onModeChange,
  unit,
  activeBands,
  selectedKeys,
  onToggleBand,
  onSelectAllBands,
  onClearBands,
  customSlabs,
  onCustomSlabsChange,
  onFillFromBands,
  unitConversion,
}: Props) {
  const [slabsOpen, setSlabsOpen] = useState(false);
  const [draftQty, setDraftQty] = useState('');
  const slabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slabsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (slabsRef.current && !slabsRef.current.contains(e.target as Node)) {
        setSlabsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [slabsOpen]);

  const addCustomSlabs = (values: number[]) => {
    if (values.length === 0) return;
    const next = [...new Set([...customSlabs, ...values])].sort((a, b) => a - b);
    onCustomSlabsChange(next);
    setDraftQty('');
  };

  const onDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSlabs(parseSlabInput(draftQty));
    }
  };

  const removeCustomSlab = (qty: number) => {
    onCustomSlabsChange(customSlabs.filter((s) => s !== qty));
  };

  const predefinedLabel =
    selectedKeys.size === 0
      ? 'Select…'
      : selectedKeys.size === activeBands.length
        ? 'All slabs'
        : `${selectedKeys.size} selected`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-mist">
        Slab source
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as SlabMode)}
          className="input input-compact text-xs w-auto min-w-[8rem]"
        >
          <option value="predefined">Predefined</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {mode === 'predefined' ? (
        <div className="relative" ref={slabsRef}>
          <span className="block text-xs text-mist mb-1">Slabs</span>
          <button
            type="button"
            onClick={() => setSlabsOpen((o) => !o)}
            className="input input-compact text-xs w-auto min-w-[9rem] inline-flex items-center justify-between gap-2"
          >
            <span>{predefinedLabel}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-mist shrink-0 transition-transform ${slabsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {slabsOpen && (
            <div className="absolute z-20 mt-1 left-0 min-w-[14rem] max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-lg p-2 space-y-1">
              <div className="flex items-center justify-between gap-2 px-1 pb-1 border-b border-border mb-1">
                <button
                  type="button"
                  className="text-[11px] text-accent-text font-medium"
                  onClick={() => {
                    onSelectAllBands();
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  className="text-[11px] text-mist font-medium"
                  onClick={onClearBands}
                >
                  None
                </button>
              </div>
              {activeBands.map((band) => {
                const key = bandKey(band);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate/50 cursor-pointer text-xs text-navy"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(key)}
                      onChange={() => onToggleBand(key)}
                      className="rounded border-border"
                    />
                    <span className="font-mono">
                      {predefinedSlabLabels([band], unit, unitConversion)[0]}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1 min-w-[12rem]">
          <span className="text-xs text-mist">
            Quantities{unit ? ` (${UNIT_LABELS[unit]})` : ''}
          </span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={draftQty}
              onChange={(e) => setDraftQty(e.target.value)}
              onKeyDown={onDraftKeyDown}
              disabled={!unit}
              placeholder={unit ? 'e.g. 5, 10, 25' : 'Select unit first'}
              className="input input-compact text-xs flex-1 min-w-[8rem]"
            />
            <button
              type="button"
              disabled={!unit || !draftQty.trim()}
              onClick={() => addCustomSlabs(parseSlabInput(draftQty))}
              className="btn-secondary p-1.5 disabled:opacity-40"
              aria-label="Add slab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {customSlabs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {customSlabRangesFromBreakpoints(customSlabs).map((r) => (
                <span
                  key={r.qty}
                  className="inline-flex items-center gap-0.5 rounded bg-slate/60 px-1.5 py-0.5 text-[11px] font-mono text-navy"
                >
                  {formatCustomSlabRange(r.from, r.to)}
                  <button
                    type="button"
                    onClick={() => removeCustomSlab(r.qty)}
                    className="text-mist hover:text-navy p-0.5"
                    aria-label={`Remove ${formatCustomSlabRange(r.from, r.to)}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {onFillFromBands && unit && (
            <button
              type="button"
              onClick={onFillFromBands}
              className="text-[11px] text-accent-text font-medium text-left w-fit"
            >
              Fill from predefined bands
            </button>
          )}
        </div>
      )}
    </div>
  );
}
