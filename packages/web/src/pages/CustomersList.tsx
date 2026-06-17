import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search } from 'lucide-react';
import { apiClient } from '../lib/api';

export default function CustomersList() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName?.toLowerCase().includes(q) ||
      c.contactName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4" />
          <p className="text-mist">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-gold" />
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Customers</h1>
            <p className="text-sm text-mist">{customers.length} customers</p>
          </div>
        </div>
        <Link to="/estimate/new" className="btn-primary inline-flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Estimate</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mist" />
        <input
          type="text"
          placeholder="Search by company, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-mist mx-auto mb-4" />
          <p className="text-mist">No customers found</p>
          {search && <p className="text-sm text-mist mt-1">Try adjusting your search</p>}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-slate/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-mist uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-mist uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-mist uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-mist uppercase tracking-wider">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border hover:bg-gold/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <Link to={`/customers/${c.id}`} className="font-medium text-navy hover:text-gold">
                      {c.companyName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.contactName || <span className="text-mist">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.email || <span className="text-mist">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.phone || <span className="text-mist">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}