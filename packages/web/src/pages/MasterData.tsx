import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Database } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMasterDataContext } from '../contexts/MasterDataContext';
import {
  apiClient,
  type PlatformMasterMaterialRow,
  type PlatformReferenceCategory,
  type PlatformReferenceItemInput,
  type PlatformMasterMaterialInput,
} from '../lib/api';

type MaterialTab = 'substrate' | 'ink' | 'adhesive' | 'packaging';
type RefTab = 'product_type' | 'unit' | 'rm_type';
type Tab = MaterialTab | RefTab;

const MATERIAL_TABS: { id: MaterialTab; label: string }[] = [
  { id: 'substrate', label: 'Substrates' },
  { id: 'ink', label: 'Ink & Coating' },
  { id: 'adhesive', label: 'Adhesive' },
  { id: 'packaging', label: 'Packaging' },
];

const REF_TABS: { id: RefTab; label: string }[] = [
  { id: 'product_type', label: 'Product Types' },
  { id: 'unit', label: 'Units' },
  { id: 'rm_type', label: 'RM Types' },
];

const PACKAGING_FAMILY = 'Packaging';

function slugKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function filterMaterials(tab: MaterialTab, rows: PlatformMasterMaterialRow[]) {
  if (tab === 'packaging') {
    return rows.filter((m) => m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY);
  }
  if (tab === 'substrate') {
    return rows.filter(
      (m) => m.type === 'substrate' && m.substrateFamily !== PACKAGING_FAMILY
    );
  }
  return rows.filter((m) => m.type === tab);
}

function newMaterialRow(tab: MaterialTab): PlatformMasterMaterialRow {
  const base = {
    id: `new-${Date.now()}`,
    key: '',
    name: '',
    solidPercent: 100,
    density: 0.91,
    costPerKgUsd: tab === 'ink' ? 12 : tab === 'adhesive' ? 8 : 3,
    wastePercent: 0,
    isSolventBased: tab === 'ink' || tab === 'adhesive',
    substrateFamily: tab === 'packaging' ? PACKAGING_FAMILY : tab === 'substrate' ? 'BOPP' : tab === 'ink' ? 'Ink & Coating' : 'Adhesive',
    substrateGrade: '',
    hoover: '',
    marketPriceUsd: null as number | null,
    externalId: null as string | null,
    externalSource: null as string | null,
  };
  if (tab === 'packaging') {
    return { ...base, type: 'substrate', name: 'New packaging item' };
  }
  return {
    ...base,
    type: tab,
    name: `New ${tab}`,
  };
}

