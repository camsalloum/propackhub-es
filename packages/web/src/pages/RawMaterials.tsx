import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Database, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMasterDataContext } from '../contexts/MasterDataContext';
import { apiClient } from '../lib/api';
import TenantReferenceEditor from '../components/TenantReferenceEditor';

/**
 * Tenant-scoped Raw Materials master.
 *
 * Each tenant owns and edits its OWN materials (the `/api/v1/materials`
 * endpoints, row-scoped by tenant_id) — never the shared platform catalog.
 * Write access follows the account model:
 *   - individual tenants: the owner can edit everything
 *   - company/group tenants: only the group admin (tenant_admin) can edit;
 *     regular members are read-only.
 * The server enforces this; the UI mirrors it so editing affordances only show
 * when the user can actually save.
 */

type MaterialRow = {
  id: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'accessory';
  solidPercent: number;
  density: string | number;
  costPerKgUsd: string | number;
  wastePercent?: number;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
  marketPriceUsd?: string | number | null;
  accessoryKind?: string | null;
  costPerMeterUsd?: string | number | null;
  costPerPieceUsd?: string | number | null;
  isTenantOnly?: boolean;
  // local-only flags
  _new?: boolean;
  _dirty?: boolean;
};

const PACKAGING_FAMILY = 'Packaging';

type TabId = 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'packaging' | 'accessory';

const TABS: { id: TabId; label: string }[] = [
  { id: 'substrate', label: 'Substrates' },
  { id: 'ink', label: 'Ink & Coating' },
  { id: 'adhesive', label: 'Adhesive' },
  { id: 'solvent', label: 'Solvent' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'accessory', label: 'Accessories' },
];

