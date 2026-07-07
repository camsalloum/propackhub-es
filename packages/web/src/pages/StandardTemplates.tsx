import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { SkeletonCard } from '../components/Skeleton';
import { ClassFilterPanel, EMPTY_CLASS_FILTER } from '../components/ClassFilterPanel';
import { TemplateStructureCard } from '../components/TemplateStructureCard';
import { TemplateBuilder } from '../components/TemplateBuilder';
import { TemplateDeck } from '../components/TemplateDeck';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { useMaterialsContextOptional } from '../contexts/MaterialsContext';
import { filterMaterialsForTemplateLayer, materialAllowedForTemplateLayer, inferStructureTypeFromSubstrateCount } from '@es/engine';
import type { LayerType, ProductTypeCode } from '@es/engine';
import {
  getTemplateClassification,
  matchesClassFilter,
  type ClassFilter,
  type TemplateStructureTier,
} from '../lib/templateCatalog';
import { isSubstrateLayerType, resolveLayerType } from '../lib/materialFamily';

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
  productType: 'roll' | 'sleeve' | 'pouch' | 'bag';
  productSubtype?: string | null;
  materialClass?: string;
  structureType?: string;
  displayOrder?: number;
  defaultDimensions?: Record<string, unknown>;
  defaultLayers?: TemplateLayer[];
  defaultProcesses?: { process_key: string; enabled: boolean; process_quantity?: number }[];
  defaultPrintingWebClass?: 'wide_web' | 'narrow_web';
  isStandard?: boolean;
  createdByUserId?: string | null;
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
  return (template.defaultLayers || [])
    .map((l, i) => {
      const mat = materials.find((m) => m.id === l.materialId);
      const type = resolveLayerType(l.layer_type, mat?.type);
      return {
        id: String(i),
        type,
        material: mat?.name || l.ref_material_key || 'Layer',
        micron: l.default_micron || 1,
        family: mat?.substrateFamily ?? null,
      };
    })
    .filter((l) => isSubstrateLayerType(l.type));
}

