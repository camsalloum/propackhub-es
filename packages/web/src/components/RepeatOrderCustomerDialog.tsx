import { useEffect, useState } from 'react';
import CustomerAutocomplete from './CustomerAutocomplete';

type RepeatOrderCustomerDialogProps = {
  open: boolean;
  onClose: () => void;
  onContinue: (customerId: string) => void;
};

export default function RepeatOrderCustomerDialog({
  open,
  onClose,
  onContinue,
}: RepeatOrderCustomerDialogProps) {
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    if (open) setCustomerId('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Repeat order"
    >
      <div className="card w-full max-w-md p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg text-brand">Repeat order</h2>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Customer</label>
          <CustomerAutocomplete value={customerId} onChange={setCustomerId} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!customerId.trim()}
            onClick={() => onContinue(customerId.trim())}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
