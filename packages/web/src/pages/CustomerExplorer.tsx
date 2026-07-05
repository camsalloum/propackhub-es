import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEntrance } from '../hooks/useEntrance';
import EmptyState from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiClient } from '../lib/api';
import { meaningfulRequotePriceChanges } from '../lib/requote';
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

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMonthYear(iso?: string): string {
  if (!iso) return 'Unknown month';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown month';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function monthSortTime(iso?: string): number {
  const d = new Date(iso || 0);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

type ExplorerRow = ExplorerEstimate & { quoteId: string; quoteName: string; quoteRef: string };

type PriceCheckBlock = {
  key: string;
  title: string;
  meta: string;
  quote: ExplorerQuote;
  estimates: ExplorerRow[];
};

type ExplorerSection = {
  key: string;
  title: string;
  meta: string;
  quote: ExplorerQuote | null;
  estimates: ExplorerRow[];
  priceChecks?: PriceCheckBlock[];
};

function priceCheckProductGroup(q: ExplorerQuote): string | null {
  const fromEstimate = q.estimates?.find((e) => e.jobName?.trim())?.jobName?.trim();
  if (fromEstimate) return fromEstimate;
  const n = q.name?.trim();
  if (n && n !== 'Price check' && !n.startsWith('Price check ·')) return n;
  return null;
}

function priceCheckSessionTitle(q: ExplorerQuote): string {
  return `${formatDate(q.updatedAt)} · ${q.refNumber}`;
}

function priceCheckSessionMeta(q: ExplorerQuote, structureCount: number): string {
  const group = priceCheckProductGroup(q);
  const parts: string[] = [];
  if (group) parts.push(group);
  parts.push(`${structureCount} structure${structureCount === 1 ? '' : 's'}`);
  parts.push(quoteStatusLabel(q.status));
  return parts.join(' · ');
}

function displayName(est: ExplorerEstimate, priceCheck?: boolean): string {
  if (priceCheck) return est.skuLabel?.trim() || est.jobName?.trim() || est.refNumber || 'Structure';
  return est.skuLabel || est.jobName || est.refNumber || 'Estimate';
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

function formatPrice(est: ExplorerEstimate): string {
  if (est.salePricePerKg == null || est.salePricePerKg === '') return '—';
  const cur = est.displayCurrency || 'USD';
  return `${cur} ${Number(est.salePricePerKg).toFixed(2)}/kg`;
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
  const [groupBy, setGroupBy] = useState<GroupBy>(() =>
    customerIdParam === 'price-check' ? 'quote' : 'quote'
  );
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
  const [deleteAnchor, setDeleteAnchor] = useState<DOMRect | null>(null);
  const [creating, setCreating] = useState(false);
  const [pdfQuoteId, setPdfQuoteId] = useState<string | null>(null);

  useEffect(() => {
    if (isPriceCheckFolder && (groupBy === 'brand' || groupBy === 'sku')) {
      setGroupBy('quote');
    }
  }, [isPriceCheckFolder, groupBy]);

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

  const handleNewPriceCheck = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const quote = await apiClient.createQuote({
        name: `Price check · ${new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`,
        customerId: null,
        isPriceCheck: true,
      });
      navigate(`/estimate/choose?quote=${quote.id}&priceCheck=1`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start price check');
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
            priceChanges: meaningfulRequotePriceChanges(res.price_changes || []),
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

  const handleAddStructure = (quoteId: string) => {
    navigate(`/estimate/choose?quote=${quoteId}&priceCheck=1`);
  };

  const openDeleteConfirm = (
    anchor: HTMLElement,
    pending: NonNullable<typeof pendingDelete>
  ) => {
    setDeleteAnchor(anchor.getBoundingClientRect());
    setPendingDelete(pending);
  };

  const closeDeleteConfirm = () => {
    setPendingDelete(null);
    setDeleteAnchor(null);
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
      closeDeleteConfirm();
      await load();
    } catch {
      alert('Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const sections = useMemo((): ExplorerSection[] => {
    type Row = ExplorerRow;
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
          return displayName(a, isPriceCheckFolder).localeCompare(displayName(b, isPriceCheckFolder));
        }
        const ta = new Date(a.updatedAt || 0).getTime();
        const tb = new Date(b.updatedAt || 0).getTime();
        return sortBy === 'oldest' ? ta - tb : tb - ta;
      });
      return copy;
    };

    const mapQuoteToRows = (q: ExplorerQuote): Row[] =>
      sortRows(
        (q.estimates || [])
          .filter((e) => matchesStatus(e.status, statusFilter))
          .map((e) => ({
            ...e,
            quoteId: q.id,
            quoteName: isPriceCheckFolder ? priceCheckSessionTitle(q) : q.name,
            quoteRef: q.refNumber,
          }))
      );

    if (groupBy === 'quote') {
      const quoteOrder = [...quotes].sort((a, b) => {
        const ta = new Date(a.updatedAt || 0).getTime();
        const tb = new Date(b.updatedAt || 0).getTime();
        if (sortBy === 'oldest') return ta - tb;
        if (sortBy === 'name') {
          const na = isPriceCheckFolder ? priceCheckSessionTitle(a) : a.name;
          const nb = isPriceCheckFolder ? priceCheckSessionTitle(b) : b.name;
          return na.localeCompare(nb);
        }
        return tb - ta;
      });
      return quoteOrder
        .map((q) => {
          const estimates = mapQuoteToRows(q);
          const title = isPriceCheckFolder ? priceCheckSessionTitle(q) : q.name;
          const meta = isPriceCheckFolder
            ? priceCheckSessionMeta(q, estimates.length)
            : `${q.refNumber}${!isPriceCheckFolder && q.rfqNumber ? ` · RFQ ${q.rfqNumber}` : ''} · ${quoteStatusLabel(q.status)} · ${estimates.length} structure${estimates.length === 1 ? '' : 's'}`;
          return {
            key: q.id,
            title,
            meta,
            quote: q,
            estimates,
          };
        })
        .filter((s) => s.estimates.length > 0 || statusFilter === 'all');
    }

    if (isPriceCheckFolder && groupBy === 'date') {
      const monthQuotes = new Map<string, ExplorerQuote[]>();
      const sortedQuotes = [...quotes].sort((a, b) => {
        const ta = new Date(a.updatedAt || 0).getTime();
        const tb = new Date(b.updatedAt || 0).getTime();
        return sortBy === 'oldest' ? ta - tb : tb - ta;
      });
      for (const q of sortedQuotes) {
        const month = formatMonthYear(q.updatedAt);
        const list = monthQuotes.get(month) ?? [];
        list.push(q);
        monthQuotes.set(month, list);
      }
      return [...monthQuotes.entries()]
        .sort(([, quotesA], [, quotesB]) => {
          const ta = monthSortTime(quotesA[0]?.updatedAt);
          const tb = monthSortTime(quotesB[0]?.updatedAt);
          return sortBy === 'oldest' ? ta - tb : tb - ta;
        })
        .map(([month, monthQuoteList]) => {
          const sortedMonthQuotes = [...monthQuoteList].sort((a, b) => {
            const ta = new Date(a.updatedAt || 0).getTime();
            const tb = new Date(b.updatedAt || 0).getTime();
            return sortBy === 'oldest' ? ta - tb : tb - ta;
          });
          const priceChecks: PriceCheckBlock[] = sortedMonthQuotes
            .map((q) => {
              const estimates = mapQuoteToRows(q);
              return {
                key: q.id,
                title: priceCheckSessionTitle(q),
                meta: priceCheckSessionMeta(q, estimates.length),
                quote: q,
                estimates,
              };
            })
            .filter((pc) => pc.estimates.length > 0 || statusFilter === 'all');
          const structureCount = priceChecks.reduce((n, pc) => n + pc.estimates.length, 0);
          return {
            key: month,
            title: month,
            meta: `${priceChecks.length} price check${priceChecks.length === 1 ? '' : 's'} · ${structureCount} structure${structureCount === 1 ? '' : 's'}`,
            quote: null,
            estimates: [],
            priceChecks,
          };
        })
        .filter((s) => (s.priceChecks?.length ?? 0) > 0 || statusFilter === 'all');
    }

    const map = new Map<string, Row[]>();
    for (const row of rows) {
      let key = '—';
      if (groupBy === 'brand') key = row.brand?.trim() || '(No brand)';
      else if (groupBy === 'sku') key = displayName(row, isPriceCheckFolder);
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
  }, [quotes, groupBy, sortBy, statusFilter, isPriceCheckFolder]);

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
          {!repeatOrder && isPriceCheckFolder && (
            <button
              type="button"
              className="btn-primary"
              disabled={creating}
              onClick={() => void handleNewPriceCheck()}
            >
              {creating ? 'Starting…' : 'New price check'}
            </button>
          )}
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
            placeholder={
              isPriceCheckFolder
                ? 'Search product group, quote, ref…'
                : 'Search SKU, brand, quote, ref…'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs text-mist">Group</label>
          {(
            isPriceCheckFolder
              ? ([
                  { id: 'quote', label: 'Price check' },
                  { id: 'date', label: 'Month' },
                ] as const)
              : ([
                  { id: 'quote', label: 'Quote' },
                  { id: 'brand', label: 'Brand' },
                  { id: 'sku', label: 'SKU' },
                  { id: 'date', label: 'Date' },
                ] as const)
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
          title={isPriceCheckFolder ? 'No price checks yet' : 'No quotes yet'}
          body={
            isPriceCheckFolder
              ? 'Start a price check to compare one or more structures.'
              : 'Create a quote for this customer to add estimates.'
          }
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                void (isPriceCheckFolder ? handleNewPriceCheck() : handleNewQuote())
              }
            >
              {isPriceCheckFolder ? 'New price check' : 'New quote'}
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.key] === true;

            const renderQuoteActions = (quote: ExplorerQuote) => (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-xs py-1 px-2"
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                >
                  {isPriceCheckFolder ? 'Open' : 'Open quote'}
                </button>
                {isPriceCheckFolder && (
                  <button
                    type="button"
                    className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                    onClick={() => handleAddStructure(quote.id)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add structure
                  </button>
                )}
                {!isPriceCheckFolder && (
                  <button
                    type="button"
                    className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                    disabled={pdfQuoteId === quote.id}
                    onClick={() => void downloadQuotePdf(quote.id, quote.refNumber)}
                  >
                    {pdfQuoteId === quote.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    PDF
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary text-xs py-1 px-2 text-danger"
                  onClick={(e) =>
                    openDeleteConfirm(e.currentTarget, {
                      type: 'quote',
                      id: quote.id,
                      label: isPriceCheckFolder ? priceCheckSessionTitle(quote) : quote.name,
                    })
                  }
                >
                  {isPriceCheckFolder ? 'Delete' : 'Delete quote'}
                </button>
              </div>
            );

            const renderEstimateRow = (
              est: ExplorerRow,
              parentQuote: ExplorerQuote | null,
              opts?: { nested?: boolean; showQuoteMeta?: boolean }
            ) => (
              <li
                key={est.id}
                className={`py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-surface-raised/40 ${
                  opts?.nested ? 'pl-8 pr-4 border-l-2 border-border/60 ml-4' : 'px-4'
                }`}
              >
                <button
                  type="button"
                  className="text-left min-w-0 flex-1"
                  onClick={() => {
                    if (parentQuote) handleEstimateAction(est, parentQuote);
                  }}
                >
                  <p className="font-medium truncate">
                    {displayName(est, isPriceCheckFolder)}
                    {est.brand ? (
                      <span className="text-mist font-normal"> · {est.brand}</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-mist truncate">
                    {opts?.showQuoteMeta && (
                      <span>
                        {est.quoteName}
                        {est.quoteRef ? ` · ${est.quoteRef}` : ''}
                        {' · '}
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
                      title={isPriceCheckFolder ? 'New price check with fresh material prices' : undefined}
                      onClick={() => void handleRequote(est.id)}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${requotingId === est.id ? 'animate-spin' : ''}`}
                      />
                      {isPriceCheckFolder ? 'New check' : 'Re-quote'}
                    </button>
                  )}
                  {!repeatOrder && (
                    <button
                      type="button"
                      className="p-1.5 text-mist hover:text-danger"
                      title="Delete structure"
                      onClick={(e) => {
                        const quote = quotes.find((q) => q.id === est.quoteId);
                        const count = quote?.estimates?.length ?? 0;
                        openDeleteConfirm(e.currentTarget, {
                          type: 'estimate',
                          id: est.id,
                          label: displayName(est, isPriceCheckFolder),
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
                  {section.quote && renderQuoteActions(section.quote)}
                </div>
                {!isCollapsed && section.priceChecks && (
                  <div className="divide-y divide-border">
                    {section.priceChecks.map((pc) => {
                      const pcCollapsed = collapsed[pc.key] === true;
                      return (
                        <div key={pc.key}>
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-raised/30">
                            <button
                              type="button"
                              className="p-1 text-mist hover:text-ink"
                              onClick={() =>
                                setCollapsed((c) => ({ ...c, [pc.key]: !pcCollapsed }))
                              }
                              aria-expanded={!pcCollapsed}
                            >
                              {pcCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-ink truncate">{pc.title}</p>
                              <p className="text-xs text-mist truncate">{pc.meta}</p>
                            </div>
                            {renderQuoteActions(pc.quote)}
                          </div>
                          {!pcCollapsed && (
                            <ul className="divide-y divide-border">
                              {pc.estimates.map((est) =>
                                renderEstimateRow(est, pc.quote, { nested: true })
                              )}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {!isCollapsed && !section.priceChecks && (
                  <ul className="divide-y divide-border">
                    {section.estimates.map((est) => {
                      const parentQuote =
                        section.quote ?? quotes.find((q) => q.id === est.quoteId) ?? null;
                      return renderEstimateRow(est, parentQuote);
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
        anchorRect={deleteAnchor}
        title={
          pendingDelete?.type === 'quote'
            ? isPriceCheckFolder
              ? 'Delete price check?'
              : 'Delete quote?'
            : pendingDelete?.isLastOnQuote
              ? isPriceCheckFolder
                ? 'Delete last structure and price check?'
                : 'Delete last estimate and quote?'
              : isPriceCheckFolder
                ? 'Delete structure?'
                : 'Delete estimate?'
        }
        message={
          pendingDelete?.type === 'quote'
            ? `Delete “${pendingDelete.label}” and all its ${isPriceCheckFolder ? 'structures' : 'estimates'}?`
            : pendingDelete?.isLastOnQuote
              ? isPriceCheckFolder
                ? `“${pendingDelete?.label}” is the only structure on this price check. The whole price check will be deleted too.`
                : `“${pendingDelete?.label}” is the only estimate on this quote. The quote will be deleted too.`
              : `Delete “${pendingDelete?.label}”?`
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={closeDeleteConfirm}
      />
    </div>
  );
};

export default CustomerExplorer;
