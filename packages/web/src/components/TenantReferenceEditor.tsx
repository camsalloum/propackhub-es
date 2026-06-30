import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { apiClient, type MasterDataReferencePayload } from '../lib/api';
import { useMasterDataContext } from '../contexts/MasterDataContext';

/**
 * Tenant-scoped reference editor. Lets a tenant add their OWN rows (saved in
 * their database) on top of the owner-shipped defaults. Owner defaults are shown
 * read-only for context. product_type / printing_web are intentionally absent —
 * they are engine-structural and owner-only.
 */

type Cat = 'rm_type' | 'unit' | 'product_subtype' | 'process';

const CATS: { id: Cat; label: string }[] = [
  { id: 'rm_type', label: 'RM Types' },
  { id: 'unit', label: 'Units' },
  { id: 'product_subtype', label: 'Subtypes' },
  { id: 'process', label: 'Processes' },
];

const UNIT_BASES = [
  { value: 'kg', label: 'Kg (weight)' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'sqm', label: 'm² (area)' },
  { value: 'lm', label: 'Linear metre (reel width)' },
];

type Row = { label: string; code: string; metadata: Record<string, unknown> };

function emptyRow(cat: Cat): Row {
  if (cat === 'unit') return { label: '', code: '', metadata: { basis: 'kg', multiplier: 1 } };
  if (cat === 'process')
    return {
      label: '',
      code: '',
      metadata: { costPerHour: 50, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 },
    };
  if (cat === 'product_subtype') return { label: '', code: '', metadata: { parent: '' } };
  return { label: '', code: '', metadata: {} };
}

