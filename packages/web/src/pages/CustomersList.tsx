import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useEntrance } from '../hooks/useEntrance';
import EmptyState from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import CustomerFormDialog, { type CustomerFormValues } from '../components/CustomerFormDialog';
import { SectionTitle } from '../components/SectionTitle';
import { apiClient } from '../lib/api';
import { useCustomerAccess } from '../hooks/useCustomerAccess';

type CustomerRow = {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

const PAGE_SIZE = 100;

export default function CustomersList() {
  const navigate = useNavigate();
  const customerAccess = useCustomerAccess();
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(async (nextOffset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      const res = await apiClient.getCustomers({ limit: PAGE_SIZE, offset: nextOffset });
      const rows = (res.items || []) as CustomerRow[];
      setTotal(res.total ?? rows.length);
      setOffset(nextOffset + rows.length);
      setCustomers((prev) => (append ? [...prev, ...rows] : rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.companyName?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: CustomerRow) => {
    setFormMode('edit');
    setEditing(c);
    setFormOpen(true);
  };

  const handleSave = async (values: CustomerFormValues) => {
    setSaving(true);
    try {
      const payload = {
        companyName: values.companyName.trim(),
        contactName: values.contactName.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        notes: values.notes.trim() || undefined,
      };
      if (formMode === 'create') {
        await apiClient.createCustomer(payload);
      } else if (editing) {
        await apiClient.updateCustomer(editing.id, payload);
      }
      setFormOpen(false);
      setEditing(null);
      await loadPage(0, false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiClient.deleteCustomer(pendingDelete.id);
      setPendingDelete(null);
      await loadPage(0, false);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const msg = err instanceof Error ? err.message : 'Delete failed';
      alert(
        status === 409 || msg.toLowerCase().includes('estimate')
          ? 'This customer has estimates and cannot be deleted.'
          : msg
      );
    } finally {
      setDeleting(false);
    }
  };

  const hasMore = customers.length < total;

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="card border border-danger/30 text-center py-10">
        <p className="text-danger font-medium">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void loadPage(0, false)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="w-full pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <SectionTitle as="h1" className="text-2xl lg:text-3xl font-display font-bold text-navy">
            Customers
          </SectionTitle>
          <p className="text-sm text-text-secondary mt-1">{total} total</p>
        </div>
        {customerAccess.canCreate && (
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New customer
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
        <input
          type="search"
          placeholder="Search company, contact, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={customers.length === 0 ? 'No customers yet' : 'No matches'}
          body={
            customers.length === 0
              ? customerAccess.canCreate
                ? 'Add a customer here or when starting a new quote.'
                : 'Customers sync from PEBI for this account.'
              : 'Try a different search term.'
          }
          action={
            customers.length === 0 ? (
              customerAccess.canCreate ? (
                <button type="button" className="btn-primary" onClick={openCreate}>
                  New customer
                </button>
              ) : undefined
            ) : (
              <button type="button" className="btn-secondary" onClick={() => setSearch('')}>
                Clear search
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="table-wrap">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-border bg-surface-base/50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider w-28">
                      {customerAccess.canEdit ? 'Actions' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-base/40">
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          className="font-medium text-brand hover:text-accent-text text-left"
                          onClick={() => navigate(`/customers/${c.id}`)}
                        >
                          {c.companyName}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-primary">
                        {c.contactName || <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-primary">
                        {c.email || <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-primary">
                        {c.phone || <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {customerAccess.canEdit ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="p-2 text-mist hover:text-accent-text rounded-lg"
                              title="Edit"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-2 text-mist hover:text-danger rounded-lg"
                              title="Delete"
                              onClick={() => setPendingDelete(c)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {hasMore && !search.trim() && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={loadingMore}
                onClick={() => void loadPage(offset, true)}
              >
                {loadingMore ? 'Loading…' : `Load more (${customers.length} of ${total})`}
              </button>
            </div>
          )}
        </>
      )}

      <CustomerFormDialog
        open={formOpen}
        mode={formMode}
        saving={saving}
        initial={
          editing
            ? {
                companyName: editing.companyName,
                contactName: editing.contactName ?? '',
                email: editing.email ?? '',
                phone: editing.phone ?? '',
                notes: editing.notes ?? '',
              }
            : undefined
        }
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onSave={(values) => void handleSave(values)}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete customer?"
        message={
          pendingDelete ? (
            <>
              Delete <strong>{pendingDelete.companyName}</strong>? Customers with estimates cannot be
              deleted.
            </>
          ) : null
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
