import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, Download, ArrowLeft, Layers, Calculator, Loader2, Check, Plus, Minus, GripVertical, AlertCircle, RefreshCw, Copy, BookmarkPlus } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import BottomSheet from '../components/BottomSheet';
import FilmStackVisualizer from '../components/FilmStackVisualizer';
import { EstimateProcessesPanel } from '../components/EstimateProcessesPanel';
import StructureGradeSelect from '../components/StructureGradeSelect';
import { JobHeaderFields } from '../components/JobHeaderFields';
import { SectionTitle } from '../components/SectionTitle';
import { BagConfigurator } from '../components/BagConfigurator';
import { PouchConfigurator } from '../components/PouchConfigurator';
import { RollConfigurator } from '../components/roll/RollConfigurator';
import { SleeveConfigurator } from '../components/sleeve/SleeveConfigurator';
import NumberTicker from '../components/NumberTicker';
import {
  configuratorTypeForBagSubtype,
  seedBagDimensionPatch,
  canonicalBagSubtype,
} from '../lib/bagConfiguratorCatalog';
import {
  configuratorTypeForPouchSubtype,
  seedPouchDimensionPatch,
  canonicalPouchSubtype,
} from '../lib/pouchConfiguratorCatalog';
import { seedRollDimensionPatch, isLabelsRollContext, defaultOrderQuantityUnit } from '../lib/rollConfiguratorCatalog';
import { seedSleeveDimensionPatch } from '../lib/sleeveConfiguratorCatalog';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { runClientCalculation } from '../lib/estimateCalc';
import { usdToDisplay, usdToDisplayPrecise } from '../lib/currency';
import { formatMicronDisplay } from '../lib/formatMicron';
import { useVisibilityProfile } from '../hooks/useVisibilityProfile';
import {
  buildProcessCostCatalogFromReference,
  dimensionsForSave,
  estimateNeedsConfiguration,
  lookupProcessCostRow,
  normalizeProcessesForSave,
  productTypeForSave,
  resolveProcessPerKgUsd,
  sanitizeEstimateSavePayload,
  validateConfiguredEstimate,
  validateSaveMaterialRefs,
} from '../lib/estimateConfigure';
import { setWorkingEstimateForTemplate } from '../lib/estimateSession';
import { selectOnFocus } from '../lib/inputs';
import { normalizeToolingScenario, toolingDevelopmentTotal } from '../lib/tooling';
import { estimateStatusLabel, MES_OUTCOME_ENABLED } from '../lib/estimateStatus';
import { meaningfulRequotePriceChanges } from '../lib/requote';
import { groupMaterialsForPicker, type CategoryNode } from '../lib/materialTaxonomy';
import { stackNeedsSolventMix, stackHasSbInk, defaultInkPrintingProcess, inkSolventRatioForProcess, materialAllowedForTemplateLayer, DEFAULT_CLEANING_SOLVENT_KG_PER_JOB, DEFAULT_WASTE_BANDS_BY_PRINT_MODE, DEFAULT_CORM_SCALE_WITH_WASTE, structureIsPrinted, wasteBandsForPrintMode, plainCormFromPrinted, layerPhysicalThicknessMicron, type LaminationRecipe, type InkPrintingProcess, type PouchAccessorySelection, type WasteBand } from '@es/engine';
import LaminationFormulaModal from '../components/LaminationFormulaModal';
import PriceListPanel, { type PriceListUnit } from '../components/PriceListPanel';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { useMaterialsContextOptional } from '../contexts/MaterialsContext';
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
  // Accessory pricing (type='accessory' rows). Strings from the API decimal columns.
  accessoryKind?: string | null;
  costPerMeterUsd?: string | null;
  costPerPieceUsd?: string | null;
  weightGramPerMeter?: string | null;
  weightGramPerPiece?: string | null;
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

/** Fallback unit-code → basis for legacy units stored without metadata. */
const LEGACY_UNIT_BASIS: Record<string, string> = {
  kgs: 'kg', kg: 'kg', kpcs: 'pieces', sqm: 'sqm', lm: 'lm', roll_500_lm: 'lm',
};

/** EXW = buyer collects — no freight; charge is always 0 and locked. */
const isExwDelivery = (term: string | null | undefined) =>
  String(term ?? '').trim().toUpperCase() === 'EXW';

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

type EstimateEditorProps = {
  /** Rendered inside QuoteWorkspace — parent owns Back / quote chrome. */
  embedded?: boolean;
  estimateIdOverride?: string;
  backTo?: string;
  /** Single-estimate quote: hide estimate ref so only Quote PKG-… shows in parent. */
  hideEstimateRef?: boolean;
  /** Parent quote is sent — structure/price edits blocked (re-quote or unlock). */
  readOnly?: boolean;
  /** Internal price check — product group only, no customer / SKU / RFQ fields. */
  priceCheckMode?: boolean;
  /** Quote workspace owns price list — hide the in-editor Price list tab. */
  hidePriceListTab?: boolean;
  /** Quote has multiple estimates — show variant label (price check). */
  multiOnQuote?: boolean;
  /** After save, refresh quote workspace (variant labels). */
  onSaved?: () => void;
};

