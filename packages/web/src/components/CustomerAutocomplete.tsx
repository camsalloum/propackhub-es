import { useState, useEffect, useRef } from 'react';
import { useCustomerAccess } from '../hooks/useCustomerAccess';

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
  const customerAccess = useCustomerAccess();
  const canCreateCustomers = allowCreate && customerAccess.canCreate;
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [totalCustomers, setTotalCustomers] = useState<number | null>(null);
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

  useEffect(() => {
    import('../lib/api').then(({ apiClient }) => {
      apiClient.getCustomers({ limit: 1 }).then((res) => {
        if (typeof res.total === 'number') setTotalCustomers(res.total);
      }).catch(() => {});
    });
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
      const created = (await apiClient.createCustomer({ companyName: trimmed })) as {
        id: string;
        companyName: string;
        contactName?: string;
      };
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
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setOptions([]);
      setOpen(true);
      return;
    }
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { apiClient } = await import('../lib/api');
        const results = await apiClient.autocompleteCustomers(trimmed);
        setOptions(Array.isArray(results) ? results : []);
        setOpen(true);
      } catch {
        setOptions([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const trimmedQuery = query.trim();
  const showCreateOption =
    canCreateCustomers &&
    trimmedQuery.length >= 1 &&
    !options.some((c) => c.companyName.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <div className="relative w-full min-w-0">
      <input
        type="text"
        className={inputClass}
        placeholder={
          canCreateCustomers ? 'Search or type new customer name…' : 'Search customers…'
        }
        value={open ? query : selectedLabel || query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (query.trim().length >= 1) search(query);
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
        <ul className="absolute z-[60] mt-1 w-full min-w-[12rem] bg-surface-raised border border-border rounded-lg shadow-lg max-h-52 overflow-auto">
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
              {trimmedQuery.length >= 1
                ? canCreateCustomers
                  ? 'No matching customer — use Add above'
                  : 'No matching customer'
                : totalCustomers != null
                  ? `${totalCustomers} customers — type to search`
                  : 'Type to search'}
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
