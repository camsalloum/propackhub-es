import { useState, useEffect, useRef, useCallback } from 'react';

interface CustomerOption {
  id: string;
  companyName: string;
  contactName?: string;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (customerId: string) => void;
  /** Typed name when user has not picked a customer row yet (used on Save). */
  onDraftChange?: (companyName: string) => void;
  className?: string;
  compact?: boolean;
  allowCreate?: boolean;
}

/** Searchable picker — lists tenant customers; can create a new customer inline. */
export default function CustomerAutocomplete({
  value,
  onChange,
  onDraftChange,
  className,
  compact = false,
  allowCreate = true,
}: CustomerAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
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
        setQuery('');
        onDraftChange?.('');
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

  const pickCustomer = (c: CustomerOption) => {
    onChange(c.id);
    setSelectedLabel(c.companyName);
    setQuery('');
    onDraftChange?.('');
    setOpen(false);
  };

  const createFromQuery = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const { apiClient } = await import('../lib/api');
      const existing = options.find(
        (c) => c.companyName.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        pickCustomer(existing);
        return;
      }
      const created = await apiClient.createCustomer({ companyName: trimmed });
      pickCustomer({
        id: created.id,
        companyName: created.companyName,
        contactName: created.contactName,
      });
    } catch (err) {
      alert(
        `Could not create customer: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setCreating(false);
    }
  };

  const search = (q: string) => {
    setQuery(q);
    if (!value) onDraftChange?.(q);
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

  const trimmedQuery = query.trim();
  const showCreateOption =
    allowCreate &&
    trimmedQuery.length >= 2 &&
    !options.some((c) => c.companyName.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <div className="relative w-full min-w-0">
      <input
        type="text"
        className={inputClass}
        placeholder="Search or type new customer name…"
        value={open ? query : selectedLabel || query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => {
          if (query.length >= 2) setOpen(true);
          else void loadRecentCustomers();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && showCreateOption) {
            e.preventDefault();
            void createFromQuery(trimmedQuery);
          }
        }}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-20 mt-1 w-full min-w-[12rem] bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-auto">
          {showCreateOption && (
            <li className="border-b border-border">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gold/10 text-sm font-medium text-gold-accessible"
                disabled={creating}
                onMouseDown={() => void createFromQuery(trimmedQuery)}
              >
                {creating ? 'Creating…' : `+ Add customer "${trimmedQuery}"`}
              </button>
            </li>
          )}
          {loading && options.length === 0 && !showCreateOption && (
            <li className="px-3 py-2 text-sm text-mist">Loading customers…</li>
          )}
          {!loading && options.length === 0 && !showCreateOption && (
            <li className="px-3 py-2 text-sm text-mist">
              {query.length >= 2 ? 'No matching customer — use Add above' : 'Type 2+ letters to search or add'}
            </li>
          )}
          {options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate text-sm truncate"
                onMouseDown={() => pickCustomer(c)}
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
