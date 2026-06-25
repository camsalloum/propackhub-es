import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Download, ArrowLeft, Layers, Calculator, DollarSign, Loader2, X } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import BottomSheet from '../components/BottomSheet';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { JobHeaderFields } from '../components/JobHeaderFields';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { usdToDisplay, displayToUsd } from '../lib/currency';
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
import { derivePrintingWebClass, stackNeedsSolventMix, materialAllowedForTemplateLayer } from '@es/engine';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import {
  DEFAULT_MASTER_REFERENCE,
  defaultUnitValue,
  normalizeProductType,
  normalizeUnitValue,
} from '../lib/masterDataReference';
import {
  dimensionFieldsFor,
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
  const [solventCostPerKgUsd, setSolventCostPerKgUsd] = useState(2.0);
  const [solventRatio, setSolventRatio] = useState(0.5);
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
      })),
    [materials]
  );

  const layerMaterialRefs = useMemo(
    () => layers.filter((l) => l.materialId).map((l) => ({ materialId: l.materialId })),
    [layers]
  );

  const derivedPrintingWebClass = useMemo(
    () => derivePrintingWebClass(layerMaterialRefs, engineMaterials),
    [layerMaterialRefs, engineMaterials]
  );

  const needsSolventMix = useMemo(
    () => stackNeedsSolventMix(layerMaterialRefs, engineMaterials),
    [layerMaterialRefs, engineMaterials]
  );

  const densityForMaterial = (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId);
    return mat?.density ? parseFloat(mat.density) : 0.9;
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= layers.length) return;
    setLayers((prev) => {
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

  const openLayerEdit = (layerId: string) => {
    setEditingLayerId(layerId);
    setLayerSheetOpen(true);
  };

  const productTypeOptions = masterReference.productTypeOptions ?? DEFAULT_PRODUCT_TYPE_OPTIONS;
  const unitOptions = masterReference.unitOptions ?? DEFAULT_UNIT_OPTIONS;

  // `productType` state holds the Master-Data product-type CODE (family): roll/sleeve/pouch/bag/custom.
  // The engine costing type is derived (bag → pouch). Subtypes link to a family by `parent`.
  const productFamily: ProductFamily = productType;
  const subtypeDimensionFields = dimensionFieldsFor(productFamily, productSubtype);

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
      gsm: micron * (mat?.density ? parseFloat(mat.density) : 0.9),
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
        isSolventBased: l.materialIsSolventBased || false, position: l.position || 0,
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
      if (data.solventCostPerKgUsd) setSolventCostPerKgUsd(parseFloat(data.solventCostPerKgUsd));
      if (data.solventRatio) setSolventRatio(parseFloat(data.solventRatio));
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
          reelWidthMm: data.dimensions.reelWidthMm || 800,
          cutoffMm: data.dimensions.cutoffMm || 600,
          numberOfUps: data.dimensions.numberOfUps || 1,
          extraPrintingTrimMm: data.dimensions.extraPrintingTrimMm || 0,
          piecesPerCut: data.dimensions.piecesPerCut || 1,
          openWidthMm: data.dimensions.openWidthMm || 200,
          openHeightMm: data.dimensions.openHeightMm || 250,
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
      solventCostPerKgUsd: needsSolventMix ? solventCostPerKgUsd : undefined,
      solventRatio: needsSolventMix ? solventRatio : undefined,
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
  }, [jobName, customerId, estimate?.productType, productType, productTypeOptions, productSubtype, needsSolventMix, dimensions, markupPercent, platesPerKg, deliveryPerKg, solventCostPerKgUsd, solventRatio, orderQuantity, orderQuantityUnit, layers, slabsState, processesState]);

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
        solventCostPerKgUsd,
        solventRatio,
      });
    } catch {
      return null;
    }
  }, [
    loading, materials, layerInputsKey, productType, dimensions,
    markupPercent, platesPerKg, deliveryPerKg, slabQuantitiesKey,
    estimate?.displayCurrency, estimate?.exchangeRateUsdToDisplay,
    solventCostPerKgUsd, solventRatio, layers.length,
  ]);

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
  // structureLocked: estimate was created from a standard template → structure is fixed.
  // Everyone including admins is locked — structure changes belong in the Templates page.
  // Only µ (thickness) and dimensions are user-editable in the estimation view.
  const structureLocked = Boolean(estimate?.sourceTemplateKey);

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
  const totalMicron = layers.reduce((s, l) => s + l.micron, 0);
  const totalGsm = layers.reduce((s, l) => s + l.gsm, 0);
  const density = totalMicron > 0 ? (totalGsm / totalMicron).toFixed(2) : '0';
  const printWebWidth = (dimensions.reelWidthMm * dimensions.numberOfUps) + dimensions.extraPrintingTrimMm;
  const fxRate = parseFloat(estimate?.exchangeRateUsdToDisplay) || 1;
  const displaySalePrice = estimate?.salePriceDisplay ?? usdToDisplay(Number(estimate?.salePricePerKg) || 0, fxRate);

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

      <div className="lg:flex lg:space-x-6">
        {/* Left panel — full width, no max-width cap so table expands */}
        <div className="lg:flex-1 min-w-0">
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
            <div className="card space-y-6">
              {/* structureLocked: from a template — only µ editable. Admins retain full edit. */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-display font-semibold text-navy">{stackLabel}</h3>
                </div>

                {/* Mobile cards + bottom sheets (PRD §5.8) */}
                <div className="space-y-3 md:hidden pb-24">
                  <button
                    type="button"
                    onClick={() => setMobileStackOpen((v) => !v)}
                    className="w-full flex items-center justify-between p-3 bg-slate rounded-lg text-sm font-medium text-navy"
                  >
                    <span>Laminate preview</span>
                    <span>{mobileStackOpen ? '▲' : '▼'}</span>
                  </button>
                  {mobileStackOpen && (
                    <div className="flex justify-center py-2">
                      <LaminateVisualizer layers={layers.map(l => ({ id: l.id, type: l.materialType, material: l.materialName, micron: l.micron, gsm: l.gsm }))} width={220} height={120} />
                    </div>
                  )}
                  {layers.map((layer, idx) => (
                    <LayerCard
                      key={layer.id}
                      index={idx}
                      total={layers.length}
                      layer={{ ...layer, type: layer.materialType, material: layer.materialName, costPerKg: can('materialCostPerKg') ? layer.costPerKgUsd : undefined }}
                      showCost={can('materialCostPerKg')}
                      onEdit={structureLocked ? undefined : () => openLayerEdit(layer.id)}
                      onRemove={structureLocked ? undefined : () => setLayers((prev) => prev.filter((l) => l.id !== layer.id))}
                      onMoveUp={structureLocked ? undefined : () => moveLayer(idx, -1)}
                      onMoveDown={structureLocked ? undefined : () => moveLayer(idx, 1)}
                      onDragStart={structureLocked ? undefined : (i) => setDragFromIndex(i)}
                      onDragEnter={(i) => {
                        if (!structureLocked && dragFromIndex !== null) setDragHoverIndex(i);
                      }}
                      onDragEnd={() => {
                        if (!structureLocked && dragFromIndex !== null && dragHoverIndex !== null) {
                          reorderLayers(dragFromIndex, dragHoverIndex);
                        }
                        setDragFromIndex(null);
                        setDragHoverIndex(null);
                      }}
                      isDragging={dragFromIndex === idx}
                    />
                  ))}
                  {!structureLocked && (
                    <button
                      type="button"
                      onClick={() => setAddLayerSheetOpen(true)}
                      className="w-full min-h-[48px] py-3 border-2 border-dashed border-border rounded-xl font-display font-semibold text-navy"
                    >
                      + Add layer
                    </button>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  {/* Column picker — optional columns */}
                  {/* Column picker removed — Cost/Kg and Cost/M² are always visible */}

                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist w-10">#</th>
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist">Type</th>
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist">Family</th>
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist">Grade Name</th>
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist w-32">Value<br/><span className="font-normal text-xs">µ / gsm</span></th>
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist w-24">Total GSM</th>
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist w-28">
                          Cost / Kg<br/><span className="font-normal text-xs">({estimate?.displayCurrency || 'USD'})</span>
                        </th>
                        <th className="text-center py-3 px-3 text-sm font-medium text-mist w-28">
                          Cost / M²<br/><span className="font-normal text-xs">({estimate?.displayCurrency || 'USD'})</span>
                        </th>
                        {!structureLocked && <th className="py-3 px-3 w-20"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {layers.map((layer, idx) => (
                        <tr key={layer.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                          <td className="py-4 px-4 text-sm text-mist text-center">{idx + 1}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs px-2 py-1 rounded-md ${layer.materialType === 'substrate' ? 'bg-blue-100 text-blue-800' : layer.materialType === 'ink' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>{LAYER_TYPE_LABELS[layer.materialType] || layer.materialType}</span>
                          </td>
                          <td className="py-4 px-4">
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
                                  return <span className="text-sm text-mist">{currentFamily || '—'}</span>;
                                }

                                return (
                                  <select
                                    className="input w-full text-sm"
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
                                  className="input w-full text-sm"
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
                          <td className="py-4 px-4 text-center">
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
                                <select
                                  className="input w-full text-sm"
                                  value={layer.materialId}
                                  title={currentMat?.hoover ?? ''}
                                  onChange={(e) => {
                                    const mat = materials.find(m => m.id === e.target.value);
                                    if (!mat) return;
                                    setLayers(prev => prev.map(l => l.id === layer.id ? {
                                      ...l, materialId: mat.id, materialName: mat.name,
                                      costPerKgUsd: parseFloat(mat.costPerKgUsd) || 0,
                                      isSolventBased: mat.isSolventBased || false,
                                      gsm: l.micron * (parseFloat(mat.density) || 0.9),
                                      hoover: mat.hoover ?? null,
                                    } : l));
                                  }}
                                >
                                  {gradeOptions.map(m => (
                                    <option key={m.id} value={m.id} title={m.hoover ?? ''}>{m.name}</option>
                                  ))}
                                </select>
                              );
                            })()}
                            {/* Admin key — hidden from UI, kept for debugging only via DevTools */}
                          </td>

                          {/* µ / GSM — input with unit label; substrate=µ, ink/adhesive=gsm; yellow when 0 */}
                          <td className="py-4 px-3 text-center">
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
                                <div className="flex items-center justify-center gap-1">
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
                                    className={`input w-20 font-mono text-sm text-center ${layer.micron === 0 ? 'bg-amber-50 border-amber-200' : ''}`}
                                    inputMode="decimal"
                                  />
                                  <span className="text-xs text-mist w-6 text-left">{unitLabel}</span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Total GSM per row = layer.gsm (substrate: µ×density; ink: solid%×µ/100) */}
                          <td className="py-4 px-3 font-mono text-sm text-center font-semibold text-navy">
                            {layer.gsm > 0 ? layer.gsm.toFixed(2) : <span className="text-mist">0.00</span>}
                          </td>

                          {/* Cost / Kg — always editable input; column visibility controlled by header */}
                          <td className="py-2 px-3 font-mono text-sm text-center">
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
                              className="input w-24 font-mono text-sm text-center"
                              inputMode="decimal"
                              aria-label={`Cost per kg for ${layer.materialName}`}
                            />
                          </td>

                          {/* Cost / M² — from engine result, x.xxxx */}
                          <td className="py-4 px-3 font-mono text-sm text-center">
                            {(() => {
                              const calcLayer = clientCalcResult?.estimate.layers[idx];
                              const c = calcLayer?.costPerM2;
                              if (c == null || c <= 0) return <span className="text-mist">—</span>;
                              // Apply FX rate without rounding to 2dp — Cost/M² needs 4dp precision
                              const rate = fxRate > 0 ? fxRate : 1;
                              const display = c * rate;
                              return display.toFixed(4);
                            })()}
                          </td>
                          {!structureLocked && (
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveLayer(idx, -1)}
                                  className="text-xs text-mist hover:text-navy disabled:opacity-30"
                                  title="Move up"
                                  aria-label="Move layer up"
                                >▲</button>
                                <button
                                  type="button"
                                  disabled={idx === layers.length - 1}
                                  onClick={() => moveLayer(idx, 1)}
                                  className="text-xs text-mist hover:text-navy disabled:opacity-30"
                                  title="Move down"
                                  aria-label="Move layer down"
                                >▼</button>
                                <button onClick={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))} className="text-sm text-mist hover:text-danger">Remove</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-slate/40">
                        <td colSpan={4} className="py-3 px-3 text-sm font-semibold text-navy text-right">Total GSM</td>
                        <td className="py-3 px-3 text-center">
                          {/* µ/GSM col — empty in footer */}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-bold text-navy">{totalGsm.toFixed(2)}</span>
                        </td>
                        <td />{/* Cost/Kg */}
                        <td />{/* Cost/M² */}
                        {!structureLocked && <td />}
                      </tr>
                    </tfoot>
                  </table>
                  </div> {/* end overflow-x-auto */}
                </div> {/* end hidden md:block */}

                {/* Add layer buttons — hidden when structure is locked (came from template) */}
                {!structureLocked && (
                  <div className="flex flex-wrap gap-3 pt-4">
                    <select className="input w-48" onChange={(e) => {
                      const type = e.target.value as 'substrate' | 'ink' | 'adhesive';
                      if (!type) return;
                      const defaultMat = materials.find(m => m.type === type);
                      const micron = type === 'substrate' ? 25 : 2;
                      const newLayer: LayerItem = { id: crypto.randomUUID(), materialId: defaultMat?.id || '', materialName: defaultMat?.name || 'Select material', materialType: type, micron, gsm: type === 'substrate' ? micron * (defaultMat?.density ? parseFloat(defaultMat.density) : 0.9) : micron, costPerKgUsd: defaultMat ? parseFloat(defaultMat.costPerKgUsd) : 0, isSolventBased: defaultMat?.isSolventBased || false, position: layers.length, hoover: defaultMat?.hoover || null };
                      setLayers((prev) => [...prev, newLayer]);
                      e.target.value = '';
                    }} defaultValue="">
                      <option value="" disabled>+ Add Layer...</option>
                      <option value="substrate">Substrate</option>
                      <option value="ink">Ink & Coating</option>
                      <option value="adhesive">Adhesive</option>
                    </select>
                  </div>
                )}

                {/* Solvent mix (admin only, wide web) */}
                {can('solventMixCost') && needsSolventMix && (
                  <div className="mt-6 p-4 border border-border rounded-lg">
                    <h4 className="font-display font-semibold text-navy mb-3">Solvent Mix</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-navy mb-2">Solvent-mix $/kg</label><input type="number" value={solventCostPerKgUsd} onChange={(e) => setSolventCostPerKgUsd(Number(e.target.value))} step="0.1" className="input w-full" /></div>
                      <div><label className="block text-sm font-medium text-navy mb-2">Ink-to-solvent ratio</label><input type="number" value={solventRatio} onChange={(e) => setSolventRatio(Number(e.target.value))} step="0.1" className="input w-full" /></div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Dimensions ───────────────────────────────────────────────── */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-display font-semibold text-navy">Dimensions</h3>
                  {/* Printing web class badge — read-only, auto-derived from ink layers */}
                  {can('printingWebClass') && derivedPrintingWebClass && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${derivedPrintingWebClass === 'wide_web' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {derivedPrintingWebClass === 'wide_web' ? 'Wide Web (SB)' : 'Narrow Web (UV)'}
                    </span>
                  )}
                </div>

                {/* Pouch/Bag: Kind locked from template, subtype chosen per job */}
                {(productFamily === 'pouch' || productFamily === 'bag') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-mist mb-1">Kind</label>
                      {structureLocked ? (
                        <p className="input bg-slate text-navy font-medium capitalize">{productFamily}</p>
                      ) : (
                        <select
                          className="input w-full"
                          value={productFamily}
                          onChange={(e) => {
                            setProductType(e.target.value);
                            setProductSubtype(defaultSubtypeForFamily(e.target.value as ProductFamily));
                          }}
                        >
                          {/* Kind options — pouch/bag families from Master Data productTypeOptions */}
                          {productTypeOptions
                            .filter(opt => opt.value === 'pouch' || opt.value === 'bag')
                            .map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                      )}
                    </div>
                    {availableSubtypes.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-mist mb-1">
                          {PRODUCT_FAMILY_LABELS[productFamily] ?? productFamily} type
                        </label>
                        <select
                          className="input w-full"
                          value={productSubtype ?? ''}
                          onChange={(e) => setProductSubtype(e.target.value || null)}
                        >
                          <option value="">Select type…</option>
                          {availableSubtypes.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic dimension fields driven by productCatalog */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subtypeDimensionFields.map((f) =>
                    f.type === 'boolean' ? (
                      <label key={f.key} className="flex items-center gap-2 md:mt-7">
                        <input
                          type="checkbox"
                          checked={Number(dimensions[f.key]) === 1}
                          onChange={(e) =>
                            setDimensions((prev) => ({ ...prev, [f.key]: e.target.checked ? 1 : 0 }))
                          }
                        />
                        <span className="text-sm font-medium text-navy">{f.label}</span>
                        {f.hint && <span className="text-xs text-mist">— {f.hint}</span>}
                      </label>
                    ) : (
                      <div key={f.key}>
                        <label className="block text-sm font-medium text-navy mb-2">
                          {f.label}{f.unit ? ` (${f.unit})` : ''}{f.required ? ' *' : ''}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          className={`input w-full ${f.required && (dimensions[f.key] ?? 0) === 0 ? 'bg-amber-50 border-amber-200' : ''}`}
                          value={dimensions[f.key] ?? 0}
                          onChange={(e) =>
                            setDimensions((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                          }
                        />
                        {f.hint && <p className="text-xs text-mist mt-1">{f.hint}</p>}
                      </div>
                    )
                  )}
                </div>

                {/* Printing web width badge (read-only, always visible for roll/sleeve) */}
                {can('printingWebWidth') && (productFamily === 'roll' || productFamily === 'sleeve') && printWebWidth > 0 && (
                  <div className="mt-4 p-3 bg-slate rounded-lg flex items-center gap-6 text-sm flex-wrap">
                    <div title="Press/lamination width before slitting — not your finished reel width.">
                      <p className="text-xs text-mist">Printing web width <span className="cursor-help">ⓘ</span></p>
                      <p className="font-mono font-semibold text-gold">{printWebWidth} mm</p>
                    </div>
                    <div>
                      <p className="text-xs text-mist">Total µ</p>
                      <p className="font-mono font-semibold">{totalMicron}</p>
                    </div>
                    <div>
                      <p className="text-xs text-mist">Total GSM</p>
                      <p className="font-mono font-semibold">{totalGsm.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-mist">Density (g/cm³)</p>
                      <p className="font-mono font-semibold">{density}</p>
                    </div>
                    {totalGsm > 0 && (
                      <div>
                        <p className="text-xs text-mist">m²/kg</p>
                        <p className="font-mono font-semibold">{(1000 / totalGsm).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pouch/Bag: show GSM + density summary */}
                {(productFamily === 'pouch' || productFamily === 'bag') && totalGsm > 0 && (
                  <div className="mt-4 p-3 bg-slate rounded-lg flex items-center gap-6 text-sm flex-wrap">
                    <div>
                      <p className="text-xs text-mist">Total µ</p>
                      <p className="font-mono font-semibold">{totalMicron}</p>
                    </div>
                    <div>
                      <p className="text-xs text-mist">Total GSM</p>
                      <p className="font-mono font-semibold">{totalGsm.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-mist">Density (g/cm³)</p>
                      <p className="font-mono font-semibold">{density}</p>
                    </div>
                    {totalGsm > 0 && (
                      <div>
                        <p className="text-xs text-mist">m²/kg</p>
                        <p className="font-mono font-semibold">{(1000 / totalGsm).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

        {/* Right panel - sticky sidebar */}
        <div className="lg:w-56 lg:flex-shrink-0 mt-8 lg:mt-0">
          <div className="sticky top-8 space-y-6">
            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">{stackLabel}</h3>
              <div className="flex items-center justify-center">
                <LaminateVisualizer layers={layers.map(l => ({ id: l.id, type: l.materialType, material: l.materialName, micron: l.micron, gsm: l.gsm }))} width={180} height={150} />
              </div>
            </div>

            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Totals</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-mist">Total GSM</span><span className="font-mono font-semibold">{totalGsm.toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-mist">Total µ</span><span className="font-mono font-semibold">{totalMicron}</span></div>
                {can('filmDensity') && <div className="flex justify-between"><span className="text-mist">Film density</span><span className="font-mono font-semibold">{density}</span></div>}
              </div>
            </div>

            <div className="card bg-gold/5 border-gold/20">
              <h3 className="font-display font-semibold text-navy mb-2">Selling Price</h3>
              <div className="text-3xl font-display font-bold text-gold-accessible mb-2">{estimate?.displayCurrency || 'USD'} {displaySalePrice.toFixed(2)} /kg</div>
              {can('costBreakdown') && <div className="text-sm text-mist">{calculating ? 'Saving to server...' : 'Live preview — save to persist'}</div>}
            </div>

            {can('costBreakdown') && (
              <div className="card">
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
                  const saleUsd = clientCalcResult?.estimate.salePricePerKg ?? Number(estimate?.salePricePerKg) ?? 0;
                  const effMargin = effectiveMarginPercent(matCostUsd, markupPercent, saleUsd);

                  return (
                    <div className="space-y-3">
                      {/* Cost line items (admin) */}
                      {can('rmCostPerKg') && (
                        <div className="flex justify-between text-sm">
                          <span className="text-mist">RM cost/kg</span>
                          <span className="font-mono font-semibold">{estimate?.displayCurrency || 'USD'} {usdToDisplay(matCostUsd, fxRate).toFixed(2)}</span>
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

            <div className="space-y-2">
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
                    gsm: l.micron * (parseFloat(mat.density) || 0.9),
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
                  setLayers((prev) => prev.map((l) => l.id === editingLayer.id ? {
                    ...l,
                    micron,
                    gsm: micron * densityForMaterial(l.materialId),
                  } : l));
                }}
                className="input w-full min-h-[48px] font-mono text-lg"
              />
            </div>
            <p className="text-sm text-mist">
              GSM: {editingLayer.gsm.toFixed(1)} · Type: {LAYER_TYPE_LABELS[editingLayer.materialType] || editingLayer.materialType}
            </p>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={addLayerSheetOpen}
        onClose={() => setAddLayerSheetOpen(false)}
        title="Add layer"
      >
        <div className="space-y-2">
          {(['substrate', 'ink', 'adhesive'] as const).map((type) => (
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
    </div>
  );
};

export default EstimateEditor;

