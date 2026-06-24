import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { SkeletonCard } from '../components/Skeleton';
import { ClassFilterPanel, EMPTY_CLASS_FILTER } from '../components/ClassFilterPanel';
import { JobHeaderFields } from '../components/JobHeaderFields';
import { TemplateStructureCard } from '../components/TemplateStructureCard';
import { TemplateBuilder } from '../components/TemplateBuilder';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { filterMaterialsForTemplateLayer, materialAllowedForTemplateLayer, inferStructureTypeFromSubstrateCount } from '@es/engine';
import type { LayerType, ProductTypeCode } from '@es/engine';
import {
  getTemplateClassification,
  matchesClassFilter,
  type ClassFilter,
  type TemplateStructureTier,
} from '../lib/templateCatalog';
import {
  defaultProductTypeValue,
  defaultUnitValue,
  normalizeProductType,
  normalizeUnitValue,
} from '../lib/masterDataReference';
import {
  clearWorkingEstimateForTemplate,
  getWorkingEstimateForTemplate,
  setWorkingEstimateForTemplate,
} from '../lib/estimateSession';

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
  productSubtype?: string | null;
  materialClass?: string;
  structureType?: string;
  displayOrder?: number;
  defaultDimensions?: Record<string, unknown>;
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

// File-level constants moved to TemplateBuilder component.
// Kept here only for backward-compat linting suppression.
const _MATERIAL_CLASS_OPTIONS = ['PE', 'Non PE'] as const;
void _MATERIAL_CLASS_OPTIONS;
const _PROCESS_KEYS = ['extrusion', 'printing', 'lamination', 'slitting', 'pouch_making', 'seaming'] as const;
void _PROCESS_KEYS;

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
    defaultDimensions: template.defaultDimensions,
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
  const [productType, setProductType] = useState<string>(() => defaultProductTypeValue());
  const [orderQuantity, setOrderQuantity] = useState(10000);
  const [orderQuantityUnit, setOrderQuantityUnit] = useState(() => defaultUnitValue());
  const [standardTemplates, setStandardTemplates] = useState<StructureTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<StructureTemplate[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const [instantiateError, setInstantiateError] = useState<{ message: string; unresolvedCount: number } | null>(null);
  const [editing, setEditing] = useState<StructureTemplate | null>(null);
  // Smart Template Builder: unified create + edit modal state (Task 4.4)
  const [builderMode, setBuilderMode] = useState<'create' | 'edit' | null>(null);
  const [builderTemplate, setBuilderTemplate] = useState<StructureTemplate | null>(null);
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

  // The following functions are retained for backward-compat reference but the editing modal
  // has been replaced by TemplateBuilder. They are intentionally kept to avoid breaking
  // any remaining `editing` state paths (edit will open TemplateBuilder via openEdit).
  // They can be removed in a follow-up cleanup once verified.
  const _applyTemplatePatch = (patch: Partial<StructureTemplate>) => {
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
  void _applyTemplatePatch;

  const _layerMaterialOptions = (layerType: LayerType) => {
    if (!editing) return [];
    return filterMaterialsForTemplateLayer(materials, layerType, classificationContext(editing));
  };
  void _layerMaterialOptions;

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

  const _editingClassification = editing ? getTemplateClassification(catalogInput(editing)) : null;
  void _editingClassification;

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
    setInstantiateError(null);
    try {
      const templateKey = template.templateKey?.trim() || null;
      const returnState = {
        returnTo: isNewQuoteFlow ? '/estimates' : '/templates',
      };

      const tryOpenDraft = async (draft: { id: string; jobName?: string; refNumber?: string }) => {
        setWorkingEstimateForTemplate(templateKey!, draft.id);
        navigate(`/estimate/${draft.id}`, { state: returnState });
      };

      const promptResumeDraft = (
        draft: { id: string; jobName?: string; refNumber?: string },
        headline: string
      ): boolean => {
        const ref = draft.refNumber || draft.id.slice(0, 8);
        return window.confirm(
          `${headline}\n\n` +
            `${draft.jobName || template.name} (${ref})\n\n` +
            `OK = open it (your saved changes)\n` +
            `Cancel = start a brand-new quote`
        );
      };

      let startFresh = false;

      if (templateKey) {
        const workingId = getWorkingEstimateForTemplate(templateKey);
        if (workingId) {
          try {
            const working = await apiClient.getEstimate(workingId);
            if (
              working?.status === 'draft' &&
              working.sourceTemplateKey === templateKey
            ) {
              if (
                promptResumeDraft(
                  working,
                  `Continue your last saved quote for "${template.name}"?`
                )
              ) {
                await tryOpenDraft(working);
                return;
              }
              clearWorkingEstimateForTemplate(templateKey);
              startFresh = true;
            } else {
              clearWorkingEstimateForTemplate(templateKey);
            }
          } catch {
            clearWorkingEstimateForTemplate(templateKey);
          }
        }

        if (!startFresh && !workingId) {
          try {
            const latest = await apiClient.getLatestDraftForTemplate(templateKey);
            if (latest?.id) {
              if (
                promptResumeDraft(
                  latest,
                  `You have a saved draft for "${template.name}".`
                )
              ) {
                await tryOpenDraft(latest);
                return;
              }
            }
          } catch {
            // Fall through to create a new estimate.
          }
        }
      }

      if (templateKey) {
        clearWorkingEstimateForTemplate(templateKey);
      }

      const created = await apiClient.instantiateTemplate(template.id, {
        customerId: selectedCustomer || undefined,
        jobName: jobName.trim() || template.name,
        orderQuantityKg: orderQuantity,
        orderQuantityUnit,
      });
      if (templateKey && created?.id) {
        setWorkingEstimateForTemplate(templateKey, created.id);
      }
      navigate(`/estimate/${created.id}`, {
        state: {
          ...returnState,
          configureFromTemplate: true,
        },
      });
    } catch (err) {
      const e = err as Error & { status?: number; details?: unknown };
      if (e.status === 409) {
        // Phase 5.4: visible unresolved-layer banner instead of alert
        const unresolvedLayers = Array.isArray(e.details) ? e.details : [];
        setInstantiateError({
          message: `${unresolvedLayers.length || 'Some'} layer${unresolvedLayers.length !== 1 ? 's' : ''} in this template could not be resolved to materials in your library.`,
          unresolvedCount: unresolvedLayers.length,
        });
      } else {
        setInstantiateError({ message: e.message || 'Failed to create estimate from template', unresolvedCount: 0 });
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
    // Use unified TemplateBuilder for edit (Task 4.1 — replaces old inline modal)
    setBuilderMode('edit');
    setBuilderTemplate(template);
  };

  const openCreate = () => {
    setBuilderMode('create');
    setBuilderTemplate(null);
  };

  const handleBuilderSaved = async (_saved: unknown) => {
    setBuilderMode(null);
    setBuilderTemplate(null);
    await loadData();
  };

  const handleBuilderClose = () => {
    setBuilderMode(null);
    setBuilderTemplate(null);
  };

  const updateEditingLayer = (_index: number, _patch: Partial<TemplateLayer>) => { void 0; };
  void updateEditingLayer;
  const addLayer = () => { void 0; };
  void addLayer;
  const removeLayer = (_index: number) => { void 0; };
  void removeLayer;
  const toggleProcess = (_key: string) => { void 0; };
  void toggleProcess;
  const isProcessEnabled = (_key: string) => false;
  void isProcessEnabled;
  const handleSaveEdit = async () => { void 0; };
  void handleSaveEdit;

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
          <div className="flex gap-2 shrink-0">
            <Link to="/templates?new=1" className="btn-secondary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New estimate
            </Link>
            {/* Task 4.4: New template button — opens TemplateBuilder in create mode */}
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4" />
              New template
            </button>
          </div>
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

      {/* Phase 5.4: unresolved-layer banner shown when instantiate returns 409 */}
      {instantiateError && (
        <div className="card bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold mb-1">⚠ Template has unresolved materials</p>
            <p>{instantiateError.message}</p>
            {isAdmin && (
              <p className="mt-1 text-xs">Re-link the template layers in the template editor (admin only) then try again.</p>
            )}
          </div>
          <button type="button" className="text-amber-700 hover:text-amber-900 shrink-0" onClick={() => setInstantiateError(null)}>✕</button>
        </div>
      )}
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

      {/* Unified TemplateBuilder modal — create + edit (Task 4.1, replaces old inline editing modal) */}
      {builderMode && (
        <TemplateBuilder
          mode={builderMode}
          template={builderTemplate ?? undefined}
          materials={materials}
          productTypeOptions={masterRef.productTypeOptions}
          productSubtypeOptions={masterRef.productSubtypeOptions}
          processOptions={masterRef.processOptions}
          isAdmin={isAdmin}
          onSaved={handleBuilderSaved}
          onClose={handleBuilderClose}
        />
      )}
    </div>
  );
};

export default StandardTemplates;
