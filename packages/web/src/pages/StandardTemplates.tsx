import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, Trash2, Plus, Loader2, ArrowLeft, X } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { SkeletonCard } from '../components/Skeleton';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { derivePrintingWebClass, filterMaterialsForTemplateLayer, materialAllowedForTemplateLayer } from '@es/engine';
import type { LayerType, ProductTypeCode } from '@es/engine';
import {
  TEMPLATE_CATALOG_FILTERS,
  deriveTemplateCatalogKey,
  matchesCatalogFilter,
  type TemplateCatalogFilter,
} from '../lib/templateCatalog';

interface TemplateLayer {
  layer_order: number;
  layer_type: 'substrate' | 'ink' | 'adhesive';
  ref_material_key?: string;
  materialId?: string | null;
  default_micron: number;
}

interface StructureTemplate {
  id: string;
  name: string;
  pebiParentPg?: string;
  productType: 'roll' | 'sleeve' | 'pouch';
  materialClass?: string;
  structureType?: string;
  displayOrder?: number;
  defaultDimensions?: Record<string, number>;
  defaultLayers?: TemplateLayer[];
  defaultProcesses?: { process_key: string; enabled: boolean }[];
  defaultPrintingWebClass?: 'wide_web' | 'narrow_web';
  isStandard?: boolean;
}

interface MaterialOption {
  id: string;
  name: string;
  type: string;
  substrateFamily?: string | null;
  isSolventBased?: boolean;
}

const MONO_CATALOG_FILTERS = TEMPLATE_CATALOG_FILTERS.filter((f) =>
  ['all', 'pe_plain', 'pe_printed', 'non_pe_plain', 'non_pe_printed', 'labels', 'sleeves', 'other'].includes(f.id)
);
const LAMINATE_CATALOG_FILTERS = TEMPLATE_CATALOG_FILTERS.filter((f) =>
  ['duplex', 'triplex', 'quadriplex'].includes(f.id)
);

const MATERIAL_CLASS_OPTIONS = ['PE', 'Non PE'] as const;
const STRUCTURE_TYPE_OPTIONS = ['Mono', 'Multilayer'] as const;

const PROCESS_KEYS = [
  'extrusion',
  'printing',
  'lamination',
  'slitting',
  'pouch_making',
  'seaming',
] as const;

function materialLookupForPrintingWeb(materials: MaterialOption[]) {
  return materials.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type as 'substrate' | 'ink' | 'adhesive',
    solidPercent: 100,
    density: 0.91,
    costPerKgUsd: 0,
    wastePercent: 0,
    isSolventBased: m.isSolventBased ?? false,
  }));
}

function productTypeLabel(
  productType: StructureTemplate['productType'],
  options: Array<{ label: string; value: string }>
): string {
  return options.find((o) => o.value === productType)?.label ?? productType;
}

function classificationContext(template: StructureTemplate) {
  return {
    materialClass: template.materialClass,
    structureType: template.structureType,
    productType: template.productType as ProductTypeCode,
  };
}

function pruneInvalidLayerMaterials(
  layers: TemplateLayer[],
  materials: MaterialOption[],
  template: StructureTemplate
): TemplateLayer[] {
  const ctx = classificationContext(template);
  return layers.map((layer) => {
    if (!layer.materialId) return layer;
    const mat = materials.find((m) => m.id === layer.materialId);
    if (!mat || !materialAllowedForTemplateLayer(mat, layer.layer_type, ctx)) {
      return { ...layer, materialId: null };
    }
    return layer;
  });
}

function classificationLabel(template: StructureTemplate): string {
  const parts = [template.materialClass, template.structureType].filter(Boolean);
  return parts.join(' · ');
}

function cardMetaLine(
  template: StructureTemplate,
  productTypeOptions: Array<{ label: string; value: string }>
): string {
  const pt = productTypeLabel(template.productType, productTypeOptions);
  const tier = deriveTemplateCatalogKey(template);
  const tierLabel = TEMPLATE_CATALOG_FILTERS.find((f) => f.id === tier)?.label;
  if (tier === 'duplex' || tier === 'triplex' || tier === 'quadriplex') {
    return `${pt} · ${tierLabel}`;
  }
  if (tier === 'labels' || tier === 'sleeves') {
    return `${pt} · ${tierLabel}`;
  }
  const classLabel = classificationLabel(template);
  return classLabel ? `${pt} · ${classLabel}` : pt;
}

