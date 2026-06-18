import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface MasterMaterial {
  key: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive';
  solidPercent: number;
  density: number;
  costPerKgUsd: number;
  wastePercent: number;
  isSolventBased: boolean;
}

const MasterLibrary = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPlatformAdmin = user?.role === 'platform_admin';

  useEffect(() => {
    if (!isPlatformAdmin) return;
    (async () => {
      try {
        const data = await apiClient.getMasterMaterials();
        setMaterials(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load master library');
      } finally {
        setLoading(false);
      }
    })();
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) {
    return <Navigate to="/settings" replace />;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateMasterMaterials(materials);
      alert('Master library saved. New tenants will receive updated seed on registration.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px] text-mist">Loading master library…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 lg:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-navy">Master Material Library</h1>
        <p className="text-mist mt-1 text-sm">Platform seed copied to every new tenant at registration.</p>
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200 mb-4 text-red-700 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const data = await apiClient.getMasterMaterials();
                setMaterials(data || []);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load master library');
              } finally {
                setLoading(false);
              }
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {materials.map((m, i) => (
          <div key={m.key} className="card p-4 space-y-3">
            <div className="font-medium">{m.name}</div>
            <div className="text-xs text-mist capitalize">{m.type} · {m.key}</div>
            <label className="block text-xs text-mist">Cost/kg USD</label>
            <input
              type="number"
              inputMode="decimal"
              className="input w-full min-h-[48px]"
              value={m.costPerKgUsd}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMaterials((prev) => prev.map((x, j) => (j === i ? { ...x, costPerKgUsd: v } : x)));
              }}
            />
          </div>
        ))}
      </div>

      <div className="card hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3">Key</th>
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-left py-2 px-3">Cost/kg USD</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m, i) => (
              <tr key={m.key} className="border-b border-border last:border-0">
                <td className="py-2 px-3 font-mono text-xs">{m.key}</td>
                <td className="py-2 px-3">{m.name}</td>
                <td className="py-2 px-3 capitalize">{m.type}</td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    className="input w-28"
                    value={m.costPerKgUsd}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMaterials((prev) => prev.map((x, j) => (j === i ? { ...x, costPerKgUsd: v } : x)));
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full md:w-auto mt-6 min-h-[48px]"
      >
        {saving ? 'Saving…' : 'Save master library'}
      </button>
    </div>
  );
};

export default MasterLibrary;
