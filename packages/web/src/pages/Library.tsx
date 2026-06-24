import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { roundUsd } from '../lib/currency';
import { SkeletonTableRows } from '../components/Skeleton';
import { deriveSubstrateFamilies, deriveSubstrateGrades } from '../lib/materialTaxonomy';
import type { RmTypeOption } from '../lib/masterDataReference';

interface Material {
  id: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive';
  solidPercent: number;
  density: number;
  wastePercent: number;
  costPerKgUsd: number;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
  marketPriceUsd?: number | null;
  platformMasterKey?: string | null;
  platformSyncedAt?: string | null;
  isTenantOnly?: boolean;
}

type PriceDraft = { costPerKgUsd: string; marketPriceUsd: string; solidPercent?: string };

/**
 * Resolve the effective MaterialFormKind for a given RmTypeOption.
 *  standard codes map to their kind directly; custom codes use 'custom'.
 */
function formKindForCode(code: string): MaterialFormKind {
  if (code === 'substrate') return 'substrate';
  if (code === 'ink') return 'ink';
  if (code === 'adhesive') return 'adhesive';
  if (code === 'packaging') return 'packaging';
  return 'custom';
}

type MaterialFormKind = 'substrate' | 'ink' | 'adhesive' | 'packaging' | 'custom';

/**
 * Determine the displayed material "kind" for a row.
 * Custom kinds = type=substrate with a family that matches a known custom rm-type label.
 */
function formKindFromMaterial(
  m: Material,
  rmTypeOptions: RmTypeOption[]
): MaterialFormKind {
  if (m.type === 'substrate' && m.substrateFamily === 'Packaging') return 'packaging';
  if (m.type === 'substrate') {
    const customType = rmTypeOptions.find(
      (rt) =>
        rt.code !== 'substrate' &&
        rt.code !== 'packaging' &&
        rt.code !== 'ink' &&
        rt.code !== 'adhesive' &&
        rt.label === m.substrateFamily
    );
    if (customType) return 'custom';
  }
  return m.type as MaterialFormKind;
}

function displayMaterialType(m: Material, rmTypeOptions: RmTypeOption[]): string {
  if (m.type === 'substrate' && m.substrateFamily === 'Packaging') return 'packaging';
  const custom = rmTypeOptions.find(
    (rt) =>
      rt.code !== 'substrate' && rt.code !== 'packaging' && rt.code !== 'ink' && rt.code !== 'adhesive' &&
      rt.label === m.substrateFamily
  );
  if (custom) return custom.label.toLowerCase();
  return m.type;
}

/** Does this material match the given RM type filter? */
function materialMatchesRmType(
  material: Material,
  rmType: RmTypeOption,
  allRmTypes: RmTypeOption[]
): boolean {
  const code = rmType.code;
  if (code === 'ink') return material.type === 'ink';
  if (code === 'adhesive') return material.type === 'adhesive';
  if (code === 'packaging') {
    return material.type === 'substrate' && material.substrateFamily === 'Packaging';
  }
  if (code === 'substrate') {
    // Substrate = all substrates NOT claimed by any custom rm-type or Packaging
    const customFamilies = allRmTypes
      .filter((t) => t.code !== 'substrate' && t.code !== 'ink' && t.code !== 'adhesive')
      .map((t) => t.label);
    return material.type === 'substrate' && !customFamilies.includes(material.substrateFamily ?? '');
  }
  // Custom type: match substrateFamily = label
  return material.type === 'substrate' && material.substrateFamily === rmType.label;
}

function savedMarket(m: Material): number {
  return roundUsd(m.marketPriceUsd ?? m.costPerKgUsd);
}
function priceInputValue(value: number | null | undefined): string {
  return roundUsd(value ?? 0).toFixed(2);
}

