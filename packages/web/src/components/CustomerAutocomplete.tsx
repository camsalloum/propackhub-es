import { useState, useEffect, useRef } from 'react';

interface CustomerOption {
  id: string;
  companyName: string;
  contactName?: string;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (customerId: string) => void;
  className?: string;
}

export default function CustomerAutocomplete({ value, onChange, className = 'input flex-1' }: CustomerAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    import('../lib/api').then(({ apiClient }) => {
      apiClient.getCustomer(value).then((c) => {
        setSelectedLabel(c.companyName);
      }).catch(() => {});
    });
  }, [value]);

  const search = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const { apiClient } = await import('../lib/api');
      const results = await apiClient.autocompleteCustomers(q);
      setOptions(results);
      setOpen(true);
    }, 250);
  };

  return (
    <div className="relative flex-1">
      <input
        type="text"
        className={className}
        placeholder={selectedLabel || 'Search customer (min 2 chars)…'}
        value={open ? query : selectedLabel || query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => { if (query.length >= 2) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
          {options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate text-sm"
                onMouseDown={() => {
                  onChange(c.id);
                  setSelectedLabel(c.companyName);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {c.companyName}
                {c.contactName ? <span className="text-mist ml-2">{c.contactName}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
