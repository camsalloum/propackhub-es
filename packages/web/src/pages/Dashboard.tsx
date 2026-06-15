import { Link } from 'react-router-dom';
import { PlusCircle, FileText, Users, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

interface Estimate {
  id: string;
  refNumber: string;
  customerId: string;
  status: 'draft' | 'sent' | 'won' | 'lost';
  totalPrice: number;
  createdAt: string;
  customerName?: string;
}

const Dashboard = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstimates = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getEstimates();
        setEstimates(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load estimates');
        console.error('Error fetching estimates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEstimates();
  }, []);

  // Calculate stats from real data
  const draftCount = estimates.filter(e => e.status === 'draft').length;
  const sentCount = estimates.filter(e => e.status === 'sent').length;
  const wonCount = estimates.filter(e => e.status === 'won').length;
  
  const stats = [
    { label: 'Draft Estimates', value: draftCount.toString(), change: '', icon: FileText, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Sent Proposals', value: sentCount.toString(), change: '', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Won Orders', value: wonCount.toString(), change: '', icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  // Recent estimates (last 5)
  const recentEstimates = estimates.slice(0, 5).map(e => ({
    id: e.refNumber,
    customer: e.customerName || 'Unknown Customer',
    structure: 'Estimate',
    status: e.status,
    date: new Date(e.createdAt).toLocaleDateString(),
    total: `AED ${(e.totalPrice || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`,
    refId: e.id,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-mist">Loading estimates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200">
        <p className="text-red-800 font-medium">Error loading estimates</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Dashboard</h1>
          <p className="text-mist mt-2">Welcome back to ProPackHub Estimation Studio</p>
        </div>
        <Link
          to="/estimate/new"
          className="mt-4 lg:mt-0 btn-primary inline-flex items-center space-x-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New Estimate</span>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-mist">{stat.label}</p>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <p className="text-3xl font-display font-bold text-navy">{stat.value}</p>
                    {stat.change && <span className="text-sm font-medium text-green-600">{stat.change}</span>}
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent estimates */}
      {recentEstimates.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-navy">Recent Estimates</h2>
            <Link to="#" className="text-sm text-gold font-medium hover:underline">
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
                  <tr key={estimate.refId} className="border-b border-border last:border-0 hover:bg-slate/50">
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm font-medium">{estimate.id}</span>
                    </td>
                    <td className="py-4 px-4 font-medium">{estimate.customer}</td>
                    <td className="py-4 px-4">
                      <span className={`badge badge-${estimate.status}`}>
                        {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-mist">{estimate.date}</td>
                    <td className="py-4 px-4 font-display font-semibold">{estimate.total}</td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <Link
                          to={`/estimate/${estimate.refId}`}
                          className="text-sm text-gold font-medium hover:underline"
                        >
                          Open
                        </Link>
                        {estimate.status === 'sent' && (
                          <Link to="#" className="text-sm text-mist font-medium hover:underline">
                            PDF
                          </Link>
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
          <Link to="/estimate/new" className="btn-primary inline-flex items-center space-x-2">
            <PlusCircle className="w-5 h-5" />
            <span>Create First Estimate</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;