function parseMaterialRow(m: Record<string, unknown>): Material {
  const cost = Number(m.costPerKgUsd);
  const marketRaw = m.marketPriceUsd;
  const market =
    marketRaw != null && marketRaw !== '' ? Number(marketRaw) : null;
  return {
    id: String(m.id ?? ''),
    name: String(m.name ?? ''),
    type: (m.type || m.materialType || 'substrate') as Material['type'],
    solidPercent: Number(m.solidPercent ?? 100),
    density: Number(m.density),
    wastePercent: Number(m.wastePercent ?? 0),
    costPerKgUsd: Number.isFinite(cost) ? roundUsd(cost) : 0,
    substrateFamily: (m.substrateFamily as string | null) ?? null,
    substrateGrade: (m.substrateGrade as string | null) ?? null,
    hoover: (m.hoover as string | null) ?? null,
    marketPriceUsd: market != null && Number.isFinite(market) ? roundUsd(market) : null,
    platformMasterKey: (m.platformMasterKey as string | null) ?? null,
    platformSyncedAt: (m.platformSyncedAt as string | null) ?? null,
    isTenantOnly: Boolean(m.isTenantOnly),
  };
}

/** Blank editing material for a given RM type option */
function blankMaterialForRmType(rmType: RmTypeOption): Material {
  const base = {
    id: '',
    name: '',
    solidPercent: 100,
    density: 0.91,
    wastePercent: 0,
    costPerKgUsd: 0,
    substrateFamily: null as string | null,
    substrateGrade: null as string | null,
    hoover: null as string | null,
    marketPriceUsd: null as number | null,
  };
  if (rmType.code === 'ink') {
    return { ...base, type: 'ink', substrateFamily: 'Ink & Coating' };
  }
  if (rmType.code === 'adhesive') {
    return { ...base, type: 'adhesive', substrateFamily: 'Adhesive' };
  }
  if (rmType.code === 'packaging') {
    return { ...base, type: 'substrate', substrateFamily: 'Packaging', density: 1 };
  }
  if (rmType.code === 'substrate') {
    return { ...base, type: 'substrate' };
  }
  // Custom type (e.g. Plate)
  return { ...base, type: 'substrate', substrateFamily: rmType.label };
}

