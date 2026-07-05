import { useState } from 'react';

type Props = {
  open: boolean;
  sourceLabel: string;
  defaultBrand?: string | null;
  busy?: boolean;
  onConfirm: (values: { skuLabel: string; brand: string }) => void;
  onCancel: () => void;
};

export default function DuplicateEstimateDialog({
  open,
  sourceLabel,
  defaultBrand,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const [skuLabel, setSkuLabel] = useState('');
  const [brand, setBrand] = useState(defaultBrand ?? '');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Duplicate estimate"
    >
      <div className="card w-full max-w-sm p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg text-brand">Duplicate estimate</h2>
        <p className="text-sm text-text-secondary truncate">From: {sourceLabel}</p>
        <div>
          <label className="text-xs text-text-secondary block mb-1">SKU / size</label>
          <input
            className="input w-full"
            value={skuLabel}
            onChange={(e) => setSkuLabel(e.target.value)}
            placeholder="e.g. 330 ml"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-1">Brand</label>
          <input
            className="input w-full"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => onConfirm({ skuLabel: skuLabel.trim(), brand: brand.trim() })}
          >
            {busy ? 'Duplicating…' : 'Duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
}
