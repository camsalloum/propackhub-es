import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEntrance } from '../hooks/useEntrance';
import EmptyState from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiClient } from '../lib/api';
import {
  estimateStatusBadgeClass,
  estimateStatusLabel,
  isDraftStatus,
} from '../lib/estimateStatus';

type GroupBy = 'quote' | 'brand' | 'sku' | 'date';
type SortBy = 'newest' | 'oldest' | 'name';
type StatusFilter = 'all' | 'draft' | 'saved';

type ExplorerEstimate = {
  id: string;
  refNumber?: string;
  skuLabel?: string | null;
  brand?: string | null;
  jobName?: string;
  status?: string;
  salePricePerKg?: string | number | null;
  displayCurrency?: string;
  structureSummary?: string;
  updatedAt?: string;
  quoteId?: string;
  variantDescription?: string | null;
};

type ExplorerQuote = {
  id: string;
  name: string;
  refNumber: string;
  rfqNumber?: string | null;
  status: string;
  updatedAt: string;
  notes?: string | null;
  estimates: ExplorerEstimate[];
};

function displayName(est: ExplorerEstimate): string {
  return est.skuLabel || est.jobName || est.refNumber || 'Estimate';
}

function formatPrice(est: ExplorerEstimate): string {
  if (est.salePricePerKg == null || est.salePricePerKg === '') return '—';
  const cur = est.displayCurrency || 'USD';
  return `${cur} ${Number(est.salePricePerKg).toFixed(2)}/kg`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function quoteStatusLabel(status: string): string {
  switch (status) {
    case 'sent':
      return 'Sent';
    case 'saved':
      return 'Saved';
    case 'archived':
      return 'Archived';
    default:
      return 'Draft';
  }
}

function matchesStatus(status: string | undefined, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'draft') return isDraftStatus(status);
  return status === 'sent' || status === 'won' || status === 'lost' || status === 'saved';
}

