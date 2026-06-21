import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, Loader2, ArrowLeft, X, Layers } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { SkeletonCard } from '../components/Skeleton';
import { ClassFilterPanel, EMPTY_CLASS_FILTER } from '../components/ClassFilterPanel';
import { JobHeaderFields } from '../components/JobHeaderFields';
import { TemplateStructureCard } from '../components/TemplateStructureCard';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { derivePrintingWebClass, filterMaterialsForTemplateLayer, materialAllowedForTemplateLayer, inferStructureTypeFromSubstrateCount } from '@es/engine';
import type { LayerType, ProductTypeCode } from '@es/engine';
import {
  getTemplateClassification,
  matchesClassFilter,
  structureTierLabel,
  type ClassFilter,
  type TemplateStructureTier,
} from '../lib/templateCatalog';
import {
  defaultProductTypeValue,
  defaultUnitValue,
  normalizeProductType,
  normalizeUnitValue,
  type ProductTypeValue,
} from '../lib/masterDataReference';

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
  templateKey?: string | null;
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

const MATERIAL_CLASS_OPTIONS = ['PE', 'Non PE'] as const;

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

function syncStructureTypeFromLayers(layers: TemplateLayer[]): StructureTemplate['structureType'] {
  const substrateCount = layers.filter((l) => l.layer_type === 'substrate').length;
  return inferStructureTypeFromSubstrateCount(substrateCount);
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

function catalogInput(template: StructureTemplate) {
  return {
    name: template.name,
    productType: template.productType,
    pebiParentPg: template.pebiParentPg,
    materialClass: template.materialClass,
    structureType: template.structureType,
    defaultLayers: template.defaultLayers,
    isStandard: template.isStandard,
  };
}

function classificationTag(template: StructureTemplate): string {
  const cls = getTemplateClassification(catalogInput(template));
  const structure = cls.structure.charAt(0).toUpperCase() + cls.structure.slice(1);
  if (cls.materialClass) {
    return `${cls.materialClass} · ${cls.isPrinted ? 'Printed' : 'Plain'} · ${structure}`;
  }
  return structure;
}

function cardMetaLine(
  template: StructureTemplate,
  productTypeOptions: Array<{ label: string; value: string }>
): string {
  const pt = productTypeLabel(template.productType, productTypeOptions);
  return `${pt} · ${classificationTag(template)}`;
}

function visualizerLayers(template: StructureTemplate, materials: MaterialOption[]) {
  return (template.defaultLayers || []).map((l, i) => {
    const mat = materials.find((m) => m.id === l.materialId);
    return {
      id: String(i),
      type: l.layer_type || 'substrate',
      material: mat?.name || l.ref_material_key || 'Layer',
      micron: 1,
    };
  });
}

const StandardTemplates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewQuoteFlow = searchParams.get('new') === '1';
  const { reference: masterRef } = useMasterDataReference();
  const productTypeOptions = masterRef.productTypeOptions;
  const unitOptions = masterRef.unitOptions;
  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'platform_admin';

  const [classFilter, setClassFilter] = useState<ClassFilter>(EMPTY_CLASS_FILTER);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [jobName, setJobName] = useState('');
  const [productType, setProductType] = useState<ProductTypeValue>(() => defaultProductTypeValue());
  const [orderQuantity, setOrderQuantity] = useState(10000);
  const [orderQuantityUnit, setOrderQuantityUnit] = useState(() => defaultUnitValue());
  const [standardTemplates, setStandardTemplates] = useState<StructureTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<StructureTemplate[]>([]);
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
      const [standard, my, mats] = await Promise.all([
        apiClient.getTemplates(true),
        apiClient.getMyTemplates(),
        apiClient.getMaterials(),
      ]);
      setStandardTemplates(standard || []);
      setMyTemplates((my || []).filter((t: StructureTemplate) => !t.isStandard));
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
    setProductType((prev) => normalizeProductType(prev, productTypeOptions));
    setOrderQuantityUnit((prev) => normalizeUnitValue(prev, unitOptions));
  }, [productTypeOptions, unitOptions]);

  useEffect(() => {
    const customer = searchParams.get('customer');
    if (customer) setSelectedCustomer(customer);
    const job = searchParams.get('jobName');
    if (job) setJobName(job);
    const pt = searchParams.get('productType') || searchParams.get('type');
    if (pt) setProductType(normalizeProductType(pt, productTypeOptions));
    const qty = searchParams.get('orderQuantity');
    if (qty && !Number.isNaN(Number(qty))) setOrderQuantity(Number(qty));
    const unit = searchParams.get('orderQuantityUnit');
    if (unit) setOrderQuantityUnit(normalizeUnitValue(unit, unitOptions));
  }, [searchParams, productTypeOptions, unitOptions]);

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
    const layers = next.defaultLayers || [];
    const structureType = syncStructureTypeFromLayers(layers);
    const synced = { ...next, structureType };
    setEditing({
      ...synced,
      defaultLayers: pruneInvalidLayerMaterials(layers, materials, synced),
    });
  };

  const layerMaterialOptions = (layerType: LayerType) => {
    if (!editing) return [];
    return filterMaterialsForTemplateLayer(materials, layerType, classificationContext(editing));
  };

  const uniqueStandard = useMemo(() => {
    const seen = new Set<string>();
    const deduped = standardTemplates.filter((t) => {
      const key = t.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }, [standardTemplates]);

  const allCatalogTemplates = useMemo(
    () => [...uniqueStandard, ...myTemplates],
    [uniqueStandard, myTemplates]
  );

  const isAllFiltersActive =
    classFilter.materialClass === null &&
    classFilter.isPrinted === null &&
    classFilter.structure === null;

  const countWithFilter = useCallback(
    (partial: Partial<ClassFilter>) => {
      const test = { ...classFilter, ...partial };
      return allCatalogTemplates.filter((t) => matchesClassFilter(catalogInput(t), test)).length;
    },
    [allCatalogTemplates, classFilter]
  );

  const filteredStandard = useMemo(() => {
    return uniqueStandard.filter((t) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.pebiParentPg || '').toLowerCase().includes(q) ||
        (t.templateKey || '').toLowerCase().includes(q);
      const matchesClass =
        isAllFiltersActive || matchesClassFilter(catalogInput(t), classFilter);
      const matchesProductType = !isNewQuoteFlow || t.productType === productType;
      return matchesSearch && matchesClass && matchesProductType;
    });
  }, [uniqueStandard, searchTerm, classFilter, isAllFiltersActive, isNewQuoteFlow, productType]);

  const toggleMaterialClass = (value: 'PE' | 'Non PE') =>
    setClassFilter((f) => ({ ...f, materialClass: f.materialClass === value ? null : value }));
  const togglePrinted = (value: boolean) =>
    setClassFilter((f) => ({ ...f, isPrinted: f.isPrinted === value ? null : value }));
  const toggleStructure = (value: TemplateStructureTier) =>
    setClassFilter((f) => ({ ...f, structure: f.structure === value ? null : value }));

  const filteredMy = useMemo(() => {
    return myTemplates.filter((t) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.templateKey || '').toLowerCase().includes(q);
      const matchesClass =
        isAllFiltersActive || matchesClassFilter(catalogInput(t), classFilter);
      const matchesProductType = !isNewQuoteFlow || t.productType === productType;
      return matchesSearch && matchesClass && matchesProductType;
    });
  }, [myTemplates, searchTerm, classFilter, isAllFiltersActive, isNewQuoteFlow, productType]);

  const editingClassification = editing ? getTemplateClassification(catalogInput(editing)) : null;

  const renderTemplateCard = (template: StructureTemplate, opts: { allowEdit: boolean; badge?: string }) => {
    const layers = visualizerLayers(template, materials);
    const layerCount = layers.length;

    return (
      <TemplateStructureCard
        key={template.id}
        name={template.name}
        metaLine={cardMetaLine(template, masterRef.productTypeOptions)}
        templateKey={template.templateKey}
        templateKeyTitle={
          template.isStandard
            ? 'Stable template_key for API / MES lookup'
            : 'Tenant-local key — not in PEBI catalog'
        }
        badge={opts.badge}
        layers={layers}
        layerCount={layerCount}
        instantiating={instantiating === template.id}
        allowEdit={opts.allowEdit}
        onUse={() => handleUseTemplate(template)}
        onEdit={() => openEdit(template)}
        onDelete={() => handleDelete(template)}
        deleting={deleting === template.id}
      />
    );
  };

  const handleUseTemplate = async (template: StructureTemplate) => {
    setInstantiating(template.id);
    try {
      const created = await apiClient.instantiateTemplate(template.id, {
        customerId: selectedCustomer || undefined,
        jobName: jobName.trim() || template.name,
        orderQuantityKg: orderQuantity,
        orderQuantityUnit,
      });
      navigate(`/estimate/${created.id}`, {
        state: {
          returnTo: isNewQuoteFlow ? '/estimates' : '/templates',
          configureFromTemplate: true,
        },
      });
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
    const defaultLayers = (template.defaultLayers || []).map((l) => ({ ...l }));
    setEditing({
      ...template,
      defaultLayers,
      structureType: syncStructureTypeFromLayers(defaultLayers),
      defaultProcesses: (template.defaultProcesses || []).map((p) => ({ ...p })),
    });
  };

  const updateEditingLayer = (index: number, patch: Partial<TemplateLayer>) => {
    if (!editing) return;
    const layers = [...(editing.defaultLayers || [])];
    layers[index] = { ...layers[index], ...patch };
    setEditing({
      ...editing,
      defaultLayers: layers,
      structureType: syncStructureTypeFromLayers(layers),
    });
  };

  const addLayer = () => {
    if (!editing) return;
    const layers = editing.defaultLayers || [];
    const ctx = classificationContext(editing);
    const defaultMat =
      filterMaterialsForTemplateLayer(materials, 'substrate', ctx)[0] || null;
    const nextLayers = [
      ...layers,
      {
        layer_order: layers.length + 1,
        layer_type: 'substrate' as const,
        materialId: defaultMat?.id || null,
        default_micron: 0,
      },
    ];
    setEditing({
      ...editing,
      defaultLayers: nextLayers,
      structureType: syncStructureTypeFromLayers(nextLayers),
    });
  };

  const removeLayer = (index: number) => {
    if (!editing) return;
    const layers = (editing.defaultLayers || [])
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, layer_order: i + 1 }));
    setEditing({
      ...editing,
      defaultLayers: layers,
      structureType: syncStructureTypeFromLayers(layers),
    });
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
      const substrateCount = (editing.defaultLayers || []).filter(
        (l) => l.layer_type === 'substrate'
      ).length;
      const structureType = inferStructureTypeFromSubstrateCount(substrateCount);

      await apiClient.updateTemplate(editing.id, {
        name: editing.name,
        productType: editing.productType,
        materialClass: editing.materialClass,
        structureType,
        displayOrder: editing.displayOrder,
        defaultLayers: (editing.defaultLayers || []).map((l, i) => ({
          layer_order: i + 1,
          layer_type: l.layer_type,
          materialId: l.materialId,
          ref_material_key: l.ref_material_key,
          default_micron: 0,
        })),
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
    <div className={`w-full ${isNewQuoteFlow ? 'pb-24 md:pb-0' : 'pb-24 lg:pb-8'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          {isNewQuoteFlow && (
            <Link
              to="/estimates"
              className="btn-secondary inline-flex items-center gap-2 shrink-0 mt-0.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">
              {isNewQuoteFlow ? 'New estimate' : 'Standard Templates'}
            </h1>
            <p className="text-mist mt-1 text-sm">
              {isNewQuoteFlow
                ? 'Fill in the job header, then pick a structure below.'
                : isAdmin
                  ? 'Platform standard stacks — pick a card to start a quote'
                  : 'Pick a standard stack to start your quote'}
            </p>
          </div>
        </div>
        {!isNewQuoteFlow && (
          <Link to="/templates?new=1" className="btn-primary inline-flex items-center gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New estimate
          </Link>
        )}
      </div>

      {isNewQuoteFlow && (
        <div className="card mb-4 py-3 px-4 sm:px-5">
          <JobHeaderFields
            customerId={selectedCustomer}
            onCustomerChange={setSelectedCustomer}
            jobName={jobName}
            onJobNameChange={setJobName}
            productType={productType}
            onProductTypeChange={setProductType}
            productTypeOptions={productTypeOptions}
            orderQuantity={orderQuantity}
            onOrderQuantityChange={setOrderQuantity}
            orderQuantityUnit={orderQuantityUnit}
            onOrderQuantityUnitChange={setOrderQuantityUnit}
            unitOptions={unitOptions}
          />
        </div>
      )}

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

      <ClassFilterPanel
        filter={classFilter}
        isAllActive={isAllFiltersActive}
        countLabel={
          isAllFiltersActive
            ? `${filteredStandard.length + filteredMy.length} structure${filteredStandard.length + filteredMy.length === 1 ? '' : 's'}`
            : `${filteredStandard.length + filteredMy.length} matching`
        }
        onReset={() => setClassFilter(EMPTY_CLASS_FILTER)}
        onToggleMaterial={toggleMaterialClass}
        onTogglePrinted={togglePrinted}
        onToggleStructure={toggleStructure}
        countWithFilter={countWithFilter}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredStandard.map((template) =>
            renderTemplateCard(template, { allowEdit: isAdmin })
          )}
        </div>
      )}

      {filteredMy.length > 0 && (
        <div className="mt-10 pt-8 border-t border-border">
          <h2 className="text-lg font-display font-semibold text-navy mb-1">My Templates</h2>
          <p className="text-sm text-mist mb-4">
            Saved from your estimates — tenant-local only, not in the PEBI standard catalog. Each gets an
            auto-generated <span className="font-mono text-xs">template_key</span> for API use.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredMy.map((template) =>
              renderTemplateCard(template, { allowEdit: true, badge: 'My template' })
            )}
          </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-navy">Layers</label>
                  <button type="button" className="text-sm text-gold font-medium" onClick={addLayer}>
                    + Add layer
                  </button>
                </div>

                {(editing.defaultLayers || []).length > 0 && (
                  <div className="rounded-lg border border-border bg-slate/30 px-3 py-3 mb-3">
                    <LaminateVisualizer
                      layers={visualizerLayers(editing, materials)}
                      width={360}
                      height={40}
                      orientation="horizontal"
                      labelMode="number"
                      className="w-full h-10"
                    />
                    <p className="text-sm font-medium text-navy mt-2">
                      {editingClassification && editing.materialClass
                        ? `${editing.materialClass} · ${editingClassification.isPrinted ? 'Printed' : 'Plain'} · ${structureTierLabel(editingClassification.structure)}`
                        : editingClassification
                          ? `${editingClassification.isPrinted ? 'Printed' : 'Plain'} · ${structureTierLabel(editingClassification.structure)}`
                          : 'Mono'}
                      <span className="font-normal text-mist">
                        {' '}
                        · {(editing.defaultLayers || []).length} layer
                        {(editing.defaultLayers || []).length === 1 ? '' : 's'}
                        {' · '}
                        {(editing.defaultLayers || []).filter((l) => l.layer_type === 'substrate').length}{' '}
                        substrate
                        {(editing.defaultLayers || []).filter((l) => l.layer_type === 'substrate').length === 1
                          ? ''
                          : 's'}
                      </span>
                    </p>
                    <p className="text-xs text-mist mt-1">
                      Add an <strong>ink</strong> layer → Printed. Add a second <strong>substrate</strong> →
                      Duplex (3 substrates → Triplex, 4+ → Quadriplex). Adhesive alone stays Plain.
                    </p>
                    <p className="text-xs text-mist mt-1">
                      Thickness (µ), width, and other job dimensions are entered when you create an estimate.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {(editing.defaultLayers || []).map((layer, i) => (
                    <div key={i} className="flex gap-2 items-center flex-wrap">
                      <span
                        className="w-7 h-7 shrink-0 rounded-md bg-navy text-white text-sm font-semibold flex items-center justify-center"
                        aria-label={`Layer ${i + 1}`}
                      >
                        {i + 1}
                      </span>
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