const Library = () => {
  const { reference: masterRef, version: masterDataVersion } = useMasterDataReference();
  const rmTypeOptions = masterRef.rmTypeOptions;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilterCode, setActiveFilterCode] = useState<string>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingRmType, setEditingRmType] = useState<RmTypeOption | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});

  const draftFor = (material: Material): PriceDraft => {
    if (priceDrafts[material.id]) return priceDrafts[material.id];
    return {
      costPerKgUsd: priceInputValue(material.costPerKgUsd),
      marketPriceUsd: priceInputValue(savedMarket(material)),
      solidPercent: String(material.solidPercent),
    };
  };

  const isPriceDirty = (material: Material): boolean => {
    const draft = draftFor(material);
    const user = roundUsd(Number(draft.costPerKgUsd));
    const market = roundUsd(Number(draft.marketPriceUsd));
    const solid = Number(draft.solidPercent ?? material.solidPercent);
    if (!Number.isFinite(user) || !Number.isFinite(market)) return true;
    return user !== roundUsd(material.costPerKgUsd) || market !== savedMarket(material) || solid !== material.solidPercent;
  };

  const setPriceDraft = (id: string, patch: Partial<PriceDraft>) => {
    setPriceDrafts((prev) => {
      const material = materials.find((m) => m.id === id);
      if (!material) return prev;
      const current = prev[id] ?? {
        costPerKgUsd: priceInputValue(material.costPerKgUsd),
        marketPriceUsd: priceInputValue(savedMarket(material)),
      };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  };

  const resetPriceDraft = (id: string) => {
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const substrateFamilies = useMemo(() => deriveSubstrateFamilies(materials), [materials]);
  const substrateGrades = useMemo(
    () => deriveSubstrateGrades(materials, editingMaterial?.substrateFamily),
    [materials, editingMaterial?.substrateFamily]
  );
  const packagingItems = useMemo(
    () =>
      materials
        .filter((m) => m.type === 'substrate' && m.substrateFamily === 'Packaging')
        .map((m) => m.substrateGrade || m.name)
        .filter(Boolean),
    [materials]
  );

  const editingFormKind = useMemo((): MaterialFormKind => {
    if (!editingMaterial) return 'substrate';
    if (editingRmType) return formKindForCode(editingRmType.code);
    return formKindFromMaterial(editingMaterial, rmTypeOptions);
  }, [editingMaterial, editingRmType, rmTypeOptions]);

  const openCreateModal = () => {
    // Default the create modal to the active filter if not 'all'
    const rmType =
      activeFilterCode !== 'all'
        ? rmTypeOptions.find((t) => t.code === activeFilterCode)
        : rmTypeOptions[0];
    const base = rmType ? blankMaterialForRmType(rmType) : blankMaterialForRmType({ label: 'Substrate', code: 'substrate' });
    setEditingMaterial(base);
    setEditingRmType(rmType ?? null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
    setEditingRmType(null);
  };

  const handleRmTypeChange = (newCode: string) => {
    const newRmType = rmTypeOptions.find((t) => t.code === newCode) ?? rmTypeOptions[0];
    const blank = blankMaterialForRmType(newRmType);
    setEditingRmType(newRmType);
    setEditingMaterial((prev) => ({
      ...blank,
      id: prev?.id ?? '',
      solidPercent: prev?.solidPercent ?? blank.solidPercent,
      density: prev?.density ?? blank.density,
      costPerKgUsd: prev?.costPerKgUsd ?? 0,
      marketPriceUsd: prev?.marketPriceUsd ?? null,
    }));
  };

  const handleRefreshMarketPrices = async () => {
    if (!confirm('Update Market Price from free polymer futures (Yahoo Finance)?\n\nUser Price is not changed. ALU has no free feed.')) return;
    try {
      setRefreshingMarket(true);
      const result = await apiClient.refreshMaterialPrices();
      await fetchMaterials();
      const sourceSummary = result.sources
        .map((s) => `${s.family}: ${s.symbol ?? 'fallback'} → $${s.filmUsdPerKg.toFixed(2)}/kg`)
        .join('\n');
      const errSummary = result.errors.length ? `\n\nNotes:\n${result.errors.join('\n')}` : '';
      alert(`Market refresh: ${result.updated} updated, ${result.skipped} unchanged (<2%).${errSummary}${sourceSummary ? `\n\nSources:\n${sourceSummary}` : ''}`);
    } catch (err) {
      alert('Failed to refresh market prices: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setRefreshingMarket(false);
    }
  };

  const handleSaveMaterial = async () => {
    if (!editingMaterial) return;

    const rmType = editingRmType ?? rmTypeOptions.find((t) => t.code === formKindForCode(editingMaterial.type));
    const kind = editingFormKind;
    const isSubstrate = kind === 'substrate';
    const isPackaging = kind === 'packaging';
    const isCustom = kind === 'custom';
    const family = editingMaterial.substrateFamily?.trim().toUpperCase() || null;
    const grade = editingMaterial.substrateGrade?.trim() || null;
    let name = editingMaterial.name.trim();

    if (isPackaging) {
      const item = grade || name;
      if (!item) { alert('Enter a packaging item name.'); return; }
      name = item;
    } else if (isSubstrate) {
      if (!family) { alert('Enter a substrate family (pick from list or type a new one, e.g. EVOH).'); return; }
      if (!grade) { alert('Enter a substrate grade.'); return; }
      if (!name) name = grade;
    } else if (isCustom) {
      if (!name) { alert(`Enter a name for this ${rmType?.label ?? 'material'}.`); return; }
    } else if (!name) {
      alert('Enter a material name.');
      return;
    }

    // Resolve DB type and family for custom RM types
    let dbType: 'substrate' | 'ink' | 'adhesive' = editingMaterial.type;
    let dbFamily = isPackaging
      ? 'Packaging'
      : isSubstrate
      ? family
      : isCustom
      ? (rmType?.label ?? editingMaterial.substrateFamily)
      : editingMaterial.substrateFamily;

    if (isCustom) {
      dbType = 'substrate';
      dbFamily = rmType?.label ?? editingMaterial.substrateFamily;
    }

    const payload = {
      name,
      type: dbType,
      solidPercent: editingMaterial.solidPercent,
      density: editingMaterial.density,
      wastePercent: editingMaterial.wastePercent ?? 0,
      costPerKgUsd: roundUsd(editingMaterial.costPerKgUsd),
      marketPriceUsd: roundUsd(editingMaterial.marketPriceUsd ?? editingMaterial.costPerKgUsd),
      substrateFamily: dbFamily,
      substrateGrade: isPackaging ? name : isSubstrate ? grade : editingMaterial.substrateGrade,
      hoover: editingMaterial.hoover?.trim() || null,
    };

    try {
      if (editingMaterial.id) {
        const updated = await apiClient.updateMaterial(editingMaterial.id, payload) as Material;
        setMaterials((prev) => prev.map((m) => m.id === updated.id ? parseMaterialRow(updated as unknown as Record<string, unknown>) : m));
      } else {
        const created = await apiClient.createMaterial(payload) as Material;
        setMaterials((prev) => [parseMaterialRow(created as unknown as Record<string, unknown>), ...prev]);
      }
      closeModal();
    } catch (err) {
      alert('Failed to save material: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [masterDataVersion]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getMaterials();
      setMaterials((data || []).map((m: Record<string, unknown>) => parseMaterialRow(m)));
      setPriceDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleInlinePriceSave = async (material: Material, patch: { costPerKgUsd: number; marketPriceUsd: number; solidPercent?: number }) => {
    const costPerKgUsd = roundUsd(patch.costPerKgUsd);
    const marketPriceUsd = roundUsd(patch.marketPriceUsd);
    const payload: Record<string, unknown> = { costPerKgUsd, marketPriceUsd };
    if (patch.solidPercent != null && Number.isFinite(patch.solidPercent)) {
      payload.solidPercent = Math.min(100, Math.max(1, Math.round(patch.solidPercent)));
    }
    setSavingPriceId(material.id);
    try {
      const updated = await apiClient.updateMaterial(material.id, payload) as Material;
      setMaterials((prev) => prev.map((m) => m.id === material.id ? parseMaterialRow(updated as unknown as Record<string, unknown>) : m));
      resetPriceDraft(material.id);
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSavingPriceId(null);
    }
  };

  const savePriceDraft = (material: Material) => {
    const draft = draftFor(material);
    const costPerKgUsd = roundUsd(Number(draft.costPerKgUsd));
    const marketPriceUsd = roundUsd(Number(draft.marketPriceUsd));
    const solidPercent = Number(draft.solidPercent ?? material.solidPercent);
    if (!Number.isFinite(costPerKgUsd) || costPerKgUsd < 0 || !Number.isFinite(marketPriceUsd) || marketPriceUsd < 0) {
      alert('Enter valid prices (0 or greater).');
      return;
    }
    void handleInlinePriceSave(material, { costPerKgUsd, marketPriceUsd, solidPercent });
  };

  const renderPriceSaveActions = (material: Material, compact = false) => {
    if (!isPriceDirty(material)) return null;
    const saving = savingPriceId === material.id;
    return (
      <div className={`flex gap-2 ${compact ? 'mt-2' : ''}`}>
        <button type="button" onClick={() => savePriceDraft(material)} disabled={saving}
          className={compact ? 'btn-primary flex-1 text-sm py-1.5' : 'text-sm text-white bg-gold px-3 py-1 rounded-md font-medium hover:opacity-90 disabled:opacity-50'}>
          {saving ? 'Saving…' : 'Save prices'}
        </button>
        <button type="button" onClick={() => resetPriceDraft(material.id)} disabled={saving}
          className={compact ? 'btn-secondary flex-1 text-sm py-1.5' : 'text-sm text-mist px-2 py-1 hover:underline disabled:opacity-50'}>
          Cancel
        </button>
      </div>
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material? This cannot be undone.')) return;
    try {
      setDeleting(id);
      await apiClient.deleteMaterial(id);
      setMaterials(materials.filter((m) => m.id !== id));
    } catch (err) {
      alert('Failed to delete material: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  // Active RM type object (null = all)
  const activeRmType = useMemo(
    () => rmTypeOptions.find((t) => t.code === activeFilterCode) ?? null,
    [activeFilterCode, rmTypeOptions]
  );

  const filteredMaterials = useMemo(() => {
    const filtered = materials.filter((material) => {
      const matchesSearch =
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.substrateFamily || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.hoover || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        activeFilterCode === 'all' ||
        (activeRmType ? materialMatchesRmType(material, activeRmType, rmTypeOptions) : true);
      const matchesFamily = familyFilter === 'all' || material.substrateFamily === familyFilter;
      return matchesSearch && matchesFilter && matchesFamily;
    });
    // Sort: family first (groups Solvent Based / UV-LED together), then name alphabetically
    return filtered.sort((a, b) => {
      const fa = (a.substrateFamily || '').toLowerCase();
      const fb = (b.substrateFamily || '').toLowerCase();
      if (fa !== fb) return fa.localeCompare(fb);
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [materials, searchTerm, activeFilterCode, activeRmType, rmTypeOptions, familyFilter]);

  const getTypeColor = (typeLabel: string) => {
    switch (typeLabel) {
      case 'substrate': return 'bg-blue-100 text-blue-800';
      case 'ink': return 'bg-purple-100 text-purple-800';
      case 'adhesive': return 'bg-green-100 text-green-800';
      case 'packaging': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFamilyColor = (family: string | null | undefined) => {
    const MAP: Record<string, string> = {
      BOPP: 'bg-sky-50 text-sky-700 border-sky-200',
      PET: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      PE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      CPP: 'bg-amber-50 text-amber-700 border-amber-200',
      PA: 'bg-rose-50 text-rose-700 border-rose-200',
      ALU: 'bg-gray-100 text-gray-700 border-gray-300',
      PAPER: 'bg-orange-50 text-orange-700 border-orange-200',
      SLEEVE: 'bg-violet-50 text-violet-700 border-violet-200',
      SPECIALTY: 'bg-pink-50 text-pink-700 border-pink-200',
      Packaging: 'bg-teal-50 text-teal-700 border-teal-200',
      'Solvent Based': 'bg-purple-50 text-purple-700 border-purple-200',
      'UV-LED': 'bg-violet-50 text-violet-700 border-violet-200',
      'Solvent Base': 'bg-green-50 text-green-700 border-green-200',
      'Solvent Less': 'bg-lime-50 text-lime-700 border-lime-200',
      'Mono Component': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return MAP[family ?? ''] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <SkeletonTableRows rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200">
        <p className="text-red-800 font-medium">Error loading raw materials</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={fetchMaterials}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Raw Materials</h1>
            <p className="text-mist mt-2 text-sm">
              Edit prices in the table, then <strong>Save prices</strong> on that row.
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center justify-center space-x-2 shrink-0 w-full sm:w-auto">
            <Plus className="w-5 h-5" />
            <span>Add Material</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-border bg-slate/40">
          <span className="text-xs font-medium text-mist uppercase tracking-wide shrink-0">Market data</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleRefreshMarketPrices} disabled={refreshingMarket}
              className="btn-secondary inline-flex items-center space-x-2 text-sm py-2">
              <RefreshCw className={`w-4 h-4 ${refreshingMarket ? 'animate-spin' : ''}`} />
              <span>{refreshingMarket ? 'Fetching…' : 'Refresh market prices'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
          <div className="flex-1 relative mb-4 lg:mb-0">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-mist" />
            <input type="text" placeholder="Search by name, family, or description..." className="input w-full pl-12"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {/* All */}
            <button onClick={() => setActiveFilterCode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilterCode === 'all' ? 'bg-gold text-white' : 'bg-slate text-ink hover:bg-border'}`}>
              All
            </button>
            {/* Dynamic rm_type tabs */}
            {rmTypeOptions.map((rt) => (
              <button key={rt.code} onClick={() => setActiveFilterCode(rt.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeFilterCode === rt.code
                    ? rt.code === 'substrate' ? 'bg-blue-100 text-blue-800'
                      : rt.code === 'ink' ? 'bg-purple-100 text-purple-800'
                      : rt.code === 'adhesive' ? 'bg-green-100 text-green-800'
                      : rt.code === 'packaging' ? 'bg-teal-100 text-teal-800'
                      : 'bg-gold/15 text-gold'
                    : 'bg-slate text-ink hover:bg-border'
                }`}>
                {rt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Family sub-filter — substrate only */}
        {(activeFilterCode === 'all' || activeFilterCode === 'substrate') && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-xs text-mist self-center mr-1">Family:</span>
            <button onClick={() => setFamilyFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium border ${familyFilter === 'all' ? 'bg-gold text-white border-gold' : 'bg-white text-ink border-border hover:bg-slate'}`}>
              All
            </button>
            {substrateFamilies.filter((fam) => fam !== 'Packaging').map((fam) => (
              <button key={fam} onClick={() => setFamilyFilter(fam)}
                className={`px-3 py-1 rounded-md text-xs font-medium border ${familyFilter === fam ? getFamilyColor(fam) + ' ring-2 ring-offset-1 ring-blue-300' : 'bg-white text-ink border-border hover:bg-slate'}`}>
                {fam}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((material) => (
            <div key={material.id} className="card !p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{material.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${getTypeColor(displayMaterialType(material, rmTypeOptions))}`}>
                      {displayMaterialType(material, rmTypeOptions)}
                    </span>
                    {material.substrateFamily && (
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${getFamilyColor(material.substrateFamily)}`}>
                        {material.substrateFamily}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-xs text-mist block mb-1">User $/kg</label>
                  <input type="number" step="0.01" min="0"
                    className="input !min-h-0 h-8 w-full font-mono text-sm py-0.5 px-2"
                    value={draftFor(material).costPerKgUsd} disabled={savingPriceId === material.id}
                    onChange={(e) => setPriceDraft(material.id, { costPerKgUsd: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material); if (e.key === 'Escape') resetPriceDraft(material.id); }} />
                </div>
                <div>
                  <label className="text-xs text-mist block mb-1">Market $/kg</label>
                  <input type="number" step="0.01" min="0"
                    className="input !min-h-0 h-8 w-full font-mono text-sm py-0.5 px-2"
                    value={draftFor(material).marketPriceUsd} disabled={savingPriceId === material.id}
                    onChange={(e) => setPriceDraft(material.id, { marketPriceUsd: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material); if (e.key === 'Escape') resetPriceDraft(material.id); }} />
                </div>
              </div>
              {renderPriceSaveActions(material, true)}
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-mist">
                <div>ρ {material.density.toFixed(2)} g/cm³</div>
                <div>Solid {material.solidPercent}%</div>
                {material.hoover && <div className="col-span-2">📝 {material.hoover}</div>}
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => { setEditingMaterial(material); setEditingRmType(null); setShowModal(true); }}
                  className="flex-1 min-h-[36px] rounded-lg bg-slate text-sm font-medium text-navy">Edit</button>
                <button type="button" onClick={() => handleDelete(material.id)} disabled={deleting === material.id}
                  className="min-h-[36px] px-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium">Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Search className="w-12 h-12 text-mist mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-navy mb-2">No materials found</h3>
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center space-x-2 mt-4">
              <Plus className="w-5 h-5" /><span>Add Material</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="card hidden md:block">
        {filteredMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Family</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Grade / Name</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Density</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Solid %</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Hoover</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">User Price<br/><span className="font-normal text-[10px]">liquid $/kg</span></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Cost at 100%<br/><span className="font-normal text-[10px]">dry equiv $/kg</span></th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Market Price</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((material) => (
                  <tr key={material.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                    <td className="py-1.5 px-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${getTypeColor(displayMaterialType(material, rmTypeOptions))}`}>
                        {displayMaterialType(material, rmTypeOptions)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      {material.substrateFamily ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md border ${getFamilyColor(material.substrateFamily)}`}>
                          {material.substrateFamily}
                        </span>
                      ) : <span className="text-xs text-mist">—</span>}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="font-medium text-sm leading-tight">{material.name}</div>
                      {material.platformMasterKey && !material.isTenantOnly && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          <span
                            className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate text-mist"
                            title={
                              material.platformSyncedAt
                                ? `Platform synced ${new Date(material.platformSyncedAt).toLocaleString()}`
                                : 'Linked to platform master catalog'
                            }
                          >
                            {material.platformMasterKey}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-sm">{material.density.toFixed(2)}</td>
                    <td className="py-1.5 px-3 font-mono text-sm">
                      {(material.type === 'ink' || material.type === 'adhesive') ? (
                        <input
                          type="number" min="1" max="100" step="1"
                          className="input !min-h-0 h-8 w-16 font-mono text-sm py-0.5 px-2"
                          value={draftFor(material).solidPercent ?? String(material.solidPercent)}
                          disabled={savingPriceId === material.id}
                          onChange={(e) => setPriceDraft(material.id, { solidPercent: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material); if (e.key === 'Escape') resetPriceDraft(material.id); }}
                          title="Solid content % — affects cost calculation for liquid inks"
                        />
                      ) : (
                        <span className="text-mist">{material.solidPercent}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-sm text-mist max-w-[200px] truncate" title={material.hoover || ''}>
                      {material.hoover || '—'}
                    </td>
                    <td className="py-1.5 px-3">
                      <input type="number" step="0.01" min="0"
                        className="input !min-h-0 h-8 w-24 font-mono text-sm py-0.5 px-2 font-semibold"
                        value={draftFor(material).costPerKgUsd} disabled={savingPriceId === material.id}
                        onChange={(e) => setPriceDraft(material.id, { costPerKgUsd: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material); if (e.key === 'Escape') resetPriceDraft(material.id); }} />
                    </td>
                    <td className="py-1.5 px-3">
                      {/* Cost at 100% solid = User Price / (Solid% / 100)
                          For ink/adhesive: this is the effective dry-equivalent cost the engine uses.
                          For substrate / 100% solid: equals User Price. */}
                      {(() => {
                        const solid = Math.max(1, Number(draftFor(material).solidPercent ?? material.solidPercent));
                        const liquid = Number(draftFor(material).costPerKgUsd);
                        if (!Number.isFinite(liquid) || liquid <= 0) return <span className="text-mist font-mono text-sm">—</span>;
                        const dryEquiv = liquid / (solid / 100);
                        return (
                          <span
                            className={`font-mono text-sm font-semibold ${solid < 100 ? 'text-amber-700' : 'text-mist'}`}
                            title={`${liquid.toFixed(2)} ÷ ${solid}% = ${dryEquiv.toFixed(2)} $/kg dry equiv`}
                          >
                            {dryEquiv.toFixed(2)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-1.5 px-3">
                      <input type="number" step="0.01" min="0"
                        className="input !min-h-0 h-8 w-24 font-mono text-sm py-0.5 px-2 text-mist"
                        value={draftFor(material).marketPriceUsd} disabled={savingPriceId === material.id}
                        onChange={(e) => setPriceDraft(material.id, { marketPriceUsd: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material); if (e.key === 'Escape') resetPriceDraft(material.id); }} />
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex flex-col gap-1">
                        {renderPriceSaveActions(material)}
                        <div className="flex space-x-2">
                          <button onClick={() => { setEditingMaterial(material); setEditingRmType(null); setShowModal(true); }}
                            className="text-sm text-gold font-medium hover:underline">Edit</button>
                          <button onClick={() => handleDelete(material.id)} disabled={deleting === material.id}
                            className="text-sm text-red-600 font-medium hover:underline disabled:opacity-50">
                            {deleting === material.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 hidden md:block">
            <Search className="w-12 h-12 text-mist mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-navy mb-2">No materials found</h3>
            <p className="text-mist mb-6">{searchTerm ? 'Try a different search term' : 'Add your first material to get started'}</p>
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center space-x-2">
              <Plus className="w-5 h-5" /><span>Add Material</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && editingMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl safe-area-pb">
            <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
              <h3 className="font-display font-semibold text-navy text-lg">
                {editingMaterial.id ? 'Edit Material' : 'Add Material'}
              </h3>
              <p className="text-sm text-mist mt-1">
                {editingFormKind === 'substrate'
                  ? 'Type a new family or grade — suggestions appear as you type.'
                  : editingFormKind === 'packaging'
                  ? 'Packaging items are saved to your tenant library.'
                  : editingFormKind === 'custom'
                  ? `Add a ${editingRmType?.label ?? 'custom'} material — set name and pricing.`
                  : 'Set name and pricing.'}
              </p>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
              {/* Material type selector — driven by rmTypeOptions */}
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Material type</label>
                <select
                  value={editingRmType?.code ?? formKindForCode(editingMaterial.type === 'substrate' && editingMaterial.substrateFamily === 'Packaging' ? 'packaging' : editingMaterial.type)}
                  onChange={(e) => handleRmTypeChange(e.target.value)}
                  className="input w-full"
                >
                  {rmTypeOptions.map((rt) => (
                    <option key={rt.code} value={rt.code}>{rt.label}</option>
                  ))}
                </select>
              </div>

              {/* Form body by kind */}
              {editingFormKind === 'substrate' ? (
                <div className="space-y-4 p-4 rounded-lg border border-border bg-slate/30">
                  <p className="text-xs font-medium text-navy uppercase tracking-wide">Substrate identity</p>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">
                      Family <span className="text-mist font-normal">(required — pick or type new)</span>
                    </label>
                    <input list="substrate-family-options"
                      value={editingMaterial.substrateFamily || ''}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, substrateFamily: e.target.value.trim().toUpperCase() || null })}
                      className="input w-full" placeholder="e.g. BOPP, PET, EVOH" autoComplete="off" />
                    <datalist id="substrate-family-options">
                      {substrateFamilies.map((fam) => <option key={fam} value={fam} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">
                      Grade <span className="text-mist font-normal">(required — pick or type new)</span>
                    </label>
                    <input list="substrate-grade-options"
                      value={editingMaterial.substrateGrade || ''}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, substrateGrade: e.target.value.trim() || null, name: e.target.value.trim() || editingMaterial.name })}
                      className="input w-full" placeholder="e.g. BOPP Transparent, LDPE Natural" autoComplete="off" />
                    <datalist id="substrate-grade-options">
                      {substrateGrades.map((grade) => <option key={grade} value={grade} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Hoover (description)</label>
                    <input value={editingMaterial.hoover || ''}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, hoover: e.target.value || null })}
                      className="input w-full" placeholder="Optional — e.g. Heat Resistant" />
                  </div>
                </div>
              ) : editingFormKind === 'packaging' ? (
                <div className="space-y-4 p-4 rounded-lg border border-border bg-slate/30">
                  <p className="text-xs font-medium text-navy uppercase tracking-wide">Packaging item</p>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Item name <span className="text-mist font-normal">(required)</span></label>
                    <input list="packaging-item-options"
                      value={editingMaterial.substrateGrade || editingMaterial.name || ''}
                      onChange={(e) => { const val = e.target.value.trim(); setEditingMaterial({ ...editingMaterial, substrateGrade: val || null, name: val, hoover: val || null }); }}
                      className="input w-full" placeholder="e.g. Pallet, Wrapping Film, Paper Sheet" autoComplete="off" />
                    <datalist id="packaging-item-options">
                      {packagingItems.map((item) => <option key={item} value={item} />)}
                    </datalist>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Name</label>
                  <input value={editingMaterial.name}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                    className="input w-full"
                    placeholder={editingFormKind === 'custom' ? `e.g. Flexo Plate, Gravure Plate` : 'e.g. Ink SB, Adhesive SB'} />
                </div>
              )}

              <div className="space-y-4">
                <p className="text-xs font-medium text-navy uppercase tracking-wide">Properties &amp; prices</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-navy mb-1">Density</label>
                    <input type="number" step="0.01"
                      value={editingMaterial.density}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, density: Number(e.target.value) })}
                      className="input w-full !min-h-0 h-10 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-navy mb-1">Solid %</label>
                    <input type="number"
                      value={editingMaterial.solidPercent}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, solidPercent: Number(e.target.value) })}
                      className="input w-full !min-h-0 h-10 text-sm" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm text-navy mb-1">User $/kg</label>
                    <input type="number" step="0.01" min="0"
                      value={priceInputValue(editingMaterial.costPerKgUsd)}
                      onChange={(e) => { const val = roundUsd(Number(e.target.value)); setEditingMaterial({ ...editingMaterial, costPerKgUsd: val, marketPriceUsd: editingMaterial.marketPriceUsd == null && !editingMaterial.id ? val : editingMaterial.marketPriceUsd }); }}
                      className="input w-full !min-h-0 h-10 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-navy mb-1">Market $/kg</label>
                  <input type="number" step="0.01" min="0"
                    value={priceInputValue(editingMaterial.marketPriceUsd ?? editingMaterial.costPerKgUsd)}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, marketPriceUsd: roundUsd(Number(e.target.value)) })}
                    className="input w-full !min-h-0 h-10 text-sm" placeholder="Defaults to User Price" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-white shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 rounded-b-xl">
              <button type="button" onClick={closeModal} className="btn-secondary w-full sm:w-auto">Cancel</button>
              <button type="button" onClick={handleSaveMaterial} className="btn-primary w-full sm:w-auto">
                {editingMaterial.id ? 'Save changes' : 'Add material'}
              </button>
            </div>
          </div>
        </div>
      )}

      <details className="mt-6 text-sm text-mist group">
        <summary className="cursor-pointer text-navy font-medium list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▸</span> Library help
        </summary>
        <p className="mt-2 pl-4 border-l-2 border-border">
          Platform master materials sync from <strong>Master Data</strong> automatically.{' '}
          <strong>Add Material</strong> creates tenant-only rows (your custom grades).{' '}
          Filter tabs reflect the RM Types list defined in <strong>Master Data → RM Types</strong>.
        </p>
      </details>
    </div>
  );
};

export default Library;
