import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Lock, Plus, Unlock } from 'lucide-react';
import { apiClient } from '../lib/api';
import {
  estimateStatusBadgeClass,
  estimateStatusLabel,
} from '../lib/estimateStatus';
import CombinedPriceListPanel from '../components/CombinedPriceListPanel';
import DuplicateEstimateDialog from '../components/DuplicateEstimateDialog';
import QuoteSummaryPanel from '../components/QuoteSummaryPanel';
import EstimateEditor from './EstimateEditor';

type QuoteEstimate = {
  id: string;
  skuLabel?: string | null;
  brand?: string | null;
  jobName?: string;
  status?: string;
  salePricePerKg?: string | number | null;
  displayCurrency?: string;
  structureSummary?: string;
};

type QuotePayload = {
  id: string;
  name: string;
  refNumber: string;
  rfqNumber?: string | null;
  status: string;
  locked?: boolean;
  sentAt?: string | null;
  validUntil?: string | null;
  deliveryTerm?: string | null;
  paymentTerms?: string | null;
  remarks?: string | null;
  customerId?: string | null;
  estimates: QuoteEstimate[];
};

function railLabel(est: QuoteEstimate): string {
  return est.skuLabel || est.jobName || 'Estimate';
}

function railPrice(est: QuoteEstimate): string {
  if (est.salePricePerKg == null || est.salePricePerKg === '') return '—';
  return `${est.displayCurrency || 'USD'} ${Number(est.salePricePerKg).toFixed(2)}/kg`;
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

function isLockedQuote(quote: QuotePayload | null): boolean {
  if (!quote) return false;
  return quote.locked === true || quote.status === 'sent' || quote.sentAt != null;
}

const QuoteWorkspace = () => {
  const { quoteId, estimateId } = useParams<{ quoteId: string; estimateId?: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [priceListKey, setPriceListKey] = useState(0);
  const [statusBusy, setStatusBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    if (!quoteId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getQuote(quoteId);
      setQuote(data as QuotePayload);
      setPriceListKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const estimates = quote?.estimates ?? [];
  const multi = estimates.length > 1;
  const activeId = estimateId || estimates[0]?.id;
  const activeEstimate = estimates.find((e) => e.id === activeId);
  const locked = isLockedQuote(quote);

  useEffect(() => {
    if (!quote || !quoteId) return;
    if (estimates.length === 0) return;
    if (!estimateId) {
      navigate(`/quotes/${quoteId}/estimates/${estimates[0].id}`, { replace: true });
    }
  }, [quote, quoteId, estimateId, estimates, navigate]);

  const backTo = useMemo(() => {
    if (!quote) return '/estimates';
    return `/estimates/customers/${quote.customerId ?? 'none'}`;
  }, [quote]);

  const handleDuplicateConfirm = async (values: { skuLabel: string; brand: string }) => {
    if (!quoteId || !activeId || duplicating || locked) return;
    setDuplicating(true);
    try {
      const created = await apiClient.duplicateEstimateOnQuote(quoteId, activeId, {
        skuLabel: values.skuLabel || null,
        brand: values.brand || null,
      });
      setShowDuplicate(false);
      await load();
      if (created?.id) {
        navigate(`/quotes/${quoteId}/estimates/${created.id}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate estimate');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAddStructure = () => {
    if (!quoteId || locked) return;
    const qs = new URLSearchParams();
    qs.set('quote', quoteId);
    if (quote?.customerId) qs.set('customer', quote.customerId);
    navigate(`/estimate/choose?${qs.toString()}`);
  };

  const downloadQuotePdf = async () => {
    if (!quoteId || pdfBusy) return;
    setPdfBusy(true);
    try {
      const blob = await apiClient.getQuoteProposalPdf(quoteId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote?.refNumber || 'quote'}-proposal.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const markSent = async () => {
    if (!quoteId || statusBusy || locked) return;
    setStatusBusy(true);
    try {
      await apiClient.updateQuote(quoteId, { status: 'sent' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark quote as sent');
    } finally {
      setStatusBusy(false);
    }
  };

  const unlockQuote = async () => {
    if (!quoteId || statusBusy || !locked) return;
    setStatusBusy(true);
    try {
      const allSaved =
        estimates.length > 0 && estimates.every((e) => e.status && e.status !== 'draft');
      await apiClient.updateQuote(quoteId, { status: allSaved ? 'saved' : 'draft' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unlock quote');
    } finally {
      setStatusBusy(false);
    }
  };

  if (loading && !quote) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2 text-mist">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading quote…
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="card max-w-lg mx-auto mt-8">
        <p className="text-danger font-medium">{error}</p>
        <Link to="/estimates" className="btn-primary mt-4 inline-flex">
          Back to Estimates
        </Link>
      </div>
    );
  }

  if (!quote) return null;

  if (estimates.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-8 card space-y-4">
        <div className="flex items-center gap-3">
          <Link to={backTo} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-xs text-mist">{quote.refNumber}</p>
            <h1 className="font-display font-semibold text-brand truncate">{quote.name}</h1>
          </div>
        </div>
        <p className="text-text-secondary text-sm">This quote has no estimates yet.</p>
        {!locked && (
          <button type="button" className="btn-primary" onClick={handleAddStructure}>
            Add estimate
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pb-4 space-y-4">
      <div className="sticky top-0 z-40 -mx-4 lg:-mx-8 px-4 lg:px-8 py-2.5 bg-surface-base/95 backdrop-blur border-b border-border flex flex-wrap items-center gap-3">
        <Link to={backTo} className="btn-secondary inline-flex items-center gap-2 shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-mist truncate flex items-center gap-1.5">
            <span>
              {quote.refNumber}
              {quote.rfqNumber ? ` · RFQ ${quote.rfqNumber}` : ''}
              {' · '}
              {quoteStatusLabel(quote.status)}
              {multi ? ` · ${estimates.length} estimates` : ''}
            </span>
            {locked && <Lock className="w-3 h-3 shrink-0" aria-label="Locked" />}
          </p>
          <h1 className="font-display font-semibold text-brand truncate text-lg leading-tight">
            {quote.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={pdfBusy || estimates.length === 0}
            onClick={() => void downloadQuotePdf()}
          >
            {pdfBusy ? (
              <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 inline mr-1" />
            )}
            PDF
          </button>
          {locked ? (
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={statusBusy}
              onClick={() => void unlockQuote()}
            >
              {statusBusy ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <Unlock className="w-3.5 h-3.5 inline mr-1" />
              )}
              Unlock
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={statusBusy}
              onClick={() => void markSent()}
            >
              {statusBusy ? (
                <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5 inline mr-1" />
              )}
              Mark sent
            </button>
          )}
          {!locked && (
            <>
              <button
                type="button"
                className="btn-secondary text-xs"
                disabled={!activeId}
                onClick={() => setShowDuplicate(true)}
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Duplicate
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={handleAddStructure}>
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                New structure
              </button>
            </>
          )}
        </div>
      </div>

      {quoteId && (
        <QuoteSummaryPanel
          quoteId={quoteId}
          locked={locked}
          rfqNumber={quote.rfqNumber}
          deliveryTerm={quote.deliveryTerm}
          paymentTerms={quote.paymentTerms}
          remarks={quote.remarks}
          validUntil={quote.validUntil}
          onUpdated={() => void load()}
        />
      )}

      {quoteId && (
        <CombinedPriceListPanel
          quoteId={quoteId}
          quoteRef={quote.refNumber}
          activeEstimateId={activeId}
          refreshKey={priceListKey}
          onSelectEstimate={(id) => navigate(`/quotes/${quoteId}/estimates/${id}`)}
        />
      )}

      <div className={multi ? 'flex flex-col lg:flex-row gap-4' : ''}>
        {multi && (
          <aside className="lg:w-56 shrink-0 space-y-2">
            {estimates.map((est) => {
              const active = est.id === activeId;
              return (
                <button
                  key={est.id}
                  type="button"
                  onClick={() => navigate(`/quotes/${quoteId}/estimates/${est.id}`)}
                  className={`w-full text-left card p-3 transition-colors ${
                    active ? 'ring-2 ring-accent border-accent' : 'hover:border-gold/40'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{railLabel(est)}</p>
                  <p className="text-gold text-sm font-semibold">{railPrice(est)}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className={`badge text-[10px] ${estimateStatusBadgeClass(est.status)}`}>
                      {estimateStatusLabel(est.status)}
                    </span>
                  </div>
                  {est.structureSummary && (
                    <p className="text-xs text-mist truncate mt-1">{est.structureSummary}</p>
                  )}
                </button>
              );
            })}
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {activeId && (
            <EstimateEditor
              key={activeId}
              embedded
              estimateIdOverride={activeId}
              backTo={backTo}
              hideEstimateRef={!multi}
              readOnly={locked}
            />
          )}
        </div>
      </div>

      <DuplicateEstimateDialog
        open={showDuplicate}
        sourceLabel={activeEstimate ? railLabel(activeEstimate) : 'Estimate'}
        defaultBrand={activeEstimate?.brand}
        busy={duplicating}
        onCancel={() => setShowDuplicate(false)}
        onConfirm={(v) => void handleDuplicateConfirm(v)}
      />
    </div>
  );
};

export default QuoteWorkspace;