const ACCESSORY_KINDS = ['zipper', 'spout', 'valve', 'handle', 'window'];

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Display helper: 2-decimal string, empty for null/blank. Keeps inputs tidy (x.xx). */
function fmt2(v: string | number | null | undefined): string {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

function rowMatchesTab(m: MaterialRow, tab: TabId): boolean {
  if (tab === 'packaging') return m.type === 'substrate' && (m.substrateFamily ?? '') === PACKAGING_FAMILY;
  if (tab === 'substrate') return m.type === 'substrate' && (m.substrateFamily ?? '') !== PACKAGING_FAMILY;
  return m.type === tab;
}

function newRowForTab(tab: TabId): MaterialRow {
  const base: MaterialRow = {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    type: tab === 'packaging' ? 'substrate' : tab,
    solidPercent: tab === 'solvent' ? 0 : 100,
    density: tab === 'solvent' ? 0.85 : 0.91,
    costPerKgUsd: tab === 'ink' ? 12 : tab === 'adhesive' ? 8 : 3,
    wastePercent: 0,
    substrateFamily: tab === 'packaging' ? PACKAGING_FAMILY : tab === 'solvent' ? 'Solvent' : '',
    substrateGrade: '',
    marketPriceUsd: null,
    accessoryKind: tab === 'accessory' ? 'zipper' : null,
    _new: true,
    _dirty: true,
  };
  return base;
}

const RawMaterials = () => {
  const { user, tenant, isLoading } = useAuth();
  const { invalidate } = useMasterDataContext();

  const [tab, setTab] = useState<TabId>('substrate');
  const [view, setView] = useState<'materials' | 'lists'>('materials');
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const canEdit =
    user?.role === 'platform_admin' ||
    user?.role === 'tenant_admin' ||
    (user?.role === 'user' && tenant?.type === 'individual');

  const load = useCallback(async () => {
    const data = (await apiClient.getMaterials()) as MaterialRow[];
    // Format numeric columns to 2dp for display (x.xx). Rows stay _dirty=false so
    // untouched rows are never re-saved; only rows the user edits persist the 2dp value.
    setRows(
      data.map((m) => ({
        ...m,
        density: fmt2(m.density),
        costPerKgUsd: fmt2(m.costPerKgUsd),
        marketPriceUsd: m.marketPriceUsd != null && m.marketPriceUsd !== '' ? fmt2(m.marketPriceUsd) : null,
        costPerMeterUsd: m.costPerMeterUsd != null && m.costPerMeterUsd !== '' ? fmt2(m.costPerMeterUsd) : null,
        costPerPieceUsd: m.costPerPieceUsd != null && m.costPerPieceUsd !== '' ? fmt2(m.costPerPieceUsd) : null,
        _new: false,
        _dirty: false,
      }))
    );
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load materials');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const visibleRows = useMemo(() => rows.filter((m) => rowMatchesTab(m, tab)), [rows, tab]);

  const patchRow = (id: string, patch: Partial<MaterialRow>) => {
    setRows((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch, _dirty: true } : m)));
  };

  const addRow = () => {
    if (!canEdit) return;
    setRows((prev) => [...prev, newRowForTab(tab)]);
  };

  const buildPayload = (m: MaterialRow) => ({
    name: (m.name || '').trim() || 'Unnamed',
    type: m.type,
    solidPercent: Math.round(num(m.solidPercent)),
    density: num(m.density) || 0.9,
    costPerKgUsd: num(m.costPerKgUsd),
    wastePercent: Math.round(num(m.wastePercent)),
    substrateFamily: m.substrateFamily?.trim() || null,
    substrateGrade: m.substrateGrade?.trim() || null,
    hoover: m.hoover?.trim() || null,
    marketPriceUsd: m.marketPriceUsd != null && m.marketPriceUsd !== '' ? num(m.marketPriceUsd) : null,
    ...(m.type === 'accessory'
      ? {
          accessoryKind: (m.accessoryKind as MaterialRow['accessoryKind']) ?? null,
          costPerMeterUsd: m.costPerMeterUsd != null && m.costPerMeterUsd !== '' ? num(m.costPerMeterUsd) : null,
          costPerPieceUsd: m.costPerPieceUsd != null && m.costPerPieceUsd !== '' ? num(m.costPerPieceUsd) : null,
        }
      : {}),
  });

  const saveChanges = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const dirty = rows.filter((m) => m._dirty);
      let created = 0;
      let updated = 0;
      for (const m of dirty) {
        const payload = buildPayload(m);
        if (m._new) {
          await apiClient.createMaterial(payload);
          created++;
        } else {
          await apiClient.updateMaterial(m.id, payload);
          updated++;
        }
      }
      await load();
      invalidate();
      setStatus(
        dirty.length === 0
          ? 'Nothing to save.'
          : `Saved — ${created} added, ${updated} updated.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (m: MaterialRow) => {
    if (!canEdit) return;
    if (m._new) {
      setRows((prev) => prev.filter((r) => r.id !== m.id));
      return;
    }
    if (!confirm(`Remove "${m.name}" from your materials?`)) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.deleteMaterial(m.id);
      setRows((prev) => prev.filter((r) => r.id !== m.id));
      invalidate();
      setStatus('Material removed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const syncFromPlatform = async () => {
    if (!canEdit) return;
    if (!confirm('Refresh your materials from the platform catalog? Your custom rows and manual prices are kept.')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient.syncMaterialsFromPlatform();
      await load();
      invalidate();
      setStatus(`Synced from platform — ${res.inserted ?? 0} added, ${res.updated ?? 0} updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSaving(false);
    }
  };

  const hasDirty = rows.some((m) => m._dirty);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">Loading materials…</div>
    );
  }

  const isAccessory = tab === 'accessory';
  const isLiquid = tab === 'ink' || tab === 'adhesive';

  return (
    <div className="w-full pb-24 lg:pb-8">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
            <Database className="w-7 h-7 text-gold shrink-0" />
            Raw Materials
          </h1>
          <p className="text-mist mt-1 text-sm">
            Your material catalog — used to price every estimate.
            {canEdit
              ? ' Edits apply only to your account.'
              : ' Read-only. Your group administrator manages these materials.'}
          </p>
        </div>
        {view === 'materials' && canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="btn-secondary flex items-center gap-2"
              disabled={saving}
              onClick={syncFromPlatform}
              title="Pull the latest platform catalog into your library"
            >
              <RefreshCw className="w-4 h-4" />
              Sync
            </button>
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              disabled={saving || !hasDirty}
              onClick={saveChanges}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 mb-4">
        {(['materials', 'lists'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === v ? 'bg-navy text-white' : 'bg-surface-raised text-ink hover:bg-slate'
            }`}
          >
            {v === 'materials' ? 'Materials' : 'Custom Lists'}
          </button>
        ))}
      </div>

      {error && <div className="card bg-danger/10 border-danger/30 mb-4 text-danger text-sm">{error}</div>}
      {status && <div className="card bg-success/10 border-success/30 mb-4 text-success text-sm">{status}</div>}

      {view === 'lists' ? (
        <TenantReferenceEditor canEdit={canEdit} />
      ) : (
        <>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              tab === t.id ? 'bg-gold/15 text-gold' : 'bg-surface-raised text-ink hover:bg-slate'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex justify-between items-center px-3 py-2 border-b border-border bg-slate/30">
          <span className="text-sm text-mist">{visibleRows.length} row(s)</span>
          {canEdit && (
            <button type="button" className="btn-secondary text-sm flex items-center gap-1 py-1.5" onClick={addRow}>
              <Plus className="w-4 h-4" /> Add row
            </button>
          )}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                {!isAccessory && <th>Family</th>}
                {!isAccessory && <th>Grade</th>}
                {!isAccessory && <th className="text-right">Density</th>}
                {isLiquid && <th className="text-right">Solid %</th>}
                {isAccessory && <th>Kind</th>}
                {isAccessory ? (
                  <>
                    <th className="text-right">Cost/m</th>
                    <th className="text-right">Cost/pc</th>
                  </>
                ) : (
                  <>
                    <th className="text-right">Cost/kg</th>
                    <th className="text-right">Market</th>
                  </>
                )}
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-mist py-6 text-sm">
                    No materials in this category yet.
                  </td>
                </tr>
              )}
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      className="cell-input w-full min-w-0"
                      value={row.name}
                      disabled={!canEdit}
                      onChange={(e) => patchRow(row.id, { name: e.target.value })}
                    />
                  </td>
                  {!isAccessory && (
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.substrateFamily ?? ''}
                        disabled={!canEdit || tab === 'packaging'}
                        onChange={(e) => patchRow(row.id, { substrateFamily: e.target.value })}
                      />
                    </td>
                  )}
                  {!isAccessory && (
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.substrateGrade ?? ''}
                        disabled={!canEdit}
                        onChange={(e) => patchRow(row.id, { substrateGrade: e.target.value })}
                      />
                    </td>
                  )}
                  {!isAccessory && (
                    <td className="text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="cell-input w-24 text-right font-mono"
                        value={String(row.density ?? '')}
                        disabled={!canEdit}
                        onChange={(e) => patchRow(row.id, { density: e.target.value })}
                      />
                    </td>
                  )}
                  {isLiquid && (
                    <td className="text-right">
                      <input
                        type="number"
                        step="1"
                        className="cell-input w-16 text-right font-mono"
                        value={String(row.solidPercent ?? '')}
                        disabled={!canEdit}
                        onChange={(e) => patchRow(row.id, { solidPercent: Number(e.target.value) })}
                      />
                    </td>
                  )}
                  {isAccessory && (
                    <td>
                      <select
                        className="cell-input w-full min-w-0"
                        value={row.accessoryKind ?? 'zipper'}
                        disabled={!canEdit}
                        onChange={(e) => patchRow(row.id, { accessoryKind: e.target.value })}
                      >
                        {ACCESSORY_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {isAccessory ? (
                    <>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="cell-input w-28 text-right font-mono"
                          value={row.costPerMeterUsd != null ? String(row.costPerMeterUsd) : ''}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.id, { costPerMeterUsd: e.target.value })}
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="cell-input w-28 text-right font-mono"
                          value={row.costPerPieceUsd != null ? String(row.costPerPieceUsd) : ''}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.id, { costPerPieceUsd: e.target.value })}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="cell-input w-28 text-right font-mono"
                          value={String(row.costPerKgUsd ?? '')}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.id, { costPerKgUsd: e.target.value })}
                        />
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="cell-input w-28 text-right font-mono"
                          value={row.marketPriceUsd != null ? String(row.marketPriceUsd) : ''}
                          disabled={!canEdit}
                          onChange={(e) => patchRow(row.id, { marketPriceUsd: e.target.value })}
                        />
                      </td>
                    </>
                  )}
                  {canEdit && (
                    <td className="text-right">
                      <button
                        type="button"
                        className="text-danger hover:text-danger/80 p-1"
                        onClick={() => removeRow(row)}
                        aria-label={`Remove ${row.name}`}
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
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

export default RawMaterials;
