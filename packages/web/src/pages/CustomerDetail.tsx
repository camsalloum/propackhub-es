import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { apiClient } from '../lib/api';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchCustomerAndEstimates();
  }, [id]);

  const fetchCustomerAndEstimates = async () => {
    try {
      setLoading(true);
      // Fetch customer details
      const customers = await apiClient.getCustomers();
      const cust = customers.find((c: any) => c.id === id);
      setCustomer(cust || null);

      // Fetch estimates for this customer from the server
      const custEstimates = await apiClient.getCustomerEstimates(id!);
      setEstimates(custEstimates);
    } catch (error) {
      console.error('Failed to load customer data:', error);
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

  if (loading) {
    return <div className="p-8">Loading customer...</div>;
  }

  if (!customer) {
    return (
      <div className="p-8">
        <p>Customer not found</p>
        <Link to="/customers" className="text-gold hover:underline">Back to customers</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center space-x-4">
        <Link to="/customers" className="text-mist hover:text-ink">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-navy">{customer.companyName}</h1>
          <div className="flex items-center space-x-4 mt-2 text-sm text-mist">
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
            <h3 className="font-display font-semibold text-navy mb-4">Contact Information</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-mist mb-1">Company</p>
                <p className="font-medium">{customer.companyName}</p>
              </div>
              {customer.contactName && (
                <div>
                  <p className="text-mist mb-1">Contact Person</p>
                  <p className="font-medium">{customer.contactName}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <p className="text-mist mb-1">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-mist mb-1">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
              {customer.notes && (
                <div>
                  <p className="text-mist mb-1">Notes</p>
                  <p className="font-medium text-sm">{customer.notes}</p>
                </div>
              )}
            </div>

            <button onClick={() => navigate(`/estimate`, { state: { customerId: id } })} className="btn-primary w-full mt-6">
              + New estimate
            </button>
          </div>
        </div>

        {/* Right: Estimates history */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-display font-semibold text-navy mb-6">Quote History</h3>

            {estimates.length === 0 && (
              <p className="text-mist">No quotes yet for this customer</p>
            )}

            {estimates.length > 0 && (
              <div className="space-y-4">
                {estimates.map((est) => (
                  <div key={est.id} className="p-4 bg-slate rounded-lg border border-border hover:border-gold/30 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono font-semibold text-navy">{est.refNumber}</p>
                        <p className="text-sm text-mist">{est.jobName}</p>
                      </div>
                      <span className={`badge badge-${est.status}`}>{est.status}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                      <div>
                        <p className="text-mist">Product</p>
                        <p className="font-medium">{est.productType}</p>
                      </div>
                      <div>
                        <p className="text-mist">Sale Price</p>
                        <p className="font-display font-semibold text-gold">{est.displayCurrency} {Number(est.salePricePerKg || 0).toFixed(2)}/kg</p>
                      </div>
                      <div>
                        <p className="text-mist">Total µ</p>
                        <p className="font-mono font-semibold">{est.totalMicron}</p>
                      </div>
                      <div>
                        <p className="text-mist">Created</p>
                        <p className="font-medium">{new Date(est.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Link to={`/estimate/${est.id}`} className="btn-secondary text-sm">
                        Open
                      </Link>
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
