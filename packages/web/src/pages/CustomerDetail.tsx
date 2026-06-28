// Feature: es-ui-revamp — Customer Detail page migration (Requirements 21.1–21.8).
//
// - All Cards and sections are token-backed (semantic token utilities + the
//   `.card` class); no raw hex / palette literals remain (R21.1). A theme swap
//   therefore re-resolves every value via CSS variables with no element
//   retaining the previous theme (R21.2).
// - The detail content animates in on mount via `useEntrance` (fade/slide),
//   ending at full opacity and final position; it is a no-op under reduced
//   motion (R21.3, R21.4).
// - Interactive quote-history cards carry `data-interactive="true"` so the
//   `index.css` hover/focus elevation + translateY micro-interaction applies
//   and reverts automatically within `motion-micro` (R21.5, R21.6).
// - A failed `:id` load shows a token-backed error indication while retaining
//   the back-to-customers navigation and a retry action (R21.8).
// - All customer data fields and navigation actions are preserved unchanged
//   (R21.7).

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Copy } from 'lucide-react';
import { apiClient } from '../lib/api';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { estimateStatusBadgeClass, estimateStatusLabel } from '../lib/estimateStatus';
import { SkeletonTableRows } from '../components/Skeleton';
import { useEntrance } from '../hooks/useEntrance';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Single-play mount entrance for the detail content; no-op under reduced
  // motion (R21.3, R21.4).
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [customer, setCustomer] = useState<any>(null);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchCustomerAndEstimates();
  }, [id]);

  const fetchCustomerAndEstimates = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      try {
        const cust = await apiClient.getCustomer(id);
        setCustomer(cust);
      } catch (err) {
        console.error('Failed to load customer:', err);
        setCustomer(null);
        setError('Could not load customer details');
      }

      try {
        const custEstimates = await apiClient.getCustomerEstimates(id);
        setEstimates(custEstimates);
      } catch (err) {
        console.error('Failed to load customer estimates:', err);
        setEstimates([]);
        setError((prev) => prev || 'Could not load quote history');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequote = async (estimate: any) => {
    try {
      const newEst = await apiClient.requoteEstimate(estimate.id);
      navigate(`/estimate/${newEst.id}`, { state: { priceChanges: newEst.price_changes } });
    } catch (err) {
      alert('Failed to create re-quote');
    }
  };

  const handleDuplicate = async (estimate: any) => {
    try {
      const copy = await apiClient.duplicateEstimate(estimate.id);
      navigate(`/estimate/${copy.id}`);
    } catch {
      alert('Failed to duplicate estimate');
    }
  };

  if (loading) {
    return <div className="p-8 max-w-6xl mx-auto"><SkeletonTableRows rows={4} /></div>;
  }

  // Customer data for the requested :id failed to load: show an error
  // indication while retaining navigation actions (R21.8).
  if (error && !customer) {
    return (
      <div className="max-w-6xl mx-auto p-8 card bg-danger/10 border border-danger/30 text-center">
        <p className="text-danger font-medium">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={fetchCustomerAndEstimates}>
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
      <div className="p-8">
        <p className="text-text-primary">Customer not found</p>
        <Link to="/customers" className="text-accent-text hover:underline">Back to customers</Link>
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center space-x-4">
        <Link to="/customers" className="text-text-secondary hover:text-text-primary transition-colors duration-micro ease-micro">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-brand">{customer.companyName}</h1>
          <div className="flex items-center space-x-4 mt-2 text-sm text-text-secondary">
            {customer.contactName && <span>{customer.contactName}</span>}
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Customer info */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="font-display font-semibold text-brand mb-4">Contact Information</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-text-secondary mb-1">Company</p>
                <p className="font-medium">{customer.companyName}</p>
              </div>
              {customer.contactName && (
                <div>
                  <p className="text-text-secondary mb-1">Contact Person</p>
                  <p className="font-medium">{customer.contactName}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <p className="text-text-secondary mb-1">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-text-secondary mb-1">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
              {customer.notes && (
                <div>
                  <p className="text-text-secondary mb-1">Notes</p>
                  <p className="font-medium text-sm">{customer.notes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/templates?customer=${id}`)}
              className="btn-primary w-full mt-6"
            >
              + New estimate
            </button>
          </div>
        </div>

        {/* Right: Estimates history */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-display font-semibold text-brand mb-6">Quote History</h3>

            {estimates.length === 0 && (
              <p className="text-text-secondary">No quotes yet for this customer</p>
            )}

            {estimates.length > 0 && (
              <div className="space-y-4">
                {estimates.map((est) => (
                  <div
                    key={est.id}
                    data-interactive="true"
                    tabIndex={0}
                    className="card p-4 bg-surface-base"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono font-semibold text-brand">{est.refNumber}</p>
                        <p className="text-sm text-text-secondary">{est.jobName}</p>
                      </div>
                      <span className={`badge ${estimateStatusBadgeClass(est.status)}`}>
                        {estimateStatusLabel(est.status)}
                      </span>
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      {est.layers?.length > 0 && (
                        <LaminateVisualizer
                          layers={est.layers.map((l: any, i: number) => ({
                            id: String(i),
                            type: 'substrate',
                            material: l.materialName || 'Layer',
                            micron: parseFloat(l.micron) || 10,
                          }))}
                          width={80}
                          height={48}
                        />
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 text-sm">
                      <div>
                        <p className="text-text-secondary">Product</p>
                        <p className="font-medium">{est.productType}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Sale Price</p>
                        <p className="font-display font-semibold text-accent-text">{est.displayCurrency} {Number(est.salePricePerKg || 0).toFixed(2)}/kg</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Total µ</p>
                        <p className="font-mono font-semibold">{est.totalMicron}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Created</p>
                        <p className="font-medium">{new Date(est.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link to={`/estimate/${est.id}`} className="btn-secondary text-sm">
                        Open
                      </Link>
                      <button onClick={() => handleDuplicate(est)} className="btn-secondary text-sm inline-flex items-center space-x-1">
                        <Copy className="w-3 h-3" />
                        <span>Duplicate</span>
                      </button>
                      <button onClick={() => handleRequote(est)} className="btn-secondary text-sm inline-flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>Re-quote</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
