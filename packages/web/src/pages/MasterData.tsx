import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Database, GripVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEntrance } from '../hooks/useEntrance';
import { useMasterDataContext } from '../contexts/MasterDataContext';
import {
  apiClient,
  type PlatformMasterMaterialRow,
  type PlatformReferenceCategory,
  type PlatformReferenceItemInput,
  type PlatformMasterMaterialInput,
} from '../lib/api';
import { DEFAULT_PRODUCT_SUBTYPE_OPTIONS } from '../lib/masterDataReference';
import LaminationFormulaModal from '../components/LaminationFormulaModal';
import { SectionTitle } from '../components/SectionTitle';
import { deriveBinderConcentrateStats, type LaminationRecipe } from '@es/engine';

type MaterialTab = string; // now dynamic — any rm_type code can be a material tab
type RefTab = 'product_type' | 'product_subtype' | 'unit' | 'rm_type' | 'process';
type Tab = MaterialTab | RefTab;

// Static ref tabs — these never change
const REF_TABS: { id: RefTab; label: string }[] = [
  { id: 'rm_type', label: 'RM Types' },
  { id: 'product_type', label: 'Product Types' },
  { id: 'unit', label: 'Units' },
  { id: 'process', label: 'Processes' },
];

// Static reference tab IDs — used to distinguish material tabs from ref tabs
const REF_TAB_IDS = new Set<string>(['product_type', 'product_subtype', 'unit', 'rm_type', 'process']);

const PACKAGING_FAMILY = 'Packaging';

// Standard material types — always present regardless of RM type config
const STANDARD_MATERIAL_TABS = [
  { id: 'substrate', label: 'Substrates' },
  { id: 'ink', label: 'Ink & Coating' },
  { id: 'adhesive', label: 'Adhesive' },
  { id: 'solvent', label: 'Solvent' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'accessory', label: 'Accessories' },
];

/** Accessory kinds + their rate basis (mirrors engine pouch-accessories.ts). */
const ACCESSORY_KIND_OPTIONS: { value: string; label: string; basis: 'per_meter' | 'per_piece' }[] = [
  { value: 'zipper', label: 'Zipper', basis: 'per_meter' },
  { value: 'spout', label: 'Spout + cap', basis: 'per_piece' },
  { value: 'valve', label: 'Degassing valve', basis: 'per_piece' },
  { value: 'handle', label: 'Handle', basis: 'per_piece' },
  { value: 'window', label: 'Window patch', basis: 'per_piece' },
];

function accessoryBasis(kind: string | null | undefined): 'per_meter' | 'per_piece' {
  return ACCESSORY_KIND_OPTIONS.find((o) => o.value === kind)?.basis ?? 'per_piece';
}

/** Map an RM type to the DB type field used for new rows */
function dbTypeForRmCode(code: string): 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'accessory' {
  if (code === 'ink') return 'ink';
  if (code === 'adhesive') return 'adhesive';
  if (code === 'solvent') return 'solvent';
  if (code === 'accessory') return 'accessory';
  return 'substrate'; // custom types map to substrate with substrateFamily = label
}

/** Default substrateFamily for a new row of a given RM type code */
function defaultFamilyForRmCode(code: string, label: string): string {
  if (code === 'packaging') return PACKAGING_FAMILY;
  if (code === 'solvent') return 'Solvent';
  if (code === 'accessory') return 'Accessory';
  if (code === 'substrate') return 'BOPP';
  if (code === 'ink') return 'Ink & Coating';
  if (code === 'adhesive') return 'Adhesive';
  return label; // custom types: family = label
}

/** Generate a stable key from a name */
function slugKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

