import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Download, ArrowLeft, Layers, Calculator, DollarSign, Loader2, X } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import BottomSheet from '../components/BottomSheet';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { usdToDisplay, displayToUsd } from '../lib/currency';
import { runClientCalculation, effectiveMarginPercent } from '../lib/estimateCalc';
import { useVisibilityProfile } from '../hooks/useVisibilityProfile';
import { dimensionsForSave, validateConfiguredEstimate } from '../lib/estimateConfigure';
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
  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'platform_admin';
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
  const [jobName, setJobName] = useState('New estimate');
  const [customerId, setCustomerId] = useState<string>('');
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
    const micron = type === 'substrate' ? 25 : type === 'ink' ? 5 : 3;
    const density = defaultMat?.density ? parseFloat(defaultMat.density) : 0.9;
    const newLayer: LayerItem = {
      id: crypto.randomUUID(),
      materialId: defaultMat?.id || '',
      materialName: defaultMat?.name || 'Select material',
      materialType: type,
      micron,
      gsm: micron * density,
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
          setEstimate({ id: undefined, status: 'draft', displayCurrency: 'AED', salePricePerKg: 0, materialCostPerKg: 0, totalGsm: 0, totalMicron: 0 });
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

  const fetchEstimate = async (estimateId: string) => {
    try {
      setLoading(true);
      const data = await apiClient.getEstimate(estimateId);
      const mappedLayers: LayerItem[] = (data.layers || []).map((l: any) => ({
        id: l.id, materialId: l.materialId, materialName: l.materialName || 'Unknown',
        materialType: l.materialType || 'substrate', micron: parseFloat(l.micron) || 0,
        gsm: parseFloat(l.gsm) || 0, costPerKgUsd: parseFloat(l.materialCostPerKgUsd) || 0,
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
        (data.productSubtype && subtypeParentByCode.get(data.productSubtype)) ||
          normalizeProductType(data.productType, productTypeOptions)
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
      if (data.processes) setProcessesState(data.processes);
      const fromTemplate =
        Boolean(data.dimensions?.configureFromTemplate) || Boolean(locationState?.configureFromTemplate);
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
      if (!fromTemplate && (!data.salePricePerKg || parseFloat(data.salePricePerKg) === 0)) {
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
    } finally { setLoading(false); }
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

  const buildSavePayload = useCallback(() => ({
    jobName, customerId: customerId || undefined, productType: engineTypeForFamily(productType),
    productSubtype: productSubtype ?? undefined,
    printingWebClass: derivedPrintingWebClass,
    dimensions: dimensionsForSave(dimensions as Record<string, unknown>),
    markupPercent, platesPerKg, deliveryPerKg,
    solventCostPerKgUsd: needsSolventMix ? solventCostPerKgUsd : undefined,
    solventRatio: needsSolventMix ? solventRatio : undefined,
    orderQuantityKg: orderQuantity,
    orderQuantityUnit,
    layers: layers.map((l, i) => ({ materialId: l.materialId, micron: l.micron, position: i })),
    slabs: slabsState.map(s => ({ quantityKg: s.quantityKg, pricePerKg: s.pricePerKgUsd ?? s.pricePerKg })),
    processes: processesState,
  }), [jobName, customerId, productType, productSubtype, derivedPrintingWebClass, needsSolventMix, dimensions, markupPercent, platesPerKg, deliveryPerKg, solventCostPerKgUsd, solventRatio, orderQuantity, orderQuantityUnit, layers, slabsState, processesState]);

  const slabQuantitiesKey = slabsState.map((s) => s.quantityKg).join(',');
  const layerInputsKey = layers.map((l) => `${l.materialId}:${l.micron}`).join('|');

  const clientCalcResult = useMemo(() => {
    if (loading || needsConfiguration || materials.length === 0 || layers.length === 0) return null;
    if (layers.some((l) => !l.materialId)) return null;
    try {
      return runClientCalculation({
        layers: layers.map((l, i) => ({ id: l.id, materialId: l.materialId, micron: l.micron, position: i })),
        materials,
        productType: engineTypeForFamily(productType),
        dimensions: { ...dimensions },
        markupPercent,
        platesPerKg,
        deliveryPerKg,
        slabs: slabsState,
        processes: processesState,
        orderQuantityKg: orderQuantity,
        displayCurrency: estimate?.displayCurrency || 'AED',
        exchangeRateUsdToDisplay: parseFloat(estimate?.exchangeRateUsdToDisplay) || 1,
        solventCostPerKgUsd,
        solventRatio,
      });
    } catch {
      return null;
    }
  }, [
    loading, needsConfiguration, materials, layerInputsKey, productType, dimensions,
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

  const persistEstimate = async (andCalculate: boolean) => {
    if (saving) return;
    if (andCalculate) {
      const validationError = validateConfiguredEstimate({
        layers,
        productType,
        dimensions: dimensions as Record<string, unknown>,
      });
      if (validationError) {
        alert(validationError);
        if (validationError.includes('Structure')) setActiveSection('structure');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = buildSavePayload();
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        localStorage.setItem(`offlineDraft:${estimate?.id || 'new'}`, JSON.stringify(payload));
        alert('Offline — draft saved locally');
        return;
      }
      let saved;
      if (estimate?.id) {
        saved = await apiClient.updateEstimate(estimate.id, payload);
      } else {
        saved = await apiClient.createEstimate(payload);
        navigate(`/estimate/${saved.id}`, { replace: true });
      }
      setEstimate((prev: any) => ({ ...prev, ...saved }));
      setDimensions((prev) => dimensionsForSave(prev as Record<string, unknown>) as DimensionState);
      setNeedsConfiguration(false);
      if (andCalculate && saved.id) {
        setCalculating(true);
        try {
          const result = await apiClient.calculateEstimate(saved.id);
          applyCalculationResult({ ...estimate, ...saved }, result);
        } catch (calcErr) {
          const msg = calcErr instanceof Error ? calcErr.message : 'Calculate failed';
          alert(`Calculate failed: ${msg}`);
        }
        finally { setCalculating(false); }
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    } finally { setSaving(false); }
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

  const handleSaveDraft = () => persistEstimate(false);
  const handleSaveAndCalculate = () => persistEstimate(true);

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
    const name = prompt('Template name:', jobName || estimate.jobName);
    if (!name?.trim()) return;
    try {
      await apiClient.createTemplate(name.trim(), estimate.id);
      alert(`Template "${name.trim()}" saved to your account. Use it when starting a new estimate from the estimate editor.`);
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

  const changeStatus = async (newStatus: 'sent' | 'won' | 'lost') => {
    if (!estimate?.id) { alert('Save the estimate before changing status'); return; }
    try {
      await apiClient.updateEstimate(estimate.id, { status: newStatus });
      await fetchEstimate(estimate.id);
      if (newStatus === 'sent') {
        alert('Marked sent. Proposal PDF saved to history when generation succeeded.');
      } else {
        alert(`Status changed to ${newStatus}`);
      }
    }
    catch (err) { alert('Failed to change status'); }
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
          <button onClick={handleSaveDraft} disabled={saving} className="btn-secondary inline-flex items-center space-x-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
          <button onClick={handleSaveAndCalculate} disabled={saving || calculating} className="btn-primary inline-flex items-center space-x-2">
            {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            <span>{calculating ? 'Calculating...' : 'Save & Calculate'}</span>
          </button>
          <button onClick={downloadProposalPdf} className="btn-secondary inline-flex items-center space-x-2">
            <Download className="w-4 h-4" /><span>PDF</span>
          </button>
        </div>
      </div>

      <div className="lg:flex lg:space-x-8">
        {/* Left panel */}
        <div className="lg:flex-1 lg:max-w-3xl">
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
              <div>
                <h3 className="text-lg font-display font-semibold text-navy mb-4">Layer Stack</h3>

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
                      onEdit={() => openLayerEdit(layer.id)}
                      onRemove={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))}
                      onMoveUp={() => moveLayer(idx, -1)}
                      onMoveDown={() => moveLayer(idx, 1)}
                      onDragStart={(i) => setDragFromIndex(i)}
                      onDragEnter={(i) => {
                        if (dragFromIndex !== null) setDragHoverIndex(i);
                      }}
                      onDragEnd={() => {
                        if (dragFromIndex !== null && dragHoverIndex !== null) {
                          reorderLayers(dragFromIndex, dragHoverIndex);
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
                    + Add layer
                  </button>
                </div>

                {/* Desktop table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">#</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">Material</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">µ</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">GSM</th>
                        {can('materialCostPerKg') && <th className="text-left py-3 px-4 text-sm font-medium text-mist">$/kg</th>}
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {layers.map((layer, idx) => (
                        <tr key={layer.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                          <td className="py-4 px-4 text-sm text-mist">{idx + 1}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs px-2 py-1 rounded-md ${layer.materialType === 'substrate' ? 'bg-blue-100 text-blue-800' : layer.materialType === 'ink' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>{LAYER_TYPE_LABELS[layer.materialType] || layer.materialType}</span>
                          </td>
                          <td className="py-4 px-4">
                            <select value={layer.materialId} onChange={(e) => {
                              const mat = materials.find(m => m.id === e.target.value);
                              if (!mat) return;
                              setLayers((prev) => prev.map((l) => l.id === layer.id ? {
                                ...l, materialId: mat.id, materialName: mat.name, materialType: layer.materialType,
                                costPerKgUsd: parseFloat(mat.costPerKgUsd) || 0, isSolventBased: mat.isSolventBased || false,
                                gsm: l.micron * (parseFloat(mat.density) || 0.9), hoover: mat.hoover,
                              } : l));
                            }} className="input w-full font-medium text-sm" title={materials.find(m => m.id === layer.materialId)?.hoover || ''}>
                              <option value="">Select material</option>
                              {renderMaterialOptions(layer.materialType)}
                            </select>
                            {isAdmin && (layer.platformMasterKeySnapshot || layer.costingKeySnapshot) && (
                              <div className="mt-1 text-[10px] font-mono text-mist leading-tight">
                                {layer.platformMasterKeySnapshot && (
                                  <div title="platform_master_key at save">{layer.platformMasterKeySnapshot}</div>
                                )}
                                {layer.costingKeySnapshot &&
                                  layer.costingKeySnapshot !== layer.platformMasterKeySnapshot && (
                                    <div title="costing_key at save">{layer.costingKeySnapshot}</div>
                                  )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <input type="number" value={layer.micron} onChange={(e) => {
                              const micron = Number(e.target.value);
                              setLayers((prev) => prev.map((l) => l.id === layer.id ? {
                                ...l, micron,
                                gsm: micron * (materials.find(m => m.id === l.materialId)?.density ? parseFloat(materials.find(m => m.id === l.materialId)!.density) : 0.9),
                              } : l));
                            }} className="input w-20 font-mono text-sm" />
                          </td>
                          <td className="py-4 px-4 font-mono text-sm">{layer.gsm.toFixed(1)}</td>
                          {can('materialCostPerKg') && <td className="py-4 px-4 font-mono text-sm">{layer.costPerKgUsd.toFixed(2)}</td>}
                          <td className="py-4 px-4">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add layer buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <select className="input w-48" onChange={(e) => {
                    const type = e.target.value as 'substrate' | 'ink' | 'adhesive';
                    if (!type) return;
                    const defaultMat = materials.find(m => m.type === type);
                    const micron = type === 'substrate' ? 25 : type === 'ink' ? 5 : 3;
                    const newLayer: LayerItem = { id: crypto.randomUUID(), materialId: defaultMat?.id || '', materialName: defaultMat?.name || 'Select material', materialType: type, micron, gsm: micron * (defaultMat?.density ? parseFloat(defaultMat.density) : 0.9), costPerKgUsd: defaultMat ? parseFloat(defaultMat.costPerKgUsd) : 0, isSolventBased: defaultMat?.isSolventBased || false, position: layers.length, hoover: defaultMat?.hoover || null };
                    setLayers((prev) => [...prev, newLayer]);
                    e.target.value = '';
                  }} defaultValue="">
                    <option value="" disabled>+ Add Layer...</option>
                    <option value="substrate">Substrate</option>
                    <option value="ink">Ink & Coating</option>
                    <option value="adhesive">Adhesive</option>
                  </select>
                  {/* Note: "+ Metallized Barrier" auto-add removed (Req 8.1).
                      Add metallized/barrier layers manually via the dropdown above. */}
                </div>

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
            </div>
          )}

          {/* Dimensions — now rendered in the top panel (product type → subtype → dimensions).
              This legacy section is disabled; safe to delete in a follow-up cleanup. */}
          {false && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Dimensions</h3>
              <p className="text-sm text-mist">
                Product type:{' '}
                <span className="font-medium text-navy">
                  {productTypeOptions.find((pt) => pt.value === productType)?.label ?? productType}
                </span>
                {' '}— change in the job header above.
              </p>
              {productType === 'roll' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-navy mb-2">Reel width (mm)</label><input type="number" value={dimensions.reelWidthMm} onChange={(e) => setDimensions(prev => ({ ...prev, reelWidthMm: Number(e.target.value) }))} className="input w-full" /></div>
                    <div><label className="block text-sm font-medium text-navy mb-2">Cut-off (mm)</label><input type="number" value={dimensions.cutoffMm} onChange={(e) => setDimensions(prev => ({ ...prev, cutoffMm: Number(e.target.value) }))} className="input w-full" /></div>
                  </div>
                  <details className="p-4 bg-slate rounded-lg">
                    <summary className="font-medium cursor-pointer">Multi-up & trim</summary>
                    <div className="mt-4 space-y-4">
                      <div><label className="block text-sm font-medium text-navy mb-2">Number of ups</label><input type="number" value={dimensions.numberOfUps} onChange={(e) => setDimensions(prev => ({ ...prev, numberOfUps: Number(e.target.value) }))} className="input w-32" /></div>
                      <div><label className="block text-sm font-medium text-navy mb-2">Extra printing trim (mm)</label><input type="number" value={dimensions.extraPrintingTrimMm} onChange={(e) => setDimensions(prev => ({ ...prev, extraPrintingTrimMm: Number(e.target.value) }))} className="input w-32" /></div>
                      <div><label className="block text-sm font-medium text-navy mb-2">Pieces per cut</label><input type="number" value={dimensions.piecesPerCut} onChange={(e) => setDimensions(prev => ({ ...prev, piecesPerCut: Number(e.target.value) }))} className="input w-32" /></div>
                    </div>
                  </details>
                </div>
              )}
              {productType === 'sleeve' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-navy mb-2">Sleeve width (mm)</label><input type="number" value={dimensions.reelWidthMm} onChange={(e) => setDimensions(prev => ({ ...prev, reelWidthMm: Number(e.target.value) }))} className="input w-full" /></div>
                  <div><label className="block text-sm font-medium text-navy mb-2">Height (mm)</label><input type="number" value={dimensions.cutoffMm} onChange={(e) => setDimensions(prev => ({ ...prev, cutoffMm: Number(e.target.value) }))} className="input w-full" /></div>
                </div>
              )}
              {productType === 'pouch' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">Kind</label>
                      <select
                        className="input w-full"
                        value={productFamily === 'bag' ? 'bag' : 'pouch'}
                        onChange={(e) => setProductSubtype(defaultSubtypeForFamily(e.target.value as ProductFamily))}
                      >
                        <option value="pouch">Pouch</option>
                        <option value="bag">Bag</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        {PRODUCT_FAMILY_LABELS[productFamily]} type
                      </label>
                      <select
                        className="input w-full"
                        value={productSubtype ?? ''}
                        onChange={(e) => setProductSubtype(e.target.value || null)}
                      >
                        <option value="">Select type…</option>
                        {subtypesForFamily(productFamily).map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.group ? `${s.group} — ${s.label}` : s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                            className="input w-full"
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
                </div>
              )}
              <div className="pt-4 border-t border-border">
                <h4 className="font-display font-semibold text-navy mb-4">Calculated Values</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {can('printingWebWidth') && (
                  <div title="Press/lamination width before slitting — not your finished reel width.">
                    <p className="text-sm text-mist">Printing web width <span className="text-mist cursor-help">ⓘ</span></p>
                    <p className="font-mono font-semibold text-gold">{printWebWidth} mm</p>
                  </div>
                  )}
                  <div><p className="text-sm text-mist">Total µ</p><p className="font-mono font-semibold">{totalMicron}</p></div>
                  <div><p className="text-sm text-mist">Total GSM</p><p className="font-mono font-semibold">{totalGsm.toFixed(1)}</p></div>
                  <div><p className="text-sm text-mist">Density</p><p className="font-mono font-semibold">{density}</p></div>
                </div>
              </div>
              {can('rollAfterSlitting') && productType === 'roll' && (
                <details className="p-4 border border-border rounded-lg">
                  <summary className="font-medium cursor-pointer select-none">Roll spec (after slitting)</summary>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm text-mist mb-1">Slit width (mm)</label><input type="number" className="input w-full" defaultValue={(dimensions as any).slitWidthMm || dimensions.reelWidthMm} /></div>
                      <div><label className="block text-sm text-mist mb-1">Core diameter (mm)</label><input type="number" className="input w-full" defaultValue={(dimensions as any).coreDiameterMm || 76} /></div>
                      <div><label className="block text-sm text-mist mb-1">Max OD (mm)</label><input type="number" className="input w-full" defaultValue={(dimensions as any).outerDiameterMm || 400} /></div>
                      <div><label className="block text-sm text-mist mb-1">Film weight / roll (kg)</label><input type="number" className="input w-full" defaultValue={(dimensions as any).weightPerRollKg || orderQuantity} /></div>
                    </div>
                    {/* Derived read-only fields */}
                    {totalGsm > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate rounded-lg">
                        <div>
                          <p className="text-xs text-mist">Film density (g/cm³)</p>
                          <p className="font-mono text-sm font-semibold">{density}</p>
                        </div>
                        <div>
                          <p className="text-xs text-mist">m²/kg</p>
                          <p className="font-mono text-sm font-semibold">{totalGsm > 0 ? (1000 / totalGsm).toFixed(2) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-mist">LM/kg (reel width)</p>
                          <p className="font-mono text-sm font-semibold">
                            {totalGsm > 0 && dimensions.reelWidthMm > 0
                              ? ((1000 / totalGsm) * (1000 / dimensions.reelWidthMm)).toFixed(1)
                              : '—'}
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-mist">Display-only — these values are not included in costing calculations.</p>
                  </div>
                </details>
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

        {/* Right panel - sticky sidebar */}
        <div className="lg:w-80 lg:flex-shrink-0 mt-8 lg:mt-0">
          <div className="sticky top-8 space-y-6">
            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Laminate Stack</h3>
              <div className="flex items-center justify-center">
                <LaminateVisualizer layers={layers.map(l => ({ id: l.id, type: l.materialType, material: l.materialName, micron: l.micron, gsm: l.gsm }))} width={220} height={180} />
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

            {can('costBreakdown') && <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Cost Breakdown</h3>
              <div className="space-y-2">{(() => {
                const mat = Number(estimate?.materialCostPerKg) || 0;
                const sale = Number(estimate?.salePricePerKg) || 0;
                const materialPct = sale ? Math.round((mat / sale) * 100) : 0;
                const markupPct = Math.round(markupPercent);
                const processPct = Math.max(0, 100 - materialPct - markupPct);
                return (<>
                  <div className="flex items-center justify-between"><span className="text-sm">Material</span><span className="text-sm font-semibold">{materialPct}%</span></div>
                  <div className="w-full bg-slate rounded-full h-2"><div className="bg-blue-500 rounded-full h-2" style={{ width: `${materialPct}%` }}></div></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Markup</span><span className="text-sm font-semibold">{markupPct}%</span></div>
                  <div className="w-full bg-slate rounded-full h-2"><div className="bg-gold rounded-full h-2" style={{ width: `${markupPct}%` }}></div></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Process</span><span className="text-sm font-semibold">{processPct}%</span></div>
                  <div className="w-full bg-slate rounded-full h-2"><div className="bg-green-500 rounded-full h-2" style={{ width: `${processPct}%` }}></div></div>
                </>);
              })()}</div>
            </div>}

            <div className="space-y-2">
              <button onClick={handleSaveAndCalculate} className="btn-primary w-full">Save & Calculate</button>
              <button onClick={handleSaveAsTemplate} className="btn-secondary w-full">Save as Template</button>
              <button onClick={downloadProposalPdf} className="btn-secondary w-full">Generate Proposal PDF</button>
              <button onClick={handleRequote} className="text-sm text-mist hover:text-ink w-full text-center py-2">Duplicate for re-quote</button>
            </div>

            <div className="card">
              <h4 className="font-display font-semibold text-navy mb-3">Status</h4>
              <div className="flex space-x-2">
                <button onClick={() => changeStatus('sent')} className="btn-secondary flex-1">Mark Sent</button>
                <button onClick={() => changeStatus('won')} className="btn-success flex-1">Mark Won</button>
                <button onClick={() => changeStatus('lost')} className="btn-danger flex-1">Mark Lost</button>
              </div>
              <div className="mt-3 text-sm text-mist">Current: <strong>{estimate?.status || 'draft'}</strong></div>
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
          <button onClick={handleSaveAndCalculate} disabled={saving} className="btn-primary px-4 py-2 text-sm min-h-[48px]">
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

