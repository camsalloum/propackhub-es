import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Download, ArrowLeft, Layers, Calculator, DollarSign, Loader2, X, Check, Plus, Minus } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import BottomSheet from '../components/BottomSheet';
import FilmStackVisualizer from '../components/FilmStackVisualizer';
import StructureGradeSelect from '../components/StructureGradeSelect';
import { JobHeaderFields } from '../components/JobHeaderFields';
import { BagConfigurator } from '../components/BagConfigurator';
import {
  configuratorTypeForBagSubtype,
  seedBagDimensionPatch,
} from '../lib/bagConfiguratorCatalog';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { usdToDisplay, usdToDisplayPrecise, displayToUsd } from '../lib/currency';
import { runClientCalculation, effectiveMarginPercent } from '../lib/estimateCalc';
import { useVisibilityProfile } from '../hooks/useVisibilityProfile';
import {
  dimensionsForSave,
  estimateNeedsConfiguration,
  normalizeProcessesForSave,
  productTypeForSave,
  validateConfiguredEstimate,
} from '../lib/estimateConfigure';
import { setWorkingEstimateForTemplate } from '../lib/estimateSession';
import { estimateStatusLabel } from '../lib/estimateStatus';
import { groupMaterialsForPicker, type CategoryNode } from '../lib/materialTaxonomy';
import { stackNeedsSolventMix, stackHasSbInk, defaultInkPrintingProcess, inkSolventRatioForProcess, materialAllowedForTemplateLayer, DEFAULT_CLEANING_SOLVENT_KG_PER_JOB, type LaminationRecipe, type InkPrintingProcess } from '@es/engine';
import LaminationFormulaModal from '../components/LaminationFormulaModal';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import {
  DEFAULT_MASTER_REFERENCE,
  defaultUnitValue,
  normalizeProductType,
  normalizeUnitValue,
} from '../lib/masterDataReference';
import {
  findDefaultSolventMaterialId,
  listSolventMaterials,
  resolveSolventCostPerKgUsd,
} from '../lib/solvent';
import {
  dimensionFieldsForEstimation,
  subtypesForFamily,
  defaultSubtypeForFamily,
  engineTypeForFamily,
  ALL_SUBTYPES,
  PRODUCT_FAMILY_LABELS,
  type ProductFamily,
} from '../lib/productCatalog';

interface MaterialItem {
  id: string; name: string; type: string; solidPercent: number;
  density: string; costPerKgUsd: string; wastePercent: number; isSolventBased: boolean;
  hoover?: string | null; substrateFamily?: string | null; subcategoryId?: string | null;
  platformMasterKey?: string | null;
  laminationRecipe?: LaminationRecipe | null;
}

interface LayerItem {
  id: string; materialId: string; materialName: string; materialType: string;
  micron: number; gsm: number; costPerKgUsd: number; isSolventBased: boolean; position: number;
  hoover?: string | null;
  platformMasterKeySnapshot?: string | null;
  costingKeySnapshot?: string | null;
}

interface DimensionState {
  reelWidthMm: number; cutoffMm: number; numberOfUps: number;
  extraPrintingTrimMm: number; piecesPerCut: number; openWidthMm: number; openHeightMm: number;
  // Index signature: dimensions are a flat numeric map; lets us round-trip through
  // Record<string, unknown> for save/load without unsafe casts (Deep Audit §5.1 / task 0.2).
  [key: string]: number;
}

const DEFAULT_PRODUCT_TYPE_OPTIONS = DEFAULT_MASTER_REFERENCE.productTypeOptions;
const DEFAULT_UNIT_OPTIONS = DEFAULT_MASTER_REFERENCE.unitOptions;

const LAYER_TYPE_LABELS: Record<string, string> = {
  substrate: 'Substrate',
  ink: 'Ink & Coating',
  adhesive: 'Adhesive',
};

/** Short labels for the fixed-width structure table Type column */
const LAYER_TYPE_TABLE_LABELS: Record<string, string> = {
  substrate: 'Substrate',
  ink: 'Ink',
  adhesive: 'Adhesive',
};

const EstimateEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { can } = useVisibilityProfile(user?.role);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Core state
  const [estimate, setEstimate] = useState<any>(null);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [slabsState, setSlabsState] = useState<any[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);
  const [requoteWarnings, setRequoteWarnings] = useState<string[]>([]);
  const [orderQuantity, setOrderQuantity] = useState<number>(1000);
  const [orderQuantityUnit, setOrderQuantityUnit] = useState(() => defaultUnitValue());
  const [processesState, setProcessesState] = useState<any[]>([]);
  const { reference: masterReference, version: masterDataVersion } = useMasterDataReference();
  const defaultCleaningKg =
    masterReference.costingDefaults?.cleaningSolventKgPerJob ?? DEFAULT_CLEANING_SOLVENT_KG_PER_JOB;

  // UI state
  const [activeSection, setActiveSection] = useState<'structure' | 'dimensions' | 'slabs' | 'markup'>('structure');
  const [productType, setProductType] = useState<string>('roll');

  // Layer table column visibility — reserved for future optional columns
  const [jobName, setJobName] = useState('New estimate');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerDraftName, setCustomerDraftName] = useState('');
  const [markupPercent, setMarkupPercent] = useState(15);
  const [platesPerKg, setPlatesPerKg] = useState(0);
  const [deliveryPerKg, setDeliveryPerKg] = useState(0);
  const [solventMaterialId, setSolventMaterialId] = useState<string | null>(null);
  const [solventCostOverrideUsd, setSolventCostOverrideUsd] = useState<number | null>(null);
  const [cleaningSolventKgPerJob, setCleaningSolventKgPerJob] = useState(defaultCleaningKg);
  const [inkPrintingProcess, setInkPrintingProcess] = useState<InkPrintingProcess | null>(null);
  const [inkSolventRatioOverride, setInkSolventRatioOverride] = useState<number | null>(null);
  const [laminationRecipeOverrides, setLaminationRecipeOverrides] = useState<Record<string, LaminationRecipe>>({});
  const [formulaModalLayerId, setFormulaModalLayerId] = useState<string | null>(null);
  const [productSubtype, setProductSubtype] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<DimensionState>({
    reelWidthMm: 800, cutoffMm: 600, numberOfUps: 1,
    extraPrintingTrimMm: 0, piecesPerCut: 1, openWidthMm: 200, openHeightMm: 250,
  });
  const [layerSheetOpen, setLayerSheetOpen] = useState(false);
  const [addLayerSheetOpen, setAddLayerSheetOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const [mobileStackOpen, setMobileStackOpen] = useState(false);
  const [needsConfiguration, setNeedsConfiguration] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [solventDetailsExpanded, setSolventDetailsExpanded] = useState(false);
  const structureTableRef = useRef<HTMLDivElement>(null);
  const [structureTableHeight, setStructureTableHeight] = useState<number | null>(null);

  const location = useLocation();
  const locationState = location.state as {
    returnTo?: string;
    configureFromTemplate?: boolean;
  } | null;
  const returnTo =
    locationState?.returnTo === '/templates'
      ? '/templates'
      : '/estimates';

  const editingLayer = layers.find((l) => l.id === editingLayerId) ?? null;

  const templateClassification = useMemo(() => {
    const tc = (dimensions as { templateClassification?: { materialClass?: string; structureType?: string } })
      .templateClassification;
    if (!tc?.materialClass && !tc?.structureType) return null;
    return {
      materialClass: tc.materialClass,
      structureType: tc.structureType,
      productType: engineTypeForFamily(productType),
    };
  }, [dimensions, productType]);

  const materialGroupsByType = useMemo(() => {
    const types = ['substrate', 'ink', 'adhesive'] as const;
    const substrateFilter = templateClassification
      ? (m: { type: string; substrateFamily?: string | null }) =>
          materialAllowedForTemplateLayer(m, 'substrate', templateClassification)
      : undefined;
    return Object.fromEntries(
      types.map((t) => [
        t,
        groupMaterialsForPicker(
          materials,
          categories,
          t,
          t === 'substrate' ? substrateFilter : undefined
        ),
      ])
    ) as Record<string, ReturnType<typeof groupMaterialsForPicker>>;
  }, [materials, categories, templateClassification]);

  const renderMaterialOptions = (layerType: string) => (
    <>
      {(materialGroupsByType[layerType] || []).map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.materials.map((m) => (
            <option key={m.id} value={m.id} title={m.hoover || ''}>
              {m.substrateFamily ? `${m.substrateFamily} – ` : ''}{m.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );

  const engineMaterials = useMemo(
    () =>
      materials.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type as 'substrate' | 'ink' | 'adhesive',
        solidPercent: m.solidPercent,
        density: parseFloat(m.density) || 0.9,
        costPerKgUsd: parseFloat(m.costPerKgUsd) || 0,
        wastePercent: m.wastePercent,
        isSolventBased: m.isSolventBased,
        substrateFamily: m.substrateFamily ?? null,
        laminationRecipe: m.laminationRecipe ?? null,
      })),
    [materials]
  );

  const layerMaterialRefs = useMemo(
    () => layers.filter((l) => l.materialId).map((l) => ({ materialId: l.materialId })),
    [layers]
  );

  const needsSolventMix = useMemo(
    () => stackNeedsSolventMix(layerMaterialRefs, engineMaterials),
    [layerMaterialRefs, engineMaterials]
  );

  const hasSbInk = useMemo(
    () => stackHasSbInk(layerMaterialRefs, engineMaterials),
    [layerMaterialRefs, engineMaterials]
  );

  const inferredInkPrintingProcess = useMemo(
    () => defaultInkPrintingProcess(layerMaterialRefs, engineMaterials),
    [layerMaterialRefs, engineMaterials]
  );

  const effectiveInkPrintingProcess = inkPrintingProcess ?? inferredInkPrintingProcess;
  const processDefaultInkRatio = inkSolventRatioForProcess(effectiveInkPrintingProcess);
  const effectiveInkSolventRatio = inkSolventRatioOverride ?? processDefaultInkRatio;

  const inkMakeupRatioTooltip =
    'Makeup solvent = dilution needed before printing. Dividing by 1.5 means every 1.5 gsm of ink needs 1 gsm of solvent. Dividing by 1.0 means 1 gsm of ink needs 1 gsm of solvent, more dilution.';

  /** Estimators / admins — not sales-only profiles. */
  const canConfigureSolvent = can('solventMixCost') || can('markupPercent');

  const solventMaterialOptions = useMemo(() => listSolventMaterials(materials), [materials]);

  const resolvedSolventCostPerKgUsd = useMemo(() => {
    if (solventCostOverrideUsd != null && Number.isFinite(solventCostOverrideUsd)) {
      return solventCostOverrideUsd;
    }
    return resolveSolventCostPerKgUsd(materials, { solventMaterialId });
  }, [materials, solventMaterialId, solventCostOverrideUsd]);

  const formulaModalLayer = layers.find((l) => l.id === formulaModalLayerId) ?? null;
  const formulaModalRecipe = useMemo(() => {
    if (!formulaModalLayer) return null;
    const override = laminationRecipeOverrides[formulaModalLayer.id];
    if (override) return override;
    const mat = materials.find((m) => m.id === formulaModalLayer.materialId);
    return mat?.laminationRecipe ?? null;
  }, [formulaModalLayer, laminationRecipeOverrides, materials]);

  useEffect(() => {
    if (!id && !estimate?.cleaningSolventKgPerJob) {
      setCleaningSolventKgPerJob(defaultCleaningKg);
    }
  }, [id, defaultCleaningKg, estimate?.cleaningSolventKgPerJob]);

  useEffect(() => {
    if (!needsSolventMix || solventMaterialOptions.length === 0) return;
    if (solventMaterialId && solventMaterialOptions.some((m) => m.id === solventMaterialId)) return;
    setSolventMaterialId(findDefaultSolventMaterialId(materials));
  }, [needsSolventMix, solventMaterialId, solventMaterialOptions, materials]);

  const densityForMaterial = (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId);
    return mat?.density ? parseFloat(mat.density) : 0.9;
  };

  const moveLayer = (index: number, direction: -1 | 1, templateLocked = false) => {
    const next = index + direction;
    if (next < 0 || next >= layers.length) return;
    setLayers((prev) => {
      if (templateLocked && prev[index]?.materialType !== 'ink') return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy.map((l, i) => ({ ...l, position: i }));
    });
  };

  const reorderLayers = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= layers.length || to >= layers.length) return;
    setLayers((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy.map((l, i) => ({ ...l, position: i }));
    });
  };

  const addLayerOfType = (type: 'substrate' | 'ink' | 'adhesive', materialId?: string) => {
    if (estimate?.sourceTemplateKey && type !== 'ink') return;
    const defaultMat = materialId
      ? materials.find((m) => m.id === materialId)
      : materials.find((m) => m.type === type);
    const micron = type === 'substrate' ? 25 : type === 'ink' ? 2 : 2;
    const density = defaultMat?.density ? parseFloat(defaultMat.density) : 0.9;
    const newLayer: LayerItem = {
      id: crypto.randomUUID(),
      materialId: defaultMat?.id || '',
      materialName: defaultMat?.name || 'Select material',
      materialType: type,
      micron,
      // Substrate: gsm = micron × density; Ink/Adhesive: user enters dry gsm = micron directly
      gsm: type === 'substrate' ? micron * density : micron,
      costPerKgUsd: defaultMat ? parseFloat(defaultMat.costPerKgUsd) : 0,
      isSolventBased: defaultMat?.isSolventBased || false,
      position: layers.length,
      hoover: defaultMat?.hoover || null,
    };
    setLayers((prev) => [...prev, newLayer]);
    setAddLayerSheetOpen(false);
  };

  const insertInkLayerAfter = (afterIndex: number) => {
    const defaultMat = materials.find((m) => m.type === 'ink');
    const micron = 2;
    const newLayer: LayerItem = {
      id: crypto.randomUUID(),
      materialId: defaultMat?.id || '',
      materialName: defaultMat?.name || 'Select material',
      materialType: 'ink',
      micron,
      gsm: micron,
      costPerKgUsd: defaultMat ? parseFloat(defaultMat.costPerKgUsd) : 0,
      isSolventBased: defaultMat?.isSolventBased || false,
      position: afterIndex + 1,
      hoover: defaultMat?.hoover ?? null,
    };
    setLayers((prev) => {
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, newLayer);
      return copy.map((l, i) => ({ ...l, position: i }));
    });
  };

  const openLayerEdit = (layerId: string) => {
    setEditingLayerId(layerId);
    setLayerSheetOpen(true);
  };

  const productTypeOptions = masterReference.productTypeOptions ?? DEFAULT_PRODUCT_TYPE_OPTIONS;
  const unitOptions = masterReference.unitOptions ?? DEFAULT_UNIT_OPTIONS;

  // `productType` state holds the Master-Data product-type CODE (family): roll/sleeve/pouch/bag/custom.
  // The engine costing type is derived (bag → pouch). Subtypes link to a family by `parent`.
  const productFamily: ProductFamily = productType;
  const estimationDimensionFields = dimensionFieldsForEstimation(productFamily, productSubtype);
  const bagConfiguratorType = configuratorTypeForBagSubtype(productSubtype);
  const bagConfiguratorActive = productFamily === 'bag' && bagConfiguratorType != null;

  // Subtype list — driven by Master Data (productSubtypeOptions), not the static catalog.
  // Fall back to static catalog only when Master Data hasn't loaded yet.
  const availableSubtypes: Array<{ code: string; label: string; parent: string; group?: string | null }> = (() => {
    const mdSubtypes = (masterReference.productSubtypeOptions ?? []).filter(s => s.parent === productFamily);
    if (mdSubtypes.length > 0) return mdSubtypes;
    // Static fallback
    return subtypesForFamily(productFamily).map(s => ({ code: s.key, label: s.label, parent: s.family, group: null }));
  })();

  const subtypeParentByCode = new Map(
    (masterReference.productSubtypeOptions ?? []).map((s) => [s.code, s.parent])
  );

  useEffect(() => {
    setProductType((prev) => normalizeProductType(prev, productTypeOptions));
    setOrderQuantityUnit((prev) => normalizeUnitValue(prev, unitOptions));
  }, [productTypeOptions, unitOptions]);

  // Seed bag schematic defaults when subtype selects a configurator-backed bag type.
  useEffect(() => {
    if (!bagConfiguratorActive || !bagConfiguratorType) return;
    setDimensions((prev) => {
      const patch = seedBagDimensionPatch(bagConfiguratorType, prev);
      if (Object.keys(patch).length === 0) return prev;
      return { ...prev, ...patch };
    });
  }, [bagConfiguratorActive, bagConfiguratorType, productSubtype]);

  // Load materials + customers on mount
  const loadBaseData = useCallback(async () => {
    let mats: MaterialItem[] = [];
    let custs: any[] = [];

    try {
      const [materialRows, cats] = await Promise.all([
        apiClient.getMaterials(),
        apiClient.getCategories().catch(() => []),
      ]);
      mats = materialRows || [];
      setMaterials(mats);
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setLoadError('Could not load materials. Layer defaults may be incomplete.');
    }

    return { mats, custs };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoadError(null);
        setLoading(true);
        const { mats } = await loadBaseData();

        if (id) {
          await fetchEstimate(id);
        } else {
          const templateId = searchParams.get('template') ? Number(searchParams.get('template')) : null;
          const paramCustomer = searchParams.get('customer') || '';
          const paramJobName = searchParams.get('jobName') || 'New estimate';
          const paramProductType = normalizeProductType(
            searchParams.get('productType') || searchParams.get('type'),
            productTypeOptions
          );
          const paramOrderQty = searchParams.get('orderQuantity');
          const paramOrderUnit = searchParams.get('orderQuantityUnit');
          const defaultLayers = getTemplateLayers(templateId, mats || []);
          setJobName(paramJobName);
          setCustomerId(paramCustomer);
          setProductType(paramProductType);
          if (paramOrderQty && !Number.isNaN(Number(paramOrderQty))) {
            setOrderQuantity(Number(paramOrderQty));
          }
          if (paramOrderUnit) setOrderQuantityUnit(normalizeUnitValue(paramOrderUnit, unitOptions));
          setLayers(defaultLayers);
          setSlabsState([
            { quantityKg: 1000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 },
            { quantityKg: 2000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 },
            { quantityKg: 5000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 },
          ]);
          setEstimate({ id: undefined, status: 'draft', displayCurrency: 'USD', salePricePerKg: 0, materialCostPerKg: 0, totalGsm: 0, totalMicron: 0 });
          const statePriceChanges = (location.state as any)?.priceChanges;
          if (statePriceChanges) setPriceChanges(statePriceChanges);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load base data:', err);
        setLoadError('Failed to load estimate data.');
        setLoading(false);
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    const fromUrl = searchParams.get('customer')?.trim();
    if (fromUrl && !customerId) setCustomerId(fromUrl);
  }, [searchParams, customerId]);

  useEffect(() => {
    if (masterDataVersion === 0) return;
    loadBaseData();
  }, [masterDataVersion, loadBaseData]);

  // Map template ID → layers using library-driven resolution (type/family, not hardcoded names).
  // Task 5.2: replaced hardcoded name-matching with find-by-type fallbacks.
  // Templates are now instantiated server-side (StandardTemplates → instantiate endpoint);
  // this function is only reached when ?template= is a legacy numeric ID in the URL,
  // so we simply scaffold one substrate + one ink using the first available material of each type.
  function getTemplateLayers(_templateId: number | null, mats: MaterialItem[]): LayerItem[] {
    const findByType = (type: string) => mats.find(m => m.type === type);
    const defaultSubstrate = findByType('substrate');
    const defaultInk = findByType('ink');
    const toLayer = (mat: MaterialItem | undefined, type: string, micron: number, position: number): LayerItem => ({
      id: crypto.randomUUID(),
      materialId: mat?.id || '',
      materialName: mat?.name || 'Select material',
      materialType: mat?.type || type,
      micron,
      gsm: (mat?.type || type) === 'substrate'
        ? micron * (mat?.density ? parseFloat(mat.density) : 0.9)
        : micron,
      costPerKgUsd: mat ? parseFloat(mat.costPerKgUsd) : 0,
      isSolventBased: mat?.isSolventBased || false,
      position,
      hoover: mat?.hoover || null,
    });
    return [
      toLayer(defaultSubstrate, 'substrate', 30, 0),
      toLayer(defaultInk, 'ink', 5, 1),
    ];
  }

  const fetchEstimate = async (estimateId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true);
      const data = await apiClient.getEstimate(estimateId);
      const mappedLayers: LayerItem[] = (data.layers || []).map((l: any) => ({
        id: l.id, materialId: l.materialId, materialName: l.materialName || 'Unknown',
        materialType: l.materialType || 'substrate', micron: parseFloat(l.micron) || 0,
        gsm: parseFloat(l.gsm) || 0,
        // Prefer the saved per-layer override (unit_cost_snapshot_usd) over the live library price
        costPerKgUsd: parseFloat(l.unit_cost_snapshot_usd || l.unitCostSnapshotUsd) || parseFloat(l.materialCostPerKgUsd) || 0,
        isSolventBased: Boolean(l.isSolventBased ?? l.materialIsSolventBased), position: l.position || 0,
        hoover: l.materialHoover || null,
        platformMasterKeySnapshot: l.platformMasterKeySnapshot ?? l.platform_master_key_snapshot ?? null,
        costingKeySnapshot: l.costingKeySnapshot ?? l.costing_key_snapshot ?? null,
      }));
      setEstimate(data);
      try {
        const propRows = await apiClient.getEstimateProposals(estimateId);
        setProposals(propRows || []);
      } catch {
        setProposals([]);
      }
      setLayers(mappedLayers);
      setSlabsState((data.slabs || []).map((s: any) => {
        const fx = parseFloat(data.exchangeRateUsdToDisplay) || 1;
        const usd = parseFloat(s.pricePerKg) || 0; // server always stores USD
        return {
          ...s,
          quantityKg: parseFloat(s.quantityKg) || 0,
          pricePerKgUsd: usd,
          pricePerKg: usdToDisplay(usd, fx),
          total: (parseFloat(s.quantityKg) || 0) * usdToDisplay(usd, fx),
        };
      }));
      setProductType(
        // Prefer subtype-based family lookup (e.g. 'bag_punch_handle' → 'bag').
        // Use static ALL_SUBTYPES catalog — no async dependency, always available on first render.
        (() => {
          if (data.productSubtype) {
            const staticEntry = ALL_SUBTYPES.find((s) => s.key === data.productSubtype);
            if (staticEntry) return staticEntry.family;
            // Fallback: master data map if already loaded
            const mdParent = subtypeParentByCode.get(data.productSubtype);
            if (mdParent) return mdParent;
          }
          return normalizeProductType(data.productType, productTypeOptions);
        })()
      );
      setProductSubtype(data.productSubtype ?? null);
      setJobName(data.jobName || '');
      setCustomerId(data.customerId || '');
      setMarkupPercent(parseFloat(data.markupPercent) || 15);
      setPlatesPerKg(parseFloat(data.platesPerKg) || 0);
      setDeliveryPerKg(parseFloat(data.deliveryPerKg) || 0);
      if (data.solventMaterialId) {
        setSolventMaterialId(data.solventMaterialId);
      } else {
        const loadedLayerRefs = (data.layers || [])
          .filter((l: { materialId?: string }) => l.materialId)
          .map((l: { materialId: string }) => ({ materialId: l.materialId }));
        const matMap = new Map(
          materials.map((m) => [
            m.id,
            {
              id: m.id,
              name: m.name,
              type: m.type as 'substrate' | 'ink' | 'adhesive',
              solidPercent: m.solidPercent,
              density: parseFloat(m.density) || 0.9,
              costPerKgUsd: parseFloat(m.costPerKgUsd) || 0,
              wastePercent: m.wastePercent,
              isSolventBased: m.isSolventBased,
            },
          ])
        );
        if (stackNeedsSolventMix(loadedLayerRefs, matMap)) {
          setSolventMaterialId(findDefaultSolventMaterialId(materials));
        }
      }
      if (data.solventCostPerKgUsd != null) {
        setSolventCostOverrideUsd(parseFloat(data.solventCostPerKgUsd));
      } else {
        setSolventCostOverrideUsd(null);
      }
      if (data.cleaningSolventKgPerJob != null) {
        setCleaningSolventKgPerJob(parseFloat(data.cleaningSolventKgPerJob));
      } else {
        setCleaningSolventKgPerJob(defaultCleaningKg);
      }
      if (data.laminationRecipeOverrides && typeof data.laminationRecipeOverrides === 'object') {
        setLaminationRecipeOverrides(data.laminationRecipeOverrides as Record<string, LaminationRecipe>);
      } else {
        setLaminationRecipeOverrides({});
      }
      if (data.inkPrintingProcess === 'flexo' || data.inkPrintingProcess === 'rotogravure') {
        setInkPrintingProcess(data.inkPrintingProcess);
      } else {
        setInkPrintingProcess(null);
      }
      if (data.solventRatio != null) {
        const ratio = parseFloat(data.solventRatio);
        setInkSolventRatioOverride(Number.isFinite(ratio) && ratio > 0 ? ratio : null);
      } else {
        setInkSolventRatioOverride(null);
      }
      if (data.orderQuantityKg) setOrderQuantity(parseFloat(data.orderQuantityKg));
      if (data.orderQuantityUnit) {
        setOrderQuantityUnit(normalizeUnitValue(data.orderQuantityUnit, unitOptions));
      }
      if (data.processes) setProcessesState(normalizeProcessesForSave(data.processes));
      const fromTemplate = estimateNeedsConfiguration(
        data.dimensions as Record<string, unknown> | null | undefined
      );
      if (fromTemplate) {
        setNeedsConfiguration(true);
        setActiveSection('structure');
        setDimensions({
          reelWidthMm: 0,
          cutoffMm: 0,
          numberOfUps: data.dimensions?.numberOfUps || 1,
          extraPrintingTrimMm: 0,
          piecesPerCut: 1,
          openWidthMm: 0,
          openHeightMm: 0,
          templateClassification: data.dimensions?.templateClassification,
          configureFromTemplate: true,
        } as DimensionState & { templateClassification?: unknown; configureFromTemplate?: boolean });
      } else if (data.dimensions) {
        setDimensions({
          reelWidthMm: 800,
          cutoffMm: 600,
          numberOfUps: 1,
          extraPrintingTrimMm: 0,
          piecesPerCut: 1,
          openWidthMm: 200,
          openHeightMm: 250,
          ...(data.dimensions as Partial<DimensionState>),
        });
      }
      if (
        !options?.silent &&
        !fromTemplate &&
        (!data.salePricePerKg || parseFloat(data.salePricePerKg) === 0)
      ) {
        try {
          const result = await apiClient.calculateEstimate(estimateId);
          applyCalculationResult(data, result);
        } catch (calcErr) {
          console.warn('Auto-calculate skipped:', calcErr);
        }
      }
      // BUG-8: read priceChanges from nav state in the :id load path too
      // (requote navigates to /estimate/:id — the banner was dropped because it only
      // ran in the no-id branch; read it here so requote banner shows correctly)
      const navPriceChanges = (location.state as { priceChanges?: unknown[] } | null)?.priceChanges;
      if (navPriceChanges?.length) {
        setPriceChanges(navPriceChanges);
        setRequoteWarnings((location.state as { warnings?: string[] } | null)?.warnings ?? []);
      }
    } catch (error) {
      console.error('Failed to load estimate:', error);
      setEstimate(null);
      setLoadError('Estimate not found or could not be loaded.');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  const applyCalculationResult = (baseEstimate: any, result: any) => {
    const fx = parseFloat(baseEstimate.exchangeRateUsdToDisplay || estimate?.exchangeRateUsdToDisplay) || 1;
    const saleUsd = result.estimate?.salePricePerKg || 0;
    const saleDisplay = usdToDisplay(saleUsd, fx);
    setEstimate((prev: any) => ({
      ...prev,
      ...baseEstimate,
      ...result.estimate,
      salePricePerKg: saleUsd,
      salePriceDisplay: saleDisplay,
      materialCostPerKg: result.estimate?.materialCostPerKg,
      totalGsm: result.estimate?.totalGsm,
      totalMicron: result.estimate?.totalMicron,
    }));
    if (result.slabs?.length) {
      setSlabsState(result.slabs.map((s: any) => {
        const usd = s.pricePerKg || 0; // server /calculate returns USD
        const display = usdToDisplay(usd, fx);
        return {
          quantityKg: s.quantityKg,
          pricePerKgUsd: usd,
          pricePerKg: display,
          total: (s.quantityKg || 0) * display,
        };
      }));
    }
  };

  const buildSavePayload = useCallback((customerIdOverride?: string) => {
    const linkedCustomer = customerIdOverride ?? customerId;
    const payload: Record<string, unknown> = {
      jobName,
      customerId: linkedCustomer || undefined,
      productType: productTypeForSave(estimate?.productType, productType, productTypeOptions),
      productSubtype: productSubtype ?? undefined,
      dimensions: dimensionsForSave(dimensions as Record<string, unknown>),
      markupPercent,
      platesPerKg,
      deliveryPerKg,
      solventMaterialId: needsSolventMix ? solventMaterialId ?? undefined : undefined,
      solventCostPerKgUsd: needsSolventMix ? resolvedSolventCostPerKgUsd : undefined,
      laminationRecipeOverrides:
        Object.keys(laminationRecipeOverrides).length > 0 ? laminationRecipeOverrides : undefined,
      cleaningSolventKgPerJob: needsSolventMix ? cleaningSolventKgPerJob : undefined,
      inkPrintingProcess: hasSbInk ? effectiveInkPrintingProcess : undefined,
      solventRatio: hasSbInk ? effectiveInkSolventRatio : undefined,
      orderQuantityKg: orderQuantity,
      orderQuantityUnit,
      layers: layers.map((l, i) => ({
        materialId: l.materialId,
        micron: Number(l.micron),
        gsm: Number(l.gsm) || 0,
        position: i,
        unitCostSnapshotUsd: l.costPerKgUsd > 0 ? Number(l.costPerKgUsd) : undefined,
      })),
    };
    // Visibility can hide processes/slabs on GET — omit empty arrays so PATCH does not
    // delete-and-reinsert children the editor never loaded (HAR: processes:[] wiped DB rows).
    if (processesState.length > 0) {
      payload.processes = normalizeProcessesForSave(processesState);
    }
    if (slabsState.length > 0) {
      payload.slabs = slabsState.map((s) => ({
        quantityKg: Number(s.quantityKg),
        pricePerKg: Number(s.pricePerKgUsd ?? s.pricePerKg) || 0,
      }));
    }
    return payload;
  }, [jobName, customerId, estimate?.productType, productType, productTypeOptions, productSubtype, needsSolventMix, hasSbInk, effectiveInkPrintingProcess, effectiveInkSolventRatio, dimensions, markupPercent, platesPerKg, deliveryPerKg, solventMaterialId, resolvedSolventCostPerKgUsd, laminationRecipeOverrides, cleaningSolventKgPerJob, orderQuantity, orderQuantityUnit, layers, slabsState, processesState]);

  /** Link estimate to a customer row — create customer record if user typed a new name. */
  const ensureCustomerForSave = async (): Promise<string | undefined> => {
    if (customerId?.trim()) return customerId;
    const name = customerDraftName.trim();
    if (!name) return undefined;
    const customers = await apiClient.getCustomers();
    const match = (customers || []).find(
      (c: { companyName?: string }) => c.companyName?.toLowerCase() === name.toLowerCase()
    );
    const id = match?.id ?? (await apiClient.createCustomer({ companyName: name })).id;
    setCustomerId(id);
    setCustomerDraftName('');
    return id;
  };

  const slabQuantitiesKey = slabsState.map((s) => s.quantityKg).join(',');
  const layerInputsKey = layers.map((l) => `${l.materialId}:${l.micron}:${l.costPerKgUsd}`).join('|');

  const clientCalcResult = useMemo(() => {
    if (loading || materials.length === 0 || layers.length === 0) return null;
    if (layers.some((l) => !l.materialId)) return null;
    if (layers.every((l) => l.micron === 0)) return null; // nothing to calculate yet
    try {
      // Build per-layer virtual material IDs so each layer can have its own price override.
      // When a layer's costPerKgUsd differs from the library material, inject a patched entry.
      const patchedMaterials = [...materials];
      const layerMaterialIds = layers.map((l, i) => {
        const libMat = materials.find((m) => m.id === l.materialId);
        const libraryPrice = libMat ? parseFloat(libMat.costPerKgUsd) || 0 : 0;
        if (libMat && l.costPerKgUsd > 0 && l.costPerKgUsd !== libraryPrice) {
          // Inject a virtual material keyed by layer id with the overridden price
          patchedMaterials.push({ ...libMat, id: l.id, costPerKgUsd: String(l.costPerKgUsd) });
          return { id: l.id, materialId: l.id, micron: l.micron, position: i };
        }
        return { id: l.id, materialId: l.materialId, micron: l.micron, position: i };
      });

      return runClientCalculation({
        layers: layerMaterialIds,
        materials: patchedMaterials,
        productType: productType as 'roll' | 'sleeve' | 'pouch' | 'bag',
        dimensions: { ...dimensions },
        markupPercent,
        platesPerKg,
        deliveryPerKg,
        slabs: slabsState,
        processes: processesState,
        orderQuantityKg: orderQuantity,
        displayCurrency: estimate?.displayCurrency || 'USD',
        exchangeRateUsdToDisplay: parseFloat(estimate?.exchangeRateUsdToDisplay) || 1,
        solventCostPerKgUsd: resolvedSolventCostPerKgUsd,
        laminationRecipeOverrides,
        cleaningSolventKgPerJob,
        inkPrintingProcess: hasSbInk ? effectiveInkPrintingProcess : undefined,
        inkSolventRatio: hasSbInk ? effectiveInkSolventRatio : undefined,
      });
    } catch {
      return null;
    }
  }, [
    loading, materials, layerInputsKey, productType, dimensions,
    markupPercent, platesPerKg, deliveryPerKg, slabQuantitiesKey,
    estimate?.displayCurrency, estimate?.exchangeRateUsdToDisplay,
    solventMaterialId, resolvedSolventCostPerKgUsd, laminationRecipeOverrides, cleaningSolventKgPerJob,
    hasSbInk, effectiveInkPrintingProcess, effectiveInkSolventRatio, layers.length,
  ]);

  const solventCostLines = useMemo(() => {
    const e = clientCalcResult?.estimate;
    if (!e || !needsSolventMix) return [];
    const lines: Array<{ key: string; label: string; perKgUsd: number; perM2Usd: number }> = [];
    const inkKg = e.inkMakeupSolventCostPerKg ?? 0;
    const inkM2 = e.inkMakeupSolventCostPerM2 ?? 0;
    if (inkKg > 0 || inkM2 > 0) {
      const proc = e.inkPrintingProcessResolved === 'rotogravure' ? 'roto' : 'flexo';
      lines.push({ key: 'ink-makeup', label: `Ink makeup (${proc})`, perKgUsd: inkKg, perM2Usd: inkM2 });
    }
    const lamKg = e.laminationSolventCostPerKg ?? 0;
    const lamM2 = e.laminationSolventCostPerM2 ?? 0;
    if (lamKg > 0 || lamM2 > 0) {
      lines.push({ key: 'lamination', label: 'Lamination EA', perKgUsd: lamKg, perM2Usd: lamM2 });
    }
    const cleanKg = e.cleaningSolventCostPerKg ?? 0;
    const cleanM2 = e.cleaningSolventCostPerM2 ?? 0;
    if (cleanKg > 0 || cleanM2 > 0) {
      lines.push({ key: 'cleaning', label: 'Press cleaning', perKgUsd: cleanKg, perM2Usd: cleanM2 });
    }
    return lines;
  }, [clientCalcResult, needsSolventMix]);

  const solventTotalPerKgUsd = useMemo(() => {
    if (clientCalcResult?.estimate.solventMixCostPerKg != null) {
      return clientCalcResult.estimate.solventMixCostPerKg;
    }
    return solventCostLines.reduce((sum, line) => sum + line.perKgUsd, 0);
  }, [solventCostLines, clientCalcResult]);

  const solventTotalPerM2Usd = useMemo(() => {
    if (clientCalcResult?.estimate.solventMixCostPerM2 != null) {
      return clientCalcResult.estimate.solventMixCostPerM2;
    }
    return solventCostLines.reduce((sum, line) => sum + line.perM2Usd, 0);
  }, [solventCostLines, clientCalcResult]);

  const rmTotals = useMemo(() => {
    const e = clientCalcResult?.estimate;
    if (!e) return null;
    const layerPerM2 =
      e.layerRmCostPerM2 ??
      e.layers?.reduce((sum, layer) => sum + (layer.costPerM2 ?? 0), 0) ??
      0;
    const solventPerM2 = e.solventMixCostPerM2 ?? solventTotalPerM2Usd;
    const rmPerKg = e.materialCostPerKg ?? 0;
    const rmPerM2 = e.rmCostPerM2 ?? layerPerM2 + solventPerM2;
    return { rmPerKg, rmPerM2, layerPerM2, solventPerM2 };
  }, [clientCalcResult, solventTotalPerM2Usd]);

  const structureMetrics = useMemo(() => {
    const e = clientCalcResult?.estimate;
    const fallbackGsm = layers.reduce((s, l) => s + (l.gsm || 0), 0);
    const fallbackSubstrateGauge = layers
      .filter((l) => l.materialType === 'substrate')
      .reduce((s, l) => s + l.micron, 0);
    if (!e) {
      return {
        totalGsm: fallbackGsm,
        substrateGaugeMicron: fallbackSubstrateGauge,
        totalConstructionMicron: null as number | null,
        structureDensity: null as number | null,
      };
    }
    return {
      totalGsm: e.totalGsm ?? fallbackGsm,
      substrateGaugeMicron: e.substrateGaugeMicron ?? fallbackSubstrateGauge,
      totalConstructionMicron: e.totalMicron ?? null,
      structureDensity: e.filmDensity ?? null,
    };
  }, [clientCalcResult, layers]);

  const visualizerLayers = useMemo(
    () =>
      layers.map((l) => {
        const mat = materials.find((m) => m.id === l.materialId);
        return {
          id: l.id,
          type: l.materialType,
          material: l.materialName,
          micron: l.micron,
          gsm: l.gsm,
          family: mat?.substrateFamily ?? null,
        };
      }),
    [layers, materials]
  );

  useEffect(() => {
    if (!clientCalcResult) return;
    const fx = parseFloat(estimate?.exchangeRateUsdToDisplay) || 1;
    const saleUsd = clientCalcResult.estimate.salePricePerKg || 0;
    const saleDisplay = usdToDisplay(saleUsd, fx);
    setEstimate((prev: any) => ({
      ...prev,
      salePricePerKg: saleUsd,
      salePriceDisplay: saleDisplay,
      materialCostPerKg: clientCalcResult.estimate.materialCostPerKg,
      totalGsm: clientCalcResult.estimate.totalGsm,
      totalMicron: clientCalcResult.estimate.totalMicron,
      substrateGaugeMicron: clientCalcResult.estimate.substrateGaugeMicron,
      filmDensity: clientCalcResult.estimate.filmDensity,
    }));
    setLayers((prev) =>
      prev.map((l, i) => {
        const calcLayer = clientCalcResult.estimate.layers[i];
        return calcLayer?.gsm != null ? { ...l, gsm: calcLayer.gsm } : l;
      })
    );
    setSlabsState((prev) =>
      prev.map((s, i) => {
        const calcSlab = clientCalcResult.slabs[i];
        // Engine always returns USD — keep USD canonical, compute display separately
        const usd = calcSlab
          ? calcSlab.pricePerKg
          : clientCalcResult.estimate.salePricePerKg || 0;
        const priceDisplay = usdToDisplay(usd, fx);
        return {
          ...s,
          pricePerKgUsd: usd,
          pricePerKg: priceDisplay,
          total: s.quantityKg * priceDisplay,
        };
      })
    );
  }, [clientCalcResult, estimate?.exchangeRateUsdToDisplay]);

  useEffect(() => {
    const el = structureTableRef.current;
    if (!el) return;
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) setStructureTableHeight(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    layers.length,
    needsSolventMix,
    solventDetailsExpanded,
    estimate?.sourceTemplateKey,
    activeSection,
  ]);

  const persistEstimate = async (): Promise<boolean> => {
    if (saving) return false;
    if (layers.length === 0) {
      alert('Add at least one layer before saving.');
      return false;
    }
    if (layers.some((l) => !l.materialId)) {
      alert('Select a material for every layer before saving.');
      return false;
    }

    setSaving(true);
    setSaveNotice(null);
    try {
      const linkedCustomerId = await ensureCustomerForSave();
      const payload = buildSavePayload(linkedCustomerId);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        localStorage.setItem(`offlineDraft:${estimate?.id || 'new'}`, JSON.stringify(payload));
        alert('Offline — draft saved locally');
        return false;
      }
      if (estimate?.id) {
        await apiClient.updateEstimate(estimate.id, payload);
        const templateKey = estimate.sourceTemplateKey?.trim();
        if (templateKey) {
          setWorkingEstimateForTemplate(templateKey, estimate.id);
        }
        setNeedsConfiguration(false);
        await fetchEstimate(estimate.id, { silent: true });
        setSaveNotice('Changes saved.');
        return true;
      }
      const saved = await apiClient.createEstimate(payload);
      const templateKey = saved?.sourceTemplateKey?.trim();
      if (templateKey && saved?.id) {
        setWorkingEstimateForTemplate(templateKey, saved.id);
      }
      navigate(`/estimate/${saved.id}`, { replace: true });
      setSaveNotice('Changes saved.');
      return true;
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(`Save failed: ${err.message || 'Unknown error'}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCalculate = async () => {
    if (!estimate?.id || calculating) return;
    const validationError = validateConfiguredEstimate({
      layers,
      productType,
      dimensions: dimensions as Record<string, unknown>,
    });
    if (validationError) {
      alert(validationError);
      if (
        validationError.includes('Structure') ||
        validationError.includes('thickness') ||
        validationError.includes('µ') ||
        validationError.includes('layer')
      ) {
        setActiveSection('structure');
      } else {
        setActiveSection('structure');
      }
      return;
    }
    setCalculating(true);
    setSaveNotice(null);
    try {
      const saved = await persistEstimate();
      if (!saved) return;
      const result = await apiClient.calculateEstimate(estimate.id);
      applyCalculationResult(estimate, result);
      await fetchEstimate(estimate.id, { silent: true });
      setSaveNotice('Calculated.');
    } catch (calcErr) {
      const msg = calcErr instanceof Error ? calcErr.message : 'Calculate failed';
      setSaveNotice(`Calculate failed: ${msg}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleCancel = () => {
    const leaving =
      needsConfiguration ||
      jobName.trim() !== (estimate?.jobName || '').trim() ||
      customerId !== (estimate?.customerId || '');
    if (leaving && !window.confirm('Leave this estimate? Your draft stays in the estimates list.')) {
      return;
    }
    navigate(returnTo);
  };

  const handleSave = () => void persistEstimate();

  const handleRequote = async () => {
    if (!estimate?.id) return;
    try {
      const res = await apiClient.requoteEstimate(estimate.id);
      if (res?.id) {
        setPriceChanges(res.price_changes || []);
        setRequoteWarnings(res.warnings || []);
        navigate(`/estimate/${res.id}`, {
          state: { priceChanges: res.price_changes || [], warnings: res.warnings || [] },
        });
      }
    } catch (err) { alert('Failed to create re-quote'); }
  };

  const downloadProposalPdf = async () => {
    try {
      const blob = await apiClient.getProposalPdf(id as string);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `proposal-${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) { console.error('Failed to download proposal PDF', error); }
  };

  const handleSaveAsTemplate = async () => {
    if (!estimate?.id) {
      alert('Save the estimate before creating a template.');
      return;
    }
    const name = prompt('Name for My Templates (reusable structure):', jobName || estimate.jobName);
    if (!name?.trim()) return;
    try {
      await apiClient.createTemplate(name.trim(), estimate.id);
      const open = window.confirm(
        `Structure "${name.trim()}" saved to My Templates.\n\nOpen My Templates now?`
      );
      if (open) {
        navigate('/my-templates');
      }
    } catch (err) {
      alert('Failed to save template: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const downloadStoredProposal = async (proposalId: string) => {
    try {
      const blob = await apiClient.getStoredProposalPdf(proposalId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download stored proposal PDF', error);
      alert('Could not download stored proposal PDF.');
    }
  };

  const changeStatus = async (newStatus: 'won' | 'lost') => {
    if (!estimate?.id) { alert('Save the estimate before changing status'); return; }
    try {
      await apiClient.updateEstimate(estimate.id, { status: newStatus });
      await fetchEstimate(estimate.id);
    } catch (err) { alert('Failed to change status'); }
  };

  if (loading) return <div className="p-8">Loading estimate...</div>;

  if (loadError && !estimate && id) {
    return (
      <div className="p-8 max-w-lg mx-auto card bg-red-50 border border-red-200 text-center">
        <p className="text-red-800 font-medium">{loadError}</p>
        <div className="flex flex-col gap-2 mt-4">
          <button type="button" className="btn-primary" onClick={() => { setLoading(true); fetchEstimate(id!); }}>
            Retry
          </button>
          <Link to="/estimates" className="text-gold hover:underline text-sm">Back to estimates</Link>
        </div>
      </div>
    );
  }
  if (!estimate) return <div className="p-8">Estimate not found</div>;

  // ── Component-scope derived flags ────────────────────────────────────────
  // structureLocked: estimate from a standard template — substrate/adhesive stack is fixed.
  // Ink & coating (e.g. varnish) may still be added, removed, reordered, and graded per job.
  const structureLocked = Boolean(estimate?.sourceTemplateKey?.trim());
  /** Template quotes: add/remove/reorder — ink only */
  const canEditLayerStructure = (layer: { materialType: string }) =>
    !structureLocked || layer.materialType === 'ink';
  const showStructureCosts = can('materialCostPerKg');
  const showInkControlsCol = structureLocked;
  const showLayerActionsCol = !structureLocked;
  const showLayerControlsCol = showLayerActionsCol || showInkControlsCol;
  const structureColCount = 6 + (showStructureCosts ? 2 : 0) + (showLayerControlsCol ? 1 : 0);
  const substrateLayerCount = layers.filter((l) => l.materialType === 'substrate').length;
  const adhesiveLayerCount = layers.filter((l) => l.materialType === 'adhesive').length;
  const maxSubstrates = 4;
  const maxAdhesives = 3;

  const renderInkControlsCell = (idx: number, layer: { id: string; materialType: string }) => {
    const btnClass =
      'p-0 h-2.5 w-2.5 flex items-center justify-center text-[9px] leading-none';
    const stackClass =
      'flex flex-col items-center gap-px text-mist select-none mx-auto';

    if (layer.materialType === 'ink') {
      return (
        <div className={stackClass}>
          <button
            type="button"
            className={`${btnClass} hover:text-gold`}
            title="Add ink & coating below"
            aria-label="Add ink & coating below"
            onClick={() => insertInkLayerAfter(idx)}
          >+</button>
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => moveLayer(idx, -1, true)}
            className={`${btnClass} hover:text-navy disabled:opacity-25`}
            title="Move up"
            aria-label="Move layer up"
          >▲</button>
          <button
            type="button"
            disabled={idx === layers.length - 1}
            onClick={() => moveLayer(idx, 1, true)}
            className={`${btnClass} hover:text-navy disabled:opacity-25`}
            title="Move down"
            aria-label="Move layer down"
          >▼</button>
          <button
            type="button"
            onClick={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))}
            className={`${btnClass} hover:text-danger`}
            title="Remove"
            aria-label="Remove layer"
          >✕</button>
        </div>
      );
    }
    if (idx === 0 && !layers.some((l) => l.materialType === 'ink')) {
      return (
        <div className={stackClass}>
          <button
            type="button"
            className={`${btnClass} hover:text-gold`}
            title="Add ink & coating"
            aria-label="Add ink & coating"
            onClick={() => insertInkLayerAfter(-1)}
          >+</button>
        </div>
      );
    }
    return null;
  };

  /** Round to at most `d` decimal places, stripping trailing zeros. */
  const fmt = (n: number, d = 4): string => {
    if (!Number.isFinite(n)) return '0';
    return parseFloat(n.toFixed(d)).toString();
  };

  // Derive a meaningful stack label from the actual layers — not a hardcoded "Laminate Stack".
  // Rules: sleeve → "Sleeve Structure"; multi-substrate → "Laminate Structure"; mono → "Film Structure"
  const stackLabel = (() => {
    if (engineTypeForFamily(productType) === 'sleeve') return 'Sleeve Structure';
    const substrateCount = layers.filter(l => l.materialType === 'substrate').length;
    if (substrateCount >= 2) return 'Laminate Structure';
    return 'Film Structure';
  })();

  // templateClassification carried in dimensions JSONB — reserved for future material filter use
  // when structureLocked is true (PE-only substrate filter etc.)
  void ((dimensions as any)?.templateClassification);

  const displaySlabs = slabsState.length > 0 ? slabsState : [{ quantityKg: 1000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 }, { quantityKg: 2000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 }, { quantityKg: 5000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 }];
  const totalGsm = structureMetrics.totalGsm;
  const totalConstructionMicron = structureMetrics.totalConstructionMicron;
  const structureDensity =
    structureMetrics.structureDensity != null
      ? structureMetrics.structureDensity.toFixed(3)
      : '—';
  const yieldSqmPerKg =
    clientCalcResult?.estimate.sqmPerKg ?? (totalGsm > 0 ? 1000 / totalGsm : null);
  const showWebTotals =
    can('filmDensity') || can('rmCostPerKg') || (yieldSqmPerKg != null && totalGsm > 0);
  const printWebWidth = (dimensions.reelWidthMm * dimensions.numberOfUps) + dimensions.extraPrintingTrimMm;
  const fxRate = parseFloat(estimate?.exchangeRateUsdToDisplay) || 1;
  const displaySalePrice = estimate?.salePriceDisplay ?? usdToDisplay(Number(estimate?.salePricePerKg) || 0, fxRate);
  const solventConfigBar = canConfigureSolvent && (hasSbInk || needsSolventMix) ? (
    <div
      id="solvent-costing"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
    >
      {hasSbInk && (
        <>
          <span className="text-xs text-mist shrink-0">Print</span>
          <div className="inline-flex rounded overflow-hidden border border-border shrink-0 bg-white">
            {(['flexo', 'rotogravure'] as const).map((method) => {
              const selected = effectiveInkPrintingProcess === method;
              const label = method === 'flexo' ? 'Flexo' : 'Roto';
              return (
                <button
                  key={method}
                  type="button"
                  title={method === 'flexo' ? 'Flexo' : 'Rotogravure'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium ${
                    selected ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-slate'
                  }`}
                  onClick={() => setInkPrintingProcess(method)}
                >
                  {selected && <Check className="w-3 h-3" aria-hidden />}
                  {label}
                </button>
              );
            })}
          </div>
          <label
            className="inline-flex items-center gap-0.5 shrink-0 cursor-help"
            title={inkMakeupRatioTooltip}
          >
            <span className="text-xs font-mono text-mist">÷</span>
            <input
              type="number"
              min="0.01"
              step="0.1"
              aria-label="Ink makeup solvent ratio"
              title={inkMakeupRatioTooltip}
              className="input py-1 px-1.5 w-14 text-xs font-mono text-center bg-white"
              value={effectiveInkSolventRatio}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setInkSolventRatioOverride(Number.isFinite(v) && v > 0 ? v : null);
              }}
            />
          </label>
          {needsSolventMix && <span className="hidden sm:inline text-amber-300">|</span>}
        </>
      )}
      {needsSolventMix && (
        <>
          <select
            className="input py-1 px-2 text-xs w-28 sm:w-36 shrink-0 bg-white"
            aria-label="Solvent"
            value={solventMaterialId ?? ''}
            onChange={(e) => {
              setSolventMaterialId(e.target.value || null);
              setSolventCostOverrideUsd(null);
            }}
          >
            {solventMaterialOptions.length === 0 && <option value="">No solvent</option>}
            {solventMaterialOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1 shrink-0">
            <span className="text-xs text-mist">$/kg</span>
            <input
              type="number"
              min="0"
              step="0.01"
              aria-label="Solvent per kg"
              className="input py-1 px-2 w-16 text-xs font-mono bg-white"
              value={usdToDisplay(resolvedSolventCostPerKgUsd, fxRate).toFixed(2)}
              onChange={(e) => {
                const displayVal = parseFloat(e.target.value) || 0;
                setSolventCostOverrideUsd(fxRate > 0 ? displayVal / fxRate : displayVal);
              }}
            />
          </label>
          <label className="inline-flex items-center gap-1 shrink-0">
            <span className="text-xs text-mist">Clean</span>
            <input
              type="number"
              min="0"
              step="1"
              aria-label="Cleaning kg per job"
              className="input py-1 px-2 w-14 text-xs font-mono bg-white"
              value={cleaningSolventKgPerJob}
              onChange={(e) => setCleaningSolventKgPerJob(Number(e.target.value) || 0)}
            />
            <span className="text-xs text-mist">kg</span>
          </label>
        </>
      )}
    </div>
  ) : null;

  return (
    <div className="w-full pb-24 md:pb-0">
      {loadError && (
        <div className="mb-4 card bg-amber-50 border border-amber-200 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>{loadError}</span>
          <button type="button" className="btn-secondary text-sm" onClick={loadBaseData}>
            Retry materials
          </button>
        </div>
      )}
      {saveNotice && (
        <div className="mb-4 card bg-green-50 border border-green-200 text-sm text-green-900 flex items-center justify-between gap-2">
          <span>{saveNotice}</span>
          <button type="button" className="text-green-700 hover:text-green-900" onClick={() => setSaveNotice(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* BUG-8: requote price-change banner — shown after navigating from a requote */}
      {priceChanges.length > 0 && (
        <div className="mb-4 card bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">Price changes vs original quote</p>
            <button type="button" className="text-amber-600 hover:text-amber-900" onClick={() => setPriceChanges([])}>✕</button>
          </div>
          <div className="space-y-1">
            {priceChanges.map((pc: { materialId: string; materialName: string; deltaPct: number; materialStale?: boolean }) => (
              <div key={pc.materialId} className="flex justify-between text-xs gap-2">
                <span className="text-ink">{pc.materialName}</span>
                <span className={pc.materialStale ? 'text-danger' : pc.deltaPct > 0 ? 'text-red-600' : 'text-green-700'}>
                  {pc.materialStale ? '⚠ Removed from library' : `${pc.deltaPct > 0 ? '+' : ''}${pc.deltaPct.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>
          {requoteWarnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
              {requoteWarnings.map((w, i) => <p key={i} className="text-xs text-amber-800">{w}</p>)}
            </div>
          )}
        </div>
      )}
      {/* Compact estimate header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        {/* Left: Back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary inline-flex items-center gap-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="min-w-0">
            <p className="text-xs font-mono text-mist leading-none truncate">
              {estimate?.refNumber || 'Draft estimate'}
            </p>
            <h1 className="text-lg font-display font-semibold text-navy leading-tight truncate">
              {jobName}
            </h1>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary inline-flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center space-x-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
          <button onClick={handleCalculate} disabled={saving || calculating} className="btn-secondary inline-flex items-center space-x-2">
            {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            <span>{calculating ? 'Calculating...' : 'Calculate'}</span>
          </button>
          <button onClick={downloadProposalPdf} className="btn-secondary inline-flex items-center space-x-2" title="Download PDF to share by email, WhatsApp, etc.">
            <Download className="w-4 h-4" /><span>PDF</span>
          </button>
        </div>
      </div>

      <div className="card mb-6 py-3 px-4 sm:px-5">
        <h3 className="text-sm font-semibold text-navy mb-1">Job details</h3>
        <p className="text-xs text-mist mb-3">
          Estimate <span className="font-mono text-ink">{estimate?.refNumber || 'draft'}</span> — pick
          an existing customer, click <strong className="text-ink">+ Add customer</strong> for a new
          one, then Save. The quote appears under{' '}
          <Link to="/estimates" className="text-gold hover:underline">
            Estimates
          </Link>{' '}
          and on that customer&apos;s page.
        </p>
        <JobHeaderFields
          customerId={customerId}
          onCustomerChange={(id) => {
            setCustomerId(id);
            setCustomerDraftName('');
          }}
          onCustomerDraftChange={setCustomerDraftName}
          jobName={jobName}
          onJobNameChange={setJobName}
          productType={productFamily}
          onProductTypeChange={(next) => {
            setProductType(next);
            setProductSubtype(defaultSubtypeForFamily(next as ProductFamily));
          }}
          productTypeOptions={productTypeOptions}
          productTypeLocked={structureLocked}
          productSubtype={productSubtype}
          onProductSubtypeChange={(next) => {
            setProductSubtype(next);
            const nextBagType = configuratorTypeForBagSubtype(next);
            if (productFamily === 'bag' && nextBagType) {
              setDimensions((prev) => ({
                ...prev,
                ...seedBagDimensionPatch(nextBagType, prev),
              }));
            }
          }}
          subtypeLabel={`${PRODUCT_FAMILY_LABELS[productFamily] ?? productFamily} type`}
          availableSubtypes={availableSubtypes}
          dimensionFields={bagConfiguratorActive ? [] : estimationDimensionFields}
          dimensions={dimensions}
          onDimensionChange={(key, value) =>
            setDimensions((prev) => ({ ...prev, [key]: value }))
          }
          orderQuantity={orderQuantity}
          onOrderQuantityChange={setOrderQuantity}
          orderQuantityUnit={orderQuantityUnit}
          onOrderQuantityUnitChange={setOrderQuantityUnit}
          unitOptions={unitOptions}
          bagDimensionsPanel={
            bagConfiguratorActive ? (
              <BagConfigurator
                productSubtype={productSubtype}
                dimensions={dimensions}
                onDimensionsChange={(patch) => setDimensions((prev) => ({ ...prev, ...patch }))}
              />
            ) : undefined
          }
        />
      </div>

      <div className="min-w-0 max-w-full overflow-x-hidden">
        <div>
          {/* Navigation tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            <button onClick={() => setActiveSection('structure')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'structure' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}>
              <Layers className="w-4 h-4" /><span>Structure</span>
            </button>
            <button onClick={() => setActiveSection('slabs')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'slabs' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}>
              <Calculator className="w-4 h-4" /><span>Quantity Slabs</span>
            </button>
            {can('markupPercent') && <button onClick={() => setActiveSection('markup')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'markup' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}>
              <DollarSign className="w-4 h-4" /><span>Markup & Extras</span>
            </button>}
          </div>

          {/* Structure section */}
          {activeSection === 'structure' && (
            <div className="space-y-6">
              <div className="card p-0 overflow-hidden shadow-md">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] border-b border-border bg-white">
                  <div className="px-5 py-3.5 lg:border-r border-border">
                    <h3 className="text-lg font-display font-semibold text-navy tracking-tight">{stackLabel}</h3>
                    <p className="text-xs text-mist mt-0.5">
                      {structureLocked
                        ? 'Template quote — films & adhesives are fixed; edit grades, thickness (µ/gsm), costs, and ink & coating rows'
                        : 'Layers, grades & RM costs'}
                    </p>
                  </div>
                  <div className="px-5 py-3.5 hidden lg:block border-l border-border bg-slate/20">
                    <h3 className="text-lg font-display font-semibold text-navy tracking-tight">Layer build-up</h3>
                    <p className="text-xs text-mist mt-0.5">Cross-section · up to 4 films, 3 adhesives, unlimited ink &amp; coating</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
                  <div className="min-w-0 lg:border-r border-border">
                {/* Mobile cards + bottom sheets (PRD §5.8) */}
                <div className="space-y-3 md:hidden pb-24">
                  <button
                    type="button"
                    onClick={() => setMobileStackOpen((v) => !v)}
                    className="w-full flex items-center justify-between p-3 bg-slate rounded-lg text-sm font-medium text-navy"
                  >
                    <span>Layer build-up</span>
                    <span>{mobileStackOpen ? '▲' : '▼'}</span>
                  </button>
                  {mobileStackOpen && (
                    <div className="py-2">
                      <FilmStackVisualizer
                        layers={visualizerLayers}
                        webWidthMm={
                          printWebWidth > 0
                            ? printWebWidth
                            : dimensions.reelWidthMm > 0
                              ? dimensions.reelWidthMm
                              : null
                        }
                      />
                    </div>
                  )}
                  {layers.map((layer, idx) => (
                    <LayerCard
                      key={layer.id}
                      index={idx}
                      total={layers.length}
                      layer={{ ...layer, type: layer.materialType, material: layer.materialName, costPerKg: can('materialCostPerKg') ? layer.costPerKgUsd : undefined }}
                      showCost={can('materialCostPerKg')}
                      onEdit={() => openLayerEdit(layer.id)}
                      showFormula={canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased}
                      formulaOverridden={!!laminationRecipeOverrides[layer.id]}
                      onFormula={
                        canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased
                          ? () => setFormulaModalLayerId(layer.id)
                          : undefined
                      }
                      onRemove={canEditLayerStructure(layer) ? () => setLayers((prev) => prev.filter((l) => l.id !== layer.id)) : undefined}
                      onMoveUp={canEditLayerStructure(layer) ? () => moveLayer(idx, -1, structureLocked) : undefined}
                      onMoveDown={canEditLayerStructure(layer) ? () => moveLayer(idx, 1, structureLocked) : undefined}
                      onDragStart={canEditLayerStructure(layer) ? (i) => setDragFromIndex(i) : undefined}
                      onDragEnter={(i) => {
                        if (dragFromIndex !== null && canEditLayerStructure(layers[dragFromIndex])) {
                          setDragHoverIndex(i);
                        }
                      }}
                      onDragEnd={() => {
                        if (dragFromIndex !== null && dragHoverIndex !== null) {
                          const dragged = layers[dragFromIndex];
                          if (!structureLocked || dragged?.materialType === 'ink') {
                            reorderLayers(dragFromIndex, dragHoverIndex);
                          }
                        }
                        setDragFromIndex(null);
                        setDragHoverIndex(null);
                      }}
                      isDragging={dragFromIndex === idx}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddLayerSheetOpen(true)}
                    className="w-full min-h-[48px] py-3 border-2 border-dashed border-border rounded-xl font-display font-semibold text-navy"
                  >
                    {structureLocked ? '+ Add ink & coating' : '+ Add layer'}
                  </button>
                  {needsSolventMix && (
                    <div className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50/60">
                      {solventConfigBar && (
                        <div className="px-3 py-2.5 border-b border-amber-200/70 overflow-x-hidden">
                          {solventConfigBar}
                        </div>
                      )}
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm"
                        onClick={() => setSolventDetailsExpanded((v) => !v)}
                      >
                        <span className="inline-flex items-center gap-2 font-medium text-navy">
                          {solventDetailsExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          Solvents
                        </span>
                        {showStructureCosts && (
                          <span className="font-mono text-xs font-semibold text-navy">
                            {usdToDisplayPrecise(solventTotalPerKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                            {usdToDisplayPrecise(solventTotalPerM2Usd, fxRate).toFixed(4)}/m²
                          </span>
                        )}
                      </button>
                      {solventDetailsExpanded && showStructureCosts && (
                        <div className="divide-y divide-amber-200/60 bg-amber-50/40 text-sm">
                          {solventCostLines.map((line) => (
                            <div key={line.key} className="flex justify-between px-3 py-2 pl-8 text-mist">
                              <span>{line.label}</span>
                              <span className="font-mono text-navy">
                                {usdToDisplayPrecise(line.perKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                                {usdToDisplayPrecise(line.perM2Usd, fxRate).toFixed(4)}/m²
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop structure table — single unified table */}
                <div ref={structureTableRef} className="hidden md:block overflow-x-auto min-w-0 p-4">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col style={{ width: '4%' }} />
                      <col style={{ width: showStructureCosts ? '10%' : '11%' }} />
                      <col style={{ width: showStructureCosts ? '14%' : '14%' }} />
                      <col style={{ width: showStructureCosts ? '25%' : '26%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '7%' }} />
                      {showStructureCosts && <col style={{ width: '10%' }} />}
                      {showStructureCosts && <col style={{ width: '10%' }} />}
                      {showLayerControlsCol && (
                        <col style={{ width: showInkControlsCol ? '4%' : '10%' }} />
                      )}
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-center align-middle py-2.5 px-1 text-xs font-medium text-mist">#</th>
                        <th className="text-center align-middle py-2.5 px-1 text-xs font-medium text-mist">Type</th>
                        <th className="text-center align-middle py-2.5 px-2 text-xs font-medium text-mist">Family</th>
                        <th className="text-center align-middle py-2.5 px-2 text-xs font-medium text-mist">Grade</th>
                        <th className="text-center align-middle py-2.5 px-1 text-xs font-medium text-mist">
                          Value <span className="font-normal text-mist/80">µ/gsm</span>
                        </th>
                        <th className="text-center align-middle py-2.5 px-2 text-xs font-medium text-mist">GSM</th>
                        {showStructureCosts && (
                          <>
                            <th className="text-center align-middle py-2.5 px-2 text-[10px] font-medium text-mist leading-tight">
                              $/kg
                            </th>
                            <th className="text-center align-middle py-2.5 px-2 text-[10px] font-medium text-mist leading-tight">
                              $/m²
                            </th>
                          </>
                        )}
                        {showLayerControlsCol && (
                          <th className="text-center align-middle py-2.5 px-0.5 text-xs font-medium text-mist" aria-label="Row actions" />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {layers.map((layer, idx) => (
                        <tr key={layer.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                          <td className="py-2.5 px-2 text-xs text-mist text-center">{idx + 1}</td>
                          <td className="py-2 px-1 min-w-0 align-middle text-center overflow-hidden">
                            <span
                              className={`inline-block max-w-full truncate text-xs px-1.5 py-0.5 rounded-md ${layer.materialType === 'substrate' ? 'bg-blue-100 text-blue-800' : layer.materialType === 'ink' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}
                              title={LAYER_TYPE_LABELS[layer.materialType] || layer.materialType}
                            >
                              {LAYER_TYPE_TABLE_LABELS[layer.materialType] || layer.materialType}
                            </span>
                          </td>
                          <td className="py-2 px-2 min-w-0 text-left align-middle overflow-hidden">
                            {/* Family dropdown — filtered by template classification (PE → PE only, Non PE → no PE) */}
                            {(() => {
                              const currentMat = materials.find(m => m.id === layer.materialId);
                              const currentFamily = currentMat?.substrateFamily ?? null;

                              if (layer.materialType !== 'substrate') {
                                // Ink/adhesive: show family dropdown (Solvent Based, UV-LED, etc.)
                                const inkFamilies = [...new Set(
                                  materials
                                    .filter(m => m.type === layer.materialType && m.substrateFamily)
                                    .map(m => m.substrateFamily!)
                                )].sort();

                                if (inkFamilies.length === 0) {
                                  return <span className="text-sm text-mist truncate block" title={currentFamily ?? ''}>{currentFamily || '—'}</span>;
                                }

                                return (
                                  <select
                                    className="cell-input w-full text-xs text-left truncate"
                                    title={currentFamily ?? ''}
                                    value={currentFamily ?? ''}
                                    onChange={(e) => {
                                      const newFamily = e.target.value;
                                      // Auto-select first material in the new family
                                      const firstInFamily = materials.find(m =>
                                        m.type === layer.materialType && m.substrateFamily === newFamily
                                      );
                                      if (firstInFamily) {
                                        setLayers(prev => prev.map(l => l.id === layer.id ? {
                                          ...l, materialId: firstInFamily.id, materialName: firstInFamily.name,
                                          costPerKgUsd: parseFloat(firstInFamily.costPerKgUsd) || 0,
                                          isSolventBased: firstInFamily.isSolventBased || false,
                                          hoover: firstInFamily.hoover ?? null,
                                        } : l));
                                      }
                                    }}
                                  >
                                    {inkFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                                  </select>
                                );
                              }

                              // Build allowed families using the engine's substrateFamilyAllowed rule
                              const allowedFamilies = [...new Set(
                                materials
                                  .filter(m => m.type === 'substrate' && m.substrateFamily)
                                  .filter(m => !templateClassification || materialAllowedForTemplateLayer(m, 'substrate', templateClassification))
                                  .map(m => m.substrateFamily!)
                              )].sort();

                              return (
                                <select
                                  className="cell-input w-full text-xs text-left truncate"
                                  title={currentFamily ?? ''}
                                  value={currentFamily ?? ''}
                                  onChange={(e) => {
                                    const newFamily = e.target.value;
                                    // Auto-select first allowed grade in the new family
                                    const firstInFamily = materials.find(m =>
                                      m.type === 'substrate' &&
                                      m.substrateFamily === newFamily &&
                                      (!templateClassification || materialAllowedForTemplateLayer(m, 'substrate', templateClassification))
                                    );
                                    if (firstInFamily) {
                                      setLayers(prev => prev.map(l => l.id === layer.id ? {
                                        ...l, materialId: firstInFamily.id, materialName: firstInFamily.name,
                                        costPerKgUsd: parseFloat(firstInFamily.costPerKgUsd) || 0,
                                        isSolventBased: firstInFamily.isSolventBased || false,
                                        gsm: l.micron * (parseFloat(firstInFamily.density) || 0.9),
                                        hoover: firstInFamily.hoover ?? null,
                                      } : l));
                                    }
                                  }}
                                >
                                  {allowedFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                              );
                            })()}
                          </td>
                          <td className="py-2 px-2 min-w-0 text-left align-middle overflow-hidden">
                            {/* Grade dropdown — filtered by family + classification; title shows hoover on hover */}                            {(() => {
                              const currentMat = materials.find(m => m.id === layer.materialId);
                              const currentFamily = currentMat?.substrateFamily ?? null;

                              // Allowed grades: must pass layer type + classification + family filter
                              const gradeOptions = materials.filter(m => {
                                if (m.type !== layer.materialType) return false;
                                if (layer.materialType === 'substrate') {
                                  if (templateClassification && !materialAllowedForTemplateLayer(m, 'substrate', templateClassification)) return false;
                                }
                                // Family filter applies to ALL layer types (substrate, ink, adhesive)
                                if (currentFamily && m.substrateFamily !== currentFamily) return false;
                                return true;
                              });

                              return (
                                <StructureGradeSelect
                                  value={layer.materialId}
                                  options={gradeOptions.map((m) => ({
                                    id: m.id,
                                    name: m.name,
                                    hoover: m.hoover ?? null,
                                  }))}
                                  onChange={(materialId) => {
                                    const mat = materials.find((m) => m.id === materialId);
                                    if (!mat) return;
                                    setLayers((prev) =>
                                      prev.map((l) =>
                                        l.id === layer.id
                                          ? {
                                              ...l,
                                              materialId: mat.id,
                                              materialName: mat.name,
                                              costPerKgUsd: parseFloat(mat.costPerKgUsd) || 0,
                                              isSolventBased: mat.isSolventBased || false,
                                              gsm:
                                                l.materialType === 'substrate'
                                                  ? l.micron * (parseFloat(mat.density) || 0.9)
                                                  : l.micron,
                                              hoover: mat.hoover ?? null,
                                            }
                                          : l
                                      )
                                    );
                                  }}
                                />
                              );
                            })()}
                            {/* Admin key — hidden from UI, kept for debugging only via DevTools */}
                          </td>

                          {/* µ / GSM — input with unit label; substrate=µ, ink/adhesive=gsm; yellow when 0 */}
                          <td className="py-2 px-1 text-center min-w-0 align-middle">
                            {(() => {
                              const mat = materials.find(m => m.id === layer.materialId);
                              const solidPct = mat?.solidPercent ?? 100;
                              const density = parseFloat(mat?.density ?? '0.9') || 0.9;
                              const isSubstrate = layer.materialType === 'substrate';
                              const unitLabel = isSubstrate ? 'µ' : 'gsm';
                              const tooltip = isSubstrate
                                ? `Density: ${density.toFixed(3)} g/cm³`
                                : `Solid content: ${solidPct}%`;
                              return (
                                <div className="inline-flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    value={parseFloat(layer.micron.toFixed(1))}
                                    step="0.1"
                                    title={tooltip}
                                    onChange={(e) => {
                                      const micron = Number(e.target.value);
                                      setLayers((prev) => prev.map((l) => l.id === layer.id ? {
                                        ...l, micron,
                                        // Substrate: gsm = micron × density
                                        // Ink/Adhesive: user enters dry gsm directly → gsm = micron
                                        gsm: isSubstrate ? micron * density : micron,
                                      } : l));
                                    }}
                                    className={`cell-input w-14 font-mono text-sm text-center px-1 ${layer.micron === 0 ? 'bg-amber-50 border-amber-200' : ''}`}
                                    inputMode="decimal"
                                  />
                                  <span className="text-xs text-mist w-7 shrink-0 text-left">{unitLabel}</span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Total GSM per row = layer.gsm (substrate: µ×density; ink: solid%×µ/100) */}
                          <td className="py-2 px-2 font-mono text-xs text-right font-semibold text-navy tabular-nums align-middle">
                            {layer.gsm > 0 ? layer.gsm.toFixed(2) : <span className="text-mist">0.00</span>}
                          </td>

                          {showStructureCosts && (
                            <>
                              <td className="py-2 px-2 text-right align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={usdToDisplay(layer.costPerKgUsd, fxRate).toFixed(2)}
                                  onChange={(e) => {
                                    const displayVal = parseFloat(e.target.value) || 0;
                                    const usd = fxRate > 0 ? displayVal / fxRate : displayVal;
                                    setLayers((prev) => prev.map((l) =>
                                      l.id === layer.id ? { ...l, costPerKgUsd: usd } : l
                                    ));
                                  }}
                                  className="cell-input w-full max-w-[5.5rem] ml-auto font-mono text-[11px] text-right px-1"
                                  inputMode="decimal"
                                  aria-label={`Cost per kg for ${layer.materialName}`}
                                />
                              </td>
                              <td className="py-2 px-2 font-mono text-[11px] text-right tabular-nums text-navy align-middle">
                                {(() => {
                                  const calcLayer = clientCalcResult?.estimate.layers[idx];
                                  const c = calcLayer?.costPerM2;
                                  if (c == null || c <= 0) return <span className="text-mist">—</span>;
                                  return usdToDisplayPrecise(c, fxRate).toFixed(4);
                                })()}
                              </td>
                            </>
                          )}

                          {showLayerControlsCol && (
                          <td className={`align-middle ${showInkControlsCol ? 'py-1 px-0' : 'py-2 px-1'}`}>
                            {showInkControlsCol
                              ? renderInkControlsCell(idx, layer)
                              : canEditLayerStructure(layer) && (
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveLayer(idx, -1, structureLocked)}
                                  className="p-1 text-mist hover:text-navy disabled:opacity-30"
                                  title="Move up"
                                  aria-label="Move layer up"
                                >▲</button>
                                <button
                                  type="button"
                                  disabled={idx === layers.length - 1}
                                  onClick={() => moveLayer(idx, 1, structureLocked)}
                                  className="p-1 text-mist hover:text-navy disabled:opacity-30"
                                  title="Move down"
                                  aria-label="Move layer down"
                                >▼</button>
                                <button
                                  type="button"
                                  onClick={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))}
                                  className="p-1 text-mist hover:text-danger text-xs"
                                  title="Remove"
                                  aria-label="Remove layer"
                                >✕</button>
                                {canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased && (
                                  <button
                                    type="button"
                                    className="p-1 text-[10px] text-blue-700 hover:text-blue-900"
                                    onClick={() => setFormulaModalLayerId(layer.id)}
                                    title="Lamination formula"
                                  >
                                    {laminationRecipeOverrides[layer.id] ? 'F*' : 'F'}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          )}
                        </tr>
                      ))}
                      {needsSolventMix && (
                        <>
                          {solventConfigBar && (
                            <tr className="border-b border-amber-200/80 bg-amber-50/60">
                              <td colSpan={structureColCount} className="py-2 px-2">
                                {solventConfigBar}
                              </td>
                            </tr>
                          )}
                          <tr className="border-b border-border bg-amber-50/50">
                            <td className="py-2 px-1" />
                            <td className="py-2 px-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900">Solvent</span>
                            </td>
                            <td className="py-2 px-1 text-center text-mist text-xs">—</td>
                            <td className="py-2 px-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-gold"
                                onClick={() => setSolventDetailsExpanded((v) => !v)}
                                aria-expanded={solventDetailsExpanded}
                              >
                                {solventDetailsExpanded ? (
                                  <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                )}
                                Solvents
                              </button>
                            </td>
                            <td className="py-2 px-1 text-center text-mist text-[10px]">—</td>
                            <td className="py-2 px-1 text-center text-mist">—</td>
                            {showStructureCosts && (
                              <>
                                <td className="py-2 px-1 font-mono text-[11px] text-center font-semibold text-navy tabular-nums">
                                  {usdToDisplayPrecise(solventTotalPerKgUsd, fxRate).toFixed(4)}
                                </td>
                                <td className="py-2 px-1 font-mono text-[11px] text-center font-semibold text-navy tabular-nums">
                                  {usdToDisplayPrecise(solventTotalPerM2Usd, fxRate).toFixed(4)}
                                </td>
                              </>
                            )}
                            {showLayerActionsCol && <td className="py-2 px-1" />}
                          </tr>
                          {solventDetailsExpanded &&
                            solventCostLines.map((line) => (
                              <tr key={line.key} className="border-b border-border bg-slate/30">
                                <td className="py-1.5 px-1" />
                                <td className="py-1.5 px-1" />
                                <td className="py-1.5 px-1" />
                                <td className="py-1.5 px-1 pl-4 text-[11px] text-mist truncate">{line.label}</td>
                                <td className="py-1.5 px-1 text-center text-mist text-[10px]">—</td>
                                <td className="py-1.5 px-1 text-center text-mist">—</td>
                                {showStructureCosts && (
                                  <>
                                    <td className="py-1.5 px-1 font-mono text-[11px] text-center tabular-nums">
                                      {usdToDisplayPrecise(line.perKgUsd, fxRate).toFixed(4)}
                                    </td>
                                    <td className="py-1.5 px-1 font-mono text-[11px] text-center tabular-nums">
                                      {usdToDisplayPrecise(line.perM2Usd, fxRate).toFixed(4)}
                                    </td>
                                  </>
                                )}
                                {showLayerActionsCol && <td className="py-1.5 px-1" />}
                              </tr>
                            ))}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-slate/40">
                        <td colSpan={4} className="py-3 px-2 text-xs font-bold text-navy text-right">
                          Total
                        </td>
                        <td
                          className="py-3 px-1 text-center"
                          title="Total structure (µ) — substrate µ + ink/adhesive dry gsm ÷ density."
                        >
                          <span className="font-mono text-xs font-bold text-navy tabular-nums">
                            {totalConstructionMicron != null && totalConstructionMicron > 0
                              ? `${totalConstructionMicron.toFixed(2)} µ`
                              : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-right font-bold text-navy tabular-nums">
                          {totalGsm.toFixed(2)}
                        </td>
                        {showStructureCosts && (
                          <>
                            <td className="py-3 px-2 font-mono text-[11px] text-right font-bold text-navy tabular-nums">
                              {rmTotals
                                ? usdToDisplayPrecise(rmTotals.rmPerKg, fxRate).toFixed(4)
                                : '—'}
                            </td>
                            <td className="py-3 px-2 font-mono text-[11px] text-right font-bold text-navy tabular-nums">
                              {rmTotals
                                ? usdToDisplayPrecise(rmTotals.rmPerM2, fxRate).toFixed(4)
                                : '—'}
                            </td>
                          </>
                        )}
                        {showLayerActionsCol && <td className="py-3 px-1" />}
                      </tr>
                    </tfoot>
                  </table>
                </div> {/* end hidden md:block */}
                  </div> {/* end table column — self-sized, no stretch gap */}

                  <div
                    className="hidden lg:block overflow-hidden bg-white border-l border-border"
                    style={
                      structureTableHeight != null
                        ? { height: structureTableHeight, maxHeight: structureTableHeight }
                        : undefined
                    }
                  >
                    <FilmStackVisualizer
                      layers={visualizerLayers}
                      webWidthMm={
                        printWebWidth > 0
                          ? printWebWidth
                          : dimensions.reelWidthMm > 0
                            ? dimensions.reelWidthMm
                            : null
                      }
                      className="h-full w-full"
                    />
                  </div>
                </div> {/* end structure body row */}
              </div> {/* end unified structure card */}

              {!structureLocked && (
              <div className="flex flex-wrap gap-3 items-center">
                <select className="input w-48" onChange={(e) => {
                    const type = e.target.value as 'substrate' | 'ink' | 'adhesive';
                    if (!type) return;
                    if (type === 'substrate' && substrateLayerCount >= maxSubstrates) return;
                    if (type === 'adhesive' && adhesiveLayerCount >= maxAdhesives) return;
                    const defaultMat = materials.find(m => m.type === type);
                    const micron = type === 'substrate' ? 25 : 2;
                    const newLayer: LayerItem = { id: crypto.randomUUID(), materialId: defaultMat?.id || '', materialName: defaultMat?.name || 'Select material', materialType: type, micron, gsm: type === 'substrate' ? micron * (defaultMat?.density ? parseFloat(defaultMat.density) : 0.9) : micron, costPerKgUsd: defaultMat ? parseFloat(defaultMat.costPerKgUsd) : 0, isSolventBased: defaultMat?.isSolventBased || false, position: layers.length, hoover: defaultMat?.hoover || null };
                    setLayers((prev) => [...prev, newLayer]);
                    e.target.value = '';
                  }} defaultValue="">
                    <option value="" disabled>+ Add Layer...</option>
                    <option value="substrate" disabled={substrateLayerCount >= maxSubstrates}>
                      Substrate{substrateLayerCount >= maxSubstrates ? ` (max ${maxSubstrates})` : ''}
                    </option>
                    <option value="ink">Ink & Coating</option>
                    <option value="adhesive" disabled={adhesiveLayerCount >= maxAdhesives}>
                      Adhesive{adhesiveLayerCount >= maxAdhesives ? ` (max ${maxAdhesives})` : ''}
                    </option>
                  </select>
              </div>
              )}

              {showWebTotals && (
                <div className="card">
                  <h3 className="font-display font-semibold text-navy mb-1">Web Totals</h3>
                  <p className="text-xs text-mist mb-4">Structure yield and material cost per web unit</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {can('filmDensity') && (
                      <>
                        <div
                          className="rounded-xl border border-border bg-slate/40 px-4 py-3 min-w-0"
                          title="Physical construction thickness (substrate µ + ink/adhesive dry gsm ÷ density)"
                        >
                          <p className="text-[11px] font-medium text-mist leading-tight">Construction</p>
                          <p className="mt-1.5 font-mono text-lg font-semibold text-navy tabular-nums leading-none">
                            {totalConstructionMicron != null && totalConstructionMicron > 0
                              ? `${totalConstructionMicron.toFixed(2)} µ`
                              : '—'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-slate/40 px-4 py-3 min-w-0">
                          <p className="text-[11px] font-medium text-mist leading-tight">GSM</p>
                          <p className="mt-1.5 font-mono text-lg font-semibold text-navy tabular-nums leading-none">
                            {totalGsm.toFixed(2)}
                          </p>
                        </div>
                        <div
                          className="rounded-xl border border-border bg-slate/40 px-4 py-3 min-w-0"
                          title="GSM ÷ construction µ"
                        >
                          <p className="text-[11px] font-medium text-mist leading-tight">Density</p>
                          <p className="mt-1.5 font-mono text-lg font-semibold text-navy tabular-nums leading-none">
                            {structureDensity} <span className="text-xs font-normal text-mist">g/cm³</span>
                          </p>
                        </div>
                      </>
                    )}
                    {yieldSqmPerKg != null && yieldSqmPerKg > 0 && (
                      <div
                        className="rounded-xl border border-border bg-slate/40 px-4 py-3 min-w-0"
                        title="Square metres of web per kilogram (1000 ÷ GSM)"
                      >
                        <p className="text-[11px] font-medium text-mist leading-tight">Yield</p>
                        <p className="mt-1.5 font-mono text-lg font-semibold text-navy tabular-nums leading-none">
                          {yieldSqmPerKg.toFixed(2)}{' '}
                          <span className="text-xs font-normal text-mist">m²/kg</span>
                        </p>
                      </div>
                    )}
                    {can('rmCostPerKg') && rmTotals && (
                      <>
                        <div className="rounded-xl border border-border bg-slate/40 px-4 py-3 min-w-0">
                          <p className="text-[11px] font-medium text-mist leading-tight">RM cost</p>
                          <p className="mt-1.5 font-mono text-lg font-semibold text-navy tabular-nums leading-none">
                            {estimate?.displayCurrency || 'USD'}{' '}
                            {usdToDisplayPrecise(rmTotals.rmPerKg, fxRate).toFixed(2)}
                            <span className="text-xs font-normal text-mist">/kg</span>
                          </p>
                        </div>
                        {(can('costPerSqm') || can('rmCostPerKg')) && rmTotals.rmPerM2 > 0 && (
                          <div className="rounded-xl border border-border bg-slate/40 px-4 py-3 min-w-0">
                            <p className="text-[11px] font-medium text-mist leading-tight">RM cost</p>
                            <p className="mt-1.5 font-mono text-lg font-semibold text-navy tabular-nums leading-none">
                              {estimate?.displayCurrency || 'USD'}{' '}
                              {usdToDisplayPrecise(rmTotals.rmPerM2, fxRate).toFixed(4)}
                              <span className="text-xs font-normal text-mist">/m²</span>
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Slabs (sales rep sees price/kg only, no edit/remove) */}
          {activeSection === 'slabs' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Quantity Slab Pricing</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Quantity (kg)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Price/kg ({estimate?.displayCurrency || 'USD'})</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Order total</th>
                    {can('markupPercent') && <th className="text-left py-3 px-4 text-sm font-medium text-mist"></th>}
                  </tr></thead>
                  <tbody>
                    {displaySlabs.map((slab: any, index: number) => (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-slate/50">
                        <td className="py-4 px-4">{can('markupPercent') ? <input type="number" value={slab.quantityKg} onChange={(e) => { const v = Number(e.target.value); setSlabsState((prev) => prev.map((s, i) => i === index ? { ...s, quantityKg: v, total: v * s.pricePerKg } : s)); }} className="input w-32 font-mono" /> : <span className="font-mono">{slab.quantityKg}</span>}</td>
                        <td className="py-4 px-4">{can('markupPercent') ? <input type="number" value={slab.pricePerKg} step="0.01" onChange={(e) => { const v = Number(e.target.value); const usd = displayToUsd(v, fxRate); setSlabsState((prev) => prev.map((s, i) => i === index ? { ...s, pricePerKg: v, pricePerKgUsd: usd, total: v * s.quantityKg } : s)); }} className="input w-32 font-mono" /> : <span className="font-mono">{slab.pricePerKg.toFixed(2)}</span>}</td>
                        <td className="py-4 px-4 font-display font-semibold">{estimate?.displayCurrency || 'USD'} {Number((slab.quantityKg || 0) * (slab.pricePerKg || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        {can('markupPercent') && <td className="py-4 px-4"><button onClick={() => setSlabsState((prev) => prev.filter((_, i) => i !== index))} className="text-sm text-mist hover:text-danger">Remove</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {can('markupPercent') && <button onClick={() => setSlabsState((prev) => [...prev, { quantityKg: 1000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 }])} className="btn-secondary">+ Add Slab Row</button>}
            </div>
          )}

          {/* Markup (admin only) */}
          {can('markupPercent') && activeSection === 'markup' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Markup & Additional Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-navy mb-2">Markup % (on material)</label><input type="number" value={markupPercent} onChange={(e) => setMarkupPercent(Number(e.target.value))} className="input w-full" /></div>
                <div><label className="block text-sm font-medium text-navy mb-2">Effective margin % (on sale price)</label><p className="input w-full bg-slate font-mono">{effectiveMarginPercent(Number(estimate?.materialCostPerKg) || 0, markupPercent, Number(estimate?.salePricePerKg) || 1).toFixed(1)}%</p></div>
                <div><label className="block text-sm font-medium text-navy mb-2">Plates/kg ({estimate?.displayCurrency || 'USD'})</label><input type="number" value={platesPerKg} onChange={(e) => setPlatesPerKg(Number(e.target.value))} step="0.01" className="input w-full" /></div>
                <div><label className="block text-sm font-medium text-navy mb-2">Delivery/kg ({estimate?.displayCurrency || 'USD'})</label><input type="number" value={deliveryPerKg} onChange={(e) => setDeliveryPerKg(Number(e.target.value))} step="0.01" className="input w-full" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing & actions — full width below editor (not sidebar) */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card bg-gold/5 border-gold/20">
              <h3 className="font-display font-semibold text-navy mb-2">Selling Price</h3>
              <div className="text-3xl font-display font-bold text-gold-accessible mb-2">{estimate?.displayCurrency || 'USD'} {displaySalePrice.toFixed(2)} /kg</div>
              {can('costBreakdown') && <div className="text-sm text-mist">{calculating ? 'Saving to server...' : 'Live preview — save to persist'}</div>}
            </div>

            {can('costBreakdown') && (
              <div className="card lg:col-span-1">
                <h3 className="font-display font-semibold text-navy mb-4">Cost Breakdown</h3>
                {(() => {
                  // Use engine result when available (accurate); fall back to saved estimate fields
                  const cb = clientCalcResult?.costBreakdown;
                  const matPct = cb ? Math.round(cb.materialPercent) : (() => {
                    const mat = Number(estimate?.materialCostPerKg) || 0;
                    const sale = Number(estimate?.salePricePerKg) || 0;
                    return sale ? Math.round((mat / sale) * 100) : 0;
                  })();
                  const mkupPct = cb ? Math.round(cb.markupPercent) : 0;
                  const procPct = cb ? Math.round(cb.processPercent) : 0;
                  const wasteAdjPct = Math.max(0, 100 - matPct - mkupPct - procPct);

                  const matCostUsd = clientCalcResult?.estimate.materialCostPerKg ?? Number(estimate?.materialCostPerKg) ?? 0;
                  const rmPerM2Usd = rmTotals?.rmPerM2 ?? clientCalcResult?.estimate.rmCostPerM2 ?? 0;
                  const saleUsd = clientCalcResult?.estimate.salePricePerKg ?? Number(estimate?.salePricePerKg) ?? 0;
                  const salePerM2Usd = clientCalcResult?.estimate.sqmPerKg
                    ? saleUsd / clientCalcResult.estimate.sqmPerKg
                    : totalGsm > 0
                      ? (saleUsd * totalGsm) / 1000
                      : 0;
                  const effMargin = effectiveMarginPercent(matCostUsd, markupPercent, saleUsd);

                  return (
                    <div className="space-y-3">
                      {can('rmCostPerKg') && (
                        <div className="flex justify-between text-sm font-semibold border-b border-border pb-2">
                          <span className="text-navy">Total RM</span>
                          <span className="font-mono text-navy text-right">
                            <span className="block">{estimate?.displayCurrency || 'USD'} {usdToDisplayPrecise(matCostUsd, fxRate).toFixed(4)}/kg</span>
                            {(can('costPerSqm') || can('rmCostPerKg')) && rmPerM2Usd > 0 && (
                              <span className="block text-xs font-normal text-mist mt-0.5">
                                {estimate?.displayCurrency || 'USD'} {usdToDisplayPrecise(rmPerM2Usd, fxRate).toFixed(4)}/m²
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {can('markupAmount') && (
                        <div className="flex justify-between text-sm">
                          <span className="text-mist">Markup ({markupPercent}% on RM)</span>
                          <span className="font-mono font-semibold">{estimate?.displayCurrency || 'USD'} {usdToDisplay(matCostUsd * markupPercent / 100, fxRate).toFixed(2)}</span>
                        </div>
                      )}
                      {can('platesPerKg') && platesPerKg > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-mist">Plates/kg</span>
                          <span className="font-mono font-semibold">{estimate?.displayCurrency || 'USD'} {platesPerKg.toFixed(2)}</span>
                        </div>
                      )}
                      {can('deliveryPerKg') && deliveryPerKg > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-mist">Delivery/kg</span>
                          <span className="font-mono font-semibold">{estimate?.displayCurrency || 'USD'} {deliveryPerKg.toFixed(2)}</span>
                        </div>
                      )}
                      {/* Effective margin % — always shown to admin (PRD §7.3 label) */}
                      {saleUsd > 0 && (
                        <div className="flex justify-between text-sm pt-2 border-t border-border">
                          <span className="text-mist" title="Markup amount ÷ sale price">Effective margin %</span>
                          <span className="font-mono font-semibold text-green-700">{effMargin.toFixed(1)}%</span>
                        </div>
                      )}
                      {/* Visual breakdown bars */}
                      <div className="space-y-2 pt-1">
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span>Material</span><span>{matPct}%</span></div>
                          <div className="w-full bg-slate rounded-full h-1.5"><div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${matPct}%` }} /></div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span>Markup (on RM)</span><span>{mkupPct}%</span></div>
                          <div className="w-full bg-slate rounded-full h-1.5"><div className="bg-gold rounded-full h-1.5" style={{ width: `${mkupPct}%` }} /></div>
                        </div>
                        {procPct > 0 && (
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Process</span><span>{procPct}%</span></div>
                            <div className="w-full bg-slate rounded-full h-1.5"><div className="bg-green-500 rounded-full h-1.5" style={{ width: `${procPct}%` }} /></div>
                          </div>
                        )}
                        {wasteAdjPct > 0 && (
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Waste / other</span><span>{wasteAdjPct}%</span></div>
                            <div className="w-full bg-slate rounded-full h-1.5"><div className="bg-orange-400 rounded-full h-1.5" style={{ width: `${wasteAdjPct}%` }} /></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-mist pt-1">
                        {clientCalcResult ? 'Live engine preview' : 'Calculate to refresh pricing'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="card space-y-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleCalculate} disabled={saving || calculating} className="btn-secondary w-full">
                {calculating ? 'Calculating...' : 'Calculate'}
              </button>
              <button onClick={handleSaveAsTemplate} className="btn-secondary w-full">
                Save structure to My Templates
              </button>
              <button onClick={handleRequote} className="text-sm text-mist hover:text-ink w-full text-center py-2">Duplicate for re-quote</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="card">
              <h4 className="font-display font-semibold text-navy mb-2">Send to customer</h4>
              <p className="text-xs text-mist mb-3">
                Save and Calculate, then download the PDF. Share it by email, WhatsApp, or any
                channel you use — the app does not send on your behalf.
              </p>
              <button onClick={downloadProposalPdf} className="btn-primary w-full">
                Download proposal PDF
              </button>

              <h4 className="font-display font-semibold text-navy mt-5 mb-2">Outcome (optional)</h4>
              <p className="text-xs text-mist mb-2">
                Track if the customer accepted or declined — only if you use this for reporting.
              </p>
              <div className="flex space-x-2">
                <button onClick={() => changeStatus('won')} className="btn-success flex-1">Mark Won</button>
                <button onClick={() => changeStatus('lost')} className="btn-danger flex-1">Mark Lost</button>
              </div>
              <div className="mt-3 text-sm text-mist">
                Current: <strong>{estimateStatusLabel(estimate?.status)}</strong>
              </div>
            </div>

            {proposals.length > 0 && (
              <div className="card">
                <h4 className="font-display font-semibold text-navy mb-3">Proposal history</h4>
                <div className="space-y-2">
                  {proposals.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2 last:border-0">
                      <div>
                        <div>{p.sentAt ? new Date(p.sentAt).toLocaleString() : 'Sent'}</div>
                        {p.validUntil && (
                          <div className="text-xs text-mist">Valid until {new Date(p.validUntil).toLocaleDateString()}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-gold font-medium hover:underline shrink-0"
                        onClick={() => downloadStoredProposal(p.id)}
                      >
                        PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h4 className="font-display font-semibold text-navy mb-3">Activity</h4>
              <div className="space-y-2" style={{ maxHeight: 220, overflow: 'auto' }}>
                {(estimate?.activityLogs || []).length === 0 && <div className="text-sm text-mist">No activity yet.</div>}
                {(estimate?.activityLogs || []).map((a: any) => (
                  <div key={a.id} className="p-2 bg-slate rounded">
                    <div className="text-sm font-medium">{a.action}</div>
                    <div className="text-xs text-mist">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky price bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-border px-4 py-3 z-50 shadow-lg safe-area-pb">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <p className="text-xs text-mist">Selling price</p>
            <p className="text-xl font-display font-bold text-gold-accessible">
              {estimate?.displayCurrency || 'USD'} {displaySalePrice.toFixed(2)}/kg
            </p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 text-sm min-h-[48px]">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <BottomSheet
        open={layerSheetOpen && !!editingLayer}
        onClose={() => { setLayerSheetOpen(false); setEditingLayerId(null); }}
        title="Edit layer"
        footer={
          <button
            type="button"
            className="btn-primary w-full min-h-[48px]"
            onClick={() => { setLayerSheetOpen(false); setEditingLayerId(null); }}
          >
            Done
          </button>
        }
      >
        {editingLayer && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Material</label>
              <select
                value={editingLayer.materialId}
                onChange={(e) => {
                  const mat = materials.find((m) => m.id === e.target.value);
                  if (!mat) return;
                  setLayers((prev) => prev.map((l) => l.id === editingLayer.id ? {
                    ...l,
                    materialId: mat.id,
                    materialName: mat.name,
                    materialType: editingLayer.materialType,
                    costPerKgUsd: parseFloat(mat.costPerKgUsd) || 0,
                    isSolventBased: mat.isSolventBased || false,
                    gsm: editingLayer.materialType === 'substrate'
                      ? l.micron * (parseFloat(mat.density) || 0.9)
                      : l.micron,
                  } : l));
                }}
                className="input w-full min-h-[48px]"
              >
                <option value="">Select material</option>
                {renderMaterialOptions(editingLayer.materialType)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Micron (µ)</label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                value={editingLayer.micron}
                onChange={(e) => {
                  const micron = Number(e.target.value);
                  const isSubstrate = editingLayer.materialType === 'substrate';
                  setLayers((prev) => prev.map((l) => l.id === editingLayer.id ? {
                    ...l,
                    micron,
                    gsm: isSubstrate ? micron * densityForMaterial(l.materialId) : micron,
                  } : l));
                }}
                className="input w-full min-h-[48px] font-mono text-lg"
              />
            </div>
            <p className="text-sm text-mist">
              GSM: {editingLayer.gsm.toFixed(1)} · Type: {LAYER_TYPE_LABELS[editingLayer.materialType] || editingLayer.materialType}
            </p>
            {canConfigureSolvent && editingLayer.materialType === 'adhesive' && editingLayer.isSolventBased && (
              <button
                type="button"
                className="btn-secondary w-full min-h-[48px]"
                onClick={() => {
                  setLayerSheetOpen(false);
                  setFormulaModalLayerId(editingLayer.id);
                }}
              >
                {laminationRecipeOverrides[editingLayer.id] ? 'Edit formula*' : 'Edit lamination formula'}
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={addLayerSheetOpen}
        onClose={() => setAddLayerSheetOpen(false)}
        title="Add layer"
      >
        <div className="space-y-2">
          {(['substrate', 'ink', 'adhesive'] as const)
            .filter((type) => !structureLocked || type === 'ink')
            .map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addLayerOfType(type)}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate text-left font-medium"
            >
              {LAYER_TYPE_LABELS[type] || type}
            </button>
          ))}
        </div>
      </BottomSheet>

      <LaminationFormulaModal
        open={formulaModalLayerId != null}
        title={
          formulaModalLayer
            ? `Lamination formula — ${formulaModalLayer.materialName}`
            : 'Lamination formula'
        }
        recipe={formulaModalRecipe}
        onClose={() => setFormulaModalLayerId(null)}
        onSave={(recipe) => {
          if (!formulaModalLayerId) return;
          setLaminationRecipeOverrides((prev) => ({ ...prev, [formulaModalLayerId]: recipe }));
        }}
      />
    </div>
  );
};

export default EstimateEditor;

