import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';

const EstimatesList = () => {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiClient.getEstimates();
        setEstimates(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load estimates');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-navy mb-4">All Estimates</h1>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Ref #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Actions</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                  <td className="py-4 px-4 font-mono">{e.refNumber}</td>
                  <td className="py-4 px-4">{e.customerName || '—'}</td>
                  <td className="py-4 px-4">{e.status}</td>
                  <td className="py-4 px-4">{e.salePricePerKg ? `${e.displayCurrency} ${Number(e.salePricePerKg).toFixed(2)}/kg` : '—'}</td>
                  <td className="py-4 px-4"><Link to={`/estimate/${e.id}`} className="text-gold">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EstimatesList;
