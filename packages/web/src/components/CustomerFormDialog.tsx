import { useEffect, useState } from 'react';

export type CustomerFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
};

type CustomerFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Partial<CustomerFormValues>;
  saving: boolean;
  onClose: () => void;
  onSave: (values: CustomerFormValues) => void;
};

const emptyForm: CustomerFormValues = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  notes: '',
};

export default function CustomerFormDialog({
  open,
  mode,
  initial,
  saving,
  onClose,
  onSave,
}: CustomerFormDialogProps) {
  const [form, setForm] = useState<CustomerFormValues>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({
      companyName: initial?.companyName ?? '',
      contactName: initial?.contactName ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      notes: initial?.notes ?? '',
    });
  }, [open, initial]);

  if (!open) return null;

  const canSave = form.companyName.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'New customer' : 'Edit customer'}
    >
      <div className="card w-full max-w-lg p-5 space-y-4">
        <h2 className="font-display font-semibold text-lg text-brand">
          {mode === 'create' ? 'New customer' : 'Edit customer'}
        </h2>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Company name</label>
          <input
            className="input w-full"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">Contact</label>
            <input
              className="input w-full"
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Phone</label>
            <input
              className="input w-full"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Email</label>
          <input
            type="email"
            className="input w-full"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm text-text-secondary block mb-1">Notes</label>
          <textarea
            className="input w-full min-h-[72px] resize-y"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving || !canSave}
            onClick={() => onSave(form)}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