const MasterData = () => {
  const { user, isLoading } = useAuth();
  const { invalidate } = useMasterDataContext();
  const [tab, setTab] = useState<Tab>('substrate');
  const [materials, setMaterials] = useState<PlatformMasterMaterialRow[]>([]);
  const [refItems, setRefItems] = useState<PlatformReferenceItemInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMaterialTab = (t: Tab): t is MaterialTab =>
    MATERIAL_TABS.some((x) => x.id === t);

  const loadMaterials = useCallback(async () => {
    const rows = await apiClient.getPlatformMasterDataMaterials();
    setMaterials(rows);
  }, []);

  const loadReference = useCallback(async () => {
    const ref = await apiClient.getPlatformMasterDataReference();
    const map: Record<RefTab, PlatformReferenceItemInput[]> = {
      product_type: (ref.productTypeRows ?? []).map((r) => ({ label: r.label, code: r.code })),
      unit: (ref.units ?? []).map((l) => ({ label: l })),
      // Use rmTypeRows (with codes) when available; fall back to bare labels with derived codes
      rm_type: (ref.rmTypeRows ?? ref.rmTypes ?? []).map((r) =>
        typeof r === 'string'
          ? { label: r, code: '' }
          : { label: (r as { label: string }).label, code: (r as { code: string }).code ?? '' }
      ),
    };
    if (!isMaterialTab(tab)) {
      setRefItems(map[tab] ?? []);
    }
  }, [tab]);

  const canManageMasterData =
    user?.role === 'tenant_admin' || user?.role === 'platform_admin';

  useEffect(() => {
    if (!canManageMasterData) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadMaterials();
        await loadReference();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load master data');
      } finally {
        setLoading(false);
      }
    })();
  }, [canManageMasterData, loadMaterials, loadReference]);

  useEffect(() => {
    if (!isMaterialTab(tab)) {
      loadReference().catch(() => {});
    }
  }, [tab, loadReference]);

  const visibleMaterials = useMemo(() => {
    if (!isMaterialTab(tab)) return [];
    return filterMaterials(tab, materials);
  }, [tab, materials]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading…
      </div>
    );
  }

  if (!canManageMasterData) {
    return (
      <div className="max-w-lg mx-auto card p-6 mt-8">
        <h1 className="text-xl font-display font-bold text-navy mb-2">Master Data</h1>
        <p className="text-mist text-sm mb-4">
          Admin access required. You are signed in as <strong>{user?.role ?? 'user'}</strong>.
        </p>
        <p className="text-sm text-ink">
          Sign out and log in with an admin account (e.g.{' '}
          <code className="text-xs bg-slate px-1 rounded">admin@propackhub.com</code>).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading master data…
      </div>
    );
  }

  const syncToast = (sync: { tenantsSynced: number; updated: number; inserted: number }) => {
    setStatus(
      `Synced ${sync.tenantsSynced} tenant(s) — ${sync.inserted} inserted, ${sync.updated} updated`
    );
    invalidate();
  };

  const handleSaveMaterials = async () => {
    if (!isMaterialTab(tab)) return;
    setSaving(true);
    setError(null);
    try {
      const tabRows = visibleMaterials.map((row, i) => {
        const key = row.key || slugKey(row.name || `item-${i}`);
        const name = row.name.trim() || key;
        return {
          ...row,
          id: undefined,
          key,
          name,
          marketPriceUsd: row.marketPriceUsd ?? row.costPerKgUsd,
          sortOrder: i,
        };
      });

      const isInCurrentTab = (m: PlatformMasterMaterialRow) => {
        if (tab === 'packaging') {
          return m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY;
        }
        if (tab === 'substrate') {
          return m.type === 'substrate' && m.substrateFamily !== PACKAGING_FAMILY;
        }
        return m.type === tab;
      };
      const other = materials.filter((m) => !isInCurrentTab(m));
      const merged = [...other, ...tabRows].map(
        ({ id: _id, costingKey: _ck, ...rest }) => rest as PlatformMasterMaterialInput
      );
      const result = await apiClient.updateMasterMaterials(merged);
      await loadMaterials();
      syncToast(result.sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReference = async () => {
    if (isMaterialTab(tab)) return;
    setSaving(true);
    setError(null);
    try {
      const result = await apiClient.savePlatformReferenceCategory(
        tab as PlatformReferenceCategory,
        refItems.filter((i) => i.label.trim())
      );
      syncToast(result.sync);
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateMaterialRow = (id: string, patch: Partial<PlatformMasterMaterialRow>) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const addMaterialRow = () => {
    if (!isMaterialTab(tab)) return;
    setMaterials((prev) => [...prev, newMaterialRow(tab)]);
  };

  const removeMaterialRow = async (row: PlatformMasterMaterialRow) => {
    if (row.id.startsWith('new-')) {
      setMaterials((prev) => prev.filter((m) => m.id !== row.id));
      return;
    }
    if (!confirm(`Remove "${row.name}" from platform master?`)) return;
    setSaving(true);
    try {
      const result = await apiClient.deletePlatformMasterMaterial(row.id);
      setMaterials((prev) => prev.filter((m) => m.id !== row.id));
      syncToast(result.sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  /** Delete an RM type item with a usage warning. */
  const removeRmTypeItem = (i: number) => {
    const item = refItems[i];
    const STANDARD_CODES = ['substrate', 'ink', 'adhesive', 'packaging'];
    const isStandard =
      STANDARD_CODES.includes((item.code ?? '').toLowerCase()) ||
      ['substrate', 'ink & coating', 'adhesive', 'packaging'].includes(
        item.label.trim().toLowerCase()
      );

    const warning = isStandard
      ? `⚠️ "${item.label}" is a standard material type.\n\nRemoving it will hide all materials of this type from the Raw Materials filters. The materials themselves are NOT deleted.\n\nContinue?`
      : `Remove RM type "${item.label}"?\n\nAny materials of this type (family = "${item.label}") will no longer appear in the Raw Materials filters. The materials are NOT deleted.\n\nContinue?`;

    if (!confirm(warning)) return;
    setRefItems((prev) => prev.filter((_, j) => j !== i));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading master data…
      </div>
    );
  }

  return (
    <div className="w-full pb-24 lg:pb-8">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
            <Database className="w-7 h-7 text-gold shrink-0" />
            Master Data
          </h1>
          <p className="text-mist mt-1 text-sm">
            Platform materials and reference lists — saves sync to all tenants automatically.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary flex items-center gap-2 shrink-0"
          disabled={saving}
          onClick={isMaterialTab(tab) ? handleSaveMaterials : handleSaveReference}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save tab'}
        </button>
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200 mb-4 text-red-700 text-sm">{error}</div>
      )}
      {status && (
        <div className="card bg-green-50 border-green-200 mb-4 text-green-800 text-sm">{status}</div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {[...MATERIAL_TABS, ...REF_TABS].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              tab === t.id ? 'bg-gold/15 text-gold' : 'bg-white text-ink hover:bg-slate'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isMaterialTab(tab) ? (
        <div className="card overflow-hidden">
          <div className="flex justify-between items-center px-3 py-2 border-b border-border bg-slate/30">
            <span className="text-sm text-mist">{visibleMaterials.length} row(s)</span>
            <button type="button" className="btn-secondary text-sm flex items-center gap-1 py-1.5" onClick={addMaterialRow}>
              <Plus className="w-4 h-4" /> Add row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[8%]" />
                <col className="w-[16%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-slate/50 text-xs uppercase tracking-wide text-mist">
                  <th className="text-left py-2 px-2 font-medium">Key</th>
                  <th className="text-left py-2 px-2 font-medium">Name</th>
                  <th className="text-left py-2 px-2 font-medium">Family</th>
                  <th className="text-left py-2 px-2 font-medium">Grade</th>
                  <th className="text-right py-2 px-2 font-medium">Density</th>
                  <th className="text-right py-2 px-2 font-medium">Solid %</th>
                  <th className="text-right py-2 px-2 font-medium">Cost/kg</th>
                  <th className="text-right py-2 px-2 font-medium">Market</th>
                  <th className="text-left py-2 px-2 font-medium">External ID</th>
                  <th className="text-left py-2 px-2 font-medium">Source</th>
                  <th className="py-2 px-1" />
                </tr>
              </thead>
              <tbody>
                {visibleMaterials.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-slate/20">
                    <td className="py-1 px-2">
                      <span
                        className="font-mono text-[11px] text-mist truncate block"
                        title={row.key || slugKey(row.name)}
                      >
                        {row.key || slugKey(row.name)}
                      </span>
                    </td>
                    <td className="py-1 px-2">
                      <input
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm"
                        value={row.name}
                        title={row.name}
                        onChange={(e) => updateMaterialRow(row.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm"
                        value={row.substrateFamily ?? ''}
                        title={row.substrateFamily ?? ''}
                        onChange={(e) => updateMaterialRow(row.id, { substrateFamily: e.target.value })}
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm"
                        value={row.substrateGrade ?? ''}
                        title={row.substrateGrade ?? ''}
                        onChange={(e) => updateMaterialRow(row.id, { substrateGrade: e.target.value })}
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm text-right tabular-nums"
                        value={row.density}
                        onChange={(e) => updateMaterialRow(row.id, { density: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm text-right tabular-nums"
                        value={row.solidPercent}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { solidPercent: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm text-right tabular-nums"
                        value={row.costPerKgUsd}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { costPerKgUsd: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm text-right tabular-nums"
                        value={row.marketPriceUsd ?? row.costPerKgUsd}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { marketPriceUsd: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm font-mono"
                        placeholder="PEBI / Oracle ID"
                        value={row.externalId ?? ''}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { externalId: e.target.value || null })
                        }
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm"
                        placeholder="e.g. pebi"
                        value={row.externalSource ?? ''}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { externalSource: e.target.value || null })
                        }
                      />
                    </td>
                    <td className="py-1 px-1 text-center">
                      <button
                        type="button"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        onClick={() => removeMaterialRow(row)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-3">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-mist">{refItems.length} item(s)</span>
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1 py-1.5"
              onClick={() => setRefItems((prev) => [...prev, { label: '', code: '' }])}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {tab === 'rm_type' && (
            <p className="text-xs text-mist mb-2">
              <strong>Code</strong> maps to the DB type:{' '}
              <code className="bg-slate rounded px-1">substrate</code> ·{' '}
              <code className="bg-slate rounded px-1">ink</code> ·{' '}
              <code className="bg-slate rounded px-1">adhesive</code> ·{' '}
              <code className="bg-slate rounded px-1">packaging</code> · or a custom slug (e.g.{' '}
              <code className="bg-slate rounded px-1">plate</code>). Custom slugs appear as new
              filter tabs in Raw Materials.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className={tab === 'unit' ? 'w-[92%]' : 'w-[62%]'} />
                {(tab === 'product_type' || tab === 'rm_type') && <col className="w-[30%]" />}
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-slate/50 text-xs uppercase tracking-wide text-mist">
                  <th className="text-left py-2 px-2 font-medium">Label</th>
                  {(tab === 'product_type' || tab === 'rm_type') && (
                    <th className="text-left py-2 px-2 font-medium">
                      Code{tab === 'rm_type' && <span className="normal-case tracking-normal text-mist/70 ml-1">(DB type)</span>}
                    </th>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {refItems.map((item, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-1 px-2">
                      <input
                        className="input w-full !min-h-[34px] !py-1 !px-2 text-sm"
                        placeholder="Label"
                        value={item.label}
                        onChange={(e) => {
                          const next = [...refItems];
                          next[i] = { ...next[i], label: e.target.value };
                          setRefItems(next);
                        }}
                      />
                    </td>
                    {(tab === 'product_type' || tab === 'rm_type') && (
                      <td className="py-1 px-2">
                        <input
                          className="input w-full !min-h-[34px] !py-1 !px-2 text-sm font-mono"
                          placeholder={tab === 'rm_type' ? 'e.g. substrate, ink, plate' : 'code'}
                          value={item.code ?? ''}
                          onChange={(e) => {
                            const next = [...refItems];
                            next[i] = { ...next[i], code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') };
                            setRefItems(next);
                          }}
                        />
                      </td>
                    )}
                    <td className="py-1 px-1 text-center">
                      <button
                        type="button"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        onClick={() =>
                          tab === 'rm_type'
                            ? removeRmTypeItem(i)
                            : setRefItems((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
};

export default MasterData;
