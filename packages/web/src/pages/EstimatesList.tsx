import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Loader2, FileText, Trash2 } from 'lucide-react';
import { useEntrance } from '../hooks/useEntrance';
import { useViewTransition } from '../hooks/useViewTransition';
import EmptyState from '../components/EmptyState';
import { SectionTitle } from '../components/SectionTitle';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiClient } from '../lib/api';
import {
  ClassFilterPanel,
  EMPTY_CLASS_FILTER,
} from '../components/ClassFilterPanel';
import {
  matchesEstimateClassFilter,
  type ClassFilter,
  type TemplateStructureTier,
} from '../lib/templateCatalog';

import {
  ESTIMATE_STATUS_FILTERS,
  estimateStatusBadgeClass,
  estimateStatusLabel,
} from '../lib/estimateStatus';

function estimateOpenPath(e: { id: string; quoteId?: string | null }): string {
  return e.quoteId ? `/quotes/${e.quoteId}/estimates/${e.id}` : `/estimate/${e.id}`;
}

const EstimatesList = () => {
  const navigate = useNavigate();
  // Smooth list → editor transition via the browser-native View Transitions API
  // (instant fallback on older browsers; reduced-motion handled in CSS).
  const navigateWithTransition = useViewTransition();
  // Single-play mount entrance for the list content; no-op under reduced motion (R16.3, R16.6).
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<ClassFilter>(EMPTY_CLASS_FILTER);
  const [requotingId, setRequotingId] = useState<string | null>(null);
  /** Estimate pending delete confirmation (null when dialog closed). */
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  /**
   * One-shot flash notice surfaced by the editor's Back button when the user
   * tried to leave a brand-new estimate with no savable content. We read it
   * once on mount, render it as a dismissible banner, and clear sessionStorage
   * so the same notice never appears twice.
   */
  const [flashNotice, setFlashNotice] = useState<string | null>(null);
  useEffect(() => {
    try {
      const note = sessionStorage.getItem('es:flashNotice');
      if (note) {
        setFlashNotice(note);
        sessionStorage.removeItem('es:flashNotice');
      }
    } catch {
      /* sessionStorage may be unavailable — silent skip */
    }
  }, []);

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEstimates();
      setEstimates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const isAllClassFiltersActive =
    classFilter.materialClass === null &&
    classFilter.isPrinted === null &&
    classFilter.structure === null;

  const countWithClassFilter = useCallback(
    (partial: Partial<ClassFilter>) => {
      const test = { ...classFilter, ...partial };
      return estimates.filter((e) => matchesEstimateClassFilter(e, test)).length;
    },
    [estimates, classFilter]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return estimates.filter((e) => {
      const matchesSearch =
        !q ||
        (e.jobName || '').toLowerCase().includes(q) ||
        (e.refNumber || '').toLowerCase().includes(q) ||
        (e.customerName || '').toLowerCase().includes(q) ||
        (e.sourceTemplateKey || '').toLowerCase().includes(q);

      const matchesCustomer =
        !customerFilter.trim() ||
        (e.customerName || '').toLowerCase().includes(customerFilter.trim().toLowerCase());

      // Status filters: 'draft' = working drafts, 'sent' = committed (Saved).
      // Until the MES outcome flag flips, won/lost rows are treated as 'sent' so
      // they aren't orphaned from the user's view.
      const matchesStatus =
        statusFilter === 'all' ||
        e.status === statusFilter ||
        (statusFilter === 'sent' && (e.status === 'won' || e.status === 'lost'));

      const matchesClass =
        isAllClassFiltersActive || matchesEstimateClassFilter(e, classFilter);

      return matchesSearch && matchesCustomer && matchesStatus && matchesClass;
    });
  }, [estimates, searchTerm, customerFilter, statusFilter, classFilter, isAllClassFiltersActive]);

  const handleRequote = async (estimateId: string) => {
    setRequotingId(estimateId);
    try {
      const res = await apiClient.requoteEstimate(estimateId);
      if (res?.id) {
        const path = res.quoteId
          ? `/quotes/${res.quoteId}/estimates/${res.id}`
          : `/estimate/${res.id}`;
        navigate(path, {
          state: {
            priceChanges: res.price_changes || [],
            warnings: res.warnings || [],
          },
        });
      }
    } catch {
      alert('Failed to create re-quote with updated prices.');
    } finally {
      setRequotingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiClient.deleteEstimate(pendingDelete.id);
      setEstimates((prev) => prev.filter((e) => e.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch {
      alert('Failed to delete estimate. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleMaterialClass = (value: 'PE' | 'Non PE') =>
    setClassFilter((f) => ({ ...f, materialClass: f.materialClass === value ? null : value }));
  const togglePrinted = (value: boolean) =>
    setClassFilter((f) => ({ ...f, isPrinted: f.isPrinted === value ? null : value }));
  const toggleStructure = (value: TemplateStructureTier) =>
    setClassFilter((f) => ({ ...f, structure: f.structure === value ? null : value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2 text-mist">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading estimates…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-danger font-medium">Could not load estimates</p>
        <p className="text-mist text-sm mt-1">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={fetchEstimates}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="pb-4 w-full">
      {flashNotice && (
        <div
          role="status"
          className="card border-warning/40 bg-warning-soft text-text-primary mb-4 flex items-start gap-3"
        >
          <span className="text-sm flex-1">{flashNotice}</span>
          <button
            type="button"
            onClick={() => setFlashNotice(null)}
            className="text-xs text-text-secondary hover:text-text-primary shrink-0"
            aria-label="Dismiss notice"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <SectionTitle
            as="h1"
            className="text-2xl lg:text-3xl font-display font-bold text-navy"
          >
            All estimates
          </SectionTitle>
          <Link to="/estimates" className="text-sm text-accent-text hover:underline">
            Customer folders
          </Link>
        </div>
        <Link to="/estimates" className="btn-primary text-center w-full sm:w-auto">
          New quote
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mist" />
          <input
            type="text"
            placeholder="Search job, ref #, customer, template key…"
            className="input w-full pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Filter by customer name…"
            className="input w-full"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {ESTIMATE_STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-micro ease-micro ${
              statusFilter === opt.value
                ? 'bg-gold text-text-on-accent border-gold'
                : 'bg-surface-raised border-border text-ink hover:border-gold/40'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ClassFilterPanel
        title="Filter:"
        filter={classFilter}
        isAllActive={isAllClassFiltersActive}
        countLabel={
          isAllClassFiltersActive
            ? `${filtered.length} of ${estimates.length} estimate${estimates.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${estimates.length} estimate${estimates.length === 1 ? '' : 's'} match`
        }
        onReset={() => setClassFilter(EMPTY_CLASS_FILTER)}
        onToggleMaterial={toggleMaterialClass}
        onTogglePrinted={togglePrinted}
        onToggleStructure={toggleStructure}
        countWithFilter={countWithClassFilter}
      />

      {estimates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No estimates yet"
          body="Start your first cost estimate from a template or from scratch. Saved quotes land here so the whole team can find them."
          action={
            <Link to="/estimates" className="btn-primary inline-flex">
              Create your first quote
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No estimates match these filters"
          body="Try clearing search, customer, or status — or reset all filters."
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setCustomerFilter('');
                setStatusFilter('all');
                setClassFilter(EMPTY_CLASS_FILTER);
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((e) => (
              <div key={e.id} data-interactive="true" className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-mist">{e.refNumber}</p>
                    <p className="font-medium truncate">{e.jobName || 'Untitled'}</p>
                    <p className="text-sm text-mist truncate">{e.customerName || 'No customer'}</p>
                  </div>
                  <span className={`badge shrink-0 ${estimateStatusBadgeClass(e.status)}`}>
                    {estimateStatusLabel(e.status)}
                  </span>
                </div>
                <p className="mt-2 text-gold font-display font-semibold">
                  {e.salePricePerKg
                    ? `${e.displayCurrency || 'USD'} ${Number(e.salePricePerKg).toFixed(2)}/kg`
                    : '—'}
                </p>
                <div className="flex gap-2 mt-3">
                  <Link
                    to={estimateOpenPath(e)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      navigateWithTransition(estimateOpenPath(e));
                    }}
                    className="btn-secondary flex-1 text-center text-sm py-2"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="btn-primary flex-1 text-sm py-2 inline-flex items-center justify-center gap-1"
                    disabled={requotingId === e.id}
                    onClick={() => handleRequote(e.id)}
                  >
                    {requotingId === e.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Re-quote
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm py-2 px-3 inline-flex items-center justify-center text-danger"
                    aria-label={`Delete estimate ${e.refNumber}`}
                    onClick={() => setPendingDelete({ id: e.id, label: `${e.refNumber} — ${e.jobName || 'Untitled'}` })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Ref #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Job</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Price/kg</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-mist">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-slate/50 transition-colors duration-micro ease-micro">
                      <td className="py-4 px-4 font-mono text-sm">{e.refNumber}</td>
                      <td className="py-4 px-4">{e.jobName || '—'}</td>
                      <td className="py-4 px-4">{e.customerName || '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`badge ${estimateStatusBadgeClass(e.status)}`}>
                          {estimateStatusLabel(e.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {e.salePricePerKg
                          ? `${e.displayCurrency || 'USD'} ${Number(e.salePricePerKg).toFixed(2)}/kg`
                          : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={estimateOpenPath(e)}
                            onClick={(ev) => {
                              ev.preventDefault();
                              navigateWithTransition(estimateOpenPath(e));
                            }}
                            className="text-gold font-medium text-sm"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            className="text-sm text-navy hover:text-gold inline-flex items-center gap-1"
                            disabled={requotingId === e.id}
                            onClick={() => handleRequote(e.id)}
                          >
                            {requotingId === e.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Re-quote
                          </button>
                          <button
                            type="button"
                            className="text-sm text-mist hover:text-danger inline-flex items-center gap-1"
                            aria-label={`Delete estimate ${e.refNumber}`}
                            onClick={() => setPendingDelete({ id: e.id, label: `${e.refNumber} — ${e.jobName || 'Untitled'}` })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete estimate?"
        message={
          <>
            This permanently removes{' '}
            <strong className="text-text-primary">{pendingDelete?.label}</strong> from your
            estimates list. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default EstimatesList;
