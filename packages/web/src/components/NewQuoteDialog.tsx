import { useEffect, useState } from 'react';
import CustomerAutocomplete from './CustomerAutocomplete';

type NewQuoteDialogProps = {
  open: boolean;
  creating: boolean;
  onClose: () => void;
  onContinue: (data: {
    customerId: string;
    rfqNumber: string;
    variantName: string;
    variantDescription: string;
  }) => void;
};

export default function NewQuoteDialog({
  open,
  creating,
  onClose,
  onContinue,
}: NewQuoteDialogProps) {
  const [customerId, setCustomerId] = useState('');
  const [rfqNumber, setRfqNumber] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantDescription, setVariantDescription] = useState('');

  useEffect(() => {
    if (open) {
      setCustomerId('');
      setRfqNumber('');
      setVariantName('');
      setVariantDescription('');
    }
  }, [open]);

  if (!open) return null;

  const canContinue = Boolean(customerId.trim() && variantName.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="New quote"
    >
      <div className="card w-full max-w-md p-5 space-y-4 overflow-visible">
        <h2 className="font-display font-semibold text-lg text-brand">New quote</h2>
        <div className="relative z-10 overflow-visible">
          <label className="text-sm text-text-secondary block mb-1">Customer</label>
          <CustomerAutocomplete value={customerId} onChange={setCustomerId} />
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">RFQ number (optional)</label>
          <input
            className="input w-full"
            value={rfqNumber}
            onChange={(e) => setRfqNumber(e.target.value)}
            placeholder="Customer RFQ reference, if any"
          />
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Variant name</label>
          <input
            className="input w-full"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="e.g. 200 ml"
          />
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Variant description</label>
          <textarea
            className="input w-full min-h-[72px] resize-y"
            value={variantDescription}
            onChange={(e) => setVariantDescription(e.target.value)}
            placeholder="Optional details for this variant"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={creating || !canContinue}
            onClick={() =>
              onContinue({
                customerId: customerId.trim(),
                rfqNumber: rfqNumber.trim(),
                variantName: variantName.trim(),
                variantDescription: variantDescription.trim(),
              })
            }
          >
            {creating ? 'Creating…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
