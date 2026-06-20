import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '../lib/api';
import { roundUsd } from '../lib/currency';
import { SkeletonTableRows } from '../components/Skeleton';
import { deriveSubstrateFamilies, deriveSubstrateGrades } from '../lib/materialTaxonomy';

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
}

type PriceDraft = { costPerKgUsd: string; marketPriceUsd: string };

const PACKAGING_FAMILY = 'Packaging';
type MaterialFormKind = 'substrate' | 'ink' | 'adhesive' | 'packaging';

function isPackagingMaterial(m: Pick<Material, 'type' | 'substrateFamily'>): boolean {
  return m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY;
}

function formKindFromMaterial(m: Material): MaterialFormKind {
  if (isPackagingMaterial(m)) return 'packaging';
  return m.type;
}

function displayMaterialType(m: Material): string {
  return isPackagingMaterial(m) ? 'packaging' : m.type;
}

function savedMarket(m: Material): number {
  return roundUsd(m.marketPriceUsd ?? m.costPerKgUsd);
}

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${roundUsd(value).toFixed(2)}`;
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
    ...(m as Material),
    type: (m.type || m.materialType) as Material['type'],
    density: Number(m.density),
    costPerKgUsd: Number.isFinite(cost) ? roundUsd(cost) : 0,
    marketPriceUsd: market != null && Number.isFinite(market) ? roundUsd(market) : null,
  };
}

const Library = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'substrate' | 'ink' | 'adhesive' | 'packaging'>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [refreshingExcel, setRefreshingExcel] = useState(false);
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});

  const draftFor = (material: Material): PriceDraft => {
    if (priceDrafts[material.id]) return priceDrafts[material.id];
    return {
      costPerKgUsd: priceInputValue(material.costPerKgUsd),
      marketPriceUsd: priceInputValue(savedMarket(material)),
    };
  };

  const isPriceDirty = (material: Material): boolean => {
    const draft = draftFor(material);
    const user = roundUsd(Number(draft.costPerKgUsd));
    const market = roundUsd(Number(draft.marketPriceUsd));
    if (!Number.isFinite(user) || !Number.isFinite(market)) return true;
    return (
      user !== roundUsd(material.costPerKgUsd) ||
      market !== savedMarket(material)
    );
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
        .filter((m) => isPackagingMaterial(m))
        .map((m) => m.substrateGrade || m.name)
        .filter(Boolean),
    [materials]
  );
  const editingFormKind = editingMaterial ? formKindFromMaterial(editingMaterial) : 'substrate';

  const openCreateModal = () => {
    setEditingMaterial({
      id: '',
      name: '',
      type: 'substrate',
      solidPercent: 100,
      density: 0.91,
      wastePercent: 0,
      costPerKgUsd: 0,
      substrateFamily: '',
      substrateGrade: '',
      hoover: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
  };

  const handleRefreshFromExcel = async () => {
    const proceed = confirm(
      'Reload all Master Data.xlsx sheets?\n\n' +
        'Substrate, Ink & Coating, Adhesive, Packaging, plus product types and units.\n\n' +
        'Rows removed from Excel will be deleted from your library.\n' +
        'Save the Excel file before continuing.'
    );
    if (!proceed) return;

    try {
      setRefreshingExcel(true);
      const result = await apiClient.refreshMaterialsFromExcel(true);
      await fetchMaterials();
      const orphanNote =
        result.orphans > 0
          ? `\n${result.orphans} orphan(s) removed (${result.pruned} deleted).`
          : '';
      alert(
        `Excel refresh complete.\n` +
          `${result.substrateCount} substrates, ${result.inkCount} inks, ` +
          `${result.adhesiveCount} adhesives, ${result.packagingCount} packaging.\n` +
          `${result.reference.productTypes} product types, ${result.reference.units} units.\n` +
          `${result.inserted} inserted, ${result.updated} updated.${orphanNote}`
      );
    } catch (err) {
      alert('Failed to refresh from Excel: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setRefreshingExcel(false);
    }
  };

  const handlePruneOrphans = async () => {
    if (
      !confirm(
        'Remove library rows that are NOT in Master Data.xlsx?\n\nGeneric costing inks/adhesives are never removed.'
      )
    ) {
      return;
    }
    try {
      setRefreshingExcel(true);
      const result = await apiClient.pruneOrphanSubstrates();
      await fetchMaterials();
      alert(`Pruned ${result.pruned} orphan substrate row(s).`);
    } catch (err) {
      alert('Failed to prune orphans: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setRefreshingExcel(false);
    }
  };

  const handleRefreshMarketPrices = async () => {
    if (
      !confirm(
        'Update Market Price from free polymer futures (Yahoo Finance)?\n\nUser Price is not changed. ALU has no free feed.'
      )
    ) {
      return;
    }
    try {
      setRefreshingMarket(true);
      const result = await apiClient.refreshMaterialPrices();
      await fetchMaterials();
      const sourceSummary = result.sources
        .map((s) => `${s.family}: ${s.symbol ?? 'fallback'} → $${s.filmUsdPerKg.toFixed(2)}/kg`)
        .join('\n');
      const errSummary = result.errors.length ? `\n\nNotes:\n${result.errors.join('\n')}` : '';
      alert(
        `Market refresh: ${result.updated} updated, ${result.skipped} unchanged (<2%).${errSummary}${sourceSummary ? `\n\nSources:\n${sourceSummary}` : ''}`
      );
    } catch (err) {
      alert('Failed to refresh market prices: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setRefreshingMarket(false);
    }
  };

  const handleSaveMaterial = async () => {
    if (!editingMaterial) return;

    const isPackaging = isPackagingMaterial(editingMaterial);
    const isSubstrate = editingMaterial.type === 'substrate' && !isPackaging;
    const family = editingMaterial.substrateFamily?.trim().toUpperCase() || null;
    const grade = editingMaterial.substrateGrade?.trim() || null;
    let name = editingMaterial.name.trim();

    if (isPackaging) {
      const item = grade || name;
      if (!item) {
        alert('Enter a packaging item name (e.g. Pallet, Wrapping Film).');
        return;
      }
      name = item;
    } else if (isSubstrate) {
      if (!family) {
        alert('Enter a substrate family (pick from list or type a new one, e.g. EVOH).');
        return;
      }
      if (!grade) {
        alert('Enter a substrate grade (type a new grade name).');
        return;
      }
      if (!name) name = grade;
    } else if (!name) {
      alert('Enter a material name.');
      return;
    }

    const payload = {
      name,
      type: editingMaterial.type,
      solidPercent: editingMaterial.solidPercent,
      density: editingMaterial.density,
      wastePercent: editingMaterial.wastePercent ?? 0,
      costPerKgUsd: roundUsd(editingMaterial.costPerKgUsd),
      marketPriceUsd: roundUsd(editingMaterial.marketPriceUsd ?? editingMaterial.costPerKgUsd),
      substrateFamily: isPackaging ? PACKAGING_FAMILY : isSubstrate ? family : editingMaterial.substrateFamily,
      substrateGrade: isPackaging ? name : isSubstrate ? grade : editingMaterial.substrateGrade,
      hoover: editingMaterial.hoover?.trim() || null,
    };

    try {
      if (editingMaterial.id) {
        const updated = await apiClient.updateMaterial(editingMaterial.id, payload) as Material;
        setMaterials((prev) => prev.map(m => m.id === updated.id ? parseMaterialRow(updated as unknown as Record<string, unknown>) : m));
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
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getMaterials();
      setMaterials((data || []).map((m: Record<string, unknown>) => parseMaterialRow(m)));
      setPriceDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInlinePriceSave = async (material: Material, patch: { costPerKgUsd: number; marketPriceUsd: number }) => {
    const costPerKgUsd = roundUsd(patch.costPerKgUsd);
    const marketPriceUsd = roundUsd(patch.marketPriceUsd);

    setSavingPriceId(material.id);
    try {
      const updated = await apiClient.updateMaterial(material.id, {
        costPerKgUsd,
        marketPriceUsd,
      }) as Material;
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === material.id ? parseMaterialRow(updated as unknown as Record<string, unknown>) : m
        )
      );
      resetPriceDraft(material.id);
    } catch (err) {
      alert('Failed to save price: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSavingPriceId(null);
    }
  };

  const savePriceDraft = (material: Material) => {
    const draft = draftFor(material);
    const costPerKgUsd = roundUsd(Number(draft.costPerKgUsd));
    const marketPriceUsd = roundUsd(Number(draft.marketPriceUsd));
    if (!Number.isFinite(costPerKgUsd) || costPerKgUsd < 0 || !Number.isFinite(marketPriceUsd) || marketPriceUsd < 0) {
      alert('Enter valid prices (0 or greater).');
      return;
    }
    void handleInlinePriceSave(material, { costPerKgUsd, marketPriceUsd });
  };

  const renderPriceSaveActions = (material: Material, compact = false) => {
    if (!isPriceDirty(material)) return null;
    const saving = savingPriceId === material.id;
    return (
      <div className={`flex gap-2 ${compact ? 'mt-2' : ''}`}>
        <button
          type="button"
          onClick={() => savePriceDraft(material)}
          disabled={saving}
          className={compact ? 'btn-primary flex-1 text-sm py-1.5' : 'text-sm text-white bg-gold px-3 py-1 rounded-md font-medium hover:opacity-90 disabled:opacity-50'}
        >
          {saving ? 'Saving…' : 'Save prices'}
        </button>
        <button
          type="button"
          onClick={() => resetPriceDraft(material.id)}
          disabled={saving}
          className={compact ? 'btn-secondary flex-1 text-sm py-1.5' : 'text-sm text-mist px-2 py-1 hover:underline disabled:opacity-50'}
        >
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
      setMaterials(materials.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete material: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.substrateFamily || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.hoover || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'packaging' && material.substrateFamily === 'Packaging') ||
      (activeFilter === 'substrate' &&
        material.type === 'substrate' &&
        material.substrateFamily !== 'Packaging') ||
      (activeFilter === 'ink' && material.type === 'ink') ||
      (activeFilter === 'adhesive' && material.type === 'adhesive');
    const matchesFamily = familyFilter === 'all' || material.substrateFamily === familyFilter;
    return matchesSearch && matchesFilter && matchesFamily;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'substrate': return 'bg-blue-100 text-blue-800';
      case 'ink': return 'bg-purple-100 text-purple-800';
      case 'adhesive': return 'bg-green-100 text-green-800';
      case 'packaging': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFamilyColor = (family: string | null | undefined) => {
    switch (family) {
      case 'BOPP': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'PET': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CPP': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PA': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ALU': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'PAPER': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'SLEEVE': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'SPECIALTY': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'Packaging': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Solvent Based': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'UV-LED': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'Solvent Base': return 'bg-green-50 text-green-700 border-green-200';
      case 'Solvent Less': return 'bg-lime-50 text-lime-700 border-lime-200';
      case 'Mono Component': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
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
        <button type="button" className="btn-primary mt-4" onClick={fetchMaterials}>
          Retry
        </button>
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
          <button
            onClick={openCreateModal}
            className="btn-primary inline-flex items-center justify-center space-x-2 shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Add Material</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-border bg-slate/40">
          <span className="text-xs font-medium text-mist uppercase tracking-wide shrink-0">Data sync</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefreshFromExcel}
              disabled={refreshingExcel || refreshingMarket}
              className="btn-secondary inline-flex items-center space-x-2 text-sm py-2"
              title="Reload from Master Data.xlsx"
            >
              <FileSpreadsheet className={`w-4 h-4 ${refreshingExcel ? 'animate-pulse' : ''}`} />
              <span>{refreshingExcel ? 'Loading Excel…' : 'Refresh from Excel'}</span>
            </button>
            <button
              onClick={handlePruneOrphans}
              disabled={refreshingExcel || refreshingMarket}
              className="btn-secondary text-sm py-2"
              title="Delete substrate rows not in Excel"
            >
              Prune orphans
            </button>
            <button
              onClick={handleRefreshMarketPrices}
              disabled={refreshingMarket || refreshingExcel}
              className="btn-secondary inline-flex items-center space-x-2 text-sm py-2"
              title="Update market prices from Yahoo Finance"
            >
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
            <input
              type="text"
              placeholder="Search by name, family, or description..."
              className="input w-full pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'all' ? 'bg-gold text-white' : 'bg-slate text-ink hover:bg-border'}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('substrate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'substrate' ? 'bg-blue-100 text-blue-800' : 'bg-slate text-ink hover:bg-border'}`}
            >
              Substrate
            </button>
            <button
              onClick={() => setActiveFilter('ink')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'ink' ? 'bg-purple-100 text-purple-800' : 'bg-slate text-ink hover:bg-border'}`}
            >
              Ink
            </button>
            <button
              onClick={() => setActiveFilter('adhesive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'adhesive' ? 'bg-green-100 text-green-800' : 'bg-slate text-ink hover:bg-border'}`}
            >
              Adhesive
            </button>
            <button
              onClick={() => setActiveFilter('packaging')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'packaging' ? 'bg-teal-100 text-teal-800' : 'bg-slate text-ink hover:bg-border'}`}
            >
              Packaging
            </button>
          </div>
        </div>
        {/* Family filter row — substrate families only */}
        {activeFilter === 'all' || activeFilter === 'substrate' ? (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-xs text-mist self-center mr-1">Family:</span>
            <button
              onClick={() => setFamilyFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium border ${familyFilter === 'all' ? 'bg-gold text-white border-gold' : 'bg-white text-ink border-border hover:bg-slate'}`}
            >
              All
            </button>
            {substrateFamilies.filter((fam) => fam !== 'Packaging').map(fam => (
              <button
                key={fam}
                onClick={() => setFamilyFilter(fam)}
                className={`px-3 py-1 rounded-md text-xs font-medium border ${familyFilter === fam ? getFamilyColor(fam) + ' ring-2 ring-offset-1 ring-blue-300' : 'bg-white text-ink border-border hover:bg-slate'}`}
              >
                {fam}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Materials — mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((material) => (
            <div key={material.id} className="card !p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{material.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${getTypeColor(displayMaterialType(material))}`}>
                      {displayMaterialType(material)}
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
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input !min-h-0 h-8 w-full font-mono text-sm py-0.5 px-2"
                    value={draftFor(material).costPerKgUsd}
                    disabled={savingPriceId === material.id}
                    onChange={(e) => setPriceDraft(material.id, { costPerKgUsd: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material);
                      if (e.key === 'Escape') resetPriceDraft(material.id);
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-mist block mb-1">Market $/kg</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input !min-h-0 h-8 w-full font-mono text-sm py-0.5 px-2"
                    value={draftFor(material).marketPriceUsd}
                    disabled={savingPriceId === material.id}
                    onChange={(e) => setPriceDraft(material.id, { marketPriceUsd: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material);
                      if (e.key === 'Escape') resetPriceDraft(material.id);
                    }}
                  />
                </div>
              </div>
              {renderPriceSaveActions(material, true)}
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-mist">
                <div>ρ {material.density.toFixed(2)} g/cm³</div>
                <div>Solid {material.solidPercent}%</div>
                {material.hoover && <div className="col-span-2">📝 {material.hoover}</div>}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => { setEditingMaterial(material); setShowModal(true); }}
                  className="flex-1 min-h-[36px] rounded-lg bg-slate text-sm font-medium text-navy"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(material.id)}
                  disabled={deleting === material.id}
                  className="min-h-[36px] px-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Search className="w-12 h-12 text-mist mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-navy mb-2">No materials found</h3>
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center space-x-2 mt-4">
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </button>
          </div>
        )}
      </div>

      {/* Materials table — desktop */}
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
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">User Price</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Market Price</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-mist">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((material) => (
                  <tr key={material.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                    <td className="py-1.5 px-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${getTypeColor(displayMaterialType(material))}`}>
                        {displayMaterialType(material)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      {material.substrateFamily ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md border ${getFamilyColor(material.substrateFamily)}`}>
                          {material.substrateFamily}
                        </span>
                      ) : (
                        <span className="text-xs text-mist">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="font-medium text-sm leading-tight">{material.name}</div>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-sm">{material.density.toFixed(2)}</td>
                    <td className="py-1.5 px-3 font-mono text-sm">{material.solidPercent}</td>
                    <td className="py-1.5 px-3 text-sm text-mist max-w-[200px] truncate" title={material.hoover || ''}>
                      {material.hoover || '—'}
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input !min-h-0 h-8 w-24 font-mono text-sm py-0.5 px-2 font-semibold"
                        value={draftFor(material).costPerKgUsd}
                        disabled={savingPriceId === material.id}
                        onChange={(e) => setPriceDraft(material.id, { costPerKgUsd: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material);
                          if (e.key === 'Escape') resetPriceDraft(material.id);
                        }}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input !min-h-0 h-8 w-24 font-mono text-sm py-0.5 px-2 text-mist"
                        value={draftFor(material).marketPriceUsd}
                        disabled={savingPriceId === material.id}
                        onChange={(e) => setPriceDraft(material.id, { marketPriceUsd: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && isPriceDirty(material)) savePriceDraft(material);
                          if (e.key === 'Escape') resetPriceDraft(material.id);
                        }}
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex flex-col gap-1">
                        {renderPriceSaveActions(material)}
                        <div className="flex space-x-2">
                        <button onClick={() => { setEditingMaterial(material); setShowModal(true); }} className="text-sm text-gold font-medium hover:underline">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          disabled={deleting === material.id}
                          className="text-sm text-red-600 font-medium hover:underline disabled:opacity-50"
                        >
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
            <p className="text-mist mb-6">
              {searchTerm ? 'Try a different search term' : 'Add your first material to get started'}
            </p>
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
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
                    ? 'Packaging items are saved to your library (not written back to Excel).'
                    : 'Set name and pricing for ink or adhesive.'}
              </p>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Material type</label>
                <select
                  value={editingFormKind}
                  onChange={(e) => {
                    const kind = e.target.value as MaterialFormKind;
                    if (kind === 'packaging') {
                      setEditingMaterial({
                        ...editingMaterial,
                        type: 'substrate',
                        substrateFamily: PACKAGING_FAMILY,
                        substrateGrade: '',
                        name: '',
                        solidPercent: 100,
                        density: 1,
                      });
                    } else if (kind === 'substrate') {
                      setEditingMaterial({
                        ...editingMaterial,
                        type: 'substrate',
                        substrateFamily:
                          editingMaterial.substrateFamily === PACKAGING_FAMILY
                            ? ''
                            : editingMaterial.substrateFamily,
                        substrateGrade:
                          editingMaterial.substrateFamily === PACKAGING_FAMILY
                            ? ''
                            : editingMaterial.substrateGrade,
                      });
                    } else {
                      setEditingMaterial({
                        ...editingMaterial,
                        type: kind,
                        substrateFamily: null,
                        substrateGrade: null,
                      });
                    }
                  }}
                  className="input w-full"
                >
                  <option value="substrate">Substrate</option>
                  <option value="ink">Ink</option>
                  <option value="adhesive">Adhesive</option>
                  <option value="packaging">Packaging</option>
                </select>
              </div>

              {editingFormKind === 'substrate' ? (
                <div className="space-y-4 p-4 rounded-lg border border-border bg-slate/30">
                  <p className="text-xs font-medium text-navy uppercase tracking-wide">Substrate identity</p>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">
                      Family <span className="text-mist font-normal">(required — pick or type new)</span>
                    </label>
                    <input
                      list="substrate-family-options"
                      value={editingMaterial.substrateFamily || ''}
                      onChange={(e) =>
                        setEditingMaterial({
                          ...editingMaterial,
                          substrateFamily: e.target.value.trim().toUpperCase() || null,
                        })
                      }
                      className="input w-full"
                      placeholder="e.g. BOPP, PET, EVOH"
                      autoComplete="off"
                    />
                    <datalist id="substrate-family-options">
                      {substrateFamilies.map((fam) => (
                        <option key={fam} value={fam} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">
                      Grade <span className="text-mist font-normal">(required — pick or type new)</span>
                    </label>
                    <input
                      list="substrate-grade-options"
                      value={editingMaterial.substrateGrade || ''}
                      onChange={(e) =>
                        setEditingMaterial({
                          ...editingMaterial,
                          substrateGrade: e.target.value.trim() || null,
                          name: e.target.value.trim() || editingMaterial.name,
                        })
                      }
                      className="input w-full"
                      placeholder="e.g. BOPP Transparent, LDPE Natural"
                      autoComplete="off"
                    />
                    <datalist id="substrate-grade-options">
                      {substrateGrades.map((grade) => (
                        <option key={grade} value={grade} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Hoover (description)</label>
                    <input
                      value={editingMaterial.hoover || ''}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, hoover: e.target.value || null })}
                      className="input w-full"
                      placeholder="Optional — e.g. Heat Resistant"
                    />
                  </div>
                  <p className="text-xs text-mist">
                    Library name:{' '}
                    <span className="font-medium text-navy">
                      {editingMaterial.substrateGrade?.trim() || editingMaterial.name || '—'}
                    </span>
                  </p>
                </div>
              ) : editingFormKind === 'packaging' ? (
                <div className="space-y-4 p-4 rounded-lg border border-border bg-slate/30">
                  <p className="text-xs font-medium text-navy uppercase tracking-wide">Packaging item</p>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">
                      Item name <span className="text-mist font-normal">(required)</span>
                    </label>
                    <input
                      list="packaging-item-options"
                      value={editingMaterial.substrateGrade || editingMaterial.name || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setEditingMaterial({
                          ...editingMaterial,
                          substrateGrade: val || null,
                          name: val,
                          hoover: val || null,
                        });
                      }}
                      className="input w-full"
                      placeholder="e.g. Pallet, Wrapping Film, Paper Sheet"
                      autoComplete="off"
                    />
                    <datalist id="packaging-item-options">
                      {packagingItems.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Name</label>
                  <input
                    value={editingMaterial.name}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                    className="input w-full"
                    placeholder="e.g. Ink SB, Adhesive SB"
                  />
                </div>
              )}

              <div className="space-y-4">
                <p className="text-xs font-medium text-navy uppercase tracking-wide">Properties &amp; prices</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-navy mb-1">Density</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingMaterial.density}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, density: Number(e.target.value) })}
                      className="input w-full !min-h-0 h-10 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-navy mb-1">Solid %</label>
                    <input
                      type="number"
                      value={editingMaterial.solidPercent}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, solidPercent: Number(e.target.value) })}
                      className="input w-full !min-h-0 h-10 text-sm"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm text-navy mb-1">User $/kg</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceInputValue(editingMaterial.costPerKgUsd)}
                      onChange={(e) => {
                        const val = roundUsd(Number(e.target.value));
                        setEditingMaterial({
                          ...editingMaterial,
                          costPerKgUsd: val,
                          marketPriceUsd:
                            editingMaterial.marketPriceUsd == null && !editingMaterial.id
                              ? val
                              : editingMaterial.marketPriceUsd,
                        });
                      }}
                      className="input w-full !min-h-0 h-10 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-navy mb-1">Market $/kg</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceInputValue(editingMaterial.marketPriceUsd ?? editingMaterial.costPerKgUsd)}
                    onChange={(e) =>
                      setEditingMaterial({ ...editingMaterial, marketPriceUsd: roundUsd(Number(e.target.value)) })
                    }
                    className="input w-full !min-h-0 h-10 text-sm"
                    placeholder="Defaults to User Price"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-white shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 rounded-b-xl">
              <button type="button" onClick={closeModal} className="btn-secondary w-full sm:w-auto">
                Cancel
              </button>
              <button type="button" onClick={handleSaveMaterial} className="btn-primary w-full sm:w-auto">
                {editingMaterial.id ? 'Save changes' : 'Add material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library info */}
      <details className="mt-6 text-sm text-mist group">
        <summary className="cursor-pointer text-navy font-medium list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▸</span> Excel &amp; market sync help
        </summary>
        <p className="mt-2 pl-4 border-l-2 border-border">
          Save <code className="text-xs bg-slate px-1 rounded">Master Data.xlsx</code> at project root (or set{' '}
          <code className="text-xs bg-slate px-1 rounded">MASTER_DATA_EXCEL_PATH</code>), then use{' '}
          <strong>Refresh from Excel</strong> reloads all sheets (substrates, inks, adhesives, packaging, units, product types).{' '}
          <strong>Prune orphans</strong> removes Excel-managed rows no longer in the file.{' '}
          <strong>Add Material</strong> saves custom rows to your tenant library only (not written back to Excel).{' '}
          <strong>Refresh market prices</strong> updates Market $ only (Yahoo futures).
        </p>
      </details>
    </div>
  );
};

export default Library;