const TenantReferenceEditor = ({ canEdit }: { canEdit: boolean }) => {
  const { invalidate } = useMasterDataContext();
  const [cat, setCat] = useState<Cat>('rm_type');
  const [rowsByCat, setRowsByCat] = useState<Record<Cat, Row[]>>({
    rm_type: [],
    unit: [],
    product_subtype: [],
    process: [],
  });
  const [reference, setReference] = useState<MasterDataReferencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ref, custom] = await Promise.all([
      apiClient.getMasterDataReference(),
      apiClient.getTenantCustomReference(),
    ]);
    setReference(ref);
    const toRows = (catId: Cat): Row[] =>
      (custom.categories[catId] ?? []).map((r) => ({
        label: r.label,
        code: r.code ?? '',
        metadata: r.metadata ?? {},
      }));
    setRowsByCat({
      rm_type: toRows('rm_type'),
      unit: toRows('unit'),
      product_subtype: toRows('product_subtype'),
      process: toRows('process'),
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reference data');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const rows = rowsByCat[cat];
  const setRows = (next: Row[]) => setRowsByCat((prev) => ({ ...prev, [cat]: next }));
  const patch = (i: number, p: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const patchMeta = (i: number, m: Record<string, unknown>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, metadata: { ...r.metadata, ...m } } : r)));

  const defaults = useMemo(() => {
    if (!reference) return [] as string[];
    if (cat === 'rm_type') return (reference.rmTypeRows ?? []).map((r) => r.label);
    if (cat === 'unit') return (reference.unitRows ?? []).map((u) => u.label);
    if (cat === 'product_subtype') return (reference.productSubtypeRows ?? []).map((r) => r.label);
    if (cat === 'process') return (reference.processRows ?? []).map((r) => r.label);
    return [];
  }, [reference, cat]);

  const productTypeCodes = useMemo(
    () => (reference?.productTypeRows ?? []).map((r) => r.code).filter(Boolean),
    [reference]
  );

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const items = rows
        .filter((r) => r.label.trim())
        .map((r) => ({ label: r.label.trim(), code: r.code.trim() || undefined, metadata: r.metadata }));
      await apiClient.saveTenantReferenceCategory(cat, items);
      await load();
      invalidate();
      setStatus('Saved your custom list.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[200px] text-mist">Loading…</div>;
  }

  return (
    <div>
      <p className="text-mist text-sm mb-4">
        Add your own entries on top of the standard lists. They are saved to your account only.
        {!canEdit && ' Read-only — your group administrator manages these.'}
      </p>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              cat === c.id ? 'bg-gold/15 text-gold' : 'bg-surface-raised text-ink hover:bg-slate'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && <div className="card bg-danger/10 border-danger/30 mb-4 text-danger text-sm">{error}</div>}
      {status && <div className="card bg-success/10 border-success/30 mb-4 text-success text-sm">{status}</div>}

      {defaults.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-mist mb-1.5">Standard (read-only)</div>
          <div className="flex flex-wrap gap-1.5">
            {defaults.map((d) => (
              <span key={d} className="px-2 py-0.5 rounded-md bg-slate/40 text-xs text-mist">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex justify-between items-center px-3 py-2 border-b border-border bg-slate/30">
          <span className="text-sm text-mist">{rows.length} custom entr{rows.length === 1 ? 'y' : 'ies'}</span>
          {canEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-sm flex items-center gap-1 py-1.5"
                onClick={() => setRows([...rows, emptyRow(cat)])}
              >
                <Plus className="w-4 h-4" /> Add
              </button>
              <button
                type="button"
                className="btn-primary text-sm flex items-center gap-1 py-1.5"
                disabled={saving}
                onClick={save}
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
        <div className="table-wrap">
          <table className="data-table min-w-[480px]">
            <thead>
              <tr>
                <th>Label</th>
                <th>Code</th>
                {cat === 'unit' && (
                  <>
                    <th>Basis</th>
                    <th className="text-right">Multiplier</th>
                  </>
                )}
                {cat === 'product_subtype' && <th>Parent type</th>}
                {cat === 'process' && (
                  <>
                    <th className="text-right">Cost/hr</th>
                    <th>Speed basis</th>
                    <th className="text-right">Speed</th>
                  </>
                )}
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-mist py-6 text-sm">
                    No custom entries yet.
                  </td>
                </tr>
              )}
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="cell-input w-full min-w-[140px]"
                      value={row.label}
                      disabled={!canEdit}
                      onChange={(e) => patch(i, { label: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input w-full min-w-[110px] font-mono"
                      placeholder="auto"
                      value={row.code}
                      disabled={!canEdit}
                      onChange={(e) => patch(i, { code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                    />
                  </td>
                  {cat === 'unit' && (
                    <>
                      <td>
                        <select
                          className="cell-input w-full min-w-[150px]"
                          value={(row.metadata.basis as string) ?? 'kg'}
                          disabled={!canEdit}
                          onChange={(e) => patchMeta(i, { basis: e.target.value })}
                        >
                          {UNIT_BASES.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          className="cell-input w-24 text-right font-mono"
                          value={String((row.metadata.multiplier as number) ?? 1)}
                          disabled={!canEdit}
                          onChange={(e) => patchMeta(i, { multiplier: Number(e.target.value) || 0 })}
                        />
                      </td>
                    </>
                  )}
                  {cat === 'product_subtype' && (
                    <td>
                      <select
                        className="cell-input w-full min-w-[120px]"
                        value={(row.metadata.parent as string) ?? ''}
                        disabled={!canEdit}
                        onChange={(e) => patchMeta(i, { parent: e.target.value })}
                      >
                        <option value="">—</option>
                        {productTypeCodes.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {cat === 'process' && (
                    <>
                      <td className="text-right">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          className="cell-input w-20 text-right font-mono"
                          value={String((row.metadata.costPerHour as number) ?? 0)}
                          disabled={!canEdit}
                          onChange={(e) => patchMeta(i, { costPerHour: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td>
                        <select
                          className="cell-input w-full min-w-[120px]"
                          value={(row.metadata.speedBasis as string) ?? 'kg_per_hour'}
                          disabled={!canEdit}
                          onChange={(e) => patchMeta(i, { speedBasis: e.target.value })}
                        >
                          <option value="kg_per_hour">kg/hour</option>
                          <option value="m_per_min">m/min</option>
                          <option value="pcs_per_min">pcs/min</option>
                        </select>
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          className="cell-input w-20 text-right font-mono"
                          value={String((row.metadata.speedValue as number) ?? 0)}
                          disabled={!canEdit}
                          onChange={(e) => patchMeta(i, { speedValue: Number(e.target.value) || 0 })}
                        />
                      </td>
                    </>
                  )}
                  {canEdit && (
                    <td className="text-right">
                      <button
                        type="button"
                        className="text-danger hover:text-danger/80 p-1"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        aria-label="Remove"
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
    </div>
  );
};

export default TenantReferenceEditor;
