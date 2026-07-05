import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { estimateStatusBadgeClass, estimateStatusLabel } from '../lib/estimateStatus';
import { SkeletonTableRows } from '../components/Skeleton';
import { useEntrance } from '../hooks/useEntrance';
import { ConfirmDialog } from '../components/ConfirmDialog';
import CustomerFormDialog, { type CustomerFormValues } from '../components/CustomerFormDialog';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [customer, setCustomer] = useState<any>(null);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchCustomerAndEstimates();
  }, [id]);

  const fetchCustomerAndEstimates = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [cust, custEstimates] = await Promise.all([
        apiClient.getCustomer(id),
        apiClient.getCustomerEstimates(id).catch(() => []),
      ]);
      setCustomer(cust);
      setEstimates(Array.isArray(custEstimates) ? custEstimates : []);
    } catch {
      setCustomer(null);
      setError('Could not load customer');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: CustomerFormValues) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await apiClient.updateCustomer(id, {
        companyName: values.companyName.trim(),
        contactName: values.contactName.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        notes: values.notes.trim() || undefined,
      });
      setCustomer(updated);
      setFormOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await apiClient.deleteCustomer(id);
      navigate('/customers');
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
      setPendingDelete(false);
    }
  };

  const openEstimate = (est: { id: string; quoteId?: string | null }) => {
    navigate(est.quoteId ? `/quotes/${est.quoteId}/estimates/${est.id}` : `/estimate/${est.id}`);
  };

  if (loading) {
    return (
      <div className="w-full">
        <SkeletonTableRows rows={4} />
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="card border border-danger/30 text-center py-10">
        <p className="text-danger font-medium">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void fetchCustomerAndEstimates()}>
          Retry
        </button>
        <Link to="/customers" className="block mt-3 text-accent-text hover:underline">
          Back to customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <p className="text-text-primary">Customer not found</p>
        <Link to="/customers" className="text-accent-text hover:underline">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="w-full pb-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/customers"
            className="mt-1 text-text-secondary hover:text-text-primary shrink-0"
            aria-label="Back to customers"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand truncate">
              {customer.companyName}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-text-secondary">
              {customer.contactName && <span>{customer.contactName}</span>}
              {customer.email && <span>{customer.email}</span>}
              {customer.phone && <span>{customer.phone}</span>}
            </div>
            {customer.notes && (
              <p className="text-sm text-text-primary mt-2 max-w-3xl">{customer.notes}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => setFormOpen(true)}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            type="button"
            className="btn-secondary text-danger inline-flex items-center gap-2"
            onClick={() => setPendingDelete(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(`/estimates/customers/${id}`)}
          >
            Open folder
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`/estimates/customers/${id}?repeatOrder=1`)}
          >
            Repeat order
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-raised/50">
          <h2 className="font-display font-semibold text-brand">Estimates</h2>
        </div>
        {estimates.length === 0 ? (
          <p className="px-4 py-6 text-text-secondary text-sm">No estimates for this customer yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-surface-base/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                    Ref
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                    Job
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                    Product
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                    Price
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((est) => (
                  <tr
                    key={est.id}
                    className="border-b border-border last:border-0 hover:bg-surface-base/40 cursor-pointer"
                    onClick={() => openEstimate(est)}
                  >
                    <td className="px-4 py-2.5 font-mono text-sm">{est.refNumber}</td>
                    <td className="px-4 py-2.5 text-sm">{est.jobName || est.skuLabel || '—'}</td>
                    <td className="px-4 py-2.5 text-sm">{est.productType || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-accent-text">
                      {est.displayCurrency} {Number(est.salePricePerKg || 0).toFixed(2)}/kg
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${estimateStatusBadgeClass(est.status)}`}>
                        {estimateStatusLabel(est.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary">
                      {est.createdAt ? new Date(est.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomerFormDialog
        open={formOpen}
        mode="edit"
        saving={saving}
        initial={{
          companyName: customer.companyName,
          contactName: customer.contactName ?? '',
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          notes: customer.notes ?? '',
        }}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
        onSave={(values) => void handleSave(values)}
      />

      <ConfirmDialog
        open={pendingDelete}
        title="Delete customer?"
        message={
          <>
            Delete <strong>{customer.companyName}</strong>? Customers with estimates cannot be deleted.
          </>
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  );
}
