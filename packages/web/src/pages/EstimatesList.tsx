import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: 'badge-draft',
    sent: 'badge-sent',
    won: 'badge-won',
    lost: 'badge-lost',
  };
  return map[status] || 'badge-draft';
};

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-mist">Loading estimates…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-800 font-medium">Could not load estimates</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-display font-bold text-navy">All Estimates</h1>
        <Link to="/estimate/choose" className="btn-primary text-center w-full sm:w-auto">
          New estimate
        </Link>
      </div>

      {estimates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-mist mb-4">No estimates yet</p>
          <Link to="/estimate/choose" className="btn-primary inline-flex">
            Create your first quote
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {estimates.map((e) => (
              <Link
                key={e.id}
                to={`/estimate/${e.id}`}
                className="card block p-4 active:bg-slate/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-mist">{e.refNumber}</p>
                    <p className="font-medium truncate">{e.jobName || 'Untitled'}</p>
                    <p className="text-sm text-mist truncate">{e.customerName || 'No customer'}</p>
                  </div>
                  <span className={`badge shrink-0 ${statusBadge(e.status)}`}>{e.status}</span>
                </div>
                <p className="mt-2 text-gold font-display font-semibold">
                  {e.salePricePerKg
                    ? `${e.displayCurrency || 'USD'} ${Number(e.salePricePerKg).toFixed(2)}/kg`
                    : '—'}
                </p>
              </Link>
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist"></th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                      <td className="py-4 px-4 font-mono text-sm">{e.refNumber}</td>
                      <td className="py-4 px-4">{e.jobName || '—'}</td>
                      <td className="py-4 px-4">{e.customerName || '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`badge ${statusBadge(e.status)}`}>{e.status}</span>
                      </td>
                      <td className="py-4 px-4">
                        {e.salePricePerKg
                          ? `${e.displayCurrency || 'USD'} ${Number(e.salePricePerKg).toFixed(2)}/kg`
                          : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <Link to={`/estimate/${e.id}`} className="text-gold font-medium">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EstimatesList;
