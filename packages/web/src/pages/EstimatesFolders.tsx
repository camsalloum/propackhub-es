import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, Loader2, Search } from 'lucide-react';
import { useEntrance } from '../hooks/useEntrance';
import EmptyState from '../components/EmptyState';
import { SectionTitle } from '../components/SectionTitle';
import NewQuoteDialog from '../components/NewQuoteDialog';
import RepeatOrderCustomerDialog from '../components/RepeatOrderCustomerDialog';
import { apiClient } from '../lib/api';

type FolderRow = {
  customerId: string | null;
  companyName: string;
  quoteCount: number;
  estimateCount: number;
  lastActivityAt: string | null;
  draftQuoteCount: number;
};

type FolderFilter = 'all' | 'drafts' | 'recent';

function formatActivityDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function folderPath(customerId: string | null): string {
  if (customerId === 'price-check') return '/estimates/customers/price-check';
  return `/estimates/customers/${customerId ?? 'none'}`;
}

const EstimatesFolders = () => {
  const navigate = useNavigate();
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FolderFilter>('all');
  const [creating, setCreating] = useState(false);
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [showRepeatOrder, setShowRepeatOrder] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEstimatesByCustomer(q?.trim() || undefined);
      setFolders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load(searchTerm);
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm, load]);

  const visible = useMemo(() => {
    let rows = folders;
    if (filter === 'drafts') {
      rows = rows.filter((f) => Number(f.draftQuoteCount) > 0);
    } else if (filter === 'recent') {
      const weekAgo = Date.now() - 7 * 86400000;
      rows = rows.filter((f) => {
        if (!f.lastActivityAt) return false;
        return new Date(f.lastActivityAt).getTime() >= weekAgo;
      });
    }
    return rows;
  }, [folders, filter]);

  const startNewQuote = async (data: {
    customerId: string;
    rfqNumber: string;
    variantName: string;
    variantDescription: string;
  }) => {
    if (creating) return;
    setCreating(true);
    try {
      const quote = await apiClient.createQuote({
        name: data.variantName,
        notes: data.variantDescription || null,
        rfqNumber: data.rfqNumber || null,
        customerId: data.customerId,
      });
      const qs = new URLSearchParams();
      qs.set('quote', quote.id);
      qs.set('customer', data.customerId);
      qs.set('variantName', data.variantName);
      if (data.variantDescription) qs.set('variantDescription', data.variantDescription);
      setShowNewQuote(false);
      navigate(`/estimate/choose?${qs.toString()}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create quote');
    } finally {
      setCreating(false);
    }
  };

  /** Local session only — quote row is created on first Save draft / Save. */
  const startPriceCheck = () => {
    navigate('/estimate/choose?priceCheck=1');
  };

  const openRepeatOrder = (customerId: string) => {
    setShowRepeatOrder(false);
    navigate(`/estimates/customers/${customerId}?repeatOrder=1`);
  };

  if (loading && folders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2 text-mist">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error && folders.length === 0) {
    return (
      <div className="card">
        <p className="text-danger font-medium">Could not load estimates</p>
        <p className="text-mist text-sm mt-1">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="pb-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <SectionTitle as="h1" className="text-2xl lg:text-3xl font-display font-bold text-navy">
          Estimates
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Link to="/estimates/all" className="btn-secondary text-center">
            All estimates
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => startPriceCheck()}
          >
            Price check
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowRepeatOrder(true)}
          >
            Repeat order
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={creating}
            onClick={() => setShowNewQuote(true)}
          >
            New quote
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mist" />
        <input
          type="search"
          placeholder="Search customers…"
          className="input w-full pl-12"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'drafts', label: 'With drafts' },
            { id: 'recent', label: 'Recent' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === opt.id
                ? 'bg-gold text-text-on-accent border-gold'
                : 'bg-surface-raised border-border text-ink hover:border-gold/40'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={folders.length === 0 ? 'No quotes yet' : 'No matching customers'}
          body={
            folders.length === 0
              ? 'Create a quote for a customer, or run a price check without one.'
              : 'Try a different search or filter.'
          }
          action={
            folders.length === 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => startPriceCheck()}
                >
                  Price check
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={creating}
                  onClick={() => setShowNewQuote(true)}
                >
                  New quote
                </button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((f) => (
            <button
              key={f.customerId ?? 'none'}
              type="button"
              onClick={() => navigate(folderPath(f.customerId))}
              className="card text-left p-5 transition-transform duration-micro ease-micro hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="font-display font-semibold text-brand text-lg truncate">
                  {f.companyName || '(No customer)'}
                </h2>
                {Number(f.draftQuoteCount) > 0 && (
                  <span className="badge badge-draft shrink-0">
                    {f.draftQuoteCount} draft{Number(f.draftQuoteCount) === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary">
                {f.quoteCount} quote{Number(f.quoteCount) === 1 ? '' : 's'}
                {' · '}
                {f.estimateCount} estimate{Number(f.estimateCount) === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-mist mt-2">Last: {formatActivityDate(f.lastActivityAt)}</p>
            </button>
          ))}
        </div>
      )}

      <NewQuoteDialog
        open={showNewQuote}
        creating={creating}
        onClose={() => setShowNewQuote(false)}
        onContinue={(data) => void startNewQuote(data)}
      />

      <RepeatOrderCustomerDialog
        open={showRepeatOrder}
        onClose={() => setShowRepeatOrder(false)}
        onContinue={openRepeatOrder}
      />
    </div>
  );
};

export default EstimatesFolders;
