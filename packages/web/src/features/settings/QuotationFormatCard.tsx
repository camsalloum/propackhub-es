import type { QuotationFieldKey, QuotationFormatPrefs, QuotationFieldVisibility } from '@es/engine';
import {
  DEFAULT_QUOTATION_FORMAT,
  QUOTATION_FIELD_META,
  parseQuotationFormat,
} from '@es/engine';

type Props = {
  value: QuotationFormatPrefs;
  onChange: (next: QuotationFormatPrefs) => void;
};

const GROUPS: Array<{ id: 'document' | 'customer' | 'commercial'; title: string }> = [
  { id: 'document', title: 'Document' },
  { id: 'customer', title: 'Customer' },
  { id: 'commercial', title: 'Commercial' },
];

export function QuotationFormatCard({ value, onChange }: Props) {
  const format = parseQuotationFormat(value);

  const setField = (key: QuotationFieldKey, vis: QuotationFieldVisibility) => {
    onChange({
      ...format,
      fields: { ...format.fields, [key]: vis },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-brand mb-1">Quotation format</h3>
        <p className="text-xs text-text-secondary">
          Choose which fields appear on the commercial quotation PDF.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-xs text-mist max-w-[12rem]">
        Table header color
        <input
          type="color"
          value={format.tableHeaderColor || DEFAULT_QUOTATION_FORMAT.tableHeaderColor}
          onChange={(e) =>
            onChange({ ...format, tableHeaderColor: e.target.value.toUpperCase() })
          }
          className="h-9 w-full cursor-pointer rounded border border-border bg-surface-raised"
        />
      </label>

      {GROUPS.map((g) => (
        <div key={g.id} className="space-y-2">
          <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            {g.title}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUOTATION_FIELD_META.filter((f) => f.group === g.id).map((f) => (
              <label
                key={f.key}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-base px-3 py-2 text-sm"
              >
                <span className="text-brand">{f.label}</span>
                <select
                  value={format.fields[f.key]}
                  onChange={(e) =>
                    setField(f.key, e.target.value as QuotationFieldVisibility)
                  }
                  className="input input-compact text-xs w-auto min-w-[5.5rem]"
                >
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                </select>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
