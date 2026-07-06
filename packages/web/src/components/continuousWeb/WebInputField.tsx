import { useEffect, useState } from 'react';
import { selectOnFocus } from '../../lib/inputs';

export interface WebConfiguratorField {
  id: string;
  label: string;
  unit: 'mm' | 'pcs' | 'kg';
  hint: string;
}

export function WebInputField({
  field,
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  field: WebConfiguratorField;
  value: number;
  onChange: (fieldId: string, value: number) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const [draft, setDraft] = useState(() => (Number.isFinite(value) ? String(value) : ''));

  useEffect(() => {
    setDraft(Number.isFinite(value) ? String(value) : '');
  }, [value]);

  return (
    <div className="flex flex-col gap-1 min-w-[6.5rem] shrink-0">
      <label
        htmlFor={`${idPrefix}-${field.id}`}
        className="text-[11px] font-semibold text-navy/80 tracking-wide select-none truncate text-center"
        title={field.hint}
      >
        {field.label}
      </label>
      <div className="flex border border-accent/40 rounded-md overflow-hidden bg-accent-soft focus-within:border-accent focus-within:ring-2 focus-within:ring-focus-ring/30 transition-shadow">
        <input
          id={`${idPrefix}-${field.id}`}
          type="number"
          inputMode="decimal"
          min={field.id === 'PPC' ? 1 : 0}
          step={field.id === 'PPC' ? 1 : 0.1}
          disabled={disabled}
          className="border-none outline-none w-[4.75rem] px-2 py-1.5 text-sm font-semibold text-brand tabular-nums text-center bg-accent-soft focus:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-raised"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(field.id, n);
          }}
          onBlur={() => {
            const n = parseFloat(draft);
            if (!Number.isFinite(n)) {
              setDraft(Number.isFinite(value) ? String(value) : '');
            }
          }}
          onFocus={selectOnFocus}
        />
        <span className="bg-accent/15 border-l border-accent/40 px-2 py-1.5 text-[11px] font-semibold text-accent-text flex items-center">
          {field.unit}
        </span>
      </div>
    </div>
  );
}
