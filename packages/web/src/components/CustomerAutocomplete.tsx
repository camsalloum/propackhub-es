import { useState, useEffect, useRef, useCallback } from 'react';

interface CustomerOption {
  id: string;
  companyName: string;
  contactName?: string;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (customerId: string) => void;
  className?: string;
  compact?: boolean;
}

/** Searchable picker — lists tenant customers from DB (same records as Customers page). */
export default function CustomerAutocomplete({
  value,
  onChange,
  className,
  compact = false,
}: CustomerAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputClass =
    className ??
    `input w-full ${compact ? 'input-compact' : ''}`;

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

  const loadRecentCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { apiClient } = await import('../lib/api');
      const results = await apiClient.getCustomers();
      setOptions(
        (results || []).slice(0, 25).map((c: CustomerOption) => ({
          id: c.id,
          companyName: c.companyName,
          contactName: c.contactName,
        }))
      );
      setOpen(true);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      if (q.length === 0) {
        void loadRecentCustomers();
      } else {
        setOptions([]);
        setOpen(false);
      }
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { apiClient } = await import('../lib/api');
        const results = await apiClient.autocompleteCustomers(q);
        setOptions(results);
        setOpen(true);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  return (
    <div className="relative w-full min-w-0">
      <input
        type="text"
        className={inputClass}
        placeholder="Select or search customer…"
        value={open ? query : selectedLabel || query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => {
          if (query.length >= 2) setOpen(true);
          else void loadRecentCustomers();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-20 mt-1 w-full min-w-[12rem] bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-auto">
          {loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-mist">Loading customers…</li>
          )}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-mist">
              {query.length >= 2 ? 'No matching customer' : 'No customers yet — add one in Customers'}
            </li>
          )}
          {options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate text-sm truncate"
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