/** Filter materials for a given RM type tab (supports dynamic custom types) */
function filterMaterialsForTab(
  tabCode: string,
  tabLabel: string,
  rows: PlatformMasterMaterialRow[],
  allRmTabs: { id: string; label: string }[]
): PlatformMasterMaterialRow[] {
  if (tabCode === 'packaging') {
    return rows.filter((m) => m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY);
  }
  if (tabCode === 'substrate') {
    const customFamilies = allRmTabs
      .filter((t) => !['substrate', 'ink', 'adhesive', 'packaging', 'solvent'].includes(t.id))
      .map((t) => t.label);
    return rows.filter(
      (m) => m.type === 'substrate' && m.substrateFamily !== PACKAGING_FAMILY && !customFamilies.includes(m.substrateFamily ?? '')
    );
  }
  if (tabCode === 'ink' || tabCode === 'adhesive') {
    return rows.filter((m) => m.type === tabCode);
  }
  if (tabCode === 'solvent') {
    return rows.filter((m) => m.type === 'solvent');
  }
  if (tabCode === 'accessory') {
    return rows.filter((m) => m.type === 'accessory');
  }
  // Custom RM type: match by substrateFamily = tab label
  return rows.filter((m) => m.type === 'substrate' && m.substrateFamily === tabLabel);
}

/** Create a new blank material row for a given RM type tab */
function newMaterialRow(tabCode: string, tabLabel: string): PlatformMasterMaterialRow {
  const dbType = dbTypeForRmCode(tabCode);
  const family = defaultFamilyForRmCode(tabCode, tabLabel);
  const defaultCost = tabCode === 'ink' ? 12 : tabCode === 'adhesive' ? 8 : 3;
  if (tabCode === 'accessory') {
    return {
      id: `new-${Date.now()}`,
      key: '',
      name: 'New accessory',
      type: 'accessory',
      solidPercent: 100,
      density: 1,
      costPerKgUsd: 0,
      liquidCostUsd: 0,
      wastePercent: 0,
      isSolventBased: false,
      substrateFamily: family,
      substrateGrade: '',
      hoover: '',
      marketPriceUsd: null,
      externalId: null,
      externalSource: null,
      accessoryKind: 'zipper',
      costPerMeterUsd: 0.05,
      costPerPieceUsd: null,
      weightGramPerMeter: 3,
      weightGramPerPiece: null,
    };
  }
  return {
    id: `new-${Date.now()}`,
    key: '',
    name: `New ${tabLabel.toLowerCase()}`,
    type: dbType,
    solidPercent: tabCode === 'solvent' ? 0 : 100,
    density: tabCode === 'solvent' ? 0.85 : 0.91,
    costPerKgUsd: tabCode === 'solvent' ? 1.54 : defaultCost,
    liquidCostUsd: defaultCost,
    wastePercent: 0,
    isSolventBased: tabCode === 'ink' || tabCode === 'adhesive',
    substrateFamily: family,
    substrateGrade: '',
    hoover: '',
    marketPriceUsd: null,
    externalId: null,
    externalSource: null,
  };
}