const EstimateEditor = ({
  embedded = false,
  estimateIdOverride,
  backTo,
  hideEstimateRef = false,
  readOnly = false,
  priceCheckMode: priceCheckModeProp = false,
  hidePriceListTab: hidePriceListTabProp,
  multiOnQuote = false,
  onSaved,
}: EstimateEditorProps = {}) => {
  const hidePriceListTab = hidePriceListTabProp ?? embedded;
  const { id: routeId } = useParams<{ id: string }>();
  const id = estimateIdOverride ?? routeId;
  const { user, tenant } = useAuth();
  const { can } = useVisibilityProfile(user?.role);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteIdFromUrl = searchParams.get('quote')?.trim() || '';
  const priceCheckFromUrl = searchParams.get('priceCheck') === '1';
  const isPriceCheck = priceCheckModeProp || priceCheckFromUrl;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Blocks duplicate POST /estimates while the first create is in flight. */
  const createInFlightRef = useRef(false);

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
  const {
    reference: masterReference,
    version: masterDataVersion,
    reload: reloadMasterData,
  } = useMasterDataReference();
  const materialsCache = useMaterialsContextOptional();
  const processCostCatalog = useMemo(
    () => buildProcessCostCatalogFromReference(masterReference),
    [masterReference.processRows, masterReference.processOptions]
  );
  const defaultCleaningKg =
    masterReference.costingDefaults?.cleaningSolventKgPerJob ?? DEFAULT_CLEANING_SOLVENT_KG_PER_JOB;

  const normalizeLoadedProcesses = useCallback(
    (rows: any[]) => {
      return normalizeProcessesForSave(
        (rows ?? []).map((process: any) => {
          const match = lookupProcessCostRow(process, processCostCatalog);
          return {
            ...process,
            processKey: process.processKey ?? match?.code ?? null,
            costPerKgUsd: resolveProcessPerKgUsd(process, processCostCatalog),
          };
        })
      );
    },
    [processCostCatalog]
  );

  useEffect(() => {
    if (!processCostCatalog.length) return;
    setProcessesState((prev) => {
      if (!prev?.length) return prev;
      const recalculated = normalizeLoadedProcesses(prev);
      const isDifferent = recalculated.some((p, index) => {
        const prior = prev[index];
        return (
          p.costPerKgUsd !== prior?.costPerKgUsd ||
          (p.processKey ?? null) !== (prior?.processKey ?? null)
        );
      });
      return isDifferent ? recalculated : prev;
    });
  }, [processCostCatalog, normalizeLoadedProcesses]);

  // UI state
  const [activeSection, setActiveSection] = useState<'structure' | 'dimensions' | 'slabs'>('structure');
  const [productType, setProductType] = useState<string>('roll');

  // Layer table column visibility — reserved for future optional columns
  const [jobName, setJobName] = useState('New estimate');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerDraftName, setCustomerDraftName] = useState('');
  /** Free-text note captured on the estimate (sales context, follow-ups, etc.).
   * Lives in `estimates.notes` (TEXT). MES will use this column for outcome
   * commentary once the won/lost flow lands. */
  const [notes, setNotes] = useState<string>('');
  const [markupPercent, setMarkupPercent] = useState(15);
  const [platesPerKg, setPlatesPerKg] = useState(0);
  const [deliveryPerKg, setDeliveryPerKg] = useState(0);
  // Pricing model v2 (USD base). pricingMethod is assigned per user by the admin.
  const [pricingMethod, setPricingMethod] = useState<'markup' | 'margin_per_kg'>('markup');
  const [marginValuePerKgUsd, setMarginValuePerKgUsd] = useState(0);
  /** Base CoRM Printed (display currency/kg; legacy state name). */
  const [cormPerKgUsd, setCormPerKgUsd] = useState(0);
  const [cormPerKgPlain, setCormPerKgPlain] = useState(0);
  const [moqKg, setMoqKg] = useState<number | null>(null);
  const [toolingChargeUsd, setToolingChargeUsd] = useState(0);
  const [skuLabel, setSkuLabel] = useState('');
  const [brand, setBrand] = useState('');
  const [specsCode, setSpecsCode] = useState('');
  const [printColorCount, setPrintColorCount] = useState<number | null>(null);
  const [costPerColor, setCostPerColor] = useState<number | null>(null);
  const [toolingBillingMode, setToolingBillingMode] = useState<
    'amortized' | 'separate' | 'not_billed' | null
  >(null);
  const [toolingScenario, setToolingScenario] = useState<'new' | 'existing' | 'modification'>('new');
  const [billableColorCount, setBillableColorCount] = useState<number | null>(null);
  const [deliveryTerm, setDeliveryTerm] = useState('EXW');
  const [deliveryChargeUsd, setDeliveryChargeUsd] = useState(0);
  // Waste bands + CoRM base: Printed vs Plain from structure (ink → Printed).
  const wastePrintMode = structureIsPrinted(layers) ? 'printed' : 'plain';
  const structureHasPrinting = wastePrintMode === 'printed';
  const wasteBands: WasteBand[] = useMemo(
    () =>
      wasteBandsForPrintMode(
        masterReference.wasteBandsByPrintMode ?? DEFAULT_WASTE_BANDS_BY_PRINT_MODE,
        wastePrintMode
      ),
    [masterReference.wasteBandsByPrintMode, wastePrintMode]
  );
  const cormScaleWithWaste =
    masterReference.cormScaleWithWaste ?? DEFAULT_CORM_SCALE_WITH_WASTE;
  const baseCormDisplay =
    wastePrintMode === 'printed'
      ? cormPerKgUsd
      : cormPerKgPlain > 0
        ? cormPerKgPlain
        : plainCormFromPrinted(cormPerKgUsd);
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
  // Pouch accessories (zipper/spout/valve/window/handle) — stored in dimensions JSONB on save.
  const [accessories, setAccessories] = useState<PouchAccessorySelection[]>([]);
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
    backTo ||
    (isPriceCheck
      ? '/estimates/customers/price-check'
      : locationState?.returnTo === '/templates'
        ? '/templates'
        : '/estimates');

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
    'Ink dilution = solvent needed before printing. Dividing by 1.5 means every 1.5 gsm of ink needs 1 gsm of solvent. Dividing by 1.0 means 1 gsm of ink needs 1 gsm of solvent, more dilution.';

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
    if (readOnly) return;
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

  // Order-quantity units must match how the product is physically sold:
  //   roll / sleeve (continuous web) → kg, pieces, area (sqm), linear metre (lm)
  //   pouch / bag   (discrete items) → kg, pieces only (LM/SQM are not sales units)
  const allowedUnitBases = useMemo<Set<string>>(
    () =>
      productFamily === 'pouch' || productFamily === 'bag'
        ? new Set(['kg', 'pieces'])
        : new Set(['kg', 'pieces', 'sqm', 'lm']),
    [productFamily]
  );
  const availableUnitOptions = useMemo(
    () =>
      unitOptions.filter((o) => {
        // Filter on the unit's BASIS (kg/pieces/sqm/lm) — not the unit name. The basis
        // travels on each option; fall back to the legacy code map only for old units.
        const basis = o.basis ?? LEGACY_UNIT_BASIS[o.value] ?? 'kg';
        return allowedUnitBases.has(basis);
      }),
    [unitOptions, allowedUnitBases]
  );
  // If the selected unit isn't valid for the current product (e.g. switched to a
  // bag while LM was selected), fall back to kg.
  useEffect(() => {
    if (availableUnitOptions.length === 0) return;
    if (!availableUnitOptions.some((o) => o.value === orderQuantityUnit)) {
      const fallback = availableUnitOptions.find((o) => o.value === 'kgs') ?? availableUnitOptions[0];
      setOrderQuantityUnit(fallback.value);
    }
  }, [availableUnitOptions, orderQuantityUnit]);

  const requiresRollLength = useMemo(
    () =>
      availableUnitOptions.find((o) => o.value === orderQuantityUnit)?.variableMultiplier === true,
    [availableUnitOptions, orderQuantityUnit]
  );

  const estimationDimensionFields = dimensionFieldsForEstimation(productFamily, productSubtype);
  const bagConfiguratorType = configuratorTypeForBagSubtype(productSubtype);
  const bagConfiguratorActive = productFamily === 'bag' && bagConfiguratorType != null;
  const pouchConfiguratorType = configuratorTypeForPouchSubtype(productSubtype);
  const pouchConfiguratorActive = productFamily === 'pouch' && pouchConfiguratorType != null;
  const rollConfiguratorActive = productFamily === 'roll';
  const sleeveConfiguratorActive = productFamily === 'sleeve';
  const webConfiguratorActive = rollConfiguratorActive || sleeveConfiguratorActive;
  const isLabelsRoll = useMemo(
    () =>
      isLabelsRollContext({
        sourceTemplateKey: estimate?.sourceTemplateKey,
        jobName,
        dimensions: dimensions as Record<string, unknown>,
      }),
    [estimate?.sourceTemplateKey, jobName, dimensions]
  );

  // Accessory materials for the pouch configurator dropdowns.
  // Hardware (zipper/spout/valve/handle) comes from accessory-typed rows; the
  // window patch can be cut from ANY substrate, so substrates are exposed as
  // 'window' options carrying density + $/kg for film pricing.
  const accessoryMaterialOptions = useMemo(
    () => {
      const hardware = materials
        .filter((m) => m.type === 'accessory' || (m.accessoryKind != null && m.accessoryKind !== ''))
        .map((m) => ({
          id: m.id,
          name: m.name,
          accessoryKind: m.accessoryKind ?? null,
          costPerMeterUsd: m.costPerMeterUsd != null ? parseFloat(m.costPerMeterUsd) : null,
          costPerPieceUsd: m.costPerPieceUsd != null ? parseFloat(m.costPerPieceUsd) : null,
          weightGramPerMeter: m.weightGramPerMeter != null ? parseFloat(m.weightGramPerMeter) : null,
          weightGramPerPiece: m.weightGramPerPiece != null ? parseFloat(m.weightGramPerPiece) : null,
          density: null as number | null,
          costPerKgUsd: null as number | null,
        }));
      const windowSubstrates = materials
        .filter((m) => m.type === 'substrate' && (m.substrateFamily ?? '').toLowerCase() !== 'packaging')
        .map((m) => ({
          id: m.id,
          name: m.name,
          accessoryKind: 'window' as string | null,
          costPerMeterUsd: null as number | null,
          costPerPieceUsd: null as number | null,
          weightGramPerMeter: null as number | null,
          weightGramPerPiece: null as number | null,
          density: m.density != null ? parseFloat(m.density) : null,
          costPerKgUsd: m.costPerKgUsd != null ? parseFloat(m.costPerKgUsd) : null,
        }));
      return [...hardware, ...windowSubstrates];
    },
    [materials]
  );

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

  // Seed pouch schematic defaults when subtype selects a configurator-backed pouch type.
  useEffect(() => {
    if (!pouchConfiguratorActive || !pouchConfiguratorType) return;
    setDimensions((prev) => {
      const patch = seedPouchDimensionPatch(pouchConfiguratorType, prev);
      if (Object.keys(patch).length === 0) return prev;
      return { ...prev, ...patch };
    });
  }, [pouchConfiguratorActive, pouchConfiguratorType, productSubtype]);

  useEffect(() => {
    if (!rollConfiguratorActive) return;
    setDimensions((prev) => {
      const patch = seedRollDimensionPatch(prev, {
        isLabels: isLabelsRoll,
        continuousWeb: !structureHasPrinting,
      });
      if (Object.keys(patch).length === 0) return prev;
      return { ...prev, ...patch };
    });
  }, [rollConfiguratorActive, productFamily, isLabelsRoll, structureHasPrinting]);

  useEffect(() => {
    if (structureHasPrinting) return;
    setPrintColorCount(null);
    setCostPerColor(null);
    setToolingBillingMode(null);
    setBillableColorCount(null);
    setToolingScenario('new');
  }, [structureHasPrinting]);

  useEffect(() => {
    if (!sleeveConfiguratorActive) return;
    setDimensions((prev) => {
      const patch = seedSleeveDimensionPatch(prev);
      if (Object.keys(patch).length === 0) return prev;
      return { ...prev, ...patch };
    });
  }, [sleeveConfiguratorActive, productFamily]);

  // Load materials + customers on mount
  const loadBaseData = useCallback(async () => {
    let mats: MaterialItem[] = [];
    const custs: any[] = [];

    try {
      if (materialsCache?.materials.length) {
        mats = materialsCache.materials as unknown as MaterialItem[];
        setMaterials(mats);
        setCategories(materialsCache.categories);
      } else {
        const [materialRows, cats] = await Promise.all([
          apiClient.getMaterials(),
          apiClient.getCategories().catch(() => []),
        ]);
        mats = materialRows || [];
        setMaterials(mats);
        setCategories(cats || []);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
      setLoadError('Could not load materials. Layer defaults may be incomplete.');
    }

    return { mats, custs };
  }, [materialsCache?.materials, materialsCache?.categories]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoadError(null);
        setLoading(true);
        const { mats } = await loadBaseData();

        if (id) {
          await fetchEstimate(id);
          await flushOfflineDraft(id);
        } else if ((location.state as { instantiated?: { estimate?: unknown } } | null)?.instantiated?.estimate) {
          // New estimate pre-filled from a template preview — nothing saved yet.
          hydrateFromInstantiated(
            (location.state as { instantiated: Parameters<typeof hydrateFromInstantiated>[0] }).instantiated,
            mats || []
          );
          const paramVariantName = searchParams.get('variantName')?.trim() || '';
          const paramVariantDescription = searchParams.get('variantDescription')?.trim() || '';
          const fromTemplatePriceCheck = searchParams.get('priceCheck') === '1';
          if (paramVariantName) {
            if (fromTemplatePriceCheck) setSkuLabel(paramVariantName);
            else {
              setJobName(paramVariantName);
              setSkuLabel(paramVariantName);
            }
          }
          if (paramVariantDescription) setNotes(paramVariantDescription);
          const statePriceChanges = (location.state as { priceChanges?: unknown[] } | null)?.priceChanges;
          if (statePriceChanges) setPriceChanges(meaningfulRequotePriceChanges(statePriceChanges as never[]));
          setLoading(false);
        } else {
          const templateId = searchParams.get('template') ? Number(searchParams.get('template')) : null;
          const scratchPriceCheck = searchParams.get('priceCheck') === '1';
          const paramCustomer = scratchPriceCheck ? '' : searchParams.get('customer') || '';
          const paramVariantName = searchParams.get('variantName')?.trim() || '';
          const paramVariantDescription = searchParams.get('variantDescription')?.trim() || '';
          const paramJobName =
            paramVariantName ||
            searchParams.get('jobName') ||
            (scratchPriceCheck ? '' : 'New estimate');
          const paramProductType = normalizeProductType(
            searchParams.get('productType') || searchParams.get('type'),
            productTypeOptions
          );
          const paramOrderQty = searchParams.get('orderQuantity');
          const paramOrderUnit = searchParams.get('orderQuantityUnit');
          const defaultLayers = getTemplateLayers(templateId, mats || []);
          setJobName(paramJobName);
          setCustomerId(paramCustomer);
          if (paramVariantName && !scratchPriceCheck) setSkuLabel(paramVariantName);
          if (paramVariantDescription) setNotes(paramVariantDescription);
          setProductType(paramProductType);
          if (paramOrderQty && !Number.isNaN(Number(paramOrderQty))) {
            setOrderQuantity(Number(paramOrderQty));
          }
          if (paramOrderUnit) {
            setOrderQuantityUnit(normalizeUnitValue(paramOrderUnit, unitOptions));
          } else {
            setOrderQuantityUnit(
              normalizeUnitValue(
                defaultOrderQuantityUnit({
                  productType: paramProductType,
                  jobName: paramJobName,
                }),
                unitOptions
              )
            );
          }
          setLayers(defaultLayers);
          setPricingMethod(user?.pricingMethod ?? 'markup');
          setSlabsState([
            { quantityKg: 1000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 },
            { quantityKg: 2000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 },
            { quantityKg: 5000, pricePerKgUsd: 0, pricePerKg: 0, total: 0 },
          ]);
          setEstimate({ id: undefined, status: 'draft', displayCurrency: 'USD', salePricePerKg: 0, materialCostPerKg: 0, totalGsm: 0, totalMicron: 0 });
          setNeedsConfiguration(true);
          setActiveSection('structure');
          const statePriceChanges = (location.state as any)?.priceChanges;
          if (statePriceChanges) setPriceChanges(meaningfulRequotePriceChanges(statePriceChanges));
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
    if (isPriceCheck) return;
    const fromUrl = searchParams.get('customer')?.trim();
    if (fromUrl && !customerId) setCustomerId(fromUrl);
  }, [searchParams, customerId, isPriceCheck]);

  // Standalone /estimate/:id → quote workspace when the estimate belongs to a quote.
  useEffect(() => {
    if (embedded || estimateIdOverride) return;
    if (!estimate?.id || !estimate?.quoteId) return;
    navigate(`/quotes/${estimate.quoteId}/estimates/${estimate.id}`, {
      replace: true,
      state: location.state,
    });
  }, [embedded, estimateIdOverride, estimate?.id, estimate?.quoteId, navigate, location.state]);

  // When connectivity returns, sync any draft saved while offline.
  useEffect(() => {
    if (!estimate?.id) return;
    const onOnline = () => { void flushOfflineDraft(estimate.id as string); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [estimate?.id]);

  useEffect(() => {
    if (masterDataVersion === 0) return;
    loadBaseData();
  }, [masterDataVersion, loadBaseData]);

  // Master data (incl. waste bands) is session-cached — not a live socket.
  // Re-fetch when opening Price list, and when the window is focused again
  // (e.g. after editing Platform Master Data in another tab).
  useEffect(() => {
    if (activeSection === 'slabs') reloadMasterData();
  }, [activeSection, reloadMasterData]);

  useEffect(() => {
    if (hidePriceListTab && activeSection === 'slabs') setActiveSection('structure');
  }, [hidePriceListTab, activeSection]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') reloadMasterData();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [reloadMasterData]);

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

  /**
   * Hydrate the editor as a NEW (unsaved) estimate from a template preview payload
   * (server resolved the layers but persisted nothing). The estimate is written to
   * the DB only when the user clicks Save.
   */
  function hydrateFromInstantiated(instantiated: any, mats: MaterialItem[]) {
    const pe = instantiated.estimate;
    const matById = new Map(mats.map((m) => [m.id, m]));
    const hydratedLayers: LayerItem[] = ((instantiated.layers || []) as any[]).map((l, i) => {
      const mat = matById.get(l.materialId);
      const density = mat?.density ? parseFloat(mat.density) : 0.9;
      const isSub = (l.materialType || 'substrate') === 'substrate';
      return {
        id: crypto.randomUUID(),
        materialId: l.materialId,
        materialName: l.materialName || mat?.name || 'Material',
        materialType: l.materialType || 'substrate',
        micron: l.micron,
        gsm: isSub ? l.micron * density : l.micron,
        costPerKgUsd: l.costPerKgUsd ?? (mat ? parseFloat(mat.costPerKgUsd) : 0),
        isSolventBased: Boolean(l.isSolventBased),
        position: i,
        hoover: l.hoover ?? null,
      };
    });

    setJobName(pe.jobName || 'New estimate');
    setProductType(
      (() => {
        if (pe.productSubtype) {
          const staticEntry = ALL_SUBTYPES.find((s) => s.key === pe.productSubtype);
          if (staticEntry) return staticEntry.family;
        }
        return normalizeProductType(pe.productType, productTypeOptions);
      })()
    );
    setProductSubtype(canonicalBagSubtype(canonicalPouchSubtype(pe.productSubtype)));
    setDimensions({
      reelWidthMm: 800, cutoffMm: 600, numberOfUps: 1,
      extraPrintingTrimMm: 0, piecesPerCut: 1, openWidthMm: 200, openHeightMm: 250,
      ...(pe.dimensions as Partial<DimensionState>),
    });
    setLayers(hydratedLayers);
    // Hydrate processes from template preview (Mfg & Operating cost calculation).
    if (instantiated.processes && instantiated.processes.length > 0) {
      setProcessesState(normalizeLoadedProcesses(instantiated.processes));
    }
    setMarkupPercent(parseFloat(pe.markupPercent) || 15);
    // Pricing method from the user; margin/kg default from the template (product group).
    setPricingMethod(user?.pricingMethod ?? 'markup');
    setMarginValuePerKgUsd(parseFloat((pe as { marginValuePerKgUsd?: string }).marginValuePerKgUsd ?? '') || 0);
    {
      const printed = parseFloat((pe as { cormPerKgUsd?: string }).cormPerKgUsd ?? '') || 0;
      setCormPerKgUsd(printed);
      const plainRaw = (pe as { cormPerKgPlain?: string }).cormPerKgPlain;
      setCormPerKgPlain(
        plainRaw != null && plainRaw !== ''
          ? parseFloat(plainRaw) || 0
          : plainCormFromPrinted(printed)
      );
      const moqRaw = (pe as { moqKg?: string }).moqKg;
      setMoqKg(moqRaw != null && moqRaw !== '' ? parseFloat(moqRaw) || null : null);
    }
    setToolingChargeUsd(0);
    setDeliveryTerm('EXW');
    setDeliveryChargeUsd(0);
    if (pe.orderQuantityKg) setOrderQuantity(parseFloat(pe.orderQuantityKg));
    setOrderQuantityUnit(
      normalizeUnitValue(
        pe.orderQuantityUnit ||
          defaultOrderQuantityUnit({
            productType: pe.productType,
            sourceTemplateKey: pe.sourceTemplateKey,
            jobName: pe.jobName,
            dimensions: pe.dimensions as Record<string, unknown> | undefined,
          }),
        unitOptions
      )
    );
    setSlabsState(
      ((instantiated.slabs && instantiated.slabs.length > 0
        ? instantiated.slabs
        : [{ quantityKg: 1000, pricePerKg: 0 }, { quantityKg: 2000, pricePerKg: 0 }, { quantityKg: 5000, pricePerKg: 0 }]
      ) as any[]).map((s) => ({ quantityKg: s.quantityKg, pricePerKgUsd: 0, pricePerKg: 0, total: 0 }))
    );
    setEstimate({
      id: undefined,
      status: 'draft',
      productType: pe.productType,
      productSubtype: pe.productSubtype ?? undefined,
      printingWebClass: pe.printingWebClass,
      sourceTemplateKey: pe.sourceTemplateKey ?? undefined,
      displayCurrency: pe.displayCurrency || 'USD',
      exchangeRateUsdToDisplay: pe.exchangeRateUsdToDisplay || '1',
      salePricePerKg: 0,
      materialCostPerKg: 0,
      totalGsm: 0,
      totalMicron: 0,
    });
    if (estimateNeedsConfiguration(pe.dimensions as Record<string, unknown>)) {
      setNeedsConfiguration(true);
      setActiveSection('structure');
    }
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
      setProductSubtype(canonicalBagSubtype(canonicalPouchSubtype(data.productSubtype)));
      setJobName(data.jobName || '');
      setCustomerId(data.customerId || '');
      setNotes(typeof data.notes === 'string' ? data.notes : '');
      setMarkupPercent(parseFloat(data.markupPercent) || 15);
      setPlatesPerKg(parseFloat(data.platesPerKg) || 0);
      setDeliveryPerKg(parseFloat(data.deliveryPerKg) || 0);
      // Pricing model v2 — adopt the user's assigned method when a (legacy) estimate has none.
      setPricingMethod(
        (data.pricingMethod as 'markup' | 'margin_per_kg' | undefined) ??
          (user?.pricingMethod ?? 'markup')
      );
      setMarginValuePerKgUsd(parseFloat(data.marginValuePerKgUsd) || 0);
      {
        const printed = parseFloat(data.cormPerKgUsd) || 0;
        setCormPerKgUsd(printed);
        setCormPerKgPlain(
          data.cormPerKgPlain != null && data.cormPerKgPlain !== ''
            ? parseFloat(data.cormPerKgPlain) || 0
            : plainCormFromPrinted(printed)
        );
        setMoqKg(
          data.moqKg != null && data.moqKg !== '' ? parseFloat(data.moqKg) || null : null
        );
      }
      setToolingChargeUsd(parseFloat(data.toolingChargeUsd) || 0);
      setSkuLabel(typeof data.skuLabel === 'string' ? data.skuLabel : '');
      setBrand(typeof data.brand === 'string' ? data.brand : '');
      setSpecsCode(typeof data.specsCode === 'string' ? data.specsCode : '');
      setPrintColorCount(
        data.printColorCount != null && data.printColorCount !== ''
          ? Number(data.printColorCount)
          : null
      );
      setCostPerColor(
        data.costPerColor != null && data.costPerColor !== ''
          ? Number(data.costPerColor)
          : null
      );
      setToolingBillingMode(
        data.toolingBillingMode === 'amortized' ||
          data.toolingBillingMode === 'separate' ||
          data.toolingBillingMode === 'not_billed'
          ? data.toolingBillingMode
          : null
      );
      setToolingScenario(normalizeToolingScenario(data.toolingScenario));
      setBillableColorCount(
        data.billableColorCount != null && data.billableColorCount !== ''
          ? Number(data.billableColorCount)
          : null
      );
      {
        const term =
          typeof data.deliveryTerm === 'string' && data.deliveryTerm ? data.deliveryTerm : 'EXW';
        setDeliveryTerm(term);
        // EXW never carries freight — force 0 even if a legacy row had a charge.
        setDeliveryChargeUsd(isExwDelivery(term) ? 0 : parseFloat(data.deliveryChargeUsd) || 0);
      }
      // Waste bands are platform-wide (Printed/Plain) — no per-estimate seed.
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
        // Only treat the saved ratio as a manual bypass when it differs from the
        // standard process ratios (flexo 1.5 / roto 1.0). A standard value was
        // auto-derived from the process, so leave the override off and let the
        // Flexo/Roto toggle keep driving it.
        const isProcessDefault =
          ratio === inkSolventRatioForProcess('flexo') ||
          ratio === inkSolventRatioForProcess('rotogravure');
        setInkSolventRatioOverride(
          Number.isFinite(ratio) && ratio > 0 && !isProcessDefault ? ratio : null
        );
      } else {
        setInkSolventRatioOverride(null);
      }
      if (data.orderQuantityKg) setOrderQuantity(parseFloat(data.orderQuantityKg));
      if (data.orderQuantityUnit) {
        setOrderQuantityUnit(normalizeUnitValue(data.orderQuantityUnit, unitOptions));
      }
      if (data.processes) setProcessesState(normalizeLoadedProcesses(data.processes));
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
      setAccessories(
        Array.isArray((data.dimensions as { accessories?: unknown })?.accessories)
          ? ((data.dimensions as { accessories?: PouchAccessorySelection[] }).accessories as PouchAccessorySelection[])
          : []
      );
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
        setPriceChanges(meaningfulRequotePriceChanges(navPriceChanges as never[]));
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
    const linkedCustomer = isPriceCheck ? undefined : customerIdOverride ?? customerId;
    const payload: Record<string, unknown> = {
      jobName,
      ...(isPriceCheck ? {} : { customerId: linkedCustomer || undefined }),
      // notes is always sent so clearing the field round-trips correctly
      notes: notes.trim() ? notes.trim() : '',
      productType: productTypeForSave(estimate?.productType, productType, productTypeOptions),
      productSubtype: productSubtype ?? undefined,
      dimensions: {
        ...dimensionsForSave(dimensions as Record<string, unknown>),
        accessories: productFamily === 'pouch' ? accessories : [],
      },
      markupPercent,
      platesPerKg,
      deliveryPerKg,
      pricingMethod,
      marginValuePerKgUsd,
      cormPerKgUsd,
      cormPerKgPlain,
      moqKg: moqKg ?? undefined,
      ...(isPriceCheck
        ? multiOnQuote && skuLabel.trim()
          ? { skuLabel: skuLabel.trim() }
          : {}
        : {
            skuLabel: skuLabel.trim() || undefined,
            brand: brand.trim() || undefined,
            specsCode: specsCode.trim() || undefined,
            printColorCount: printColorCount ?? undefined,
            costPerColor: costPerColor ?? undefined,
            toolingBillingMode:
              printColorCount != null && costPerColor != null
                ? toolingBillingMode ?? 'separate'
                : undefined,
            toolingScenario:
              printColorCount != null && costPerColor != null ? toolingScenario : undefined,
            billableColorCount:
              printColorCount != null && costPerColor != null && toolingScenario === 'modification'
                ? billableColorCount ?? undefined
                : toolingScenario === 'existing'
                  ? 0
                  : undefined,
            toolingChargeUsd:
              printColorCount != null && costPerColor != null ? undefined : toolingChargeUsd,
            toolingBilledToCustomer:
              printColorCount != null && costPerColor != null
                ? (toolingBillingMode ?? 'separate') === 'amortized'
                : toolingChargeUsd > 0,
            deliveryTerm: deliveryTerm || undefined,
            deliveryChargeUsd: isExwDelivery(deliveryTerm) ? 0 : deliveryChargeUsd,
          }),
      solventMaterialId: needsSolventMix ? solventMaterialId ?? undefined : undefined,
      solventCostPerKgUsd: needsSolventMix ? resolvedSolventCostPerKgUsd : undefined,
      laminationRecipeOverrides:
        Object.keys(laminationRecipeOverrides).length > 0 ? laminationRecipeOverrides : undefined,
      cleaningSolventKgPerJob: needsSolventMix ? cleaningSolventKgPerJob : undefined,
      inkPrintingProcess: hasSbInk ? effectiveInkPrintingProcess : undefined,
      // Persist the ratio only when the user explicitly bypassed it. When it's
      // process-derived we omit it so reopening keeps the Flexo/Roto toggle live.
      solventRatio: hasSbInk && inkSolventRatioOverride != null ? inkSolventRatioOverride : undefined,
      ...(Number.isFinite(orderQuantity) && orderQuantity > 0
        ? { orderQuantityKg: orderQuantity }
        : {}),
      orderQuantityUnit,
      // Preserve the template link so the structure stays locked after the first
      // save (substrate stack fixed; ink/coating still editable). Without this the
      // create payload drops the key and the saved estimate unlocks unexpectedly.
      sourceTemplateKey: estimate?.sourceTemplateKey?.trim() || undefined,
      quoteId: estimate?.quoteId || quoteIdFromUrl || undefined,
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
      const slabs = slabsState
        .map((s) => ({
          quantityKg: Number(s.quantityKg),
          pricePerKg: Number(s.pricePerKgUsd ?? s.pricePerKg) || 0,
        }))
        .filter((s) => Number.isFinite(s.quantityKg) && s.quantityKg > 0);
      if (slabs.length > 0) payload.slabs = slabs;
    }
    return sanitizeEstimateSavePayload(payload);
  }, [isPriceCheck, multiOnQuote, jobName, customerId, notes, estimate?.productType, estimate?.sourceTemplateKey, estimate?.quoteId, quoteIdFromUrl, productType, productTypeOptions, productSubtype, needsSolventMix, hasSbInk, effectiveInkPrintingProcess, effectiveInkSolventRatio, dimensions, accessories, productFamily, markupPercent, platesPerKg, deliveryPerKg, pricingMethod, marginValuePerKgUsd, cormPerKgUsd, cormPerKgPlain, moqKg, toolingChargeUsd, skuLabel, brand, specsCode, printColorCount, costPerColor, toolingBillingMode, toolingScenario, billableColorCount, deliveryTerm, deliveryChargeUsd, solventMaterialId, resolvedSolventCostPerKgUsd, laminationRecipeOverrides, cleaningSolventKgPerJob, orderQuantity, orderQuantityUnit, layers, slabsState, processesState]);

  /** Link estimate to a customer row — create customer record if user typed a new name. */
  const ensureCustomerForSave = async (): Promise<string | undefined> => {
    if (isPriceCheck) return undefined;
    if (customerId?.trim()) return customerId;
    const name = customerDraftName.trim();
    if (!name) return undefined;
    const customers = await apiClient.listCustomers(1000);
    const match = (customers || []).find(
      (c: { companyName?: string }) => c.companyName?.toLowerCase() === name.toLowerCase()
    ) as { id?: string } | undefined;
    if (match?.id) {
      setCustomerId(match.id);
      setCustomerDraftName('');
      return match.id;
    }
    if (!tenant?.customerAccess?.canCreate) {
      throw new Error('Pick an existing customer — new customers are created in PEBI for this account.');
    }
    const created = (await apiClient.createCustomer({ companyName: name })) as { id: string };
    const id = created.id;
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
        dimensions: { ...dimensions, accessories },
        markupPercent,
        platesPerKg,
        deliveryPerKg,
        slabs: slabsState,
        processes: processesState,
        orderQuantityKg: orderQuantity,
        orderQuantityUnit,
        orderQuantityUnitDef: (() => {
          const def = (
            masterReference as {
              unitRows?: Array<{ code: string; basis: 'kg' | 'pieces' | 'sqm' | 'lm'; multiplier: number; variableMultiplier?: boolean }>;
            } | null
          )?.unitRows?.find((u) => u.code === orderQuantityUnit);
          if (!def) return undefined;
          const override = Number(dimensions.orderUnitMultiplier);
          if (def.variableMultiplier && Number.isFinite(override) && override > 0) {
            return { basis: def.basis, multiplier: override };
          }
          return { basis: def.basis, multiplier: def.multiplier };
        })(),
        displayCurrency: estimate?.displayCurrency || 'USD',
        exchangeRateUsdToDisplay: parseFloat(estimate?.exchangeRateUsdToDisplay) || 1,
        solventCostPerKgUsd: resolvedSolventCostPerKgUsd,
        laminationRecipeOverrides,
        cleaningSolventKgPerJob,
        inkPrintingProcess: hasSbInk ? effectiveInkPrintingProcess : undefined,
        inkSolventRatio: hasSbInk ? effectiveInkSolventRatio : undefined,
        pricingMethod,
        marginValuePerKgUsd,
        operatingCostMethod: tenant?.operatingCostMethod ?? undefined,
        cormPerKgUsd: baseCormDisplay,
        cormScaleWithWaste,
        toolingChargeUsd:
          printColorCount != null && costPerColor != null
            ? toolingDevelopmentTotal({
                toolingScenario,
                printColorCount,
                billableColorCount,
                costPerColor,
              }) ?? 0
            : toolingChargeUsd,
        toolingBilledToCustomer:
          printColorCount != null && costPerColor != null
            ? (toolingBillingMode ?? 'separate') === 'amortized' &&
              (toolingDevelopmentTotal({
                toolingScenario,
                printColorCount,
                billableColorCount,
                costPerColor,
              }) ?? 0) > 0
            : toolingChargeUsd > 0,
        deliveryTerm,
        deliveryChargeUsd: isExwDelivery(deliveryTerm) ? 0 : deliveryChargeUsd,
        wasteBands,
      });
    } catch {
      return null;
    }
  }, [
    loading, materials, layerInputsKey, productType, dimensions,
    markupPercent, platesPerKg, deliveryPerKg, slabQuantitiesKey,
    estimate?.displayCurrency, estimate?.exchangeRateUsdToDisplay,
    solventMaterialId, resolvedSolventCostPerKgUsd, laminationRecipeOverrides, cleaningSolventKgPerJob,
    hasSbInk, effectiveInkPrintingProcess, effectiveInkSolventRatio, layers.length, accessories,
    orderQuantity, orderQuantityUnit, masterReference, wasteBands,
    pricingMethod, marginValuePerKgUsd, baseCormDisplay, cormScaleWithWaste, toolingChargeUsd,
    printColorCount, costPerColor, toolingBillingMode, toolingScenario, billableColorCount,
    deliveryTerm, deliveryChargeUsd,
    tenant?.operatingCostMethod, processesState,
  ]);

  const solventCostLines = useMemo(() => {
    const e = clientCalcResult?.estimate;
    if (!e || !needsSolventMix) return [];
    const lines: Array<{ key: string; label: string; perKgUsd: number; perM2Usd: number }> = [];
    const inkKg = e.inkMakeupSolventCostPerKg ?? 0;
    const inkM2 = e.inkMakeupSolventCostPerM2 ?? 0;
    if (inkKg > 0 || inkM2 > 0) {
      const proc = e.inkPrintingProcessResolved === 'rotogravure' ? 'roto' : 'flexo';
      lines.push({ key: 'ink-makeup', label: `Ink Dilution (${proc})`, perKgUsd: inkKg, perM2Usd: inkM2 });
    }
    const lamKg = e.laminationSolventCostPerKg ?? 0;
    const lamM2 = e.laminationSolventCostPerM2 ?? 0;
    if (lamKg > 0 || lamM2 > 0) {
      lines.push({ key: 'lamination', label: 'Lamination Dilution', perKgUsd: lamKg, perM2Usd: lamM2 });
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

  const fxRateForUi = parseFloat(estimate?.exchangeRateUsdToDisplay) || 1;
  const colorsDriveTooling =
    printColorCount != null &&
    costPerColor != null &&
    Number.isFinite(printColorCount) &&
    Number.isFinite(costPerColor);
  const effectiveToolingDisplay = colorsDriveTooling
    ? toolingDevelopmentTotal({
        toolingScenario,
        printColorCount,
        billableColorCount,
        costPerColor,
      }) ?? 0
    : toolingChargeUsd;

  const visualizerLayers = useMemo(
    () =>
      layers.map((l, i) => {
        const mat = materials.find((m) => m.id === l.materialId);
        const calcLayer = clientCalcResult?.estimate.layers[i];
        const density = mat ? parseFloat(String(mat.density)) || 0 : 0;
        const physicalMicron =
          mat != null
            ? layerPhysicalThicknessMicron(
                {
                  id: l.id,
                  materialId: l.materialId,
                  micron: l.micron,
                  gsm: l.gsm,
                  position: l.position,
                },
                {
                  id: mat.id,
                  name: mat.name,
                  type: mat.type as 'substrate' | 'ink' | 'adhesive',
                  density,
                  solidPercent: parseFloat(String(mat.solidPercent)) || 0,
                  costPerKgUsd: parseFloat(String(mat.costPerKgUsd)) || 0,
                  wastePercent: mat.wastePercent ?? 0,
                }
              )
            : undefined;
        return {
          id: l.id,
          type: l.materialType,
          material: l.materialName,
          micron: l.micron,
          physicalMicron,
          gsm: l.gsm,
          family: mat?.substrateFamily ?? null,
          costPerKg: can('materialCostPerKg')
            ? usdToDisplay(l.costPerKgUsd, fxRateForUi)
            : null,
          costPerM2:
            can('materialCostPerKg') && calcLayer?.costPerM2 != null
              ? usdToDisplayPrecise(calcLayer.costPerM2, fxRateForUi)
              : null,
        };
      }),
    [layers, materials, can, fxRateForUi, clientCalcResult]
  );

  useEffect(() => {
    if (!clientCalcResult) return;
    const fx = parseFloat(estimate?.exchangeRateUsdToDisplay) || 1;
    const calcEstimate = clientCalcResult.estimate;
    const saleUsd = calcEstimate.salePricePerKg || 0;
    const saleDisplay = usdToDisplay(saleUsd, fx);

    setEstimate((prev: any) => {
      if (
        prev?.salePricePerKg === saleUsd &&
        prev?.salePriceDisplay === saleDisplay &&
        prev?.materialCostPerKg === calcEstimate.materialCostPerKg &&
        prev?.totalGsm === calcEstimate.totalGsm &&
        prev?.totalMicron === calcEstimate.totalMicron &&
        prev?.substrateGaugeMicron === calcEstimate.substrateGaugeMicron &&
        prev?.filmDensity === calcEstimate.filmDensity
      ) {
        return prev;
      }
      return {
        ...prev,
        salePricePerKg: saleUsd,
        salePriceDisplay: saleDisplay,
        materialCostPerKg: calcEstimate.materialCostPerKg,
        totalGsm: calcEstimate.totalGsm,
        totalMicron: calcEstimate.totalMicron,
        substrateGaugeMicron: calcEstimate.substrateGaugeMicron,
        filmDensity: calcEstimate.filmDensity,
      };
    });

    setLayers((prev) => {
      let changed = false;
      const next = prev.map((l, i) => {
        const calcLayer = calcEstimate.layers[i];
        if (calcLayer?.gsm != null && calcLayer.gsm !== l.gsm) {
          changed = true;
          return { ...l, gsm: calcLayer.gsm };
        }
        return l;
      });
      return changed ? next : prev;
    });

    setSlabsState((prev) => {
      let changed = false;
      const next = prev.map((s, i) => {
        const calcSlab = clientCalcResult.slabs[i];
        const usd = calcSlab
          ? calcSlab.pricePerKg
          : calcEstimate.salePricePerKg || 0;
        const priceDisplay = usdToDisplay(usd, fx);
        if (
          s.pricePerKgUsd === usd &&
          s.pricePerKg === priceDisplay &&
          s.total === s.quantityKg * priceDisplay
        ) {
          return s;
        }
        changed = true;
        return {
          ...s,
          pricePerKgUsd: usd,
          pricePerKg: priceDisplay,
          total: s.quantityKg * priceDisplay,
        };
      });
      return changed ? next : prev;
    });
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

  const ensureStructureReady = useCallback((): boolean => {
    const err = validateConfiguredEstimate({
      layers,
      productType,
      dimensions: dimensions as Record<string, unknown>,
      processes: processesState,
      requiresRollLength,
      structureHasPrinting,
    });
    if (err) {
      alert(err);
      setActiveSection('structure');
      return false;
    }
    return true;
  }, [layers, productType, dimensions, processesState, requiresRollLength, structureHasPrinting]);

  const goToSection = useCallback(
    (section: 'structure' | 'dimensions' | 'slabs') => {
      if (section !== 'structure' && !ensureStructureReady()) return;

      // Price list requires at least one process enabled
      if (section === 'slabs') {
        const enabledCount = processesState.filter((p) => p.enabled !== false).length;
        if (enabledCount === 0) {
          alert('Select at least one process before proceeding to pricing.');
          return;
        }
      }

      setActiveSection(section);
    },
    [ensureStructureReady, processesState]
  );

  // Replay a draft that was saved while offline back to the server once we're
  // online again. This is the restore path for the offline save above — the
  // work is recovered by re-submitting it, not silently dropped.
  const flushOfflineDraft = async (estimateId: string): Promise<void> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const draftKey = `offlineDraft:${estimateId}`;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { payload?: unknown };
      const payload = parsed?.payload ?? parsed; // tolerate legacy (bare payload) entries
      if (!payload) {
        localStorage.removeItem(draftKey);
        return;
      }
      await apiClient.updateEstimate(estimateId, payload);
      localStorage.removeItem(draftKey);
      setSaveNotice('Offline changes synced.');
      await fetchEstimate(estimateId, { silent: true });
    } catch (err) {
      // Keep the draft so we can retry on the next load / reconnect.
      console.error('Failed to sync offline draft:', err);
    }
  };

  /**
   * Save modes:
   *  - 'draft'   → explicit Save Draft button: status='draft', shows success toast.
   *  - 'final'   → explicit Save Final button: status='sent' (DB enum), validated.
   *  - 'silent'  → Calculate auto-save: keeps current status, no success toast.
   *
   * Returns true when a save actually reached the server.
   */
  type SaveMode = 'draft' | 'final' | 'silent';

  const syncPriceCheckQuoteName = async (quoteId: string | undefined) => {
    if (!isPriceCheck || !quoteId) return;
    const productGroup = jobName?.trim();
    if (!productGroup || productGroup === 'New estimate') return;
    try {
      await apiClient.updateQuote(quoteId, { name: productGroup });
    } catch {
      /* best effort */
    }
  };

  const persistEstimate = async (mode: SaveMode = 'draft'): Promise<boolean> => {
    if (readOnly) {
      if (mode !== 'silent') alert('This quote is sent and locked. Unlock or re-quote to edit.');
      return false;
    }
    if (saving) return false;
    if (layers.length === 0) {
      if (mode !== 'silent') alert('Add at least one layer before saving.');
      return false;
    }
    if (layers.some((l) => !l.materialId)) {
      if (mode !== 'silent') alert('Select a material for every layer before saving.');
      return false;
    }
    const materialRefError = validateSaveMaterialRefs({
      layers,
      materialIds: materials.map((m) => m.id),
      needsSolventMix,
      solventMaterialId,
    });
    if (materialRefError) {
      if (mode !== 'silent') alert(materialRefError);
      return false;
    }
    if (!jobName.trim()) {
      if (mode !== 'silent') {
        alert(isPriceCheck ? 'Enter a product group before saving.' : 'Enter a job name before saving.');
      }
      return false;
    }
    if (isPriceCheck && multiOnQuote && !skuLabel.trim() && mode === 'final') {
      alert('Enter a variant name before saving.');
      return false;
    }
    if (mode === 'final') {
      // Final save must satisfy the full configurator validation (dimensions etc.).
      // For draft and silent we let the user save partial work — that's the whole
      // point of a draft.
      const validationError = validateConfiguredEstimate({
        layers,
        productType,
        dimensions: dimensions as Record<string, unknown>,
        processes: processesState,
        requiresRollLength,
        structureHasPrinting,
      });
      if (validationError) {
        alert(validationError);
        setActiveSection('structure');
        return false;
      }
    }

    setSaving(true);
    if (mode !== 'silent') setSaveNotice(null);
    try {
      const linkedCustomerId = await ensureCustomerForSave();
      const payload = buildSavePayload(linkedCustomerId);
      // Explicit status transitions. Silent (Calculate) preserves whatever the
      // row already had — we don't downgrade a 'sent' estimate to 'draft' just
      // because the user recalculated.
      if (mode === 'draft') payload.status = 'draft';
      else if (mode === 'final' && (!estimate?.status || estimate.status === 'draft')) {
        payload.status = 'sent';
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const draftKey = `offlineDraft:${estimate?.id || 'new'}`;
        localStorage.setItem(draftKey, JSON.stringify({ payload, savedAt: Date.now() }));
        if (mode !== 'silent') {
          setSaveNotice(
            estimate?.id
              ? 'You are offline. Your changes are saved on this device and will sync automatically when the connection returns.'
              : 'You are offline. This new estimate is saved on this device, but new estimates can only sync once you reconnect and save again.'
          );
        }
        return false;
      }
      if (estimate?.id) {
        await apiClient.updateEstimate(estimate.id, payload);
        const templateKey = estimate.sourceTemplateKey?.trim();
        if (templateKey) {
          setWorkingEstimateForTemplate(templateKey, estimate.id);
        }
        setNeedsConfiguration(false);
        // Persist the authoritative calculation so the saved snapshot (and PDF)
        // match the live on-screen pricing. Best-effort: a partial draft may be
        // too incomplete for the engine — keep the save and skip the snapshot.
        try {
          await apiClient.calculateEstimate(estimate.id);
        } catch (calcErr) {
          console.warn('Recalculate on save skipped:', calcErr);
        }
        await fetchEstimate(estimate.id, { silent: true });
        await syncPriceCheckQuoteName(estimate.quoteId || quoteIdFromUrl || undefined);
        if (mode === 'draft') setSaveNotice('Draft saved.');
        else if (mode === 'final') setSaveNotice('Saved.');
        onSaved?.();
        return true;
      }
      if (createInFlightRef.current) return false;
      createInFlightRef.current = true;
      try {
        const saved = await apiClient.createEstimate(payload);
        const templateKey = saved?.sourceTemplateKey?.trim();
        if (templateKey && saved?.id) {
          setWorkingEstimateForTemplate(templateKey, saved.id);
        }
        setEstimate((prev: any) => ({
          ...prev,
          id: saved.id,
          quoteId: saved.quoteId ?? prev?.quoteId ?? quoteIdFromUrl ?? undefined,
          refNumber: saved.refNumber ?? prev?.refNumber,
        }));
        // Recalculate the freshly created estimate so its persisted price snapshot
        // is in sync before we navigate to it. Best-effort (see note above).
        if (saved?.id) {
          try {
            await apiClient.calculateEstimate(saved.id);
          } catch (calcErr) {
            console.warn('Recalculate on save skipped:', calcErr);
          }
        }
        {
          const qid = saved.quoteId || quoteIdFromUrl;
          await syncPriceCheckQuoteName(qid || undefined);
          if (qid) {
            navigate(`/quotes/${qid}/estimates/${saved.id}`, { replace: true });
          } else {
            navigate(`/estimate/${saved.id}`, { replace: true });
          }
        }
        if (mode === 'draft') setSaveNotice('Draft saved.');
        else if (mode === 'final') setSaveNotice('Saved.');
        onSaved?.();
        return true;
      } finally {
        createInFlightRef.current = false;
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      // Silent saves (Calculate) shouldn't blast the user with a modal — log +
      // carry on. Explicit Save buttons still alert.
      if (mode !== 'silent') alert(`Save failed: ${err.message || 'Unknown error'}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Back: leave the editor WITHOUT persisting anything. The user has
   * explicit "Save draft" and "Save" buttons for persistence; Back always
   * discards unsaved changes and never creates a draft row.
   */
  const handleCancel = () => {
    navigate(returnTo);
  };

  const handleSaveDraft = () => void persistEstimate('draft');
  const handleSaveFinal = () => void persistEstimate('final');

  const handleRequote = async () => {
    if (!estimate?.id) return;
    try {
      const res = await apiClient.requoteEstimate(estimate.id);
      if (res?.id) {
        const changes = meaningfulRequotePriceChanges(res.price_changes || []);
        setPriceChanges(changes);
        setRequoteWarnings(res.warnings || []);
        const dest = res.quoteId
          ? `/quotes/${res.quoteId}/estimates/${res.id}`
          : `/estimate/${res.id}`;
        navigate(dest, {
          state: { priceChanges: changes, warnings: res.warnings || [] },
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

  const handleSnapBack = async () => {
    if (!estimate?.id || !estimate?.sourceTemplateKey) {
      alert('Only template quotes can be reverted to template.');
      return;
    }
    const confirmed = window.confirm(
      'Revert to template structure? This will reset layers & processes to the template defaults. Current edits will be lost.'
    );
    if (!confirmed) return;
    
    try {
      setSaving(true);
      // Load the template by its ID (sourceTemplateKey)
      const template = await apiClient.getTemplate(estimate.sourceTemplateKey);
      if (!template) {
        alert('Template not found.');
        return;
      }
      // Re-instantiate estimate from template (server-side fork check)
      const instantiated = await apiClient.instantiateTemplate(template.id, {
        customerId,
        jobName,
      });
      if (!instantiated?.estimate) {
        alert('Failed to instantiate template.');
        return;
      }

      // Merge into current estimate while preserving customer/job name
      const payload = {
        ...instantiated.estimate,
        jobName,
        customerId,
        layers: instantiated.layers,
        processes: instantiated.processes || [],
        processesCustomized: false,
      };
      await apiClient.updateEstimate(estimate.id, payload);
      setSaveNotice('Reverted to template structure.');
      await fetchEstimate(estimate.id, { silent: true });
    } catch (err) {
      alert('Failed to revert: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  const handleCustomizeProcesses = async () => {
    if (!estimate?.id) return;
    try {
      setSaving(true);
      await apiClient.updateEstimate(estimate.id, {
        processesCustomized: true,
      });
      setSaveNotice('Processes locked in — future layer changes won\'t affect them.');
      await fetchEstimate(estimate.id, { silent: true });
    } catch (err) {
      alert('Failed to lock processes: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSaving(false);
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
      <div className="p-8 max-w-lg mx-auto card bg-danger/10 border border-danger/30 text-center">
        <p className="text-danger font-medium">{loadError}</p>
        <div className="flex flex-col gap-2 mt-4">
          <button type="button" className="btn-primary" onClick={() => { setLoading(true); fetchEstimate(id!); }}>
            Retry
          </button>
          <Link to={returnTo} className="text-gold hover:underline text-sm">Back</Link>
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
    !readOnly && (!structureLocked || layer.materialType === 'ink');
  const showStructureCosts = can('materialCostPerKg');
  const showInkControlsCol = structureLocked;
  const showLayerActionsCol = !structureLocked;
  const showLayerControlsCol = showLayerActionsCol || showInkControlsCol;
  const displayCurrencyLabel = estimate?.displayCurrency || 'USD';
  /** Single source of truth for structure columns — header and every body row map this. */
  const structureColumns: Array<{ key: string; track: string; label: ReactNode }> = [
    { key: 'idx', track: '2rem', label: '#' },
    // Wide enough for "Substrate" badge at text-xs + px-1.5 (was 4.75rem → "Substr…")
    { key: 'type', track: '6.5rem', label: 'Type' },
    // Family names are short (PET, PE); grade truncates in-cell and expands in the menu.
    { key: 'family', track: 'minmax(0,0.85fr)', label: 'Family' },
    { key: 'grade', track: 'minmax(0,1fr)', label: 'Grade' },
    {
      key: 'value',
      track: '6.25rem',
      label: (
        <span className="block w-full leading-tight text-center">
          <span className="block">Value</span>
          <span className="block font-normal opacity-80 text-[10px]">µ/gsm</span>
        </span>
      ),
    },
    {
      key: 'gsm',
      track: '4.5rem',
      label: (
        <span className="leading-tight text-center">
          <span className="block">GSM</span>
        </span>
      ),
    },
    ...(showStructureCosts
      ? [
          {
            key: 'perKg',
            track: '5.25rem',
            label: (
              <span className="leading-tight text-center">
                <span className="block">Material</span>
                <span className="block font-normal opacity-80 text-[10px]">
                  {displayCurrencyLabel}/kg
                </span>
              </span>
            ),
          },
          {
            key: 'perM2',
            track: '5.25rem',
            label: (
              <span className="leading-tight text-center">
                <span className="block">Area</span>
                <span className="block font-normal opacity-80 text-[10px]">
                  {displayCurrencyLabel}/m²
                </span>
              </span>
            ),
          },
        ]
      : []),
    ...(showLayerControlsCol ? [{ key: 'actions', track: '2rem', label: '' as ReactNode }] : []),
  ];
  const structureGridCols = structureColumns.map((c) => c.track).join(' ');
  const centeredStructureColKeys = new Set(['value']);
  const structureGridStyle = {
    ['--structure-cols' as string]: structureGridCols,
  } as CSSProperties;
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
  const _fmt = (n: number, d = 4): string => {
    if (!Number.isFinite(n)) return '0';
    return parseFloat(n.toFixed(d)).toString();
  };
  void _fmt;

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

  const totalGsm = structureMetrics.totalGsm;
  const totalConstructionMicron = structureMetrics.totalConstructionMicron;
  const structureDensity =
    structureMetrics.structureDensity != null
      ? structureMetrics.structureDensity.toFixed(3)
      : '—';
  const yieldSqmPerKg =
    clientCalcResult?.estimate.sqmPerKg ?? (totalGsm > 0 ? 1000 / totalGsm : null);

  // Order quantity expressed in every unit (Kg · Kpcs · m² · LM), derived from the
  // structure's per-kg yields — shown regardless of the unit the user entered.
  // LM is the finished reel running length (linearMPerKgReel), matching the 'lm' unit.
  const orderQtyMetrics = (() => {
    const e = clientCalcResult?.estimate;
    const pos = (n: number | null | undefined) =>
      n != null && Number.isFinite(n) && n > 0 ? n : null;
    return {
      kg: pos(e?.orderQuantityKgConverted),
      kpcs: pos(e?.orderQuantityKpcs),
      pieces: pos(e?.orderQuantityKpcs) != null ? (e!.orderQuantityKpcs as number) * 1000 : null,
      sqm: pos(e?.orderQuantitySqm),
      lm: pos(e?.orderQuantityMetersReel),
      piecesPerKg: pos(e?.piecesPerKg),
      gramsPerPiece: pos(e?.gramsPerPiece),
      sqmPerKg: pos(e?.sqmPerKg),
      lmPerKgReel: pos(e?.linearMPerKgReel),
    };
  })();
  const fmtQty = (n: number | null | undefined, decimals = 0) =>
    n != null && Number.isFinite(n)
      ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : '—';

  // Compact stat tile for the Production Summary / Cost panels.
  // flex-col + mt-auto bottom-aligns the value so cards stay aligned and equal
  // height even when a label wraps to two lines on narrow screens.
  const statTile = (label: string, value: string, unit?: string, title?: string) => (
    <div className="rounded-lg border border-border bg-slate/40 px-3 py-2 min-w-0 flex flex-col gap-1 h-full" title={title}>
      <p className="text-[10px] font-medium text-mist leading-tight break-words">{label}</p>
      <p className="mt-auto font-mono text-sm font-semibold text-navy tabular-nums leading-none">
        {value}
        {unit ? <span className="text-[10px] font-normal text-mist"> {unit}</span> : null}
      </p>
    </div>
  );

  // Tooltip text: this order converted to every unit (for the order-quantity input).
  const orderQuantityHint = (() => {
    const m = orderQtyMetrics;
    const parts = [
      m.kg != null ? `${fmtQty(m.kg, 2)} kg` : null,
      m.pieces != null ? `${fmtQty(m.pieces, 0)} pcs` : null,
      m.sqm != null ? `${fmtQty(m.sqm, 2)} m²` : null,
      m.lm != null ? `${fmtQty(m.lm, 2)} LM` : null,
    ].filter(Boolean);
    return parts.length ? `This order ≈ ${parts.join(' · ')}` : undefined;
  })();

  // Tooltip text for the reel/cut-off/pieces inputs: the per-kg yields they drive.
  const dimensionHints = (() => {
    const m = orderQtyMetrics;
    const perKg = [
      m.piecesPerKg != null ? `${fmtQty(m.piecesPerKg, 4)} pcs/kg` : null,
      m.gramsPerPiece != null ? `${fmtQty(m.gramsPerPiece, 4)} g/piece` : null,
      m.sqmPerKg != null ? `${fmtQty(m.sqmPerKg, 4)} m²/kg` : null,
      m.lmPerKgReel != null ? `${fmtQty(m.lmPerKgReel, 4)} LM/kg (reel)` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    if (!perKg) return undefined;
    return {
      reelWidthMm: `Reel width drives reel LM and piece count.\nPer kg: ${perKg}`,
      cutoffMm: `Cut-off drives the piece count.\nPer kg: ${perKg}`,
      piecesPerCut: `Pieces per cut multiplies the piece count.\nPer kg: ${perKg}`,
    };
  })();

  const fxRate = parseFloat(estimate?.exchangeRateUsdToDisplay) || 1;
  const salePricePerKgUsd =
    Number(clientCalcResult?.estimate?.salePricePerKg ?? estimate?.salePricePerKg) || 0;
  const displaySalePrice =
    salePricePerKgUsd > 0
      ? usdToDisplay(salePricePerKgUsd, fxRate)
      : Number(estimate?.salePriceDisplay) || 0;
  /** Selling price in every applicable unit (display currency). */
  const sellingPricesByUnit = (() => {
    const cur = estimate?.displayCurrency || 'USD';
    const fmt = (usd: number, decimals: number) =>
      usdToDisplayPrecise(usd, fxRate).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    const gsmLocal = clientCalcResult?.estimate?.totalGsm ?? totalGsm ?? 0;
    const widthM = (dimensions?.reelWidthMm ?? 0) / 1000;
    const rollLengthLm = Number(dimensions?.orderUnitMultiplier) || 0;
    const piecesPerKg = orderQtyMetrics.piecesPerKg;
    const lmPerKg = orderQtyMetrics.lmPerKgReel;
    const saleM2Usd = gsmLocal > 0 ? salePricePerKgUsd * (gsmLocal / 1000) : 0;
    const saleLmUsd =
      lmPerKg != null && lmPerKg > 0
        ? salePricePerKgUsd / lmPerKg
        : widthM > 0 && saleM2Usd > 0
          ? saleM2Usd * widthM
          : 0;
    const line = (usd: number, decimals: number, unit: string, title?: string) => ({
      text: `${cur} ${fmt(usd, decimals)} /${unit}`,
      title,
    });
    const rows: Array<{ text: string; title?: string }> = [
      line(salePricePerKgUsd, 2, 'kg'),
    ];
    if (gsmLocal > 0) {
      rows.push(line(saleM2Usd, 4, 'm²'));
    }
    if (allowedUnitBases.has('lm') && saleLmUsd > 0) {
      rows.push(line(saleLmUsd, 4, 'LM'));
    }
    if (requiresRollLength && rollLengthLm > 0 && saleLmUsd > 0) {
      rows.push(line(saleLmUsd * rollLengthLm, 2, 'roll', `${rollLengthLm} LM per roll`));
    }
    if (allowedUnitBases.has('pieces') && piecesPerKg != null && piecesPerKg > 0) {
      const salePcUsd = salePricePerKgUsd / piecesPerKg;
      rows.push(line(salePcUsd, 4, 'pc'));
      rows.push(line(salePcUsd * 1000, 2, 'Kpcs'));
    }
    return rows;
  })();
  const solventConfigBar = canConfigureSolvent && (hasSbInk || needsSolventMix) ? (
    <div
      id="solvent-costing"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
    >
      {hasSbInk && (
        <>
          <span className="text-xs text-mist shrink-0">Print</span>
          <div className="inline-flex rounded overflow-hidden border border-border shrink-0 bg-surface-raised">
            {(['flexo', 'rotogravure'] as const).map((method) => {
              const selected = effectiveInkPrintingProcess === method;
              const label = method === 'flexo' ? 'Flexo' : 'Roto';
              return (
                <button
                  key={method}
                  type="button"
                  title={method === 'flexo' ? 'Flexo' : 'Rotogravure'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium ${
                    selected ? 'bg-navy text-text-on-accent' : 'bg-surface-raised text-navy hover:bg-slate'
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
              aria-label="Ink dilution solvent ratio"
              title={inkMakeupRatioTooltip}
              className="input py-1 px-1.5 w-14 text-xs font-mono text-center"
              value={effectiveInkSolventRatio}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setInkSolventRatioOverride(Number.isFinite(v) && v > 0 ? v : null);
              }}
              onFocus={selectOnFocus}
            />
          </label>
          {needsSolventMix && <span className="hidden sm:inline text-warning">|</span>}
        </>
      )}
      {needsSolventMix && (
        <>
          <select
            className="input py-1 px-2 text-xs w-28 sm:w-36 shrink-0"
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
            <span className="text-xs text-mist">{estimate?.displayCurrency || 'USD'}/kg</span>
            <input
              type="number"
              min="0"
              step="0.01"
              aria-label="Solvent per kg"
              className="input py-1 px-2 w-16 text-xs font-mono"
              value={usdToDisplay(resolvedSolventCostPerKgUsd, fxRate).toFixed(2)}
              onChange={(e) => {
                const displayVal = parseFloat(e.target.value) || 0;
                setSolventCostOverrideUsd(fxRate > 0 ? displayVal / fxRate : displayVal);
              }}
              onFocus={selectOnFocus}
            />
          </label>
          <label className="inline-flex items-center gap-1 shrink-0">
            <span className="text-xs text-mist">Clean</span>
            <input
              type="number"
              min="0"
              step="1"
              aria-label="Cleaning kg per job"
              className="input py-1 px-2 w-14 text-xs font-mono"
              value={cleaningSolventKgPerJob}
              onChange={(e) => setCleaningSolventKgPerJob(Number(e.target.value) || 0)}
              onFocus={selectOnFocus}
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
        <div className="mb-4 card bg-warning/10 border border-warning/30 text-sm text-warning flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>{loadError}</span>
          <button type="button" className="btn-secondary text-sm" onClick={loadBaseData}>
            Retry materials
          </button>
        </div>
      )}
      {saveNotice && (
        <div className="mb-4 card bg-success/10 border border-success/30 text-sm text-success flex items-center justify-between gap-2">
          <span>{saveNotice}</span>
          <button type="button" className="text-success/80 hover:text-success" onClick={() => setSaveNotice(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* BUG-8: requote price-change banner — shown after navigating from a requote */}
      {priceChanges.length > 0 && (
        <div className="mb-4 card bg-warning/10 border border-warning/30 text-sm text-warning">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">Price changes vs original quote</p>
            <button type="button" className="text-warning/80 hover:text-warning" onClick={() => setPriceChanges([])}>✕</button>
          </div>
          <div className="space-y-1">
            {priceChanges.map((pc: { materialId: string; materialName: string; deltaPct: number; materialStale?: boolean }) => (
              <div key={pc.materialId} className="flex justify-between text-xs gap-2">
                <span className="text-ink">{pc.materialName}</span>
                <span className={pc.materialStale ? 'text-danger' : pc.deltaPct > 0 ? 'text-danger' : 'text-success'}>
                  {pc.materialStale ? '⚠ Removed from library' : `${pc.deltaPct > 0 ? '+' : ''}${pc.deltaPct.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </div>
          {requoteWarnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-warning/30 space-y-1">
              {requoteWarnings.map((w, i) => <p key={i} className="text-xs text-warning">{w}</p>)}
            </div>
          )}
        </div>
      )}
      {/* Compact estimate header — sticky so Save/Calculate stay reachable while scrolling */}
      <div className={`${embedded ? 'relative z-20' : 'sticky top-0 z-30 -mx-4 lg:-mx-8 px-4 lg:px-8'} py-3 mb-6 ${embedded ? '' : 'bg-surface-base/95 backdrop-blur border-b border-border'} flex items-center justify-between gap-3`}>
        {/* Left: Back + title (Back hidden when QuoteWorkspace owns chrome) */}
        <div className="flex items-center gap-3 min-w-0">
          {!embedded && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary inline-flex items-center gap-2 shrink-0"
              title="Back — discards unsaved changes"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="min-w-0">
            <p className="eyebrow font-mono leading-none truncate flex items-center gap-2 flex-wrap">
              <span>
                {hideEstimateRef
                  ? `${estimateStatusLabel(estimate?.status)}${needsConfiguration ? ' · Needs configuration' : ''}`
                  : estimate?.refNumber
                    ? `${estimate.refNumber} · ${estimateStatusLabel(estimate?.status)}${needsConfiguration ? ' · Needs configuration' : ''}`
                    : `Draft estimate${needsConfiguration ? ' · Needs configuration' : ''}`}
              </span>
              {estimate?.structureForked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-warning/10 text-warning rounded whitespace-nowrap" title="Layers differ from template">
                  <AlertCircle className="w-3 h-3" />
                  Forked
                </span>
              )}
              {estimate?.processesCustomized && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-info/10 text-info rounded whitespace-nowrap" title="Processes manually edited">
                  <Check className="w-3 h-3" />
                  Customized
                </span>
              )}
            </p>
            <h1 className="font-display font-semibold text-brand leading-tight truncate text-lg sm:text-xl">
              {isPriceCheck && multiOnQuote && skuLabel.trim()
                ? skuLabel.trim()
                : jobName}
            </h1>
            {isPriceCheck && multiOnQuote && jobName.trim() && (
              <p className="text-xs text-mist truncate">{jobName.trim()}</p>
            )}
          </div>
        </div>

        {/* Right: actions — single toolbar (no bottom duplicates) */}
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {!readOnly && estimate?.structureForked && estimate?.sourceTemplateKey && (
            <button
              type="button"
              onClick={handleSnapBack}
              disabled={saving}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs"
              title="Revert layers & processes to template defaults"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">Snap back</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="btn-secondary inline-flex items-center gap-1.5"
              title="Save your in-progress work — you can come back to finish it later"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save draft'}</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveFinal}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-1.5"
              title="Save the completed estimate — validates dimensions, layers, and structure"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
          )}
          {!embedded && (
            <button
              type="button"
              onClick={downloadProposalPdf}
              disabled={!estimate?.id}
              className="btn-secondary inline-flex items-center gap-1.5"
              title="Download proposal PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              disabled={!estimate?.id}
              className="btn-secondary inline-flex items-center gap-1.5"
              title="Save structure to My Templates"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span className="hidden md:inline">My Templates</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleRequote}
            disabled={!estimate?.id}
            className="btn-secondary inline-flex items-center gap-1.5"
            title={readOnly ? 'Create a new quote with fresh prices' : 'Duplicate for re-quote'}
          >
            <Copy className="w-4 h-4" />
            <span className="hidden md:inline">Re-quote</span>
          </button>
        </div>
      </div>

      <fieldset
        disabled={readOnly}
        className="min-w-0 border-0 p-0 m-0 disabled:opacity-90 [&_button:not([type='button'])]:disabled:pointer-events-none"
      >
      <div className="card mb-6 py-3 px-4 sm:px-5">
        <SectionTitle
          as="h3"
          className="text-sm font-semibold text-brand mb-3"
          hint={
            isPriceCheck && !multiOnQuote
              ? `Price check ${estimate?.refNumber || 'draft'} — name the product group. Save draft to keep working, or Save when pricing is ready.`
              : !isPriceCheck
                ? `Estimate ${estimate?.refNumber || 'draft'} — pick an existing customer, click + Add customer for a new one. Use Save draft to keep working later, or Save when the estimate is complete. It appears under Estimates and on that customer's page.`
                : undefined
          }
        >
          {isPriceCheck ? 'Product group' : 'Job details'}
        </SectionTitle>
        <JobHeaderFields
          hideCustomer={isPriceCheck}
          jobNameLabel={isPriceCheck ? 'Product group' : 'Job name'}
          jobNamePlaceholder={isPriceCheck ? 'e.g. Triplex laminate — snack' : undefined}
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
            // Bag/pouch: leave the subtype unselected ("Select type…") so the user picks from the
            // list and the configurator activates. Other families keep their first subtype as a default.
            setProductSubtype(next === 'bag' || next === 'pouch' ? null : defaultSubtypeForFamily(next as ProductFamily));
            const nextUnit = defaultOrderQuantityUnit({
              productType: next,
              sourceTemplateKey: estimate?.sourceTemplateKey,
              jobName,
              dimensions: dimensions as Record<string, unknown>,
            });
            if (nextUnit === 'kpcs') {
              setOrderQuantityUnit(normalizeUnitValue('kpcs', unitOptions));
            }
          }}
          productTypeOptions={productTypeOptions}
          productTypeLocked={structureLocked || readOnly}
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
            const nextPouchType = configuratorTypeForPouchSubtype(next);
            if (productFamily === 'pouch' && nextPouchType) {
              setDimensions((prev) => ({
                ...prev,
                ...seedPouchDimensionPatch(nextPouchType, prev),
              }));
            }
          }}
          subtypeLabel={`${PRODUCT_FAMILY_LABELS[productFamily] ?? productFamily} type`}
          availableSubtypes={availableSubtypes}
          dimensionFields={
            // Pouch/bag/roll/sleeve dimensions are entered in the design panel configurator.
            productFamily === 'pouch' || productFamily === 'bag' || webConfiguratorActive
              ? []
              : estimationDimensionFields
          }
          dimensions={dimensions}
          onDimensionChange={(key, value) =>
            setDimensions((prev) => ({ ...prev, [key]: value }))
          }
          orderQuantity={orderQuantity}
          onOrderQuantityChange={setOrderQuantity}
          orderQuantityUnit={orderQuantityUnit}
          onOrderQuantityUnitChange={setOrderQuantityUnit}
          unitOptions={availableUnitOptions}
          orderQuantityUnitMultiplier={dimensions.orderUnitMultiplier}
          onOrderQuantityUnitMultiplierChange={(value) =>
            setDimensions((prev) => ({ ...prev, orderUnitMultiplier: value }))
          }
          orderQuantityHint={orderQuantityHint}
          dimensionHints={dimensionHints}
          bagDimensionsPanel={
            bagConfiguratorActive ? (
              <BagConfigurator
                productSubtype={productSubtype}
                dimensions={dimensions}
                onDimensionsChange={(patch) => setDimensions((prev) => ({ ...prev, ...patch }))}
              />
            ) : pouchConfiguratorActive ? (
              <PouchConfigurator
                productSubtype={productSubtype}
                dimensions={dimensions}
                onDimensionsChange={(patch) => setDimensions((prev) => ({ ...prev, ...patch }))}
                accessories={accessories}
                onAccessoriesChange={setAccessories}
                accessoryMaterials={accessoryMaterialOptions}
              />
            ) : rollConfiguratorActive ? (
              <RollConfigurator
                dimensions={dimensions}
                onDimensionsChange={(patch) => setDimensions((prev) => ({ ...prev, ...patch }))}
                totalGsm={totalGsm}
                filmDensityGcm3={structureMetrics.structureDensity ?? 0}
                isLabels={isLabelsRoll}
                continuousWeb={!structureHasPrinting}
              />
            ) : sleeveConfiguratorActive ? (
              <SleeveConfigurator
                dimensions={dimensions}
                onDimensionsChange={(patch) => setDimensions((prev) => ({ ...prev, ...patch }))}
                totalGsm={totalGsm}
                filmDensityGcm3={structureMetrics.structureDensity ?? 0}
              />
            ) : undefined
          }
          showSkuFields={!isPriceCheck}
          showVariantField={isPriceCheck && multiOnQuote}
          skuLabel={skuLabel}
          onSkuLabelChange={setSkuLabel}
          brand={brand}
          onBrandChange={setBrand}
          specsCode={specsCode}
          onSpecsCodeChange={setSpecsCode}
          showDevCostFields={!isPriceCheck && can('platesPerKg') && structureHasPrinting}
          printColorCount={printColorCount}
          onPrintColorCountChange={setPrintColorCount}
          costPerColor={costPerColor}
          onCostPerColorChange={setCostPerColor}
          toolingScenario={toolingScenario}
          onToolingScenarioChange={(next) => {
            setToolingScenario(next);
            if (next === 'existing') setBillableColorCount(0);
            else if (next === 'new') setBillableColorCount(null);
          }}
          billableColorCount={billableColorCount}
          onBillableColorCountChange={setBillableColorCount}
          toolingBillingMode={toolingBillingMode}
          onToolingBillingModeChange={setToolingBillingMode}
          effectiveToolingDisplay={effectiveToolingDisplay}
          colorsDriveTooling={colorsDriveTooling}
          toolingChargeUsd={toolingChargeUsd}
          onToolingChargeUsdChange={setToolingChargeUsd}
          showDeliveryFields={!isPriceCheck && can('markupPercent')}
          deliveryTerm={deliveryTerm}
          onDeliveryTermChange={setDeliveryTerm}
          deliveryChargeUsd={deliveryChargeUsd}
          onDeliveryChargeUsdChange={setDeliveryChargeUsd}
          displayCurrency={estimate?.displayCurrency || 'USD'}
        />
      </div>

      <div className="min-w-0 max-w-full overflow-x-hidden">
        <div>
          {!hidePriceListTab && (
            <div className="flex space-x-2 mb-6 overflow-x-auto">
              <button onClick={() => goToSection('structure')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-micro ease-micro ${activeSection === 'structure' ? 'bg-accent-soft text-accent-text font-medium' : 'hover:bg-surface-base text-text-primary'}`}>
                <Layers className="w-4 h-4" /><span>Structure</span>
              </button>
              <button onClick={() => goToSection('slabs')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-micro ease-micro ${activeSection === 'slabs' ? 'bg-accent-soft text-accent-text font-medium' : 'hover:bg-surface-base text-text-primary'}`}>
                <Calculator className="w-4 h-4" /><span>Price list</span>
              </button>
            </div>
          )}

          {/* Structure section */}
          {(activeSection === 'structure' || hidePriceListTab) && (
            <div className="space-y-6">
              <div className="card p-0 overflow-hidden shadow-md">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] border-b border-border bg-surface-raised">
                  <div className="px-5 py-3.5 xl:border-r border-border">
                    <SectionTitle
                      as="h3"
                      className="text-lg font-display font-semibold text-navy tracking-tight"
                      hint={
                        structureLocked
                          ? 'Template quote — films & adhesives are fixed; edit grades, thickness (µ/gsm), costs, and ink & coating rows'
                          : 'Layers, grades & RM costs'
                      }
                    >
                      {stackLabel}
                    </SectionTitle>
                    {layers.length > 1 && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-mist">
                        <GripVertical className="w-3.5 h-3.5" />
                        {structureLocked ? 'Drag the handle to reorder ink & coating' : 'Drag the handle to reorder layers'}
                      </p>
                    )}
                  </div>
                  <div className="px-5 py-3.5 hidden xl:block border-l border-border bg-slate/20">
                    <SectionTitle
                      as="h3"
                      className="text-lg font-display font-semibold text-navy tracking-tight"
                      hint="Cross-section · up to 4 films, 3 adhesives, unlimited ink & coating"
                    >
                      Layer build-up
                    </SectionTitle>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start">
                  <div className="min-w-0 xl:border-r border-border">
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
                        totalMicron={totalConstructionMicron}
                        displayCurrency={displayCurrencyLabel}
                        showContrib={showStructureCosts}
                      />
                    </div>
                  )}
                  {layers.map((layer, idx) => {
                    const costPerKgDisplay = can('materialCostPerKg') 
                      ? usdToDisplay(layer.costPerKgUsd, fxRate) 
                      : undefined;
                    return (
                    <LayerCard
                      key={layer.id}
                      index={idx}
                      layer={{ ...layer, type: layer.materialType, material: layer.materialName, costPerKg: costPerKgDisplay }}
                      showCost={can('materialCostPerKg')}
                      displayCurrency={estimate?.displayCurrency || 'USD'}
                      onEdit={() => openLayerEdit(layer.id)}
                      showFormula={canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased}
                      formulaOverridden={!!laminationRecipeOverrides[layer.id]}
                      onFormula={
                        canConfigureSolvent && layer.materialType === 'adhesive' && layer.isSolventBased
                          ? () => setFormulaModalLayerId(layer.id)
                          : undefined
                      }
                      onRemove={canEditLayerStructure(layer) ? () => setLayers((prev) => prev.filter((l) => l.id !== layer.id)) : undefined}
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
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setAddLayerSheetOpen(true)}
                    className="w-full min-h-[48px] py-3 border-2 border-dashed border-border rounded-xl font-display font-semibold text-navy"
                  >
                    {structureLocked ? '+ Add ink & coating' : '+ Add layer'}
                  </button>
                  {needsSolventMix && (
                    <div className="border border-warning/30 rounded-lg overflow-hidden bg-warning/10">
                      {solventConfigBar && (
                        <div className="px-3 py-2.5 border-b border-warning/30 overflow-x-hidden">
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
                        <div className="divide-y divide-warning/20 bg-warning/5 text-sm">
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

                {/* Desktop structure grid — one column definition for header + every row */}
                <div ref={structureTableRef} className="hidden md:block overflow-x-auto min-w-0 p-4 pr-6">
                  <div className="structure-grid text-sm" style={structureGridStyle} role="table">
                    <div className="structure-grid__row" role="row">
                      {structureColumns.map((col) => (
                        <div
                          key={col.key}
                          className={`structure-grid__cell structure-grid__cell--head${
                            centeredStructureColKeys.has(col.key)
                              ? ' structure-grid__cell--head-center'
                              : ''
                          }`}
                          role="columnheader"
                        >
                          {col.label}
                        </div>
                      ))}
                    </div>
                      {layers.map((layer, idx) => (
                        <div
                          key={layer.id}
                          role="row"
                          onDragEnter={() => {
                            if (dragFromIndex !== null && canEditLayerStructure(layers[dragFromIndex])) {
                              setDragHoverIndex(idx);
                            }
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragFromIndex !== null && dragHoverIndex !== null) {
                              const dragged = layers[dragFromIndex];
                              if (!structureLocked || dragged?.materialType === 'ink') {
                                reorderLayers(dragFromIndex, dragHoverIndex);
                              }
                            }
                            setDragFromIndex(null);
                            setDragHoverIndex(null);
                          }}
                          className={`structure-grid__row hover:bg-slate/50 transition-colors ${
                            dragFromIndex === idx ? 'opacity-50' : ''
                          } ${
                            dragHoverIndex === idx && dragFromIndex !== null && dragFromIndex !== idx
                              ? 'bg-brand/5 outline outline-1 outline-brand/40'
                              : ''
                          }`}
                        >
                          <div className="structure-grid__cell text-xs text-mist" role="cell">
                            <div className="flex items-center gap-0.5 min-w-0 w-full">
                              {canEditLayerStructure(layer) && (
                                <span
                                  draggable
                                  onDragStart={() => setDragFromIndex(idx)}
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
                                  className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-mist hover:text-brand hover:bg-brand/10 cursor-grab active:cursor-grabbing touch-none transition-colors"
                                  aria-label="Drag to reorder layer"
                                  title="Drag to reorder"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <span className="tabular-nums">{idx + 1}</span>
                            </div>
                          </div>
                          <div className="structure-grid__cell" role="cell">
                            <span
                              className={`inline-block text-xs px-1.5 py-0.5 rounded-md whitespace-nowrap ${layer.materialType === 'substrate' ? 'bg-brand/10 text-brand' : layer.materialType === 'ink' ? 'bg-accent/10 text-accent-text' : 'bg-success/10 text-success'}`}
                              title={LAYER_TYPE_LABELS[layer.materialType] || layer.materialType}
                            >
                              {LAYER_TYPE_TABLE_LABELS[layer.materialType] || layer.materialType}
                            </span>
                          </div>
                          <div className="structure-grid__cell overflow-hidden" role="cell">
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
                          </div>
                          <div className="structure-grid__cell overflow-hidden" role="cell">
                            {/* Grade dropdown — filtered by family + classification; title shows hoover on hover */}
                            {(() => {
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

                              const solidPct = currentMat?.solidPercent ?? 100;
                              const solidBasisTitle =
                                solidPct < 100
                                  ? `Cost/kg is solid basis (${solidPct}% solid). Wet ink cost is higher; solvent is costed separately.`
                                  : undefined;

                              return (
                                <div className="min-w-0 w-full" title={solidBasisTitle}>
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
                                </div>
                              );
                            })()}
                          </div>

                          <div className="structure-grid__cell structure-grid__cell--col-center" role="cell">
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
                                <div
                                  className={`structure-grid__field w-full ${layer.micron === 0 ? 'border-warning/30 bg-warning/10' : ''}`}
                                >
                                  <input
                                    type="number"
                                    value={parseFloat(layer.micron.toFixed(1))}
                                    step="0.1"
                                    title={tooltip}
                                    onChange={(e) => {
                                      const micron = Number(e.target.value);
                                      setLayers((prev) => prev.map((l) => l.id === layer.id ? {
                                        ...l, micron,
                                        gsm: isSubstrate ? micron * density : micron,
                                      } : l));
                                    }}
                                    inputMode="decimal"
                                    onFocus={selectOnFocus}
                                  />
                                  <span className="text-xs text-mist shrink-0">{unitLabel}</span>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="structure-grid__cell font-mono text-xs font-semibold text-navy tabular-nums" role="cell">
                            {layer.gsm > 0 ? layer.gsm.toFixed(2) : <span className="text-mist">0.00</span>}
                          </div>

                          {showStructureCosts && (
                            <>
                              <div className="structure-grid__cell" role="cell">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  title={
                                    layer.materialType === 'ink' &&
                                    (materials.find((m) => m.id === layer.materialId)?.solidPercent ?? 100) <
                                      100
                                      ? `Cost/kg is solid basis (${materials.find((m) => m.id === layer.materialId)?.solidPercent}% solid). Wet ink cost is higher; solvent is costed separately.`
                                      : undefined
                                  }
                                  value={usdToDisplay(layer.costPerKgUsd, fxRate).toFixed(2)}
                                  onChange={(e) => {
                                    const displayVal = parseFloat(e.target.value) || 0;
                                    const usd = fxRate > 0 ? displayVal / fxRate : displayVal;
                                    setLayers((prev) => prev.map((l) =>
                                      l.id === layer.id ? { ...l, costPerKgUsd: usd } : l
                                    ));
                                  }}
                                  className="cell-input font-mono text-[11px] text-right"
                                  inputMode="decimal"
                                  aria-label={`Cost per kg for ${layer.materialName}`}
                                  onFocus={selectOnFocus}
                                />
                              </div>
                              <div className="structure-grid__cell font-mono text-[11px] tabular-nums text-navy" role="cell">
                                {(() => {
                                  const calcLayer = clientCalcResult?.estimate.layers[idx];
                                  const c = calcLayer?.costPerM2;
                                  if (c == null || c <= 0) return <span className="text-mist">—</span>;
                                  return usdToDisplayPrecise(c, fxRate).toFixed(4);
                                })()}
                              </div>
                            </>
                          )}

                          {showLayerControlsCol && (
                          <div className="structure-grid__cell" role="cell">
                            {showInkControlsCol
                              ? renderInkControlsCell(idx, layer)
                              : canEditLayerStructure(layer) && (
                              <div className="flex items-center gap-0.5">
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
                                    className="p-1 text-[10px] text-accent-text hover:text-accent"
                                    onClick={() => setFormulaModalLayerId(layer.id)}
                                    title="Lamination formula"
                                  >
                                    {laminationRecipeOverrides[layer.id] ? 'F*' : 'F'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                      ))}
                      {needsSolventMix && (
                        <>
                          {solventConfigBar && (
                            <div className="structure-grid__row bg-warning/10" role="row">
                              <div
                                className="structure-grid__cell py-2"
                                style={{ gridColumn: '1 / -1' }}
                                role="cell"
                              >
                                {solventConfigBar}
                              </div>
                            </div>
                          )}
                          <div className="structure-grid__row bg-warning/10" role="row">
                            <div className="structure-grid__cell" role="cell" />
                            <div className="structure-grid__cell" role="cell">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-warning/20 text-warning">Solvent</span>
                            </div>
                            <div className="structure-grid__cell text-mist text-xs" role="cell">—</div>
                            <div className="structure-grid__cell" role="cell">
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
                            </div>
                            <div className="structure-grid__cell text-mist text-[10px]" role="cell">—</div>
                            <div className="structure-grid__cell text-mist" role="cell">—</div>
                            {showStructureCosts && (
                              <>
                                <div className="structure-grid__cell font-mono text-[11px] font-semibold text-navy tabular-nums" role="cell">
                                  {usdToDisplayPrecise(solventTotalPerKgUsd, fxRate).toFixed(4)}
                                </div>
                                <div className="structure-grid__cell font-mono text-[11px] font-semibold text-navy tabular-nums" role="cell">
                                  {usdToDisplayPrecise(solventTotalPerM2Usd, fxRate).toFixed(4)}
                                </div>
                              </>
                            )}
                            {showLayerControlsCol && <div className="structure-grid__cell" role="cell" />}
                          </div>
                          {solventDetailsExpanded &&
                            solventCostLines.map((line) => (
                              <div key={line.key} className="structure-grid__row bg-slate/30" role="row">
                                <div className="structure-grid__cell" role="cell" />
                                <div className="structure-grid__cell" role="cell" />
                                <div className="structure-grid__cell" role="cell" />
                                <div className="structure-grid__cell pl-4 text-[11px] text-mist truncate" role="cell">{line.label}</div>
                                <div className="structure-grid__cell text-mist text-[10px]" role="cell">—</div>
                                <div className="structure-grid__cell text-mist" role="cell">—</div>
                                {showStructureCosts && (
                                  <>
                                    <div className="structure-grid__cell font-mono text-[11px] tabular-nums" role="cell">
                                      {usdToDisplayPrecise(line.perKgUsd, fxRate).toFixed(4)}
                                    </div>
                                    <div className="structure-grid__cell font-mono text-[11px] tabular-nums" role="cell">
                                      {usdToDisplayPrecise(line.perM2Usd, fxRate).toFixed(4)}
                                    </div>
                                  </>
                                )}
                                {showLayerControlsCol && <div className="structure-grid__cell" role="cell" />}
                              </div>
                            ))}
                        </>
                      )}
                    <div className="structure-grid__row border-t-2 border-border bg-slate/40" role="row">
                      <div className="structure-grid__cell py-3" role="cell" />
                      <div className="structure-grid__cell py-3" role="cell" />
                      <div className="structure-grid__cell py-3" role="cell" />
                      <div className="structure-grid__cell py-3 text-xs font-bold text-navy" role="cell">
                        Total
                      </div>
                      <div
                        className="structure-grid__cell structure-grid__cell--col-center py-3"
                        title="Total structure (µ) — substrate µ + ink/adhesive dry gsm ÷ density."
                        role="cell"
                      >
                        <span className="font-mono text-xs font-bold text-navy tabular-nums">
                          {totalConstructionMicron != null && totalConstructionMicron > 0
                            ? `${formatMicronDisplay(totalConstructionMicron)} µ`
                            : '—'}
                        </span>
                      </div>
                      <div className="structure-grid__cell py-3 font-mono text-xs font-bold text-navy tabular-nums" role="cell">
                        {totalGsm.toFixed(2)}
                      </div>
                      {showStructureCosts && (
                        <>
                          <div className="structure-grid__cell py-3 font-mono text-[11px] font-bold text-navy tabular-nums" role="cell">
                            {rmTotals
                              ? usdToDisplayPrecise(rmTotals.rmPerKg, fxRate).toFixed(4)
                              : '—'}
                          </div>
                          <div className="structure-grid__cell py-3 font-mono text-[11px] font-bold text-navy tabular-nums" role="cell">
                            {rmTotals
                              ? usdToDisplayPrecise(rmTotals.rmPerM2, fxRate).toFixed(4)
                              : '—'}
                          </div>
                        </>
                      )}
                      {showLayerControlsCol && <div className="structure-grid__cell py-3" role="cell" />}
                    </div>
                  </div>
                </div> {/* end hidden md:block */}

                <div className="hidden md:block xl:hidden border-t border-border bg-surface-raised px-4 py-3">
                  <FilmStackVisualizer
                    layers={visualizerLayers}
                    totalMicron={totalConstructionMicron}
                    className="w-full"
                    displayCurrency={displayCurrencyLabel}
                    showContrib={showStructureCosts}
                  />
                </div>
                  </div> {/* end table column — self-sized, no stretch gap */}

                  <div
                    className="hidden xl:block overflow-hidden bg-surface-raised border-l border-border"
                    style={
                      structureTableHeight != null
                        ? { height: structureTableHeight, maxHeight: structureTableHeight }
                        : undefined
                    }
                  >
                    <FilmStackVisualizer
                      layers={visualizerLayers}
                      totalMicron={totalConstructionMicron}
                      className="h-full w-full"
                      displayCurrency={displayCurrencyLabel}
                      showContrib={showStructureCosts}
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

              {/* Template quotes: processes come from the template — no panel.
                  Scratch builds: user must pick steps here before slabs/pricing. */}
              {!structureLocked && (
                <EstimateProcessesPanel
                  processes={processesState}
                  processOptions={masterReference.processOptions}
                  layerCount={layers.length}
                  hint="Define which manufacturing steps apply to this job before quantity slabs and pricing."
                  onChange={(rows) => setProcessesState(normalizeLoadedProcesses(rows))}
                  isCustomized={estimate?.processesCustomized ?? true}
                  structureForked={estimate?.structureForked ?? false}
                  onCustomize={handleCustomizeProcesses}
                />
              )}

              {clientCalcResult && (
                <div className="card space-y-5">
                  <SectionTitle
                    as="h3"
                    className="font-display font-semibold text-navy"
                    hint="Per-kg structure yields and the order quantity expressed in every unit. LM is the finished reel running length."
                  >
                    Production Summary
                  </SectionTitle>

                  {/* Yield factors — per-kg rates first, then the structure descriptors */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-mist mb-2">Yield Factors</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {statTile('Area Yield', fmtQty(yieldSqmPerKg, 4), 'm²/kg', 'Square metres of web per kilogram (1000 ÷ GSM)')}
                      {statTile('Length Yield', fmtQty(orderQtyMetrics.lmPerKgReel, 4), 'LM/kg', 'Finished reel running metres per kilogram (m²/kg ÷ reel width)')}
                      {statTile('Piece Yield', fmtQty(orderQtyMetrics.piecesPerKg, 4), 'pcs/kg', 'Finished pieces per kilogram (needs reel width, cut-off, pieces/cut)')}
                      {statTile('Piece Weight', fmtQty(orderQtyMetrics.gramsPerPiece, 4), 'g', 'Grams of film per finished piece')}
                      {can('filmDensity') && statTile('Total Thickness', formatMicronDisplay(totalConstructionMicron), 'µ', 'Total film thickness (substrate µ + ink/adhesive dry gsm ÷ density)')}
                      {statTile('Total GSM', fmtQty(totalGsm, 2), 'gsm')}
                      {can('filmDensity') && statTile('Average Density', structureDensity, 'g/cm³', 'GSM ÷ thickness µ')}
                    </div>
                  </div>

                  {/* Order totals — same structure, every unit */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-mist mb-2">Order Totals</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {statTile('Total Weight', fmtQty(orderQtyMetrics.kg, 2), 'kg')}
                      {statTile('Total Pieces', fmtQty(orderQtyMetrics.pieces, 0), 'pcs', 'Total finished pieces for the order')}
                      {statTile('Total Area', fmtQty(orderQtyMetrics.sqm, 2), 'm²')}
                      {statTile('Total Length', fmtQty(orderQtyMetrics.lm, 2), 'LM', 'Finished reel running length')}
                    </div>
                  </div>

                  {(() => {
                    const isRollSleeve = productFamily === 'roll' || productFamily === 'sleeve';
                    const missingLm = isRollSleeve && orderQtyMetrics.lmPerKgReel == null;
                    const missingPieces =
                      orderQtyMetrics.piecesPerKg == null &&
                      (productFamily === 'pouch' ||
                        productFamily === 'bag' ||
                        (isRollSleeve && structureHasPrinting));
                    if (!missingLm && !missingPieces) return null;
                    let msg = 'Set the product dimensions in Job details.';
                    if (missingLm && missingPieces) {
                      msg =
                        'Piece and length yield need reel width, cut-off and pieces/cut — set them in Job details.';
                    } else if (missingLm) {
                      msg = 'Length yield needs reel width — set it in Job details.';
                    } else if (isRollSleeve && structureHasPrinting) {
                      msg =
                        'Piece yield needs reel width, cut-off and pieces/cut — set them in Job details.';
                    } else if (productFamily === 'pouch' || productFamily === 'bag') {
                      msg = 'Piece yield needs width, height and gussets — set them in Job details.';
                    }
                    return <p className="text-[11px] text-warning">{msg}</p>;
                  })()}
                </div>
              )}

              {can('rmCostPerKg') && rmTotals && (
                <div className="card space-y-4">
                  <SectionTitle
                    as="h3"
                    className="font-display font-semibold text-navy"
                    hint="Raw-material cost per unit."
                  >
                    Material cost
                  </SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {statTile('RM cost', `${estimate?.displayCurrency || 'USD'} ${usdToDisplayPrecise(rmTotals.rmPerKg, fxRate).toFixed(2)}`, '/kg')}
                    {(can('costPerSqm') || can('rmCostPerKg')) && rmTotals.rmPerM2 > 0 &&
                      statTile('RM cost', `${estimate?.displayCurrency || 'USD'} ${usdToDisplayPrecise(rmTotals.rmPerM2, fxRate).toFixed(4)}`, '/m²')}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Price list — unit / slabs / currency, selling price in selected unit only */}
          {!hidePriceListTab && activeSection === 'slabs' && (
            clientCalcResult ? (
              (() => {
                const ce = clientCalcResult.estimate;
                const gsmLocal = ce.totalGsm ?? totalGsm ?? 0;
                const piecesPerKg = orderQtyMetrics.piecesPerKg;
                const lmPerKg = orderQtyMetrics.lmPerKgReel;
                const rollLengthLm = Number(dimensions?.orderUnitMultiplier) || 0;
                const widthM = (dimensions?.reelWidthMm ?? 0) / 1000;
                const canLm =
                  allowedUnitBases.has('lm') &&
                  ((lmPerKg != null && lmPerKg > 0) || (gsmLocal > 0 && widthM > 0));
                const canPieces =
                  allowedUnitBases.has('pieces') && piecesPerKg != null && piecesPerKg > 0;
                const priceListUnits: PriceListUnit[] = ['kg'];
                if (gsmLocal > 0 && allowedUnitBases.has('sqm')) priceListUnits.push('m2');
                if (canLm) priceListUnits.push('lm');
                if (canLm && requiresRollLength && rollLengthLm > 0) priceListUnits.push('roll');
                if (canPieces) {
                  priceListUnits.push('pc');
                  priceListUnits.push('kpcs');
                }
                return (
                  <PriceListPanel
                    wasteBands={wasteBands}
                    materialPerKgUsd={ce.materialCostPerKg ?? 0}
                    logisticsPerKgUsd={ce.logisticsCostPerKg ?? 0}
                    developmentPerKgUsd={ce.developmentCostPerKg ?? 0}
                    accessoryPerKgUsd={ce.accessoryCostPerKg ?? 0}
                    pricingMethod={pricingMethod}
                    markupPercent={markupPercent}
                    marginValuePerKgDisplay={marginValuePerKgUsd}
                    estimateFxRate={fxRate}
                    estimateDisplayCurrency={estimate?.displayCurrency || 'USD'}
                    totalGsm={gsmLocal}
                    piecesPerKg={piecesPerKg}
                    lmPerKgReel={lmPerKg}
                    reelWidthMm={dimensions?.reelWidthMm ?? 0}
                    rollLengthLm={rollLengthLm}
                    availableUnits={priceListUnits}
                    operatingCostMethod={tenant?.operatingCostMethod}
                    baseCormDisplay={baseCormDisplay}
                    cormScaleWithWaste={cormScaleWithWaste}
                    moqKg={moqKg}
                  />
                );
              })()
            ) : (
              <div className="card">
                <p className="text-sm text-mist">Add layers with materials to see the price list.</p>
              </div>
            )
          )}

        </div>

        {/* Pricing panels — Selling price + Cost breakdown hidden on Price list. */}
        {(activeSection !== 'slabs' || MES_OUTCOME_ENABLED || proposals.length > 0) && (
        <div className="mt-8 pt-8 border-t border-border">
          {activeSection !== 'slabs' && (
          <div
            className={`grid grid-cols-1 gap-6 items-stretch ${
              can('costBreakdown') ? 'lg:grid-cols-2' : ''
            }`}
          >
            <div
              className="card border-accent/30 h-full min-w-0 flex flex-col"
              style={{
                background:
                  'linear-gradient(135deg, rgb(var(--color-accent-soft)) 0%, rgb(var(--color-surface-raised)) 70%)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <h3 className="font-display font-semibold text-brand shrink-0">Selling price</h3>
              <div className="mt-3 flex-1 min-h-0 flex flex-col justify-between items-start font-display font-bold text-lg text-accent-text tabular tracking-tight text-left leading-snug">
                {sellingPricesByUnit.map((row) => (
                  <p key={row.text} title={row.title}>
                    {row.text}
                  </p>
                ))}
              </div>
            </div>

            {can('costBreakdown') && (
              <div className="card h-full min-w-0">
                <h3 className="font-display font-semibold text-brand mb-4">Cost breakdown</h3>
                {(() => {
                  const ce = clientCalcResult?.estimate;
                  const cur = estimate?.displayCurrency || 'USD';
                  const gsmLocal = ce?.totalGsm ?? totalGsm ?? 0;
                  const widthM = (dimensions?.reelWidthMm ?? 0) / 1000;
                  const rollLengthLm = Number(dimensions?.orderUnitMultiplier) || 0;
                  const showM2 = gsmLocal > 0;
                  const showLm = allowedUnitBases.has('lm') && widthM > 0;
                  // Per-roll column only when Roll (custom length) is selected and length is set.
                  const showRoll = requiresRollLength && rollLengthLm > 0 && showLm;
                  const m2ToKg = (v: number) => (gsmLocal > 0 ? (v / gsmLocal) * 1000 : 0);
                  const kgToM2 = (v: number) => (showM2 ? v * (gsmLocal / 1000) : 0);
                  const m2ToLm = (v: number) => (showLm ? v * widthM : 0);
                  const m2ToRoll = (v: number) => (showRoll ? m2ToLm(v) * rollLengthLm : 0);
                  const fmtKg = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(2);
                  const fmtM2 = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(4);
                  const fmtLm = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(4);
                  const fmtRoll = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(2);

                  // Per-family raw-material split (per m²) from the current layer stack.
                  let subM2 = 0, inkAdhM2 = 0, pkgM2 = 0;
                  for (const l of layers) {
                    const mat = materials.find((m) => m.id === l.materialId);
                    const fam = (mat?.substrateFamily ?? '').toLowerCase();
                    const t = (l.materialType || mat?.type || 'substrate') as string;
                    const lineM2 = ((l.gsm || 0) / 1000) * (l.costPerKgUsd || 0);
                    if (t === 'substrate') {
                      if (fam === 'packaging') pkgM2 += lineM2; else subM2 += lineM2;
                    } else if (t === 'ink' || t === 'adhesive') {
                      inkAdhM2 += lineM2;
                    }
                  }
                  inkAdhM2 += solventTotalPerM2Usd; // Ink, Solvent, Adhesive & Coating family

                  const substratesKg = m2ToKg(subM2);
                  const inkAdhKg = m2ToKg(inkAdhM2);
                  const packagingKg = m2ToKg(pkgM2);
                  const materialNoWasteKg = ce?.materialCostPerKg ?? (substratesKg + inkAdhKg + packagingKg);
                  const totalRmKg = ce?.wasteAdjustedMaterialPerKg ?? materialNoWasteKg;
                  const wasteKg = Math.max(0, totalRmKg - materialNoWasteKg);
                  const wastePct = ce?.wastePercentApplied ?? 0;
                  const baseM2 = subM2 + inkAdhM2 + pkgM2;
                  const wasteM2 = baseM2 * (wastePct / 100);
                  const totalRmM2 = baseM2 + wasteM2;

                  // Manufacturing & Operating — resolved by the tenant method.
                  const processSumPerKgUsd = (processesState ?? [])
                    .filter((p: any) => p.enabled !== false)
                    .reduce((sum: number, p: any) => {
                      const qty = Math.max(1, Number(p.processQuantity) || 1);
                      return sum + resolveProcessPerKgUsd(p, processCostCatalog) * qty;
                    }, 0);
                  const mfgOpKg = ce?.operationCostPerKg ?? processSumPerKgUsd;
                  const prepressKg = ce?.developmentCostPerKg ?? 0;
                  const transportKg = ce?.logisticsCostPerKg ?? 0;
                  const accessoryKg = ce?.accessoryCostPerKg ?? 0;
                  const saleKg = ce?.salePricePerKg ?? Number(estimate?.salePricePerKg) ?? 0;

                  type CostRow = { label: string; kgVal: number; m2Val?: number; strong?: boolean; show?: boolean };
                  const rows: CostRow[] = [
                    { label: 'Substrates', kgVal: substratesKg, m2Val: subM2 },
                    { label: 'Ink, Solvent, Adhesive & Coating', kgVal: inkAdhKg, m2Val: inkAdhM2 },
                    { label: 'Waste', kgVal: wasteKg, m2Val: wasteM2 },
                    { label: 'Packaging', kgVal: packagingKg, m2Val: pkgM2, show: packagingKg > 0 },
                    { label: 'Total RM', kgVal: totalRmKg, m2Val: totalRmM2, strong: true },
                    { label: 'Manufacturing & Operating', kgVal: mfgOpKg, m2Val: kgToM2(mfgOpKg) },
                    { label: 'PrePress', kgVal: prepressKg, m2Val: kgToM2(prepressKg), show: prepressKg > 0 },
                    { label: 'Transportation', kgVal: transportKg, m2Val: kgToM2(transportKg), show: transportKg > 0 },
                    { label: 'Accessories', kgVal: accessoryKg, m2Val: kgToM2(accessoryKg), show: accessoryKg > 0 },
                    { label: 'Selling price', kgVal: saleKg, m2Val: kgToM2(saleKg), strong: true },
                  ];

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-xs font-medium text-mist"> </th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap">{cur} / kg</th>
                            {showM2 && <th className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap">{cur} / m²</th>}
                            {showLm && <th className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap">{cur} / LM</th>}
                            {showRoll && (
                              <th
                                className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap"
                                title={`Per roll of ${rollLengthLm} LM`}
                              >
                                {cur} / roll
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rows
                            .filter((r) => r.show !== false)
                            .map((r, i) => (
                              <tr
                                key={r.label}
                                className={`${r.strong ? 'border-t border-border' : ''} ${i % 2 === 1 ? 'bg-slate/40' : ''}`}
                              >
                                <td className={`py-2 px-3 ${r.strong ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                                  {r.label}
                                </td>
                                <td className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}>
                                  {fmtKg(r.kgVal)}
                                </td>
                                {showM2 && (
                                  <td className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}>
                                    {fmtM2(r.m2Val ?? 0)}
                                  </td>
                                )}
                                {showLm && (
                                  <td className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}>
                                    {fmtLm(m2ToLm(r.m2Val ?? 0))}
                                  </td>
                                )}
                                {showRoll && (
                                  <td className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}>
                                    {fmtRoll(m2ToRoll(r.m2Val ?? kgToM2(r.kgVal)))}
                                  </td>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
          )}

          {(MES_OUTCOME_ENABLED || proposals.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {MES_OUTCOME_ENABLED && (
                <div className="card">
                  <SectionTitle
                    as="h4"
                    className="font-display font-semibold text-navy mb-3"
                    hint="Track if the customer accepted or declined — only if you use this for reporting."
                  >
                    Outcome
                  </SectionTitle>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => changeStatus('won')} className="btn-success flex-1">Mark Won</button>
                    <button type="button" onClick={() => changeStatus('lost')} className="btn-danger flex-1">Mark Lost</button>
                  </div>
                  <div className="mt-3 text-sm text-mist">
                    Current: <strong>{estimateStatusLabel(estimate?.status)}</strong>
                  </div>
                </div>
              )}

              {proposals.length > 0 && !isPriceCheck && (
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
            </div>
          )}
        </div>
        )}
      </div>

      {/* Mobile sticky price bar — hidden on Price list (same as desktop panels). */}
      {activeSection !== 'slabs' && (
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-surface-raised border-t border-border px-4 py-3 z-50 shadow-lg safe-area-pb">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <p className="eyebrow leading-none">Selling price</p>
            <p className="text-xl font-display font-bold text-accent-text tabular mt-1">
              <NumberTicker
                value={displaySalePrice}
                durationMs={600}
                decimals={2}
                prefix={`${estimate?.displayCurrency || 'USD'} `}
                suffix="/kg"
              />
            </p>
          </div>
          {!readOnly && (
            <button onClick={handleSaveFinal} disabled={saving} className="btn-primary px-4 py-2 text-sm min-h-[48px]">
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
      )}
      </fieldset>

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
                onFocus={selectOnFocus}
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