function visualizerLayers(template: StructureTemplate, materials: MaterialOption[]) {
  return (template.defaultLayers || []).map((l, i) => {
    const mat = materials.find((m) => m.id === l.materialId);
    return {
      id: String(i),
      type: l.layer_type || 'substrate',
      material: mat?.name || l.ref_material_key || 'Layer',
      micron: l.default_micron || 10,
    };
  });
}

const StandardTemplates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reference: masterRef } = useMasterDataReference();
  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'platform_admin';

  const [catalogFilter, setCatalogFilter] = useState<TemplateCatalogFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [standardTemplates, setStandardTemplates] = useState<StructureTemplate[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const [editing, setEditing] = useState<StructureTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [standard, mats] = await Promise.all([
        apiClient.getTemplates(true),
        apiClient.getMaterials(),
      ]);
      setStandardTemplates(standard || []);
      setMaterials(
        (mats || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          type: m.type || m.materialType,
          substrateFamily: m.substrateFamily ?? null,
          isSolventBased: m.isSolventBased,
        }))
      );
    } catch (err) {
      console.error(err);
      setLoadError('Could not load templates. Check that the API server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const applyTemplatePatch = (patch: Partial<StructureTemplate>) => {
    if (!editing) return;
    const next = { ...editing, ...patch };
    setEditing({
      ...next,
      defaultLayers: pruneInvalidLayerMaterials(next.defaultLayers || [], materials, next),
    });
  };

  const layerMaterialOptions = (layerType: LayerType) => {
    if (!editing) return [];
    return filterMaterialsForTemplateLayer(materials, layerType, classificationContext(editing));
  };

  const uniqueStandard = useMemo(() => {
    const seen = new Set<string>();
    return standardTemplates.filter((t) => {
      const key = t.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [standardTemplates]);

  const filteredStandard = uniqueStandard.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      (t.pebiParentPg || '').toLowerCase().includes(q);
    return matchesSearch && matchesCatalogFilter(t, catalogFilter);
  });

  const renderTemplateCard = (template: StructureTemplate, opts: { allowEdit: boolean }) => (
    <div
      key={template.id}
      className="relative rounded-lg border border-border bg-white hover:border-gold/40 hover:shadow-sm transition-all"
      onDoubleClick={() => {
        if (opts.allowEdit) openEdit(template);
      }}
    >
      {opts.allowEdit && (
        <div className="absolute top-1 right-1 z-10 flex gap-0.5">
          <button
            type="button"
            className="p-1 rounded-md text-mist hover:text-navy hover:bg-slate/80"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(template);
            }}
            aria-label="Edit template"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1 rounded-md text-mist hover:text-red-600 hover:bg-red-50"
            disabled={deleting === template.id}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(template);
            }}
            aria-label="Delete template"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <button
        type="button"
        className="w-full p-2.5 pr-8 text-left"
        disabled={instantiating === template.id}
        onClick={() => handleUseTemplate(template)}
      >
        <div className="flex items-center gap-2">
          <LaminateVisualizer
            layers={visualizerLayers(template, materials)}
            width={28}
            height={36}
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-navy leading-snug line-clamp-2 pr-1">
              {template.name}
            </h4>
            <p className="text-[10px] text-mist mt-0.5 truncate">
              {cardMetaLine(template, masterRef.productTypeOptions)}
            </p>
            {instantiating === template.id && (
              <p className="text-[10px] text-gold mt-0.5 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Creating…
              </p>
            )}
          </div>
        </div>
      </button>
    </div>
  );

  const handleUseTemplate = async (template: StructureTemplate) => {
    setInstantiating(template.id);
    try {
      const created = await apiClient.instantiateTemplate(template.id, {
        jobName: template.name,
      });
      navigate(`/estimate/${created.id}`, { state: { returnTo: '/templates' } });
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        alert(
          'This template has unresolved materials. Relink layers in Standard Templates (admin).'
        );
      } else {
        alert(e.message || 'Failed to create estimate from template');
      }
    } finally {
      setInstantiating(null);
    }
  };

  const handleDelete = async (template: StructureTemplate) => {
    const label = template.isStandard ? 'deactivate' : 'delete';
    if (!confirm(`${template.isStandard ? 'Deactivate' : 'Delete'} template "${template.name}"?`)) return;
    setDeleting(template.id);
    try {
      await apiClient.deleteTemplate(template.id);
      await loadData();
    } catch (err) {
      alert(`Failed to ${label} template`);
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (template: StructureTemplate) => {
    if (template.isStandard && !isAdmin) return;
    setEditing({
      ...template,
      defaultLayers: (template.defaultLayers || []).map((l) => ({ ...l })),
      defaultProcesses: (template.defaultProcesses || []).map((p) => ({ ...p })),
      defaultDimensions: { ...(template.defaultDimensions || {}) },
    });
  };

  const updateEditingLayer = (index: number, patch: Partial<TemplateLayer>) => {
    if (!editing) return;
    const layers = [...(editing.defaultLayers || [])];
    layers[index] = { ...layers[index], ...patch };
    setEditing({ ...editing, defaultLayers: layers });
  };

  const addLayer = () => {
    if (!editing) return;
    const layers = editing.defaultLayers || [];
    const ctx = classificationContext(editing);
    const defaultMat =
      filterMaterialsForTemplateLayer(materials, 'substrate', ctx)[0] || null;
    setEditing({
      ...editing,
      defaultLayers: [
        ...layers,
        {
          layer_order: layers.length + 1,
          layer_type: 'substrate',
          materialId: defaultMat?.id || null,
          default_micron: 20,
        },
      ],
    });
  };

  const removeLayer = (index: number) => {
    if (!editing) return;
    const layers = (editing.defaultLayers || [])
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, layer_order: i + 1 }));
    setEditing({ ...editing, defaultLayers: layers });
  };

  const toggleProcess = (key: string) => {
    if (!editing) return;
    const procs = [...(editing.defaultProcesses || [])];
    const idx = procs.findIndex((p) => p.process_key === key);
    if (idx >= 0) {
      procs[idx] = { ...procs[idx], enabled: !procs[idx].enabled };
    } else {
      procs.push({ process_key: key, enabled: true });
    }
    setEditing({ ...editing, defaultProcesses: procs });
  };

  const isProcessEnabled = (key: string) =>
    (editing?.defaultProcesses || []).find((p) => p.process_key === key)?.enabled ?? false;

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const layerRefs = (editing.defaultLayers || [])
        .filter((l) => l.materialId)
        .map((l) => ({ materialId: l.materialId! }));
      const derivedPrintingWeb = derivePrintingWebClass(
        layerRefs,
        materialLookupForPrintingWeb(materials)
      );

      await apiClient.updateTemplate(editing.id, {
        name: editing.name,
        productType: editing.productType,
        materialClass: editing.materialClass,
        structureType: editing.structureType,
        displayOrder: editing.displayOrder,
        defaultDimensions: editing.defaultDimensions,
        defaultLayers: editing.defaultLayers,
        defaultProcesses: editing.defaultProcesses,
        defaultPrintingWebClass: derivedPrintingWeb,
      });
      setEditing(null);
      await loadData();
    } catch (err) {
      alert('Failed to save template: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-28 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Standard Templates</h1>
          <p className="text-mist mt-1 text-sm">
            {isAdmin
              ? 'Platform standard stacks — pick a card to start a quote'
              : 'Pick a standard stack to start your quote'}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => navigate('/estimate/choose')}
        >
          <Plus className="w-4 h-4" />
          New estimate
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mist" />
          <input
            type="text"
            placeholder="Search templates..."
            className="input w-full pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-5 space-y-3">
        <div>
          <p className="text-xs font-medium text-mist uppercase tracking-wide mb-1.5">Mono & specialty</p>
          <div className="flex flex-wrap gap-1.5">
            {MONO_CATALOG_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCatalogFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  catalogFilter === f.id
                    ? 'bg-gold text-white shadow-sm'
                    : 'bg-white border border-border text-ink hover:border-gold/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-mist uppercase tracking-wide mb-1.5">Laminates</p>
          <div className="flex flex-wrap gap-1.5">
            {LAMINATE_CATALOG_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCatalogFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  catalogFilter === f.id
                    ? 'bg-gold text-white shadow-sm'
                    : 'bg-white border border-border text-ink hover:border-gold/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError ? (
        <div className="card text-center py-12">
          <p className="text-danger mb-4">{loadError}</p>
          <button type="button" className="btn-primary" onClick={loadData}>
            Retry
          </button>
        </div>
      ) : filteredStandard.length === 0 ? (
        <div className="card text-center py-10">
          <h3 className="text-lg font-display font-semibold text-navy mb-2">No templates in this category</h3>
          <p className="text-mist text-sm">Try another filter or clear the search.</p>
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}
        >
          {filteredStandard.map((template) =>
            renderTemplateCard(template, { allowEdit: isAdmin })
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setEditing(null)}
          />
          <div className="relative bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-medium text-mist hover:text-navy"
                onClick={() => setEditing(null)}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to templates
              </button>
              <button
                type="button"
                className="p-2 rounded-lg text-mist hover:text-navy hover:bg-slate"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-display font-bold text-navy mb-4">Edit template</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Name</label>
                <input
                  className="input w-full"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Product type</label>
                  <select
                    className="input w-full"
                    value={editing.productType}
                    onChange={(e) =>
                      applyTemplatePatch({
                        productType: e.target.value as StructureTemplate['productType'],
                      })
                    }
                  >
                    {masterRef.productTypeOptions.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Material class</label>
                  <select
                    className="input w-full"
                    value={editing.materialClass || ''}
                    onChange={(e) =>
                      applyTemplatePatch({
                        materialClass: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">—</option>
                    {MATERIAL_CLASS_OPTIONS.map((mc) => (
                      <option key={mc} value={mc}>
                        {mc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Structure</label>
                  <select
                    className="input w-full"
                    value={editing.structureType || ''}
                    onChange={(e) =>
                      applyTemplatePatch({
                        structureType: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">—</option>
                    {STRUCTURE_TYPE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-navy">Layers</label>
                  <button type="button" className="text-sm text-gold font-medium" onClick={addLayer}>
                    + Add layer
                  </button>
                </div>
                <div className="space-y-2">
                  {(editing.defaultLayers || []).map((layer, i) => (
                    <div key={i} className="flex gap-2 items-center flex-wrap">
                      <select
                        className="input w-36 text-sm"
                        value={layer.layer_type}
                        onChange={(e) => {
                          const layerType = e.target.value as TemplateLayer['layer_type'];
                          const allowed = layerMaterialOptions(layerType);
                          updateEditingLayer(i, {
                            layer_type: layerType,
                            materialId: allowed[0]?.id || null,
                          });
                        }}
                      >
                        <option value="substrate">Substrate</option>
                        <option value="ink">Ink & Coating</option>
                        <option value="adhesive">Adhesive</option>
                      </select>
                      <select
                        className="input flex-1 min-w-[12rem] text-sm"
                        value={layer.materialId || ''}
                        onChange={(e) => updateEditingLayer(i, { materialId: e.target.value || null })}
                      >
                        <option value="">Select material</option>
                        {layerMaterialOptions(layer.layer_type).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.substrateFamily && layer.layer_type === 'substrate'
                              ? `${m.substrateFamily} – `
                              : ''}
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="input w-20 text-sm"
                        value={layer.default_micron}
                        min={0}
                        step={0.5}
                        onChange={(e) =>
                          updateEditingLayer(i, { default_micron: parseFloat(e.target.value) || 0 })
                        }
                        aria-label="Micron"
                      />
                      <span className="text-xs text-mist shrink-0">µ</span>
                      <button
                        type="button"
                        className="text-red-500 p-2"
                        onClick={() => removeLayer(i)}
                        aria-label="Remove layer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">Processes</label>
                <div className="flex flex-wrap gap-2">
                  {PROCESS_KEYS.map((key) => (
                    <label key={key} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isProcessEnabled(key)}
                        onChange={() => toggleProcess(key)}
                      />
                      {key.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={saving}
                onClick={handleSaveEdit}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardTemplates;