const CustomerExplorer = () => {
  const { customerId: customerIdParam } = useParams<{ customerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const repeatOrder = searchParams.get('repeatOrder') === '1';
  const isPriceCheckFolder = customerIdParam === 'price-check';
  const customerId =
    customerIdParam === 'none' || isPriceCheckFolder ? null : customerIdParam ?? null;

  const [customerName, setCustomerName] = useState('');
  const [quotes, setQuotes] = useState<ExplorerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('quote');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [requotingId, setRequotingId] = useState<string | null>(null);
  const [repeatPick, setRepeatPick] = useState<{
    estimate: ExplorerEstimate;
    quote: ExplorerQuote;
    variantName: string;
    variantDescription: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'estimate' | 'quote';
    id: string;
    label: string;
    quoteId?: string;
    isLastOnQuote?: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pdfQuoteId, setPdfQuoteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!customerIdParam) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCustomerExplorer(customerIdParam, search.trim() || undefined);
      setCustomerName(data.customer?.companyName || '(No customer)');
      setQuotes((data.quotes || []) as ExplorerQuote[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load explorer');
    } finally {
      setLoading(false);
    }
  }, [customerIdParam, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(t);
  }, [load]);

  const openEstimate = (est: ExplorerEstimate, quoteId: string) => {
    navigate(`/quotes/${quoteId}/estimates/${est.id}`);
  };

  const openRepeatPick = (est: ExplorerEstimate, quote: ExplorerQuote) => {
    const defaultName = est.skuLabel?.trim() || quote.name?.trim() || est.jobName?.trim() || '';
    const defaultDescription =
      est.variantDescription?.trim() || quote.notes?.trim() || '';
    setRepeatPick({
      estimate: est,
      quote,
      variantName: defaultName,
      variantDescription: defaultDescription,
    });
  };

  const handleEstimateAction = (est: ExplorerEstimate, quote: ExplorerQuote) => {
    if (repeatOrder) {
      openRepeatPick(est, quote);
      return;
    }
    openEstimate(est, quote.id);
  };

  const handleNewQuote = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const quote = await apiClient.createQuote({
        name: 'New quote',
        customerId,
      });
      const qs = new URLSearchParams();
      qs.set('quote', quote.id);
      if (customerId) qs.set('customer', customerId);
      navigate(`/estimate/choose?${qs.toString()}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create quote');
    } finally {
      setCreating(false);
    }
  };

  const handleRequote = async (
    estimateId: string,
    opts?: { quoteName?: string; skuLabel?: string; variantDescription?: string }
  ) => {
    setRequotingId(estimateId);
    try {
      const res = await apiClient.requoteEstimate(estimateId, {
        quoteName: opts?.quoteName,
        skuLabel: opts?.skuLabel,
        variantDescription: opts?.variantDescription ?? null,
      });
      setRepeatPick(null);
      if (res?.id && res?.quoteId) {
        navigate(`/quotes/${res.quoteId}/estimates/${res.id}`, {
          state: {
            priceChanges: res.price_changes || [],
            warnings: res.warnings || [],
          },
        });
      } else if (res?.id) {
        navigate(`/estimate/${res.id}`);
      }
    } catch {
      alert('Failed to create re-quote.');
    } finally {
      setRequotingId(null);
    }
  };

  const downloadQuotePdf = async (quoteId: string, refNumber: string) => {
    if (pdfQuoteId) return;
    setPdfQuoteId(quoteId);
    try {
      const blob = await apiClient.getQuoteProposalPdf(quoteId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${refNumber || 'quote'}-proposal.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setPdfQuoteId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.type === 'quote') {
        await apiClient.deleteQuote(pendingDelete.id);
      } else {
        await apiClient.deleteEstimate(pendingDelete.id);
        if (pendingDelete.isLastOnQuote && pendingDelete.quoteId) {
          await apiClient.deleteQuote(pendingDelete.quoteId);
        }
      }
      setPendingDelete(null);
      await load();
    } catch {
      alert('Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const sections = useMemo(() => {
    type Row = ExplorerEstimate & { quoteId: string; quoteName: string; quoteRef: string };
    const rows: Row[] = [];
    for (const q of quotes) {
      for (const est of q.estimates || []) {
        if (!matchesStatus(est.status, statusFilter)) continue;
        rows.push({
          ...est,
          quoteId: q.id,
          quoteName: q.name,
          quoteRef: q.refNumber,
        });
      }
    }

    const sortRows = (list: Row[]) => {
      const copy = [...list];
      copy.sort((a, b) => {
        if (sortBy === 'name') {
          return displayName(a).localeCompare(displayName(b));
        }
        const ta = new Date(a.updatedAt || 0).getTime();
        const tb = new Date(b.updatedAt || 0).getTime();
        return sortBy === 'oldest' ? ta - tb : tb - ta;
      });
      return copy;
    };

    if (groupBy === 'quote') {
      const quoteOrder = [...quotes].sort((a, b) => {
        const ta = new Date(a.updatedAt || 0).getTime();
        const tb = new Date(b.updatedAt || 0).getTime();
        return sortBy === 'oldest' ? ta - tb : sortBy === 'name' ? a.name.localeCompare(b.name) : tb - ta;
      });
      return quoteOrder
        .map((q) => {
          const estimates = sortRows(
            (q.estimates || [])
              .filter((e) => matchesStatus(e.status, statusFilter))
              .map((e) => ({
                ...e,
                quoteId: q.id,
                quoteName: q.name,
                quoteRef: q.refNumber,
              }))
          );
          return {
            key: q.id,
            title: q.name,
            meta: `${q.refNumber}${q.rfqNumber ? ` · RFQ ${q.rfqNumber}` : ''} · ${quoteStatusLabel(q.status)} · ${estimates.length} estimate${estimates.length === 1 ? '' : 's'}`,
            quote: q,
            estimates,
          };
        })
        .filter((s) => s.estimates.length > 0 || statusFilter === 'all');
    }

    const map = new Map<string, Row[]>();
    for (const row of rows) {
      let key = '—';
      if (groupBy === 'brand') key = row.brand?.trim() || '(No brand)';
      else if (groupBy === 'sku') key = displayName(row);
      else if (groupBy === 'date') key = formatDate(row.updatedAt);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, estimates]) => ({
        key: title,
        title,
        meta: `${estimates.length} estimate${estimates.length === 1 ? '' : 's'}`,
        quote: null as ExplorerQuote | null,
        estimates: sortRows(estimates),
      }));
  }, [quotes, groupBy, sortBy, statusFilter]);

  if (loading && quotes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2 text-mist">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error && quotes.length === 0) {
    return (
      <div className="card">
        <p className="text-danger font-medium">Could not load explorer</p>
        <p className="text-mist text-sm mt-1">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="pb-4 w-full max-w-none mx-0">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/estimates" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Estimates
          </Link>
          <h1 className="font-display font-bold text-navy text-2xl truncate flex-1 min-w-0">
            {repeatOrder ? `Repeat order — ${customerName}` : customerName}
          </h1>
          {!repeatOrder && !isPriceCheckFolder && (
            <button
              type="button"
              className="btn-primary"
              disabled={creating}
              onClick={() => void handleNewQuote()}
            >
              {creating ? 'Creating…' : 'New quote'}
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mist" />
          <input
            type="search"
            className="input w-full pl-12"
            placeholder="Search SKU, brand, quote, ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs text-mist">Group</label>
          {(
            [
              { id: 'quote', label: 'Quote' },
              { id: 'brand', label: 'Brand' },
              { id: 'sku', label: 'SKU' },
              { id: 'date', label: 'Date' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setGroupBy(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                groupBy === opt.id
                  ? 'bg-gold text-text-on-accent border-gold'
                  : 'bg-surface-raised border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          <label className="text-xs text-mist">Sort</label>
          {(
            [
              { id: 'newest', label: 'Newest' },
              { id: 'oldest', label: 'Oldest' },
              { id: 'name', label: 'A–Z' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSortBy(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                sortBy === opt.id
                  ? 'bg-gold text-text-on-accent border-gold'
                  : 'bg-surface-raised border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'draft', label: 'Draft' },
              { id: 'saved', label: 'Saved' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatusFilter(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                statusFilter === opt.id
                  ? 'bg-gold text-text-on-accent border-gold'
                  : 'bg-surface-raised border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          body="Create a quote for this customer to add estimates."
          action={
            <button type="button" className="btn-primary" onClick={() => void handleNewQuote()}>
              New quote
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.key] === true;
            return (
              <div key={section.key} className="card p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-raised/50">
                  <button
                    type="button"
                    className="p-1 text-mist hover:text-ink"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [section.key]: !isCollapsed }))
                    }
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-brand truncate">{section.title}</p>
                    <p className="text-xs text-mist truncate">{section.meta}</p>
                  </div>
                  {section.quote && (
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1 px-2"
                        onClick={() => navigate(`/quotes/${section.quote!.id}`)}
                      >
                        Open quote
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                        disabled={pdfQuoteId === section.quote!.id}
                        onClick={() =>
                          void downloadQuotePdf(section.quote!.id, section.quote!.refNumber)
                        }
                      >
                        {pdfQuoteId === section.quote!.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        PDF
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1 px-2 text-danger"
                        onClick={() =>
                          setPendingDelete({
                            type: 'quote',
                            id: section.quote!.id,
                            label: section.quote!.name,
                          })
                        }
                      >
                        Delete quote
                      </button>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <ul className="divide-y divide-border">
                    {section.estimates.map((est) => {
                      const parentQuote =
                        section.quote ?? quotes.find((q) => q.id === est.quoteId) ?? null;
                      return (
                      <li
                        key={est.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-surface-raised/40"
                      >
                        <button
                          type="button"
                          className="text-left min-w-0 flex-1"
                          onClick={() => {
                            if (parentQuote) handleEstimateAction(est, parentQuote);
                          }}
                        >
                          <p className="font-medium truncate">
                            {displayName(est)}
                            {est.brand ? (
                              <span className="text-mist font-normal"> · {est.brand}</span>
                            ) : null}
                          </p>
                          <p className="text-sm text-mist truncate">
                            {groupBy !== 'quote' && (
                              <span>
                                {est.quoteName} ·{' '}
                              </span>
                            )}
                            {est.structureSummary || '—'}
                            {' · '}
                            <span className="text-gold font-medium">{formatPrice(est)}</span>
                            {' · '}
                            {formatDate(est.updatedAt)}
                          </p>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`badge ${estimateStatusBadgeClass(est.status)}`}>
                            {estimateStatusLabel(est.status)}
                          </span>
                          <button
                            type="button"
                            className="btn-secondary text-xs py-1 px-2"
                            onClick={() => {
                              if (parentQuote) handleEstimateAction(est, parentQuote);
                            }}
                          >
                            {repeatOrder ? 'Select' : 'Open'}
                          </button>
                          {!repeatOrder && (
                            <button
                              type="button"
                              className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                              disabled={requotingId === est.id}
                              onClick={() => void handleRequote(est.id)}
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${requotingId === est.id ? 'animate-spin' : ''}`}
                              />
                              Re-quote
                            </button>
                          )}
                          {!repeatOrder && (
                            <button
                              type="button"
                              className="p-1.5 text-mist hover:text-danger"
                              title="Delete estimate"
                              onClick={() => {
                                const quote = quotes.find((q) => q.id === est.quoteId);
                                const count = quote?.estimates?.length ?? 0;
                                setPendingDelete({
                                  type: 'estimate',
                                  id: est.id,
                                  label: displayName(est),
                                  quoteId: est.quoteId,
                                  isLastOnQuote: count <= 1,
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {repeatPick && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Re-quote variant"
        >
          <div className="card w-full max-w-md p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg text-brand">Re-quote variant</h2>
            <div>
              <label className="text-sm text-text-secondary block mb-1">Variant name</label>
              <input
                className="input w-full"
                value={repeatPick.variantName}
                onChange={(e) =>
                  setRepeatPick((p) => (p ? { ...p, variantName: e.target.value } : p))
                }
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary block mb-1">Variant description</label>
              <textarea
                className="input w-full min-h-[72px] resize-y"
                value={repeatPick.variantDescription}
                onChange={(e) =>
                  setRepeatPick((p) => (p ? { ...p, variantDescription: e.target.value } : p))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRepeatPick(null)}
                disabled={requotingId === repeatPick.estimate.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={
                  requotingId === repeatPick.estimate.id || !repeatPick.variantName.trim()
                }
                onClick={() =>
                  void handleRequote(repeatPick.estimate.id, {
                    quoteName: repeatPick.variantName.trim(),
                    skuLabel: repeatPick.variantName.trim(),
                    variantDescription: repeatPick.variantDescription.trim() || undefined,
                  })
                }
              >
                {requotingId === repeatPick.estimate.id ? 'Creating…' : 'Re-quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        title={
          pendingDelete?.type === 'quote'
            ? 'Delete quote?'
            : pendingDelete?.isLastOnQuote
              ? 'Delete last estimate and quote?'
              : 'Delete estimate?'
        }
        message={
          pendingDelete?.type === 'quote'
            ? `Delete “${pendingDelete.label}” and all its estimates?`
            : pendingDelete?.isLastOnQuote
              ? `“${pendingDelete?.label}” is the only estimate on this quote. The quote will be deleted too.`
              : `Delete “${pendingDelete?.label}”?`
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default CustomerExplorer;