const StandardTemplates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pickerTab: 'standard' | 'mine' =
    searchParams.get('tab') === 'mine' ? 'mine' : 'standard';
  const customerFromUrl = searchParams.get('customer')?.trim() || '';
  const quoteFromUrl = searchParams.get('quote')?.trim() || '';
  const priceCheckFromUrl = searchParams.get('priceCheck') === '1';
  const variantNameFromUrl = searchParams.get('variantName')?.trim() || '';
  const variantDescriptionFromUrl = searchParams.get('variantDescription')?.trim() || '';
  const { reference: masterRef } = useMasterDataReference();
  const materialsCache = useMaterialsContextOptional();
  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'platform_admin';
  const isPlatformAdmin = user?.role === 'platform_admin';

  // Standards live in the platform catalog — only platform_admin may edit/delete
  // (tenant_admin PATCH was overwritten by platform sync on reload).
  const canEditStandardTemplate = isPlatformAdmin;
  const canDeleteStandardTemplate = isPlatformAdmin;

  const canManageMyTemplate = (template: StructureTemplate) => {
    if (template.isStandard) return false;
    if (!template.createdByUserId) return isAdmin;
    return template.createdByUserId === user?.id;
  };

  const [classFilter, setClassFilter] = useState<ClassFilter>(EMPTY_CLASS_FILTER);
  const [searchTerm, setSearchTerm] = useState('');
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
  /** Platform-admin shortcut: pre-toggle "Save as platform standard" when opening the builder. */
  const [builderDefaultSavePlatform, setBuilderDefaultSavePlatform] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const cachedMats = materialsCache?.materials ?? [];
      const [mats, standard, my] = await Promise.all([
        cachedMats.length > 0
          ? Promise.resolve(cachedMats)
          : apiClient.getMaterials(),
        apiClient.getTemplates(true),
        apiClient.getMyTemplates(),
      ]);
      setMaterials(
        (mats || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          type: m.type || m.materialType,
          substrateFamily: m.substrateFamily ?? null,
          isSolventBased: m.isSolventBased,
        }))
      );
      setStandardTemplates(standard || []);
      setMyTemplates(my || []);
    } catch (err) {
      console.error(err);
      setLoadError('Could not load templates. Check that the API server is running.');
    } finally {
      setLoading(false);
    }
  }, [materialsCache?.materials]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setPickerTab = (tab: 'standard' | 'mine') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'mine') next.set('tab', 'mine');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

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

  const showMyGrid = pickerTab === 'mine';

  const countWithFilter = useCallback(
    (partial: Partial<ClassFilter>) => {
      const test = { ...classFilter, ...partial };
      const pool = showMyGrid ? myTemplates : uniqueStandard;
      return pool.filter((t) => matchesClassFilter(catalogInput(t), test)).length;
    },
    [classFilter, showMyGrid, myTemplates, uniqueStandard]
  );

  const isAllFiltersActive =
    classFilter.materialClass === null &&
    classFilter.isPrinted === null &&
    classFilter.structure === null;

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
      return matchesSearch && matchesClass;
    });
  }, [uniqueStandard, searchTerm, classFilter, isAllFiltersActive]);

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
      // Personal templates: always list all — job-header product type is a hint, not a gate.
      return matchesSearch && matchesClass;
    });
  }, [myTemplates, searchTerm, classFilter, isAllFiltersActive]);

  const activeTemplates = showMyGrid ? filteredMy : filteredStandard;

  const _editingClassification = editing ? getTemplateClassification(catalogInput(editing)) : null;
  void _editingClassification;

  /** Templates = structure only. Resolve the template into an UNSAVED draft (no DB row);
   *  the editor opens it as a new estimate and only persists when the user saves. */
  const createEstimateFromStructure = async (template: StructureTemplate) => {
    setInstantiating(template.id);
    setInstantiateError(null);
    try {
      const preview = await apiClient.previewTemplate(template.id, {
        customerId: priceCheckFromUrl ? undefined : customerFromUrl || undefined,
        jobName: variantNameFromUrl || template.name,
        quoteId: quoteFromUrl || undefined,
      });
      const qs = new URLSearchParams();
      if (customerFromUrl && !priceCheckFromUrl) qs.set('customer', customerFromUrl);
      if (quoteFromUrl) qs.set('quote', quoteFromUrl);
      if (priceCheckFromUrl) qs.set('priceCheck', '1');
      if (variantNameFromUrl) qs.set('variantName', variantNameFromUrl);
      if (variantDescriptionFromUrl) qs.set('variantDescription', variantDescriptionFromUrl);
      const estimatePath = qs.toString() ? `/estimate/new?${qs}` : '/estimate/new';
      navigate(estimatePath, {
        state: {
          returnTo: '/estimates',
          configureFromTemplate: true,
          fromStructureTemplate: true,
          // Editor hydrates a new (unsaved) estimate from this; nothing is saved yet.
          instantiated: preview,
        },
      });
    } catch (err) {
      const e = err as Error & { status?: number; details?: unknown };
      if (e.status === 409) {
        const unresolvedLayers = Array.isArray(e.details) ? e.details : [];
        setInstantiateError({
          message: `${unresolvedLayers.length || 'Some'} layer${unresolvedLayers.length !== 1 ? 's' : ''} in this template could not be resolved to materials in your library.`,
          unresolvedCount: unresolvedLayers.length,
        });
      } else {
        setInstantiateError({
          message: e.message || 'Failed to create estimate from template',
          unresolvedCount: 0,
        });
      }
    } finally {
      setInstantiating(null);
    }
  };

  const renderTemplateCard = (template: StructureTemplate, opts: { badge?: string }) => {
    const layers = visualizerLayers(template, materials);
    const layerCount = layers.length;
    const isMine = showMyGrid || !template.isStandard;
    const canEdit = isMine ? canManageMyTemplate(template) : canEditStandardTemplate;
    const canDelete = isMine ? canManageMyTemplate(template) : canDeleteStandardTemplate;

    return (
      <TemplateStructureCard
        key={template.id}
        name={template.name}
        metaLine={cardMetaLine(template, masterRef.productTypeOptions)}
        templateKey={template.templateKey}
        badge={opts.badge}
        layers={layers}
        layerCount={layerCount}
        busy={instantiating === template.id}
        showEditStructure={canEdit}
        showSaveToMyTemplates={!showMyGrid && Boolean(template.isStandard)}
        showCloneToPlatformStandard={isPlatformAdmin}
        showDelete={canDelete && isMine}
        onCreateEstimate={() => createEstimateFromStructure(template)}
        onEditStructure={canEdit ? () => openEdit(template) : undefined}
        onSaveToMyTemplates={
          !showMyGrid && template.isStandard
            ? () => openForkAsMyTemplate(template)
            : undefined
        }
        onCloneToPlatformStandard={
          isPlatformAdmin ? () => openCloneAsPlatformStandard(template) : undefined
        }
        onDelete={canDelete && isMine ? () => handleDelete(template) : undefined}
        deleting={deleting === template.id}
      />
    );
  };

  const handleDelete = async (template: StructureTemplate) => {
    if (template.isStandard && !canDeleteStandardTemplate) return;
    if (!template.isStandard && !canManageMyTemplate(template)) return;
    const isPlatformDelete =
      template.isStandard && isPlatformAdmin && Boolean(template.templateKey);
    const label = isPlatformDelete
      ? 'deactivate everywhere'
      : template.isStandard
        ? 'deactivate (this tenant only)'
        : 'delete';
    if (
      !confirm(
        isPlatformDelete
          ? `Deactivate platform standard "${template.name}" for every tenant?`
          : `${template.isStandard ? 'Deactivate' : 'Delete'} template "${template.name}"?`
      )
    )
      return;
    setDeleting(template.id);
    try {
      if (isPlatformDelete) {
        // Platform admin deletes the canonical row, then the next sync mirrors
        // the deactivation into every tenant copy.
        await apiClient.deletePlatformTemplateByKey(template.templateKey!);
        window.dispatchEvent(new Event('platform-templates-changed'));
      } else {
        await apiClient.deleteTemplate(template.id);
      }
      await loadData();
    } catch (err) {
      alert(`Failed to ${label} template`);
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (template: StructureTemplate) => {
    if (template.isStandard && !canEditStandardTemplate) return;
    if (!template.isStandard && !canManageMyTemplate(template)) return;
    // Use unified TemplateBuilder for edit (Task 4.1 — replaces old inline modal)
    setBuilderMode('edit');
    setBuilderTemplate(template);
    setBuilderDefaultSavePlatform(false);
  };

  const openCreate = () => {
    setBuilderMode('create');
    setBuilderTemplate(null);
    setBuilderDefaultSavePlatform(false);
  };

  /** Fork a standard structure into My Templates (no customer, no estimate). */
  const openForkAsMyTemplate = (source: StructureTemplate) => {
    setBuilderMode('create');
    setBuilderTemplate({
      ...source,
      name: `${source.name} (my copy)`,
      isStandard: false,
    });
    setBuilderDefaultSavePlatform(false);
  };

  /**
   * Platform-admin shortcut: clone any visible template into a new platform
   * standard. Prefills the builder with the source's content and lands the
   * "Save as platform standard" toggle pre-checked.
   */
  const openCloneAsPlatformStandard = (source: StructureTemplate) => {
    if (!isPlatformAdmin) return;
    setBuilderMode('create');
    setBuilderTemplate({
      ...source,
      name: `${source.name} (copy)`,
      isStandard: true,
    });
    setBuilderDefaultSavePlatform(true);
  };

  const handleBuilderSaved = async (
    _saved: unknown,
    meta?: { savedAsPlatformStandard: boolean }
  ) => {
    setBuilderMode(null);
    setBuilderTemplate(null);
    setBuilderDefaultSavePlatform(false);
    await loadData();
    // Land on the tab matching what was actually saved: platform standards on
    // the Standard tab, personal templates on My Templates.
    setPickerTab(meta?.savedAsPlatformStandard ? 'standard' : 'mine');
  };

  const handleBuilderClose = () => {
    setBuilderMode(null);
    setBuilderTemplate(null);
    setBuilderDefaultSavePlatform(false);
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
    <div className="w-full pb-24 lg:pb-8">
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:gap-4">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-brand shrink-0">Templates</h1>
        <div className="relative flex-1 min-w-0 order-last lg:order-none">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Search templates..."
            className="input w-full pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => setPickerTab('mine')}
          >
            My Templates
          </button>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4" />
            New structure
          </button>
        </div>
      </div>

      <ClassFilterPanel
        title="Filter:"
        filter={classFilter}
        isAllActive={isAllFiltersActive}
        countLabel={
          isAllFiltersActive
            ? `${activeTemplates.length} structure${activeTemplates.length === 1 ? '' : 's'}`
            : `${activeTemplates.length} matching`
        }
        onReset={() => setClassFilter(EMPTY_CLASS_FILTER)}
        onToggleMaterial={toggleMaterialClass}
        onTogglePrinted={togglePrinted}
        onToggleStructure={toggleStructure}
        countWithFilter={countWithFilter}
      />

      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            pickerTab === 'standard'
              ? 'border-accent text-accent-text'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setPickerTab('standard')}
        >
          Standard Templates
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            pickerTab === 'mine'
              ? 'border-accent text-accent-text'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => setPickerTab('mine')}
        >
          My Templates
          {myTemplates.length > 0 ? (
            <span className="ml-1.5 text-xs font-normal text-text-secondary">({myTemplates.length})</span>
          ) : null}
        </button>
      </div>

      {/* Phase 5.4: unresolved-layer banner shown when instantiate returns 409 */}
      {instantiateError && (
        <div className="card bg-warning/10 border border-warning/40 text-sm text-text-primary flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold mb-1 text-warning">⚠ Template has unresolved materials</p>
            <p>{instantiateError.message}</p>
            {isAdmin && (
              <p className="mt-1 text-xs text-text-secondary">Re-link the template layers in the template editor (admin only) then try again.</p>
            )}
          </div>
          <button type="button" className="text-warning hover:text-text-primary shrink-0" onClick={() => setInstantiateError(null)}>✕</button>
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
      ) : activeTemplates.length === 0 ? (
        <div className="card text-center py-10 px-6 max-w-xl mx-auto">
          <h3 className="text-lg font-display font-semibold text-brand mb-2">
            {showMyGrid ? 'No personal templates yet' : 'No templates in this category'}
          </h3>
          {showMyGrid ? (
            <div className="text-text-secondary text-sm space-y-3 text-left">
              <p>
                <strong className="text-text-primary">My Templates</strong> stores reusable{' '}
                <em>structures</em> (layer stack + materials), not saved quotes.
              </p>
              <p>
                Open a saved quote from the{' '}
                <Link to="/estimates" className="text-accent-text hover:underline">
                  Estimates
                </Link>{' '}
                list — templates do not store customer-specific quotes.
              </p>
              <p>
                To add a structure here: open an estimate →{' '}
                <strong className="text-text-primary">My Templates</strong> in the top bar, or use{' '}
                <strong className="text-text-primary">New template</strong> above.
              </p>
            </div>
          ) : (
            <p className="text-text-secondary text-sm">Try another filter or clear the search.</p>
          )}
        </div>
      ) : (
        <TemplateDeck
          items={activeTemplates}
          getKey={(template) => template.id}
          ariaLabel={showMyGrid ? 'My templates' : 'Standard templates'}
          itemWidth={320}
          renderItem={(template) =>
            renderTemplateCard(template, {
              badge: showMyGrid ? 'My template' : undefined,
            })
          }
        />
      )}

      {/* Unified TemplateBuilder modal — create + edit (My Templates + Platform standards) */}
      {builderMode && (
        <TemplateBuilder
          mode={builderMode}
          template={builderTemplate ?? undefined}
          materials={materials}
          productTypeOptions={masterRef.productTypeOptions}
          productSubtypeOptions={masterRef.productSubtypeOptions}
          processOptions={masterRef.processOptions}
          isAdmin={isAdmin}
          isPlatformAdmin={isPlatformAdmin}
          defaultSaveAsPlatformStandard={builderDefaultSavePlatform}
          onSaved={handleBuilderSaved}
          onClose={handleBuilderClose}
        />
      )}
    </div>
  );
};

export default StandardTemplates;
