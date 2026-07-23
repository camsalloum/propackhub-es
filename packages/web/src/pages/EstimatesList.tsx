import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Loader2, FileText } from 'lucide-react';
import { useEntrance } from '../hooks/useEntrance';
import { useViewTransition } from '../hooks/useViewTransition';
import EmptyState from '../components/EmptyState';
import { SectionTitle } from '../components/SectionTitle';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiClient } from '../lib/api';
import { meaningfulRequotePriceChanges } from '../lib/requote';
import {
  ClassFilterPanel,
  EMPTY_CLASS_FILTER,
} from '../components/ClassFilterPanel';
import {
  matchesEstimateClassFilter,
  type ClassFilter,
  type TemplateStructureTier,
} from '../lib/templateCatalog';
import { ESTIMATE_STATUS_FILTERS } from '../lib/estimateStatus';
import { EstimatesPackagesTable } from '../features/estimates-list/EstimatesPackagesTable';
import { EstimatesFlatList } from '../features/estimates-list/EstimatesFlatList';
import { groupEstimatesByPackage } from '../features/estimates-list/groupPackages';
import type {
  EstimateListRow,
  EstimatesListViewMode,
} from '../features/estimates-list/types';

const EstimatesList = () => {
  const navigate = useNavigate();
  const navigateWithTransition = useViewTransition();
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [estimates, setEstimates] = useState<EstimateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<ClassFilter>(EMPTY_CLASS_FILTER);
  const [viewMode, setViewMode] = useState<EstimatesListViewMode>('package');
  const [requotingId, setRequotingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [deleteAnchor, setDeleteAnchor] = useState<DOMRect | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flashNotice, setFlashNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const note = sessionStorage.getItem('es:flashNotice');
      if (note) {
        setFlashNotice(note);
        sessionStorage.removeItem('es:flashNotice');
      }
    } catch {
      /* sessionStorage may be unavailable */
    }
  }, []);

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEstimates({ limit: 500 });
      setEstimates((data || []) as EstimateListRow[]);
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
        (e.quoteRefNumber || '').toLowerCase().includes(q) ||
        (e.customerName || '').toLowerCase().includes(q) ||
        (e.sourceTemplateKey || '').toLowerCase().includes(q);

      const matchesCustomer =
        !customerFilter.trim() ||
        (e.customerName || '').toLowerCase().includes(customerFilter.trim().toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        e.status === statusFilter ||
        (statusFilter === 'sent' && (e.status === 'won' || e.status === 'lost'));

      const matchesClass =
        isAllClassFiltersActive || matchesEstimateClassFilter(e, classFilter);

      return matchesSearch && matchesCustomer && matchesStatus && matchesClass;
    });
  }, [estimates, searchTerm, customerFilter, statusFilter, classFilter, isAllClassFiltersActive]);

  const packages = useMemo(() => groupEstimatesByPackage(filtered), [filtered]);

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
            priceChanges: meaningfulRequotePriceChanges(res.price_changes || []),
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
      setDeleteAnchor(null);
    } catch {
      alert('Failed to delete estimate. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const onDelete = (est: EstimateListRow, anchor: DOMRect) => {
    setDeleteAnchor(anchor);
    setPendingDelete({
      id: est.id,
      label: `${est.refNumber} — ${est.jobName || 'Untitled'}`,
    });
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
            placeholder="Search job, PKG/QT ref, customer, template…"
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

      <div className="flex flex-wrap items-center gap-2 mb-4">
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
        <span className="mx-1 hidden sm:inline text-border">|</span>
        <button
          type="button"
          onClick={() => setViewMode('package')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-micro ease-micro ${
            viewMode === 'package'
              ? 'bg-gold text-text-on-accent border-gold'
              : 'bg-surface-raised border-border text-ink hover:border-gold/40'
          }`}
        >
          By package
        </button>
        <button
          type="button"
          onClick={() => setViewMode('flat')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-micro ease-micro ${
            viewMode === 'flat'
              ? 'bg-gold text-text-on-accent border-gold'
              : 'bg-surface-raised border-border text-ink hover:border-gold/40'
          }`}
        >
          Flat
        </button>
      </div>

      <ClassFilterPanel
        title="Filter:"
        filter={classFilter}
        isAllActive={isAllClassFiltersActive}
        countLabel={
          viewMode === 'package'
            ? `${packages.length} package${packages.length === 1 ? '' : 's'} · ${filtered.length} estimate${filtered.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${estimates.length} estimate${estimates.length === 1 ? '' : 's'}`
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
      ) : viewMode === 'package' ? (
        <EstimatesPackagesTable
          packages={packages}
          requotingId={requotingId}
          onOpen={navigateWithTransition}
          onRequote={handleRequote}
          onDelete={onDelete}
        />
      ) : (
        <EstimatesFlatList
          estimates={filtered}
          requotingId={requotingId}
          onOpen={navigateWithTransition}
          onRequote={handleRequote}
          onDelete={onDelete}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        anchorRect={deleteAnchor}
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
        onCancel={() => {
          setPendingDelete(null);
          setDeleteAnchor(null);
        }}
      />
    </div>
  );
};

export default EstimatesList;
