// Feature: es-ui-revamp — Customers List page migration (Requirement 20).
//
// - All text/background/border/surface colors source from semantic Design_Token
//   utilities (text-brand, text-text-secondary, accent-text, bg-surface-raised,
//   border-border, …); no raw hex or legacy palette literals remain (R20.1).
// - List content animates in on mount via `useEntrance`, a no-op under reduced
//   motion so content renders in its final state (R20.3, R20.5).
// - Customer rows are interactive Cards (`data-interactive="true"`) / token-backed
//   row hover so a background/border micro-interaction applies and reverts on
//   hover/focus end (R20.4, R20.5).
// - Listing, search, and navigation behavior are unchanged (R20.6).

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search } from 'lucide-react';
import { useEntrance } from '../hooks/useEntrance';
import { useViewTransition } from '../hooks/useViewTransition';
import EmptyState from '../components/EmptyState';
import { apiClient } from '../lib/api';

export default function CustomersList() {
  // Single-play mount entrance for the list content; no-op under reduced motion (R20.3, R20.5).
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  // View Transitions API for the list → detail morph (instant fallback elsewhere).
  const navigate = useViewTransition();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
      console.error('Failed to load customers:', err);
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
          <div className="spinner h-12 w-12 mx-auto mb-4" />
          <p className="text-text-secondary">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto card border border-danger/30 text-center py-12">
        <p className="text-danger font-medium">Could not load customers</p>
        <p className="text-text-secondary text-sm mt-1">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={fetchCustomers}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-accent-text" />
          <div>
            <h1 className="text-2xl font-display font-bold text-brand">Customers</h1>
            <p className="text-sm text-text-secondary">{customers.length} customers</p>
          </div>
        </div>
        <Link to="/templates" className="btn-primary inline-flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Estimate</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
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
        customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            body="Customers are auto-saved the first time you assign one to an estimate. Once added, they show up here with quote history."
            action={
              <Link to="/templates" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Start a new estimate</span>
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No customers match your search"
            body="Try a different company name, contact, or email."
            action={
              <button type="button" className="btn-secondary" onClick={() => setSearch('')}>
                Clear search
              </button>
            }
          />
        )
      ) : (
        <div className="card p-0">
          <div className="table-wrap">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-surface-base/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-surface-base/50 transition-colors duration-micro ease-micro cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/customers/${c.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/customers/${c.id}`);
                      }}
                      className="font-medium text-brand hover:text-accent-text transition-colors duration-micro ease-micro"
                    >
                      {c.companyName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.contactName || <span className="text-text-secondary">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.email || <span className="text-text-secondary">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.phone || <span className="text-text-secondary">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