const MasterData = () => {
  const { user, isLoading } = useAuth();
  const { invalidate } = useMasterDataContext();
  // Single-play mount entrance for the library content; no-op under reduced motion (R22.3, R22.5).
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [tab, setTab] = useState<Tab>('rm_type');
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
  const [formulaMaterialId, setFormulaMaterialId] = useState<string | null>(null);
  const [cleaningDefaultKg, setCleaningDefaultKg] = useState(20);

  const formulaMaterial = materials.find((m) => m.id === formulaMaterialId) ?? null;
  const formulaRecipe = (formulaMaterial?.laminationRecipe as LaminationRecipe | null) ?? null;

  const isMaterialTab = (t: Tab): boolean => !REF_TAB_IDS.has(t);

  // Dynamic material tabs built from loaded RM types — starts with standard tabs,
  // then any custom RM types are appended automatically
  const [rmTypeTabs, setRmTypeTabs] = useState<{ id: string; label: string }[]>(STANDARD_MATERIAL_TABS);

  const loadMaterials = useCallback(async () => {
    const rows = await apiClient.getPlatformMasterDataMaterials();
    // Derive liquidCostUsd for ink/adhesive rows: liquidCostUsd = costPerKgUsd × (solidPercent/100)
    // (reverse of the computation — so when user opens the page they see the liquid price)
    const withLiquid = rows.map((row) => {
      // Use stored liquidCostUsd if available (avoids floating-point round-trip loss).
      // Fall back to reverse-calculation only for legacy rows that predate this column.
      if (row.liquidCostUsd != null) {
        return { ...row, liquidCostUsd: Number(row.liquidCostUsd) };
      }
      if ((row.type === 'ink' || row.type === 'adhesive') && row.solidPercent > 0 && row.solidPercent < 100) {
        return { ...row, liquidCostUsd: Math.round(row.costPerKgUsd * row.solidPercent) / 100 };
      }
      return { ...row, liquidCostUsd: row.costPerKgUsd };
    });
    setMaterials(withLiquid);
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
      unit: (ref.unitRows && ref.unitRows.length > 0
        ? ref.unitRows.map((u) => ({
            label: u.label,
            code: u.code,
            metadata: { basis: u.basis, multiplier: u.multiplier } as Record<string, unknown>,
          }))
        : (ref.units ?? []).map((l) => ({ label: l }))),
      rm_type: (ref.rmTypeRows ?? ref.rmTypes ?? []).map((r) =>
        typeof r === 'string'
          ? { label: r, code: '' }
          : { label: (r as { label: string }).label, code: (r as { code: string }).code ?? '' }
      ),
      process: [],  // process tab managed separately via processRows state
    };

    // Build dynamic material tabs from RM types.
    // Standard types always present; custom types (id not already a standard tab)
    // are appended. Exclude every standard tab id — including 'solvent' and
    // 'accessory' — and de-dupe custom ids so two rows can't collide on a React key.
    const STANDARD_CODES = new Set(STANDARD_MATERIAL_TABS.map((t) => t.id.toLowerCase()));
    const seenCustom = new Set<string>();
    const customRmTabs = map.rm_type
      .map((r) => ({ id: (r.code || slugKey(r.label)).toLowerCase(), label: r.label.trim() }))
      .filter((t) => {
        if (!t.label || STANDARD_CODES.has(t.id) || seenCustom.has(t.id)) return false;
        seenCustom.add(t.id);
        return true;
      });
    setRmTypeTabs([...STANDARD_MATERIAL_TABS, ...customRmTabs]);
    setCleaningDefaultKg(
      (ref as { costingDefaults?: { cleaningSolventKgPerJob?: number } }).costingDefaults
        ?.cleaningSolventKgPerJob ?? 20
    );
    if (!isMaterialTab(tab)) {
      setRefItems((map as Record<string, PlatformReferenceItemInput[]>)[tab] ?? []);
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

  const canEdit = user?.role === 'tenant_admin' || user?.role === 'platform_admin';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadMaterials();
        await loadReference();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load materials');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMaterials, loadReference]);

  useEffect(() => {
    if (!isMaterialTab(tab)) {
      loadReference().catch(() => {});
    }
  }, [tab, loadReference]);

  const visibleMaterials = useMemo(() => {
    if (!isMaterialTab(tab)) return [];
    const currentTab = rmTypeTabs.find((t) => t.id === tab);
    return filterMaterialsForTab(tab, currentTab?.label ?? tab, materials, rmTypeTabs);
  }, [tab, materials, rmTypeTabs]);

  // Drag-and-drop reordering state — hoisted above the early returns below so
  // the hook order stays identical on every render (Rules of Hooks).
  const [ptDragFrom, setPtDragFrom] = useState<number | null>(null);
  const [ptDragHover, setPtDragHover] = useState<number | null>(null);
  const [subDragFrom, setSubDragFrom] = useState<number | null>(null);
  const [subDragHover, setSubDragHover] = useState<number | null>(null);
  const [procDragFrom, setProcDragFrom] = useState<number | null>(null);
  const [procDragHover, setProcDragHover] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading…
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

      const currentTab = rmTypeTabs.find((t) => t.id === tab);
      const isInCurrentTab = (m: PlatformMasterMaterialRow) => {
        return filterMaterialsForTab(tab, currentTab?.label ?? tab, [m], rmTypeTabs).length > 0;
      };
      const other = materials.filter((m) => !isInCurrentTab(m));
      const merged = [...other, ...tabRows].map(
        ({ id: _id, costingKey: _ck, ...rest }) => rest as PlatformMasterMaterialInput
      );
      const result = await apiClient.updateMasterMaterials(merged);
      if (tab === 'solvent') {
        await apiClient.updateCostingDefaults(cleaningDefaultKg);
      }
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

  // ── Drag-and-drop reordering (product types) ───────────────────────────────
  const reorderProductType = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= refItems.length || to >= refItems.length) return;
    setRefItems((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };
  const commitPtDrag = () => {
    if (ptDragFrom !== null && ptDragHover !== null) reorderProductType(ptDragFrom, ptDragHover);
    setPtDragFrom(null);
    setPtDragHover(null);
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

  // ── Drag-and-drop reordering (subtypes — constrained to same parent) ────────
  const commitSubDrag = () => {
    if (
      subDragFrom !== null &&
      subDragHover !== null &&
      subDragFrom !== subDragHover &&
      subtypeRows[subDragFrom]?.parent === subtypeRows[subDragHover]?.parent
    ) {
      setSubtypeRows((prev) => {
        const copy = [...prev];
        const [item] = copy.splice(subDragFrom, 1);
        // Account for index shift when removing an earlier element.
        const insertAt = subDragFrom < subDragHover ? subDragHover - 1 : subDragHover;
        copy.splice(insertAt, 0, item);
        return copy;
      });
    }
    setSubDragFrom(null);
    setSubDragHover(null);
  };

  // ── Drag-and-drop reordering (processes) ────────────────────────────────────
  const commitProcDrag = () => {
    if (procDragFrom !== null && procDragHover !== null && procDragFrom !== procDragHover) {
      setProcessRows((prev) => {
        const copy = [...prev];
        const [item] = copy.splice(procDragFrom, 1);
        const insertAt = procDragFrom < procDragHover ? procDragHover - 1 : procDragHover;
        copy.splice(insertAt, 0, item);
        return copy;
      });
    }
    setProcDragFrom(null);
    setProcDragHover(null);
  };

  const updateMaterialRow = (id: string, patch: Partial<PlatformMasterMaterialRow>) => {
    setMaterials((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const updated = { ...m, ...patch };
      // Auto-compute costPerKgUsd when liquidCostUsd or solidPercent changes (ink/adhesive only)
      if ((updated.type === 'ink' || updated.type === 'adhesive') &&
          ('liquidCostUsd' in patch || 'solidPercent' in patch)) {
        const liquid = updated.liquidCostUsd ?? updated.costPerKgUsd;
        const solid = Math.max(1, updated.solidPercent || 100);
        updated.costPerKgUsd = parseFloat((liquid / (solid / 100)).toFixed(4));
      }
      return updated;
    }));
  };

  const addMaterialRow = () => {
    if (!isMaterialTab(tab)) return;
    const currentTab = rmTypeTabs.find((t) => t.id === tab);
    setMaterials((prev) => [...prev, newMaterialRow(tab, currentTab?.label ?? tab)]);
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
    <div ref={entranceRef} className="w-full pb-24 lg:pb-8">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
            <Database className="w-7 h-7 text-gold shrink-0" />
            Raw Materials
          </h1>
          <p className="text-mist mt-1 text-sm">
            Material catalog — the single source of truth for all estimates.
            {canEdit && ' Changes sync to all users automatically.'}
            {!canEdit && ' Contact an admin to update prices or add materials.'}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn-primary flex items-center gap-2 shrink-0"
            disabled={saving}
            onClick={isMaterialTab(tab) ? handleSaveMaterials : handleSaveReference}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save tab'}
          </button>
        )}
      </div>

      {error && (
        <div className="card bg-danger/10 border-danger/30 mb-4 text-danger text-sm">{error}</div>
      )}
      {status && (
        <div className="card bg-success/10 border-success/30 mb-4 text-success text-sm">{status}</div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {[REF_TABS[0], ...rmTypeTabs, ...REF_TABS.slice(1)].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-micro ease-micro shrink-0 ${
              tab === t.id ? 'bg-gold/15 text-gold' : 'bg-surface-raised text-ink hover:bg-slate'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isMaterialTab(tab) ? (
        <div className="card overflow-hidden">
          {tab === 'solvent' && canEdit && (
            <div className="px-3 py-3 border-b border-border bg-warning/10 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-mist mb-1">
                  Default cleaning EA (kg/job)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input w-full font-mono"
                  value={cleaningDefaultKg}
                  onChange={(e) => setCleaningDefaultKg(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-mist mt-1">New estimates default to this when SB ink is in the stack.</p>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center px-3 py-2 border-b border-border bg-slate/30">
            <span className="text-sm text-mist">{visibleMaterials.length} row(s)</span>
            {canEdit && (
              <button type="button" className="btn-secondary text-sm flex items-center gap-1 py-1.5" onClick={addMaterialRow}>
                <Plus className="w-4 h-4" /> Add row
              </button>
            )}
          </div>
          {tab === 'accessory' ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th className="text-right">Cost / m ($)</th>
                    <th className="text-right">Weight (g/m)</th>
                    <th className="text-right">Cost / pc ($)</th>
                    <th className="text-right">Weight (g/pc)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleMaterials.map((row) => {
                    const basis = accessoryBasis(row.accessoryKind);
                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            className="cell-input w-full min-w-0"
                            value={row.name}
                            disabled={!canEdit}
                            onChange={(e) => updateMaterialRow(row.id, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            className="cell-input w-full"
                            value={row.accessoryKind ?? 'zipper'}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateMaterialRow(row.id, {
                                accessoryKind: e.target.value as PlatformMasterMaterialRow['accessoryKind'],
                              })
                            }
                          >
                            {ACCESSORY_KIND_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {basis === 'per_meter' ? (
                            <input
                              type="number" step="0.001" className="cell-input cell-num w-[80px]"
                              value={row.costPerMeterUsd ?? 0} disabled={!canEdit}
                              onChange={(e) => updateMaterialRow(row.id, { costPerMeterUsd: Number(e.target.value) })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td>
                          {basis === 'per_meter' ? (
                            <input
                              type="number" step="0.01" className="cell-input cell-num w-[80px]"
                              value={row.weightGramPerMeter ?? 0} disabled={!canEdit}
                              onChange={(e) => updateMaterialRow(row.id, { weightGramPerMeter: Number(e.target.value) })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td>
                          {basis === 'per_piece' ? (
                            <input
                              type="number" step="0.001" className="cell-input cell-num w-[80px]"
                              value={row.costPerPieceUsd ?? 0} disabled={!canEdit}
                              onChange={(e) => updateMaterialRow(row.id, { costPerPieceUsd: Number(e.target.value) })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td>
                          {basis === 'per_piece' ? (
                            <input
                              type="number" step="0.01" className="cell-input cell-num w-[80px]"
                              value={row.weightGramPerPiece ?? 0} disabled={!canEdit}
                              onChange={(e) => updateMaterialRow(row.id, { weightGramPerPiece: Number(e.target.value) })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td className="text-center">
                          {canEdit && (
                            <button
                              type="button"
                              className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro"
                              onClick={() => removeMaterialRow(row)}
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visibleMaterials.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-mist py-4 text-sm">No accessories yet — click “Add row”. Used by the Pouch configurator (zipper/spout/valve/window/handle).</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Name</th>
                  <th>Grade</th>
                  <th className="text-right">Density</th>
                  <th className="text-right">Solid %</th>
                  {(tab === 'ink' || tab === 'adhesive') && (
                    <th className="text-right">Liquid Cost<br/><span className="font-normal text-[10px]">$/kg liquid</span></th>
                  )}
                  <th className="text-right">
                    {(tab === 'ink' || tab === 'adhesive') ? (
                      <>Cost/kg<br/><span className="font-normal text-[10px]">dry equiv (auto)</span></>
                    ) : 'Cost/kg'}
                  </th>
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
                        disabled={!canEdit}
                        onChange={(e) => updateMaterialRow(row.id, { substrateFamily: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.name}
                        title={row.name}
                        disabled={!canEdit}
                        onChange={(e) => updateMaterialRow(row.id, { name: e.target.value })}
                        onDoubleClick={() => {
                          if (tab === 'adhesive' && row.isSolventBased) setFormulaMaterialId(row.id);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.substrateGrade ?? ''}
                        title={row.substrateGrade ?? ''}
                        disabled={!canEdit}
                        onChange={(e) => updateMaterialRow(row.id, { substrateGrade: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="cell-input cell-num w-[72px]"
                        value={row.density}
                        disabled={!canEdit}
                        onChange={(e) => updateMaterialRow(row.id, { density: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="cell-input cell-num w-[64px]"
                        value={row.solidPercent}
                        disabled={!canEdit}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { solidPercent: Number(e.target.value) })
                        }
                      />
                    </td>
                    {/* Liquid Cost — editable for ink/adhesive; derives costPerKgUsd automatically */}
                    {(tab === 'ink' || tab === 'adhesive') && (
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="cell-input cell-num w-[72px]"
                          value={row.liquidCostUsd ?? row.costPerKgUsd}
                          title="Price you pay per kg of liquid ink/adhesive"
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateMaterialRow(row.id, { liquidCostUsd: Number(e.target.value) })
                          }
                        />
                      </td>
                    )}
                    <td>
                      {(tab === 'ink' || tab === 'adhesive') ? (
                        <span
                          className="cell-num font-mono text-sm font-semibold text-warning px-2"
                          title={`${(row.liquidCostUsd ?? row.costPerKgUsd).toFixed(2)} ÷ ${row.solidPercent}% = ${row.costPerKgUsd.toFixed(4)}`}
                        >
                          {row.costPerKgUsd.toFixed(2)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          className="cell-input cell-num w-[72px]"
                          value={row.costPerKgUsd}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateMaterialRow(row.id, { costPerKgUsd: Number(e.target.value) })
                          }
                        />
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="cell-input cell-num w-[72px]"
                        value={row.marketPriceUsd ?? row.costPerKgUsd}
                        disabled={!canEdit}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { marketPriceUsd: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="text-center">
                      {tab === 'adhesive' && row.isSolventBased && canEdit && (
                        <button
                          type="button"
                          className="text-xs text-accent-text hover:text-accent mr-1 transition-colors duration-micro ease-micro"
                          onClick={() => setFormulaMaterialId(row.id)}
                        >
                          Formula
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro"
                          onClick={() => removeMaterialRow(row)}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      ) : tab === 'product_type' ? (
        <div className="card p-3 space-y-3">
          <div className="flex justify-between items-center">
            <SectionTitle
              as="span"
              className="text-sm text-mist"
              hint="Each product type has its own code (e.g. pouch, bag). Subtypes nest under a type with a parentcode_subtype code (e.g. bag_wicket) — they drive the estimate dropdowns."
            >
              {refItems.length} product type(s)
            </SectionTitle>
            <button type="button" className="btn-secondary text-sm flex items-center gap-1 py-1.5" onClick={addProductType}>
              <Plus className="w-4 h-4" /> Add product type
            </button>
          </div>
          {refItems.map((pt, i) => {
            const ptCode = (pt.code ?? '').toLowerCase();
            return (
              <div
                key={i}
                onDragEnter={() => { if (ptDragFrom !== null) setPtDragHover(i); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); commitPtDrag(); }}
                className={`border border-border rounded-lg p-3 bg-slate/10 transition-colors ${
                  ptDragFrom === i ? 'opacity-50' : ''
                } ${ptDragHover === i && ptDragFrom !== null && ptDragFrom !== i ? 'outline outline-1 outline-gold/50 bg-gold/5' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* Drag handle */}
                  <span
                    draggable
                    onDragStart={() => setPtDragFrom(i)}
                    onDragEnd={commitPtDrag}
                    className="text-mist hover:text-navy cursor-grab active:cursor-grabbing touch-none shrink-0"
                    aria-label="Drag to reorder product type"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>
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
                  <button type="button" className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro" onClick={() => removeProductType(i)} aria-label="Delete product type">
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
                      <div
                        key={idx}
                        onDragEnter={() => {
                          if (subDragFrom !== null && subtypeRows[subDragFrom]?.parent === ptCode) setSubDragHover(idx);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); commitSubDrag(); }}
                        className={`flex flex-wrap items-center gap-2 rounded transition-colors ${
                          subDragFrom === idx ? 'opacity-50' : ''
                        } ${subDragHover === idx && subDragFrom !== null && subDragFrom !== idx ? 'outline outline-1 outline-gold/50 bg-gold/5' : ''}`}
                      >
                        {/* Drag handle */}
                        <span
                          draggable
                          onDragStart={() => setSubDragFrom(idx)}
                          onDragEnd={commitSubDrag}
                          className="text-mist hover:text-navy cursor-grab active:cursor-grabbing touch-none shrink-0"
                          aria-label="Drag to reorder subtype"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
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
                        <button type="button" className="p-1 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro" onClick={() => removeSubtype(idx)} aria-label="Delete subtype">
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
            <SectionTitle
              as="span"
              className="text-sm text-mist"
              hint="Processes drive template selection and estimate instantiation defaults (cost/hour, speed, setup). The code (e.g. pouch_making) is the stable key stored in templates."
            >
              {processRows.length} process(es)
            </SectionTitle>
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1 py-1.5"
              onClick={() => setProcessRows((prev) => [...prev, { label: 'New process', code: '', description: '', costPerHour: 50, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 }])}
            >
              <Plus className="w-4 h-4" /> Add process
            </button>
          </div>
          <div className="space-y-2">
            {processRows.map((proc, i) => {
              const groupIdxCount = processRows.length;
              return (
                <div
                  key={i}
                  onDragEnter={() => { if (procDragFrom !== null) setProcDragHover(i); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); commitProcDrag(); }}
                  className={`border border-border rounded-lg p-3 bg-slate/10 space-y-2 transition-colors ${
                    procDragFrom === i ? 'opacity-50' : ''
                  } ${procDragHover === i && procDragFrom !== null && procDragFrom !== i ? 'outline outline-1 outline-gold/50 bg-gold/5' : ''}`}
                >
                  {/* Row 1: reorder + label + code + delete */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      draggable
                      onDragStart={() => setProcDragFrom(i)}
                      onDragEnd={commitProcDrag}
                      className="text-mist hover:text-navy cursor-grab active:cursor-grabbing touch-none shrink-0"
                      aria-label="Drag to reorder process"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <div className="flex flex-col gap-0 shrink-0">
                      <button type="button" disabled={i === 0} onClick={() => setProcessRows((prev) => { const c = [...prev]; [c[i], c[i-1]] = [c[i-1], c[i]]; return c; })} className="text-mist hover:text-navy disabled:opacity-20 text-xs leading-none px-0.5" aria-label="Move up">▲</button>
                      <button type="button" disabled={i === groupIdxCount - 1} onClick={() => setProcessRows((prev) => { const c = [...prev]; [c[i], c[i+1]] = [c[i+1], c[i]]; return c; })} className="text-mist hover:text-navy disabled:opacity-20 text-xs leading-none px-0.5" aria-label="Move down">▼</button>
                    </div>
                    <input className="input !min-h-[34px] !py-1 !px-2 text-sm flex-1 min-w-[8rem]" placeholder="Label (e.g. Extrusion)" value={proc.label} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, label: e.target.value } : p))} />
                    <input className="input !min-h-[34px] !py-1 !px-2 text-sm font-mono w-36" placeholder="code" value={proc.code} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') } : p))} />
                    <button type="button" className="p-1.5 text-danger hover:bg-danger/10 rounded shrink-0 transition-colors duration-micro ease-micro" onClick={() => setProcessRows((prev) => prev.filter((_, j) => j !== i))} aria-label="Delete process"><Trash2 className="w-4 h-4" /></button>
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
              onClick={() =>
                setRefItems((prev) => [
                  ...prev,
                  tab === 'unit'
                    ? { label: '', code: '', metadata: { basis: 'kg', multiplier: 1 } }
                    : { label: '', code: '' },
                ])
              }
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {tab === 'unit' && (
            <p className="text-xs text-mist mb-2">
              Each unit converts the order quantity to kg via a <strong>basis</strong> (kg, pieces, m²,
              or reel-width linear metre) times a <strong>multiplier</strong>. E.g. Kpcs = pieces × 1000,
              Roll 500 LM = linear metre × 500, 1 MT = kg × 1000.
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
                  {tab === 'unit' && (
                    <>
                      <th>Basis</th>
                      <th className="text-right">Multiplier</th>
                    </>
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
                    {tab === 'unit' && (
                      <>
                        <td>
                          <select
                            className="cell-input w-full min-w-[150px]"
                            value={(item.metadata?.basis as string) ?? 'kg'}
                            onChange={(e) => {
                              const next = [...refItems];
                              next[i] = {
                                ...next[i],
                                metadata: { ...(next[i].metadata ?? {}), basis: e.target.value },
                              };
                              setRefItems(next);
                            }}
                          >
                            <option value="kg">Kg (weight)</option>
                            <option value="pieces">Pieces</option>
                            <option value="sqm">m² (area)</option>
                            <option value="lm">Linear metre (reel width)</option>
                          </select>
                        </td>
                        <td className="text-right">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            className="cell-input w-24 text-right font-mono"
                            title="Base units per entered unit (e.g. Kpcs = 1000)"
                            value={String((item.metadata?.multiplier as number) ?? 1)}
                            onChange={(e) => {
                              const next = [...refItems];
                              next[i] = {
                                ...next[i],
                                metadata: { ...(next[i].metadata ?? {}), multiplier: Number(e.target.value) || 0 },
                              };
                              setRefItems(next);
                            }}
                          />
                        </td>
                      </>
                    )}
                    <td className="text-center">
                      <button
                        type="button"
                        className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro"
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
      <LaminationFormulaModal
        open={formulaMaterialId != null}
        title={formulaMaterial ? `Master formula — ${formulaMaterial.name}` : 'Master formula'}
        recipe={formulaRecipe}
        onClose={() => setFormulaMaterialId(null)}
        onSave={(recipe) => {
          if (!formulaMaterialId) return;
          const stats = deriveBinderConcentrateStats(recipe);
          updateMaterialRow(formulaMaterialId, {
            laminationRecipe: recipe as unknown as Record<string, unknown>,
            solidPercent: stats.solidPercent,
            costPerKgUsd: stats.costPerKgUsd,
            liquidCostUsd: stats.liquidCostUsd,
          });
        }}
      />
    </div>
  );
};

export default MasterData;
