import { Link } from 'react-router-dom';
import { PlusCircle, FileText, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { SkeletonDashboard } from '../components/Skeleton';

interface SummaryEstimate {
  id: string;
  refNumber: string;
  jobName?: string;
  customerName?: string | null;
  status: 'draft' | 'sent' | 'won' | 'lost';
  totalPrice: number;
  displayCurrency?: string;
  createdAt: string;
  daysLeft?: number;
  validUntil?: string | null;
}

interface DashboardSummary {
  estimatesThisMonth: number;
  drafts: number;
  sent: number;
  won: number;
  recent: SummaryEstimate[];
  expiringProposals: SummaryEstimate[];
}

const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = summary
    ? [
        {
          label: 'This Month',
          value: summary.estimatesThisMonth.toString(),
          icon: FileText,
          color: 'text-navy',
          bg: 'bg-slate',
        },
        {
          label: 'Draft Estimates',
          value: summary.drafts.toString(),
          icon: FileText,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
        },
        {
          label: 'Sent Proposals',
          value: summary.sent.toString(),
          icon: TrendingUp,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
        },
        {
          label: 'Won Orders',
          value: summary.won.toString(),
          icon: Users,
          color: 'text-green-600',
          bg: 'bg-green-100',
        },
      ]
    : [];

  const formatTotal = (e: SummaryEstimate) =>
    `${e.displayCurrency || 'AED'} ${(e.totalPrice || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200">
        <p className="text-red-800 font-medium">Error loading dashboard</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={fetchSummary}>
          Retry
        </button>
      </div>
    );
  }

  const recentEstimates = summary?.recent ?? [];
  const expiring = summary?.expiringProposals ?? [];

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Dashboard</h1>
          <p className="text-mist mt-2">Welcome back to ProPackHub Estimation Studio</p>
        </div>
        <Link
          to="/templates?new=1"
          className="mt-4 lg:mt-0 btn-primary inline-flex items-center space-x-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New Estimate</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mist">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-navy mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {expiring.length > 0 && (
        <div className="card mb-8 border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-display font-semibold text-navy">Expiring Proposals</h2>
            <span className="text-sm text-mist">(within 7 days)</span>
          </div>
          <div className="space-y-3">
            {expiring.map((est) => (
              <div
                key={est.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white rounded-lg border border-amber-100"
              >
                <div>
                  <span className="font-mono text-sm font-medium">{est.refNumber}</span>
                  <span className="text-mist mx-2">·</span>
                  <span className="font-medium">{est.customerName || 'No customer'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-amber-700 font-medium">
                    {est.daysLeft === 0 ? 'Expires today' : `${est.daysLeft} day${est.daysLeft === 1 ? '' : 's'} left`}
                  </span>
                  <Link to={`/estimate/${est.id}`} className="text-sm text-gold font-medium hover:underline">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentEstimates.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-navy">Recent Estimates</h2>
            <Link to="/estimates" className="text-sm text-gold font-medium hover:underline">
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Ref #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentEstimates.map((estimate) => (
                  <tr key={estimate.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm font-medium">{estimate.refNumber}</span>
                    </td>
                    <td className="py-4 px-4 font-medium">{estimate.customerName || 'Unknown Customer'}</td>
                    <td className="py-4 px-4">
                      <span className={`badge badge-${estimate.status}`}>
                        {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-mist">
                      {new Date(estimate.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 font-display font-semibold">{formatTotal(estimate)}</td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <Link
                          to={`/estimate/${estimate.id}`}
                          className="text-sm text-gold font-medium hover:underline"
                        >
                          Open
                        </Link>
                        {estimate.status === 'sent' && (
                          <button
                            onClick={async () => {
                              try {
                                const blob = await apiClient.getProposalPdf(estimate.id);
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `proposal-${estimate.refNumber}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              } catch {
                                alert('Failed to download PDF');
                              }
                            }}
                            className="text-sm text-mist font-medium hover:underline"
                          >
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-mist mx-auto mb-4" />
          <h3 className="text-xl font-display font-semibold text-navy mb-2">No estimates yet</h3>
          <p className="text-mist mb-6">Create your first estimate to get started</p>
          <Link to="/estimate/choose" className="btn-primary inline-flex items-center space-x-2">
            <PlusCircle className="w-5 h-5" />
            <span>Create First Estimate</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
