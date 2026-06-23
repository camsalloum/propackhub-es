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
import { DEFAULT_PRODUCT_SUBTYPE_OPTIONS } from '../lib/masterDataReference';

type MaterialTab = 'substrate' | 'ink' | 'adhesive' | 'packaging';
type RefTab = 'product_type' | 'product_subtype' | 'unit' | 'rm_type' | 'process';
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
  { id: 'process', label: 'Processes' },
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
  /** Subtypes (all parents) — edited nested under Product Types. */
  const [subtypeRows, setSubtypeRows] = useState<Array<{ label: string; code: string; parent: string }>>([]);
  /** Process definitions — edited under the Processes tab. */
  const [processRows, setProcessRows] = useState<Array<{ label: string; code: string; description: string; costPerHour: number; speedBasis: string; speedValue: number; setupHours: number }>>([]);
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
      product_type: (() => {
        const rows = (ref.productTypeRows ?? []).map((r) => ({
          label: r.label,
          code: (r.code || '').toLowerCase(),
        }));
        // Heal legacy seed where "Bag" was given the engine code "pouch": treat it as Pouch,
        // then ensure a distinct Bag(bag) exists. Result: Roll, Sleeve, Pouch, Bag.
        const healed = rows.map((r) =>
          r.label.trim().toLowerCase() === 'bag' && r.code === 'pouch' ? { label: 'Pouch', code: 'pouch' } : r
        );
        for (const c of [
          { label: 'Roll', code: 'roll' },
          { label: 'Sleeve', code: 'sleeve' },
          { label: 'Pouch', code: 'pouch' },
          { label: 'Bag', code: 'bag' },
        ]) {
          if (!healed.some((r) => r.code === c.code)) healed.push(c);
        }
        return healed;
      })(),
      product_subtype: (() => {
        const rows = ((ref as { productSubtypeRows?: Array<{ label: string; code: string }> })
          .productSubtypeRows ?? []);
        return rows.length > 0
          ? rows.map((r) => ({ label: r.label, code: r.code }))
          : DEFAULT_PRODUCT_SUBTYPE_OPTIONS.map((s) => ({ label: s.label, code: s.code }));
      })(),
      unit: (ref.units ?? []).map((l) => ({ label: l })),
      rm_type: (ref.rmTypeRows ?? ref.rmTypes ?? []).map((r) =>
        typeof r === 'string'
          ? { label: r, code: '' }
          : { label: (r as { label: string }).label, code: (r as { code: string }).code ?? '' }
      ),
      process: [],  // process tab managed separately via processRows state
    };
    if (!isMaterialTab(tab)) {
      setRefItems(map[tab] ?? []);
    }
    if (tab === 'product_type') {
      const subRows = ((ref as { productSubtypeRows?: Array<{ label: string; code: string; parent?: string }> })
        .productSubtypeRows ?? []);
      setSubtypeRows(
        subRows.length > 0
          ? subRows.map((r) => ({ label: r.label, code: r.code, parent: (r.parent || '').toLowerCase() }))
          : DEFAULT_PRODUCT_SUBTYPE_OPTIONS.map((s) => ({ label: s.label, code: s.code, parent: s.parent }))
      );
    }
    // Always load process rows (used by Processes tab)
    const pRows = ((ref as { processRows?: Array<{ label: string; code: string; description?: string; costPerHour?: number; speedBasis?: string; speedValue?: number; setupHours?: number }> })
      .processRows ?? []);
    if (pRows.length > 0) {
      setProcessRows(pRows.map((p) => ({
        label: p.label,
        code: p.code,
        description: p.description ?? '',
        costPerHour: p.costPerHour ?? 50,
        speedBasis: p.speedBasis ?? 'kg_per_hour',
        speedValue: p.speedValue ?? 100,
        setupHours: p.setupHours ?? 1,
      })));
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
      if (tab === 'product_type') {
        // Save product types + their nested subtypes (linked by parent) together.
        const ptResult = await apiClient.savePlatformReferenceCategory(
          'product_type',
          refItems.filter((i) => i.label.trim()).map((i) => ({ label: i.label.trim(), code: (i.code ?? '').trim() }))
        );
        await apiClient.savePlatformReferenceCategory(
          'product_subtype',
          subtypeRows
            .filter((s) => s.label.trim() && s.code.trim() && s.parent.trim())
            .map((s) => ({ label: s.label.trim(), code: s.code.trim(), metadata: { parent: s.parent.trim() } }))
        );
        syncToast(ptResult.sync);
        invalidate();
        return;
      }
      if (tab === 'process') {
        const result = await apiClient.savePlatformReferenceCategory(
          'process' as PlatformReferenceCategory,
          processRows
            .filter((p) => p.label.trim() && p.code.trim())
            .map((p) => ({
              label: p.label.trim(),
              code: p.code.trim(),
              metadata: {
                description: p.description,
                costPerHour: p.costPerHour,
                speedBasis: p.speedBasis,
                speedValue: p.speedValue,
                setupHours: p.setupHours,
              },
            }))
        );
        syncToast(result.sync);
        invalidate();
        return;
      }
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

  // --- Product Types + nested Subtypes editors ---
  const addProductType = () =>
    setRefItems((prev) => [...prev, { label: 'New type', code: '' }]);

  const updateProductType = (i: number, patch: Partial<PlatformReferenceItemInput>) => {
    setRefItems((prev) => {
      const next = [...prev];
      const before = next[i];
      next[i] = { ...before, ...patch };
      // Keep child subtypes pointing at the renamed code.
      if (patch.code !== undefined && before.code && patch.code !== before.code) {
        setSubtypeRows((rows) =>
          rows.map((s) => (s.parent === (before.code ?? '').toLowerCase() ? { ...s, parent: (patch.code ?? '').toLowerCase() } : s))
        );
      }
      return next;
    });
  };

  const removeProductType = (i: number) => {
    const pt = refItems[i];
    const code = (pt.code ?? '').toLowerCase();
    if (!confirm(`Remove product type "${pt.label}" and its subtypes?`)) return;
    setRefItems((prev) => prev.filter((_, j) => j !== i));
    setSubtypeRows((rows) => rows.filter((s) => s.parent !== code));
  };

  /** Move a product type up or down in the order. */
  const moveProductType = (i: number, dir: -1 | 1) => {
    const next = i + dir;
    if (next < 0 || next >= refItems.length) return;
    setRefItems((prev) => {
      const copy = [...prev];
      [copy[i], copy[next]] = [copy[next], copy[i]];
      return copy;
    });
  };

  const addSubtype = (parent: string) =>
    setSubtypeRows((prev) => [...prev, { label: 'New subtype', code: '', parent: parent.toLowerCase() }]);

  const updateSubtype = (idx: number, patch: Partial<{ label: string; code: string }>) =>
    setSubtypeRows((prev) => prev.map((s, j) => (j === idx ? { ...s, ...patch } : s)));

  const removeSubtype = (idx: number) =>
    setSubtypeRows((prev) => prev.filter((_, j) => j !== idx));

  /** Move a subtype up or down within its parent group. */
  const moveSubtype = (idx: number, dir: -1 | 1) => {
    const parent = subtypeRows[idx]?.parent;
    if (!parent) return;
    const groupIdxs = subtypeRows
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.parent === parent)
      .map(({ i }) => i);
    const posInGroup = groupIdxs.indexOf(idx);
    const targetPosInGroup = posInGroup + dir;
    if (targetPosInGroup < 0 || targetPosInGroup >= groupIdxs.length) return;
    const targetIdx = groupIdxs[targetPosInGroup];
    setSubtypeRows((prev) => {
      const copy = [...prev];
      [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
      return copy;
    });
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
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Name</th>
                  <th>Grade</th>
                  <th className="text-right">Density</th>
                  <th className="text-right">Solid %</th>
                  <th className="text-right">Cost/kg</th>
                  <th className="text-right">Market</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleMaterials.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.substrateFamily ?? ''}
                        title={row.substrateFamily ?? ''}
                        onChange={(e) => updateMaterialRow(row.id, { substrateFamily: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.name}
                        title={row.name}
                        onChange={(e) => updateMaterialRow(row.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.substrateGrade ?? ''}
                        title={row.substrateGrade ?? ''}
                        onChange={(e) => updateMaterialRow(row.id, { substrateGrade: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="cell-input cell-num w-[72px]"
                        value={row.density}
                        onChange={(e) => updateMaterialRow(row.id, { density: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="cell-input cell-num w-[64px]"
                        value={row.solidPercent}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { solidPercent: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="cell-input cell-num w-[72px]"
                        value={row.costPerKgUsd}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { costPerKgUsd: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="cell-input cell-num w-[72px]"
                        value={row.marketPriceUsd ?? row.costPerKgUsd}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { marketPriceUsd: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="text-center">
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
      ) : tab === 'product_type' ? (
        <div className="card p-3 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-mist">{refItems.length} product type(s)</span>
            <button type="button" className="btn-secondary text-sm flex items-center gap-1 py-1.5" onClick={addProductType}>
              <Plus className="w-4 h-4" /> Add product type
            </button>
          </div>
          <p className="text-xs text-mist">
            Each product type has its own code (e.g. <code className="bg-slate rounded px-1">pouch</code>,{' '}
            <code className="bg-slate rounded px-1">bag</code>). Subtypes nest under a type with a{' '}
            <code className="bg-slate rounded px-1">parentcode_subtype</code> code (e.g.{' '}
            <code className="bg-slate rounded px-1">bag_wicket</code>) — they drive the estimate dropdowns.
          </p>
          {refItems.map((pt, i) => {
            const ptCode = (pt.code ?? '').toLowerCase();
            return (
              <div key={i} className="border border-border rounded-lg p-3 bg-slate/10">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveProductType(i, -1)}
                      className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                      aria-label="Move type up"
                    >▲</button>
                    <button
                      type="button"
                      disabled={i === refItems.length - 1}
                      onClick={() => moveProductType(i, 1)}
                      className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                      aria-label="Move type down"
                    >▼</button>
                  </div>
                  <input
                    className="input !min-h-[34px] !py-1 !px-2 text-sm flex-1 min-w-[8rem]"
                    placeholder="Product type label"
                    value={pt.label}
                    onChange={(e) => updateProductType(i, { label: e.target.value })}
                  />
                  <input
                    className="input !min-h-[34px] !py-1 !px-2 text-sm font-mono w-32"
                    placeholder="code"
                    value={pt.code ?? ''}
                    onChange={(e) => updateProductType(i, { code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                  />
                  <button type="button" className="p-1.5 text-red-600 hover:bg-red-50 rounded" onClick={() => removeProductType(i)} aria-label="Delete product type">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 ml-3 pl-3 border-l-2 border-border space-y-1">
                  {subtypeRows.map((s, idx) => {
                    if (s.parent !== ptCode) return null;
                    // Find position within this parent's group for disabling arrows
                    const groupIdxs = subtypeRows
                      .map((r, j) => ({ r, j }))
                      .filter(({ r }) => r.parent === ptCode)
                      .map(({ j }) => j);
                    const posInGroup = groupIdxs.indexOf(idx);
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        {/* Subtype reorder */}
                        <div className="flex flex-col gap-0">
                          <button
                            type="button"
                            disabled={posInGroup === 0}
                            onClick={() => moveSubtype(idx, -1)}
                            className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                            aria-label="Move subtype up"
                          >▲</button>
                          <button
                            type="button"
                            disabled={posInGroup === groupIdxs.length - 1}
                            onClick={() => moveSubtype(idx, 1)}
                            className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                            aria-label="Move subtype down"
                          >▼</button>
                        </div>
                        <input
                          className="input !min-h-[30px] !py-0.5 !px-2 text-sm flex-1 min-w-[8rem]"
                          placeholder="Subtype label"
                          value={s.label}
                          onChange={(e) => updateSubtype(idx, { label: e.target.value })}
                        />
                        <input
                          className="input !min-h-[30px] !py-0.5 !px-2 text-sm font-mono w-40"
                          placeholder={`${ptCode || 'type'}_subtype`}
                          value={s.code}
                          onChange={(e) => updateSubtype(idx, { code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                        />
                        <button type="button" className="p-1 text-red-600 hover:bg-red-50 rounded" onClick={() => removeSubtype(idx)} aria-label="Delete subtype">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="text-xs text-gold hover:underline flex items-center gap-1 mt-1 disabled:opacity-40"
                    onClick={() => addSubtype(ptCode)}
                    disabled={!ptCode}
                    title={ptCode ? '' : 'Set a code on the product type first'}
                  >
                    <Plus className="w-3 h-3" /> Add subtype
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'process' ? (
        <div className="card p-3 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-mist">{processRows.length} process(es)</span>
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1 py-1.5"
              onClick={() => setProcessRows((prev) => [...prev, { label: 'New process', code: '', description: '', costPerHour: 50, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 }])}
            >
              <Plus className="w-4 h-4" /> Add process
            </button>
          </div>
          <p className="text-xs text-mist">
            Processes drive template selection and estimate instantiation defaults (cost/hour, speed, setup).
            The <strong>code</strong> (e.g. <code className="bg-slate rounded px-1">pouch_making</code>) is the stable key stored in templates.
          </p>
          <div className="space-y-2">
            {processRows.map((proc, i) => {
              const groupIdxCount = processRows.length;
              return (
                <div key={i} className="border border-border rounded-lg p-3 bg-slate/10 space-y-2">
                  {/* Row 1: reorder + label + code + delete */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex flex-col gap-0 shrink-0">
                      <button type="button" disabled={i === 0} onClick={() => setProcessRows((prev) => { const c = [...prev]; [c[i], c[i-1]] = [c[i-1], c[i]]; return c; })} className="text-mist hover:text-navy disabled:opacity-20 text-xs leading-none px-0.5" aria-label="Move up">▲</button>
                      <button type="button" disabled={i === groupIdxCount - 1} onClick={() => setProcessRows((prev) => { const c = [...prev]; [c[i], c[i+1]] = [c[i+1], c[i]]; return c; })} className="text-mist hover:text-navy disabled:opacity-20 text-xs leading-none px-0.5" aria-label="Move down">▼</button>
                    </div>
                    <input className="input !min-h-[34px] !py-1 !px-2 text-sm flex-1 min-w-[8rem]" placeholder="Label (e.g. Extrusion)" value={proc.label} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, label: e.target.value } : p))} />
                    <input className="input !min-h-[34px] !py-1 !px-2 text-sm font-mono w-36" placeholder="code" value={proc.code} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') } : p))} />
                    <button type="button" className="p-1.5 text-red-600 hover:bg-red-50 rounded shrink-0" onClick={() => setProcessRows((prev) => prev.filter((_, j) => j !== i))} aria-label="Delete process"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {/* Row 2: description + cost defaults */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-6">
                    <div className="col-span-2">
                      <label className="block text-xs text-mist mb-0.5">Description</label>
                      <input className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" placeholder="Short description" value={proc.description} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, description: e.target.value } : p))} />
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">$/hr</label>
                      <input type="number" className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" value={proc.costPerHour} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, costPerHour: Number(e.target.value) } : p))} />
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">Setup hrs</label>
                      <input type="number" className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" value={proc.setupHours} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, setupHours: Number(e.target.value) } : p))} />
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">Speed basis</label>
                      <select className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" value={proc.speedBasis} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, speedBasis: e.target.value } : p))}>
                        <option value="kg_per_hour">kg / hr</option>
                        <option value="m_per_min">m / min</option>
                        <option value="pcs_per_min">pcs / min</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">Speed value</label>
                      <input type="number" className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" value={proc.speedValue} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, speedValue: Number(e.target.value) } : p))} />
                    </div>
                  </div>
                </div>
              );
            })}
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
          {tab === 'product_subtype' && (
            <p className="text-xs text-mist mb-2">
              <strong>Code</strong> sets the family + dimension fields: prefix{' '}
              <code className="bg-slate rounded px-1">pouch_</code> for pouches,{' '}
              <code className="bg-slate rounded px-1">bag_</code> for bags (e.g.{' '}
              <code className="bg-slate rounded px-1">pouch_stand_up</code>,{' '}
              <code className="bg-slate rounded px-1">bag_wicket</code>). Known codes map to specific
              dimension fields; custom codes get the base width/height/ups/trim set.
            </p>
          )}
          <div className="table-wrap">
            <table className="data-table min-w-[420px]">
              <thead>
                <tr>
                  <th>Label</th>
                  {(tab === 'rm_type' || tab === 'product_subtype') && (
                    <th>
                      Code{tab === 'rm_type' && <span className="normal-case tracking-normal text-mist/70 ml-1">(DB type)</span>}
                    </th>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {refItems.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="cell-input w-full min-w-[160px]"
                        placeholder="Label"
                        value={item.label}
                        onChange={(e) => {
                          const next = [...refItems];
                          next[i] = { ...next[i], label: e.target.value };
                          setRefItems(next);
                        }}
                      />
                    </td>
                    {(tab === 'rm_type' || tab === 'product_subtype') && (
                      <td>
                        <input
                          className="cell-input w-full min-w-[120px] font-mono"
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
                    <td className="text-center">
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
