import { useState } from 'react';

type Props = {
  open: boolean;
  sourceLabel: string;
  defaultBrand?: string | null;
  busy?: boolean;
  /** Price check — variant label only; product group stays from source. */
  priceCheckMode?: boolean;
  onConfirm: (values: { skuLabel: string; brand: string; variantLabel?: string }) => void;
  onCancel: () => void;
};

export default function DuplicateEstimateDialog({
  open,
  sourceLabel,
  defaultBrand,
  busy,
  priceCheckMode = false,
  onConfirm,
  onCancel,
}: Props) {
  const [skuLabel, setSkuLabel] = useState('');
  const [brand, setBrand] = useState(defaultBrand ?? '');
  const [variantLabel, setVariantLabel] = useState('');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={priceCheckMode ? 'Duplicate structure' : 'Duplicate estimate'}
    >
      <div className="card w-full max-w-sm p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg text-brand">
          {priceCheckMode ? 'Duplicate structure' : 'Duplicate estimate'}
        </h2>
        <p className="text-sm text-text-secondary truncate">From: {sourceLabel}</p>
        {priceCheckMode ? (
          <div>
            <label className="text-xs text-text-secondary block mb-1">Variant</label>
            <input
              className="input w-full"
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              placeholder="e.g. 200 ml · 250 mm reel"
              autoFocus
            />
          </div>
        ) : (
          <>
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
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() =>
              priceCheckMode
                ? onConfirm({ skuLabel: '', brand: '', variantLabel: variantLabel.trim() })
                : onConfirm({ skuLabel: skuLabel.trim(), brand: brand.trim() })
            }
          >
            {busy ? 'Duplicating…' : 'Duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
}
