import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  configuratorTypeForBagSubtype,
  seedBagDimensionPatch,
  canonicalBagSubtype,
} from '../../../lib/bagConfiguratorCatalog';
import {
  configuratorTypeForPouchSubtype,
  seedPouchDimensionPatchForSubtype,
  canonicalPouchSubtype,
} from '../../../lib/pouchConfiguratorCatalog';
import { seedRollDimensionPatch, isLabelsRollContext, defaultOrderQuantityUnit } from '../../../lib/rollConfiguratorCatalog';
import { seedSleeveDimensionPatch } from '../../../lib/sleeveConfiguratorCatalog';
import { apiClient } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { runClientCalculation } from '../../../lib/estimateCalc';
import { buildRmTotals } from '../costSummaryMetrics';
import {
  DEFAULT_PROFIT_MARGIN_PERCENT,
  DEFAULT_LOAD_PER_PALLET_KG,
  DEFAULT_CARTONS_PER_PALLET,
  DEFAULT_PCS_PER_CARTON,
  mergePackagingConfigDefaults,
  mergeConsumablesConfigDefaults,
  type OperatingCostMethod,
  type PackagingConfig,
  type ConsumablesConfig,
} from '@es/engine';
import { useStructureProcessFork } from './useStructureProcessFork';
import { usdToDisplay, usdToDisplayPrecise } from '../../../lib/currency';
import { useBeforeUnloadGuard } from '../../../hooks/useBeforeUnloadGuard';
import { useVisibilityProfile } from '../../../hooks/useVisibilityProfile';
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
} from '../../../lib/estimateConfigure';
import { setWorkingEstimateForTemplate } from '../../../lib/estimateSession';
import { useEstimateEditorDerived } from './useEstimateEditorDerived';
import {
  DEFAULT_PRODUCT_TYPE_OPTIONS,
  DEFAULT_UNIT_OPTIONS,
  LEGACY_UNIT_BASIS,
  isExwDelivery,
} from '../constants';
import type {
  MaterialItem,
  LayerItem,
  DimensionState,
  EstimateEditorProps,
} from '../types';
import { normalizeToolingScenario, toolingDevelopmentTotal } from '../../../lib/tooling';
import { meaningfulRequotePriceChanges } from '../../../lib/requote';
import { groupMaterialsForPicker, type CategoryNode } from '../../../lib/materialTaxonomy';
import { stackNeedsSolventMix, stackHasSbInk, stackHasSleeveSubstrate, defaultInkPrintingProcess, inkSolventRatioForProcess, materialAllowedForTemplateLayer, DEFAULT_CLEANING_SOLVENT_KG_PER_JOB, DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM, DEFAULT_WASTE_BANDS_BY_PRINT_MODE, DEFAULT_CORM_SCALE_WITH_WASTE, structureIsPrinted, wasteBandsForPrintMode, plainCormFromPrinted, layerPhysicalThicknessMicron, type LaminationRecipe, type InkPrintingProcess, type PouchAccessorySelection, type WasteBand } from '@es/engine';
import { useMasterDataReference } from '../../../hooks/useMasterDataReference';
import { useMaterialsContextOptional } from '../../../contexts/MaterialsContext';
import {
  defaultUnitValue,
  normalizeProductType,
  normalizeUnitValue,
} from '../../../lib/masterDataReference';
import {
  findDefaultSolventMaterialId,
  listSolventMaterials,
  resolveSolventCostPerKgUsd,
} from '../../../lib/solvent';
import { resolveSeamingSolventCostPerKgUsd } from '../../../lib/seaming-solvent';
import {
  dimensionFieldsForEstimation,
  subtypesForFamily,
  defaultSubtypeForFamily,
  engineTypeForFamily,
  ALL_SUBTYPES,
  POUCH_SUBTYPES,
  PRODUCT_FAMILY_LABELS,
  type ProductFamily,
} from '../../../lib/productCatalog';

export type EstimateEditorControllerGate =
  | { phase: 'loading' }
  | { phase: 'error'; loadError: string; id: string; returnTo: string; onRetry: () => void }
  | { phase: 'missing' };

export type EstimateEditorControllerReady = {
  phase: 'ready';
  PRODUCT_FAMILY_LABELS: any;
  accessories: any;
  accessoryMaterialOptions: any;
  activeSection: any;
  addLayerOfType: any;
  addLayerSheetOpen: any;
  adhesiveLayerCount: any;
  allowedUnitBases: any;
  availableSubtypes: any;
  availableUnitOptions: any;
  bagConfiguratorActive: any;
  baseCormDisplay: any;
  billableColorCount: any;
  brand: any;
  can: any;
  canConfigureSolvent: any;
  canEditLayerStructure: any;
  canOverrideOperatingCostMethod: any;
  centeredStructureColKeys: any;
  changeStatus: any;
  clientCalcResult: any;
  colorsDriveTooling: any;
  configuratorTypeForBagSubtype: any;
  configuratorTypeForPouchSubtype: any;
  consumablesTotalPerKgUsd: any;
  consumablesTotalPerM2Usd: any;
  cormScaleWithWaste: any;
  costPerColor: any;
  costingBlocksProps: any;
  customerId: any;
  defaultOrderQuantityUnit: any;
  defaultSubtypeForFamily: any;
  deliveryChargeUsd: any;
  deliveryTerm: any;
  densityForMaterial: any;
  dimensionHints: any;
  dimensions: any;
  displayCurrencyLabel: any;
  displaySalePrice: any;
  downloadProposalPdf: any;
  downloadStoredProposal: any;
  dragFromIndex: any;
  dragHoverIndex: any;
  editingLayer: any;
  editorError: any;
  effectiveToolingDisplay: any;
  embedded: any;
  estimate: any;
  estimationDimensionFields: any;
  formulaModalLayer: any;
  formulaModalLayerId: any;
  formulaModalRecipe: any;
  fxRate: any;
  goToSection: any;
  handleCancel: any;
  handleCustomizeProcesses: any;
  handleRequote: any;
  handleSaveAsTemplate: any;
  handleSaveDraft: any;
  handleSaveFinal: any;
  handleSnapBack: any;
  hideEstimateRef: any;
  hidePriceListTab: any;
  isDirty: any;
  isLabelsRoll: any;
  isPriceCheck: any;
  jobName: any;
  laminationRecipeOverrides: any;
  layerSheetOpen: any;
  layers: any;
  leaveConfirmOpen: any;
  loadBaseData: any;
  loadError: any;
  marginValuePerKgUsd: any;
  markupPercent: any;
  masterReference: any;
  materials: any;
  maxAdhesives: any;
  maxSubstrates: any;
  mobileStackOpen: any;
  moqKg: any;
  multiOnQuote: any;
  navigate: any;
  needsConfiguration: any;
  normalizeLoadedProcesses: any;
  normalizeUnitValue: any;
  onSaved: any;
  openLayerEdit: any;
  operatingCostMethod: any;
  orderQtyMetrics: any;
  orderQuantity: any;
  orderQuantityHint: any;
  orderQuantityUnit: any;
  packagingTotalPerKgUsd: any;
  packagingTotalPerM2Usd: any;
  pendingTemplateName: any;
  processesStale: any;
  processesConfirmOpen: any;
  pendingProcesses: any;
  setPendingProcesses: any;
  processesDiffLines: any;
  confirmProcesses: any;
  cancelProcessesConfirm: any;
  rederiveFromStructure: any;
  clientStructureForked: any;
  clientProcessesCustomized: any;
  pouchConfiguratorActive: any;
  priceChanges: any;
  pricingMethod: any;
  printColorCount: any;
  processesState: any;
  productFamily: any;
  productSubtype: any;
  productTypeOptions: any;
  profitMarginPercent: any;
  proposals: any;
  readOnly: any;
  renderInkControlsCell: any;
  renderMaterialOptions: any;
  reorderLayers: any;
  requiresRollLength: any;
  requoteWarnings: any;
  returnTo: any;
  rmTotals: any;
  rollConfiguratorActive: any;
  runSnapBack: any;
  saveNotice: any;
  saving: any;
  seedBagDimensionPatch: any;
  seedPouchDimensionPatchForSubtype: any;
  sellingPricesByUnit: any;
  setAccessories: any;
  setAddLayerSheetOpen: any;
  setBillableColorCount: any;
  setBrand: any;
  setCormPerKgPlain: any;
  setCormPerKgUsd: any;
  setCostPerColor: any;
  setCustomerDraftName: any;
  setCustomerId: any;
  setDeliveryChargeUsd: any;
  setDeliveryTerm: any;
  setDimensions: any;
  setDragFromIndex: any;
  setDragHoverIndex: any;
  setEditingLayerId: any;
  setEditorError: any;
  setFormulaModalLayerId: any;
  setJobName: any;
  setLaminationRecipeOverrides: any;
  setLayerSheetOpen: any;
  setLayers: any;
  setLeaveConfirmOpen: any;
  setMarkupPercent: any;
  setMobileStackOpen: any;
  setOperatingCostMethodOverride: any;
  setOrderQuantity: any;
  setOrderQuantityUnit: any;
  setPriceChanges: any;
  setPrintColorCount: any;
  setProcessesState: any;
  setProductSubtype: any;
  setProductType: any;
  setProfitMarginPercent: any;
  setSaveNotice: any;
  setSnapBackConfirmOpen: any;
  setSpecsCode: any;
  setTemplateOpenConfirmOpen: any;
  setTemplatePromptOpen: any;
  setToolingBillingMode: any;
  setToolingChargeUsd: any;
  setToolingScenario: any;
  showInkControlsCol: any;
  showLayerControlsCol: any;
  showStructureCosts: any;
  skuLabel: any;
  setSkuLabel: any;
  sleeveConfiguratorActive: any;
  snapBackConfirmOpen: any;
  solventTotalPerM2Usd: any;
  specsCode: any;
  stackLabel: any;
  structureColumns: any;
  structureDensity: any;
  structureGridStyle: any;
  structureHasPrinting: any;
  structureLocked: any;
  structureMetrics: any;
  structureTableHeight: any;
  structureTableRef: any;
  submitSaveAsTemplate: any;
  substrateLayerCount: any;
  templateClassification: any;
  templateCormRef: any;
  templateOpenConfirmOpen: any;
  templatePromptOpen: any;
  tenant: any;
  tenantMarkupPercent: any;
  tenantOperatingCostMethod: any;
  tenantProfitMarginPercent: any;
  toolingBillingMode: any;
  toolingChargeUsd: any;
  toolingScenario: any;
  totalConstructionMicron: any;
  totalGsm: any;
  unitOptions: any;
  visualizerLayers: any;
  wasteBands: any;
  wastePrintMode: any;
  webConfiguratorActive: any;
  yieldSqmPerKg: any;
};

export type EstimateEditorControllerResult =
  | EstimateEditorControllerGate
  | EstimateEditorControllerReady;


export function useEstimateEditorController({
  embedded = false,
  estimateIdOverride,
  backTo,
  hideEstimateRef = false,
  readOnly = false,
  priceCheckMode: priceCheckModeProp = false,
  hidePriceListTab: hidePriceListTabProp,
  multiOnQuote = false,
  onSaved,
}: EstimateEditorProps = {}): EstimateEditorControllerResult {
  const hidePriceListTab = hidePriceListTabProp ?? embedded;
  const { id: routeId } = useParams<{ id: string }>();
  const id = estimateIdOverride ?? routeId;
  const { user, tenant } = useAuth();
  const [tenantOperatingCostMethod, setTenantOperatingCostMethod] = useState<
    OperatingCostMethod | undefined
  >(tenant?.operatingCostMethod);
  /** Null = follow tenant setting; set = estimate-scoped override. */
  const [operatingCostMethodOverride, setOperatingCostMethodOverride] =
    useState<OperatingCostMethod | null>(null);
  const [tenantProfitMarginPercent, setTenantProfitMarginPercent] = useState(
    DEFAULT_PROFIT_MARGIN_PERCENT
  );
  const [tenantMarkupPercent, setTenantMarkupPercent] = useState(15);
  const [profitMarginPercent, setProfitMarginPercent] = useState(DEFAULT_PROFIT_MARGIN_PERCENT);
  /** Template CoRM snapshot at load — restore when clearing method override. */
  const templateCormRef = useRef<{ printed: number; plain: number }>({ printed: 0, plain: 0 });
  const operatingCostMethod: OperatingCostMethod =
    operatingCostMethodOverride ?? tenantOperatingCostMethod ?? 'markup_over_rm';
  const { can } = useVisibilityProfile(user?.role);
  const canOverrideOperatingCostMethod =
    user?.role === 'platform_admin' ||
    user?.role === 'tenant_admin' ||
    can('overrideOperatingCostMethod');
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
  const [sleeveSeamingSolventGsm, setSleeveSeamingSolventGsm] = useState(
    DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM
  );
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
  const [editorError, setEditorError] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [snapBackConfirmOpen, setSnapBackConfirmOpen] = useState(false);
  const [templatePromptOpen, setTemplatePromptOpen] = useState(false);
  const [templateOpenConfirmOpen, setTemplateOpenConfirmOpen] = useState(false);
  const [pendingTemplateName, setPendingTemplateName] = useState('');
  const [cleanSnapshot, setCleanSnapshot] = useState<string | null>(null);
  const [solventDetailsExpanded, setSolventDetailsExpanded] = useState(false);
  const [packagingDetailsExpanded, setPackagingDetailsExpanded] = useState(false);
  const [consumablesDetailsExpanded, setConsumablesDetailsExpanded] = useState(false);
  const [packagingConfig, setPackagingConfig] = useState<PackagingConfig>(() =>
    mergePackagingConfigDefaults({
      loadPerPalletKg: DEFAULT_LOAD_PER_PALLET_KG,
      cartonsPerPallet: DEFAULT_CARTONS_PER_PALLET,
      pcsPerCarton: DEFAULT_PCS_PER_CARTON,
    })
  );
  const [consumablesConfig, setConsumablesConfig] = useState<ConsumablesConfig>(() =>
    mergeConsumablesConfigDefaults(null)
  );
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

  const processFork = useStructureProcessFork({
    layers,
    materials,
    productType,
    productTypeOptions: masterReference.productTypeOptions ?? [],
    materialClass: (templateClassification?.materialClass as 'PE' | 'Non PE' | undefined) ?? null,
    estimate,
    processCostCatalog,
    processOptions: masterReference.processOptions ?? [],
    processesState,
    setProcessesState: (rows) => setProcessesState(rows),
    normalizeLoadedProcesses,
    readOnly,
    ready: !loading && Boolean(estimate?.id),
  });
  const {
    structureLocked,
    structureForked: clientStructureForked,
    processesCustomized: clientProcessesCustomized,
    processesStale,
    confirmOpen: processesConfirmOpen,
    pendingProcesses,
    setPendingProcesses,
    diffLines: processesDiffLines,
    confirmProcesses,
    cancelConfirm: cancelProcessesConfirm,
    rederiveFromStructure,
  } = processFork;

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
        type: m.type as 'substrate' | 'ink' | 'adhesive' | 'solvent',
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

  const hasSleeveSubstrate = useMemo(
    () => stackHasSleeveSubstrate(layerMaterialRefs, engineMaterials),
    [layerMaterialRefs, engineMaterials]
  );

  const showSolventCosting = needsSolventMix || hasSleeveSubstrate;

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
    'Ink : solvent parts on press. 1:1 = one part solvent per part dry ink (typical flexo). 1:2 = two parts solvent per part dry ink (typical roto). Makeup g/m² = ink GSM × solvent parts.';

  /** Estimators / admins — not sales-only profiles. */
  const canConfigureSolvent = can('solventMixCost') || can('markupPercent');

  const solventMaterialOptions = useMemo(() => listSolventMaterials(materials), [materials]);

  const resolvedSolventCostPerKgUsd = useMemo(() => {
    if (solventCostOverrideUsd != null && Number.isFinite(solventCostOverrideUsd)) {
      return solventCostOverrideUsd;
    }
    return resolveSolventCostPerKgUsd(materials, { solventMaterialId });
  }, [materials, solventMaterialId, solventCostOverrideUsd]);

  const resolvedSeamingSolventCostPerKgUsd = useMemo(
    () => resolveSeamingSolventCostPerKgUsd(materials),
    [materials]
  );

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
    if (id) return; // loaded estimate applies its own packagingConfig
    const cd = masterReference.costingDefaults;
    setPackagingConfig((prev) =>
      mergePackagingConfigDefaults({
        ...prev,
        loadPerPalletKg: cd?.loadPerPalletKg ?? prev.loadPerPalletKg,
        cartonsPerPallet: cd?.cartonsPerPallet ?? prev.cartonsPerPallet,
        pcsPerCarton: cd?.pcsPerCarton ?? prev.pcsPerCarton,
        ldWrapPasses: cd?.ldWrapPasses ?? prev.ldWrapPasses,
        ldWrapFilmWidthMm: cd?.ldWrapFilmWidthMm ?? prev.ldWrapFilmWidthMm,
        ldWrapGsm: cd?.ldWrapGsm ?? prev.ldWrapGsm,
        stretchWrapLayers: cd?.stretchWrapLayers ?? prev.stretchWrapLayers,
      })
    );
  }, [id, masterReference.costingDefaults]);

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

  // Pouch picker: always v4 catalog (ignore stale Master Data legacy names).
  // Bags/other families still prefer Master Data when present.
  const availableSubtypes: Array<{ code: string; label: string; parent: string; group?: string | null }> = (() => {
    if (productFamily === 'pouch') {
      return POUCH_SUBTYPES.map((s) => ({
        code: s.key,
        label: s.label,
        parent: s.family,
        group: s.group ?? null,
      }));
    }
    const mdSubtypes = (masterReference.productSubtypeOptions ?? []).filter((s) => s.parent === productFamily);
    if (mdSubtypes.length > 0) return mdSubtypes;
    return subtypesForFamily(productFamily).map((s) => ({
      code: s.key,
      label: s.label,
      parent: s.family,
      group: s.group ?? null,
    }));
  })();

  const subtypeParentByCode = new Map(
    (masterReference.productSubtypeOptions ?? []).map((s) => [s.code, s.parent])
  );

  useEffect(() => {
    setProductType((prev) => normalizeProductType(prev, productTypeOptions));
    setOrderQuantityUnit((prev) => normalizeUnitValue(prev, unitOptions));
  }, [productTypeOptions, unitOptions]);

  // Keep tenant M&O defaults current (AuthContext can lag after Settings save).
  useEffect(() => {
    if (tenant?.operatingCostMethod) {
      setTenantOperatingCostMethod(tenant.operatingCostMethod);
    }
  }, [tenant?.operatingCostMethod]);

  useEffect(() => {
    let cancelled = false;
    void apiClient
      .getSettings()
      .then((settings) => {
        if (cancelled) return;
        const method = settings.operatingCostMethod;
        if (
          method === 'process_per_kg' ||
          method === 'markup_over_rm' ||
          method === 'fixed_per_group'
        ) {
          setTenantOperatingCostMethod(method);
        }
        const profit = Number(settings.defaultProfitMarginPercent);
        if (Number.isFinite(profit)) {
          setTenantProfitMarginPercent(profit);
        }
        const markup = Number(settings.defaultMarkupPercent);
        if (Number.isFinite(markup)) {
          setTenantMarkupPercent(markup);
        }
      })
      .catch(() => {
        /* Auth tenant fallback remains */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      const patch = seedPouchDimensionPatchForSubtype(productSubtype, prev);
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

  // Keep editor materials in sync when MaterialsContext refreshes after PEBI/platform sync
  // (CatalogRefreshCoordinator) — do not wait for masterDataVersion bump alone.
  useEffect(() => {
    if (!materialsCache?.materials.length) return;
    setMaterials(materialsCache.materials as unknown as MaterialItem[]);
    if (materialsCache.categories) setCategories(materialsCache.categories);
  }, [materialsCache?.materials, materialsCache?.categories]);

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
      const plainRaw = (pe as { cormPerKgPlain?: string }).cormPerKgPlain;
      const plain =
        plainRaw != null && plainRaw !== ''
          ? parseFloat(plainRaw) || 0
          : plainCormFromPrinted(printed);
      setCormPerKgUsd(printed);
      setCormPerKgPlain(plain);
      templateCormRef.current = { printed, plain };
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
      {
        const method = data.operatingCostMethod;
        if (
          method === 'process_per_kg' ||
          method === 'markup_over_rm' ||
          method === 'fixed_per_group'
        ) {
          setOperatingCostMethodOverride(method);
        } else {
          setOperatingCostMethodOverride(null);
        }
        const profit =
          data.profitMarginPercent != null && data.profitMarginPercent !== ''
            ? Number(data.profitMarginPercent)
            : NaN;
        setProfitMarginPercent(
          Number.isFinite(profit) ? profit : tenantProfitMarginPercent
        );
      }
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
        const plain =
          data.cormPerKgPlain != null && data.cormPerKgPlain !== ''
            ? parseFloat(data.cormPerKgPlain) || 0
            : plainCormFromPrinted(printed);
        setCormPerKgUsd(printed);
        setCormPerKgPlain(plain);
        templateCormRef.current = { printed, plain };
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
      if (data.sleeveSeamingSolventGsm != null) {
        setSleeveSeamingSolventGsm(parseFloat(data.sleeveSeamingSolventGsm));
      } else {
        setSleeveSeamingSolventGsm(DEFAULT_SLEEVE_SEAMING_SOLVENT_GSM);
      }
      if (data.packagingConfig && typeof data.packagingConfig === 'object') {
        setPackagingConfig(mergePackagingConfigDefaults(data.packagingConfig as PackagingConfig));
      } else {
        const cd = masterReference.costingDefaults;
        setPackagingConfig(
          mergePackagingConfigDefaults({
            loadPerPalletKg: cd?.loadPerPalletKg,
            cartonsPerPallet: cd?.cartonsPerPallet,
            pcsPerCarton: cd?.pcsPerCarton,
            ldWrapPasses: cd?.ldWrapPasses,
            ldWrapFilmWidthMm: cd?.ldWrapFilmWidthMm,
            ldWrapGsm: cd?.ldWrapGsm,
            stretchWrapLayers: cd?.stretchWrapLayers,
          })
        );
      }
      if (data.consumablesConfig && typeof data.consumablesConfig === 'object') {
        setConsumablesConfig(
          mergeConsumablesConfigDefaults(data.consumablesConfig as ConsumablesConfig)
        );
      } else {
        setConsumablesConfig(mergeConsumablesConfigDefaults(null));
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
      operatingCostMethod: operatingCostMethodOverride,
      profitMarginPercent,
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
      sleeveSeamingSolventGsm: hasSleeveSubstrate ? sleeveSeamingSolventGsm : undefined,
      packagingConfig,
      consumablesConfig,
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
      structureForked: clientStructureForked,
      processesCustomized: clientProcessesCustomized,
      // New price check has no quote yet — server auto-creates parent with this flag.
      ...(isPriceCheck && !(estimate?.quoteId || quoteIdFromUrl) ? { isPriceCheck: true } : {}),
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
  }, [isPriceCheck, multiOnQuote, jobName, customerId, notes, estimate?.productType, estimate?.sourceTemplateKey, estimate?.quoteId, quoteIdFromUrl, productType, productTypeOptions, productSubtype, needsSolventMix, hasSleeveSubstrate, hasSbInk, effectiveInkPrintingProcess, effectiveInkSolventRatio, dimensions, accessories, productFamily, markupPercent, operatingCostMethodOverride, profitMarginPercent, platesPerKg, deliveryPerKg, pricingMethod, marginValuePerKgUsd, cormPerKgUsd, cormPerKgPlain, moqKg, toolingChargeUsd, skuLabel, brand, specsCode, printColorCount, costPerColor, toolingBillingMode, toolingScenario, billableColorCount, deliveryTerm, deliveryChargeUsd, solventMaterialId, resolvedSolventCostPerKgUsd, laminationRecipeOverrides, cleaningSolventKgPerJob, sleeveSeamingSolventGsm, packagingConfig, consumablesConfig, orderQuantity, orderQuantityUnit, layers, slabsState, processesState, clientStructureForked, clientProcessesCustomized]);

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
        productSubtype,
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
        seamingSolventCostPerKgUsd: hasSleeveSubstrate
          ? resolvedSeamingSolventCostPerKgUsd
          : undefined,
        laminationRecipeOverrides,
        cleaningSolventKgPerJob,
        sleeveSeamingSolventGsm: hasSleeveSubstrate ? sleeveSeamingSolventGsm : undefined,
        packagingConfig,
        consumablesConfig,
        inkPrintingProcess: hasSbInk ? effectiveInkPrintingProcess : undefined,
        printColorCount: printColorCount ?? undefined,
        inkSolventRatio: hasSbInk ? effectiveInkSolventRatio : undefined,
        pricingMethod,
        marginValuePerKgUsd,
        operatingCostMethod: operatingCostMethod ?? tenant?.operatingCostMethod ?? undefined,
        profitMarginPercent,
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
    loading, materials, layerInputsKey, productType, productSubtype, dimensions,
    markupPercent, platesPerKg, deliveryPerKg, slabQuantitiesKey,
    estimate?.displayCurrency, estimate?.exchangeRateUsdToDisplay,
    solventMaterialId, resolvedSolventCostPerKgUsd, resolvedSeamingSolventCostPerKgUsd, laminationRecipeOverrides, cleaningSolventKgPerJob,
    sleeveSeamingSolventGsm, packagingConfig, consumablesConfig, hasSleeveSubstrate, hasSbInk, effectiveInkPrintingProcess, effectiveInkSolventRatio, layers.length, accessories,
    orderQuantity, orderQuantityUnit, masterReference, wasteBands,
    pricingMethod, marginValuePerKgUsd, baseCormDisplay, cormScaleWithWaste, toolingChargeUsd,
    printColorCount, costPerColor, toolingBillingMode, toolingScenario, billableColorCount,
    deliveryTerm, deliveryChargeUsd,
    operatingCostMethod, tenant?.operatingCostMethod, profitMarginPercent, processesState,
  ]);

  const solventCostLines = useMemo(() => {
    const e = clientCalcResult?.estimate;
    if (!e || !showSolventCosting) return [];
    const lines: Array<{
      key: string;
      label: string;
      perKgUsd: number;
      perM2Usd: number;
      qty?: number | null;
      qtyUnit?: string;
      qtyHint?: string;
      calcHint?: string;
    }> = [];
    const fx = parseFloat(estimate?.exchangeRateUsdToDisplay) || 1;
    const cur = estimate?.displayCurrency || 'USD';
    const priceDisp = usdToDisplay(resolvedSolventCostPerKgUsd, fx).toFixed(2);
    const totalGsm =
      e.totalGsm ?? layers.reduce((s, l) => s + (l.gsm || 0), 0);
    const orderKg = e.orderQuantityKg ?? orderQuantity ?? 1000;

    const inkKg = e.inkMakeupSolventCostPerKg ?? 0;
    const inkM2 = e.inkMakeupSolventCostPerM2 ?? 0;
    if (inkKg > 0 || inkM2 > 0 || hasSbInk) {
      const proc = e.inkPrintingProcessResolved === 'rotogravure' ? 'roto' : 'flexo';
      const dryInkGsm = layers
        .filter((l) => l.materialType === 'ink' && l.isSolventBased)
        .reduce((sum, l) => sum + (l.gsm || 0), 0);
      const ratio = effectiveInkSolventRatio;
      const makeupGsm = dryInkGsm * ratio;
      lines.push({
        key: 'ink-makeup',
        label: `Ink Dilution (${proc})`,
        perKgUsd: inkKg,
        perM2Usd: inkM2,
        qty: makeupGsm,
        qtyUnit: 'g/m²',
        qtyHint: `ink:solvent 1:${ratio}`,
        calcHint: [
          `Ink : solvent parts = 1 : ${ratio} (${proc})`,
          `Makeup ${makeupGsm.toFixed(2)} g/m² = dry ink ${dryInkGsm.toFixed(2)} g/m² × ${ratio} solvent parts`,
          `$/m² = (${makeupGsm.toFixed(2)} / 1000) × ${priceDisp} ${cur}/kg`,
          `$/kg = ($/m² ÷ ${Number(totalGsm).toFixed(2)} total GSM) × 1000`,
        ].join('\n'),
      });
    }
    const lamKg = e.laminationSolventCostPerKg ?? 0;
    const lamM2 = e.laminationSolventCostPerM2 ?? 0;
    if (lamKg > 0 || lamM2 > 0) {
      const price = resolvedSolventCostPerKgUsd;
      const lamGsm = price > 0 ? (lamM2 / price) * 1000 : null;
      lines.push({
        key: 'lamination',
        label: 'Lamination Dilution',
        perKgUsd: lamKg,
        perM2Usd: lamM2,
        qty: lamGsm,
        qtyUnit: 'g/m²',
        qtyHint: 'EA from SB adhesive recipe',
        calcHint: [
          `EA solvent coat from each SB adhesive layer recipe`,
          lamGsm != null
            ? `Shown ${lamGsm.toFixed(2)} g/m² = ($/m² ÷ solvent ${priceDisp} ${cur}/kg) × 1000`
            : `Solvent portion of dry adhesive coat`,
          `$/m² = (EA g/m² / 1000) × solvent ${cur}/kg`,
          `$/kg = ($/m² ÷ ${Number(totalGsm).toFixed(2)} total GSM) × 1000`,
        ].join('\n'),
      });
    }
    const cleanKg = e.cleaningSolventCostPerKg ?? 0;
    const cleanM2 = e.cleaningSolventCostPerM2 ?? 0;
    if (cleanKg > 0 || cleanM2 > 0 || needsSolventMix) {
      lines.push({
        key: 'cleaning',
        label: 'Press cleaning',
        perKgUsd: cleanKg,
        perM2Usd: cleanM2,
        qty: cleaningSolventKgPerJob,
        qtyUnit: 'kg/job',
        qtyHint: 'allocated over order kg',
        calcHint: [
          `Press cleaning solvent per job (editable)`,
          `$/kg = (${cleaningSolventKgPerJob} kg/job × ${priceDisp} ${cur}/kg) ÷ ${Number(orderKg).toFixed(0)} kg order`,
          `$/m² = ($/kg × ${Number(totalGsm).toFixed(2)} total GSM) / 1000`,
        ].join('\n'),
      });
    }
    const seamKg = e.seamingSolventCostPerKg ?? 0;
    const seamM2 = e.seamingSolventCostPerM2 ?? 0;
    if (seamKg > 0 || seamM2 > 0 || hasSleeveSubstrate) {
      lines.push({
        key: 'seaming',
        label: 'Seaming',
        perKgUsd: seamKg,
        perM2Usd: seamM2,
        qty: sleeveSeamingSolventGsm,
        qtyUnit: 'g/m²',
        qtyHint: 'sleeve seam solvent coat',
        calcHint: [
          `Sleeve seaming mix coat (editable g/m²)`,
          `$/m² = (${sleeveSeamingSolventGsm} g/m² / 1000) × seaming mix ${cur}/kg`,
          `$/kg = ($/m² ÷ ${Number(totalGsm).toFixed(2)} total GSM) × 1000`,
        ].join('\n'),
      });
    }
    return lines;
  }, [
    clientCalcResult,
    showSolventCosting,
    hasSbInk,
    needsSolventMix,
    hasSleeveSubstrate,
    layers,
    effectiveInkSolventRatio,
    resolvedSolventCostPerKgUsd,
    cleaningSolventKgPerJob,
    sleeveSeamingSolventGsm,
    estimate?.exchangeRateUsdToDisplay,
    estimate?.displayCurrency,
    orderQuantity,
  ]);

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

  const packagingCostLines = clientCalcResult?.estimate.packagingCostLines ?? [];
  const packagingTotalPerKgUsd = clientCalcResult?.estimate.packagingCostPerKg ?? 0;
  const packagingTotalPerM2Usd = clientCalcResult?.estimate.packagingCostPerM2 ?? 0;
  const packagingNeedsReview = clientCalcResult?.estimate.packagingNeedsReview ?? false;
  const consumablesCostLines = clientCalcResult?.estimate.consumablesCostLines ?? [];
  const consumablesTotalPerKgUsd = clientCalcResult?.estimate.consumablesCostPerKg ?? 0;
  const consumablesTotalPerM2Usd = clientCalcResult?.estimate.consumablesCostPerM2 ?? 0;
  const consumablesNeedsReview = clientCalcResult?.estimate.consumablesNeedsReview ?? false;
  const showPackagingCosting = Boolean(productType);

  const rmTotals = useMemo(() => {
    return buildRmTotals(
      clientCalcResult?.estimate,
      solventTotalPerM2Usd,
      packagingTotalPerM2Usd
    );
  }, [clientCalcResult, solventTotalPerM2Usd, packagingTotalPerM2Usd]);

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

  const showEditorError = useCallback((msg: string) => {
    setEditorError(msg);
    setSaveNotice(null);
  }, []);

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
      showEditorError(err);
      setActiveSection('structure');
      return false;
    }
    return true;
  }, [layers, productType, dimensions, processesState, requiresRollLength, structureHasPrinting, showEditorError]);

  const goToSection = useCallback(
    (section: 'structure' | 'dimensions' | 'slabs') => {
      if (section !== 'structure' && !ensureStructureReady()) return;

      // Price list requires at least one process enabled
      if (section === 'slabs') {
        const enabledCount = processesState.filter((p) => p.enabled !== false).length;
        if (enabledCount === 0) {
          showEditorError('Select at least one process before proceeding to pricing.');
          return;
        }
      }

      setActiveSection(section);
    },
    [ensureStructureReady, processesState, showEditorError]
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
      if (mode !== 'silent') showEditorError('This quote is sent and locked. Unlock or re-quote to edit.');
      return false;
    }
    if (saving) return false;
    if (layers.length === 0) {
      if (mode !== 'silent') showEditorError('Add at least one layer before saving.');
      return false;
    }
    if (layers.some((l) => !l.materialId)) {
      if (mode !== 'silent') showEditorError('Select a material for every layer before saving.');
      return false;
    }
    const materialRefError = validateSaveMaterialRefs({
      layers,
      materialIds: materials.map((m) => m.id),
      needsSolventMix,
      solventMaterialId,
    });
    if (materialRefError) {
      if (mode !== 'silent') showEditorError(materialRefError);
      return false;
    }
    if (!jobName.trim()) {
      if (mode !== 'silent') {
        showEditorError(isPriceCheck ? 'Enter a product group before saving.' : 'Enter a job name before saving.');
      }
      return false;
    }
    if (isPriceCheck && multiOnQuote && !skuLabel.trim() && mode === 'final') {
      showEditorError('Enter a variant name before saving.');
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
        showEditorError(validationError);
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
        setEditorError(null);
        setCleanSnapshot(editorSnapshot);
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
        setEditorError(null);
        setCleanSnapshot(editorSnapshot);
        onSaved?.();
        return true;
      } finally {
        createInFlightRef.current = false;
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      // Silent saves (Calculate) shouldn't interrupt with a banner.
      if (mode !== 'silent') showEditorError(`Save failed: ${err.message || 'Unknown error'}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorSnapshot = useMemo(
    () =>
      JSON.stringify({
        jobName,
        customerId,
        productType,
        productSubtype,
        layers: layers.map((l) => ({
          id: l.id,
          materialId: l.materialId,
          micron: l.micron,
          costPerKgUsd: l.costPerKgUsd,
          materialType: l.materialType,
        })),
        processes: processesState.map((p) => ({
          id: p.id,
          enabled: p.enabled !== false,
          processQuantity: p.processQuantity ?? 1,
          costPerKgUsd: p.costPerKgUsd ?? 0,
        })),
        slabQty: slabsState.map((s) => Number(s.quantityKg) || 0),
        markupPercent,
        platesPerKg,
        deliveryPerKg,
        pricingMethod,
        marginValuePerKgUsd,
        cormPerKgUsd,
        toolingChargeUsd,
        deliveryTerm,
        deliveryChargeUsd,
        orderQuantity,
        orderQuantityUnit,
        dimensions,
        accessories,
        packagingConfig,
        consumablesConfig,
      }),
    [
      jobName,
      customerId,
      productType,
      productSubtype,
      layers,
      processesState,
      slabsState,
      markupPercent,
      platesPerKg,
      deliveryPerKg,
      pricingMethod,
      marginValuePerKgUsd,
      cormPerKgUsd,
      toolingChargeUsd,
      deliveryTerm,
      deliveryChargeUsd,
      orderQuantity,
      orderQuantityUnit,
      dimensions,
      accessories,
      packagingConfig,
      consumablesConfig,
    ]
  );

  useEffect(() => {
    if (loading || !estimate) return;
    const t = window.setTimeout(() => setCleanSnapshot(editorSnapshot), 0);
    return () => window.clearTimeout(t);
    // Capture baseline once per estimate load — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, estimate?.id]);

  const isDirty =
    !readOnly && cleanSnapshot != null && editorSnapshot !== cleanSnapshot;
  useBeforeUnloadGuard(isDirty);

  /**
   * Back: leave without persisting. Confirm when there are unsaved edits.
   */
  const handleCancel = () => {
    if (isDirty) {
      setLeaveConfirmOpen(true);
      return;
    }
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
    } catch (err) { showEditorError('Failed to create re-quote'); }
  };

  const downloadProposalPdf = async () => {
    try {
      const blob = await apiClient.getProposalPdf(id as string);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `proposal-${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) { console.error('Failed to download proposal PDF', error); }
  };

  const handleSaveAsTemplate = () => {
    if (!estimate?.id) {
      showEditorError('Save the estimate before creating a template.');
      return;
    }
    setTemplatePromptOpen(true);
  };

  const submitSaveAsTemplate = async (name: string) => {
    if (!estimate?.id) return;
    setTemplatePromptOpen(false);
    try {
      await apiClient.createTemplate(name, estimate.id);
      setPendingTemplateName(name);
      setTemplateOpenConfirmOpen(true);
    } catch (err) {
      showEditorError('Failed to save template: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const runSnapBack = async () => {
    if (!estimate?.id || !estimate?.sourceTemplateKey) {
      showEditorError('Only template quotes can be reverted to template.');
      return;
    }
    try {
      setSaving(true);
      const template = await apiClient.getTemplate(estimate.sourceTemplateKey);
      if (!template) {
        showEditorError('Template not found.');
        return;
      }
      const instantiated = await apiClient.instantiateTemplate(template.id, {
        customerId,
        jobName,
      });
      if (!instantiated?.estimate) {
        showEditorError('Failed to instantiate template.');
        return;
      }

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
      setEditorError(null);
      await fetchEstimate(estimate.id, { silent: true });
    } catch (err) {
      showEditorError('Failed to revert: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  const handleSnapBack = () => {
    if (!estimate?.id || !estimate?.sourceTemplateKey) {
      showEditorError('Only template quotes can be reverted to template.');
      return;
    }
    setSnapBackConfirmOpen(true);
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
      showEditorError('Failed to lock processes: ' + (err instanceof Error ? err.message : 'Unknown'));
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
      showEditorError('Could not download stored proposal PDF.');
    }
  };

  const changeStatus = async (newStatus: 'won' | 'lost') => {
    if (!estimate?.id) { showEditorError('Save the estimate before changing status'); return; }
    try {
      await apiClient.updateEstimate(estimate.id, { status: newStatus });
      await fetchEstimate(estimate.id);
    } catch (err) { showEditorError('Failed to change status'); }
  };

  // ── Derived flags + hooks MUST run every render (Rules of Hooks).
  // Early phase returns happen only AFTER all hooks below.
  // structureLocked comes from useStructureProcessFork (template + not forked).
  const canEditLayerStructure = (layer: { materialType: string }) =>
    !readOnly && (!structureLocked || layer.materialType === 'ink');
  const showStructureCosts = can('materialCostPerKg');
  const showInkControlsCol = structureLocked;
  const showLayerActionsCol = !structureLocked;
  const showLayerControlsCol = showLayerActionsCol || showInkControlsCol;
  const displayCurrencyLabel = estimate?.displayCurrency || 'USD';
  const {
    structureColumns,
    centeredStructureColKeys,
    structureGridStyle,
    substrateLayerCount,
    adhesiveLayerCount,
    maxSubstrates,
    maxAdhesives,
    stackLabel,
    totalGsm,
    totalConstructionMicron,
    structureDensity,
    yieldSqmPerKg,
    orderQtyMetrics,
    orderQuantityHint,
    dimensionHints,
    fxRate,
    displaySalePrice,
    sellingPricesByUnit,
  } = useEstimateEditorDerived({
    showStructureCosts,
    showLayerControlsCol,
    displayCurrencyLabel,
    productType,
    engineTypeForFamily,
    layers,
    structureMetrics,
    clientCalcResult,
    estimate,
    dimensions,
    allowedUnitBases,
    requiresRollLength,
  });

  if (loading) {
    return { phase: 'loading' as const };
  }

  if (loadError && !estimate && id) {
    return {
      phase: 'error' as const,
      loadError,
      id,
      returnTo,
      onRetry: () => {
        setLoading(true);
        fetchEstimate(id!);
      },
    };
  }
  if (!estimate) return { phase: 'missing' as const };

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

    const costingBlocksProps = {
    showStructureCosts,
    showLayerControlsCol,
    fxRate,
    displayCurrency: displayCurrencyLabel,
    canConfigure: canConfigureSolvent,
    showSolvent: showSolventCosting,
    solventExpanded: solventDetailsExpanded,
    onSolventExpandedChange: setSolventDetailsExpanded,
    solventTotalPerKgUsd,
    solventTotalPerM2Usd,
    hasSbInk,
    needsSolventMix,
    hasSleeveSubstrate,
    inkPrintingProcess: effectiveInkPrintingProcess,
    onInkPrintingProcessChange: (method: 'flexo' | 'rotogravure') => {
      setInkPrintingProcess(method);
      // Follow process default (flexo 1:1, roto 1:2) unless user edits the ratio again.
      setInkSolventRatioOverride(null);
    },
    inkSolventRatio: effectiveInkSolventRatio,
    onInkSolventRatioChange: setInkSolventRatioOverride,
    inkMakeupRatioTooltip,
    solventMaterialId,
    solventMaterialOptions,
    onSolventMaterialIdChange: (id: string | null) => {
      setSolventMaterialId(id);
      setSolventCostOverrideUsd(null);
    },
    solventCostPerKgUsd: resolvedSolventCostPerKgUsd,
    onSolventCostPerKgUsdChange: setSolventCostOverrideUsd,
    cleaningSolventKgPerJob,
    onCleaningSolventKgPerJobChange: setCleaningSolventKgPerJob,
    sleeveSeamingSolventGsm,
    onSleeveSeamingSolventGsmChange: setSleeveSeamingSolventGsm,
    solventCostLines,
    showPackaging: showPackagingCosting,
    packagingExpanded: packagingDetailsExpanded,
    onPackagingExpandedChange: setPackagingDetailsExpanded,
    packagingTotalPerKgUsd,
    packagingTotalPerM2Usd,
    packagingNeedsReview,
    packagingCostLines,
    productType: productType as 'roll' | 'sleeve' | 'pouch' | 'bag',
    packagingConfig,
    onPackagingConfigChange: (patch: Partial<PackagingConfig>) =>
      setPackagingConfig((c) => ({ ...c, ...patch })),
    consumablesExpanded: consumablesDetailsExpanded,
    onConsumablesExpandedChange: setConsumablesDetailsExpanded,
    consumablesTotalPerKgUsd,
    consumablesTotalPerM2Usd,
    consumablesNeedsReview,
    consumablesCostLines,
    consumablesConfig,
    onConsumablesConfigChange: (patch: Partial<ConsumablesConfig>) =>
      setConsumablesConfig((c) => ({ ...c, ...patch })),
  };

  return {
    phase: 'ready' as const,
    PRODUCT_FAMILY_LABELS,
    accessories,
    accessoryMaterialOptions,
    activeSection,
    addLayerOfType,
    addLayerSheetOpen,
    adhesiveLayerCount,
    allowedUnitBases,
    availableSubtypes,
    availableUnitOptions,
    bagConfiguratorActive,
    baseCormDisplay,
    billableColorCount,
    brand,
    can,
    canConfigureSolvent,
    canEditLayerStructure,
    canOverrideOperatingCostMethod,
    centeredStructureColKeys,
    changeStatus,
    clientCalcResult,
    colorsDriveTooling,
    configuratorTypeForBagSubtype,
    configuratorTypeForPouchSubtype,
    consumablesTotalPerKgUsd,
    consumablesTotalPerM2Usd,
    cormScaleWithWaste,
    costPerColor,
    costingBlocksProps,
    customerId,
    defaultOrderQuantityUnit,
    defaultSubtypeForFamily,
    deliveryChargeUsd,
    deliveryTerm,
    densityForMaterial,
    dimensionHints,
    dimensions,
    displayCurrencyLabel,
    displaySalePrice,
    downloadProposalPdf,
    downloadStoredProposal,
    dragFromIndex,
    dragHoverIndex,
    editingLayer,
    editorError,
    effectiveToolingDisplay,
    embedded,
    estimate,
    estimationDimensionFields,
    formulaModalLayer,
    formulaModalLayerId,
    formulaModalRecipe,
    fxRate,
    goToSection,
    handleCancel,
    handleCustomizeProcesses,
    handleRequote,
    handleSaveAsTemplate,
    handleSaveDraft,
    handleSaveFinal,
    handleSnapBack,
    hideEstimateRef,
    hidePriceListTab,
    isDirty,
    isLabelsRoll,
    isPriceCheck,
    jobName,
    laminationRecipeOverrides,
    layerSheetOpen,
    layers,
    leaveConfirmOpen,
    loadBaseData,
    loadError,
    marginValuePerKgUsd,
    markupPercent,
    masterReference,
    materials,
    maxAdhesives,
    maxSubstrates,
    mobileStackOpen,
    moqKg,
    multiOnQuote,
    navigate,
    needsConfiguration,
    normalizeLoadedProcesses,
    normalizeUnitValue,
    onSaved,
    openLayerEdit,
    operatingCostMethod,
    orderQtyMetrics,
    orderQuantity,
    orderQuantityHint,
    orderQuantityUnit,
    packagingTotalPerKgUsd,
    packagingTotalPerM2Usd,
    pendingTemplateName,
    pouchConfiguratorActive,
    priceChanges,
    pricingMethod,
    printColorCount,
    processesState,
    productFamily,
    productSubtype,
    productTypeOptions,
    profitMarginPercent,
    proposals,
    readOnly,
    renderInkControlsCell,
    renderMaterialOptions,
    reorderLayers,
    requiresRollLength,
    requoteWarnings,
    returnTo,
    rmTotals,
    rollConfiguratorActive,
    runSnapBack,
    saveNotice,
    saving,
    seedBagDimensionPatch,
    seedPouchDimensionPatchForSubtype,
    sellingPricesByUnit,
    setAccessories,
    setAddLayerSheetOpen,
    setBillableColorCount,
    setBrand,
    setCormPerKgPlain,
    setCormPerKgUsd,
    setCostPerColor,
    setCustomerDraftName,
    setCustomerId,
    setDeliveryChargeUsd,
    setDeliveryTerm,
    setDimensions,
    setDragFromIndex,
    setDragHoverIndex,
    setEditingLayerId,
    setEditorError,
    setFormulaModalLayerId,
    setJobName,
    setLaminationRecipeOverrides,
    setLayerSheetOpen,
    setLayers,
    setLeaveConfirmOpen,
    setMarkupPercent,
    setMobileStackOpen,
    setOperatingCostMethodOverride,
    setOrderQuantity,
    setOrderQuantityUnit,
    setPriceChanges,
    setPrintColorCount,
    setProcessesState,
    setProductSubtype,
    setProductType,
    setProfitMarginPercent,
    setSaveNotice,
    setSnapBackConfirmOpen,
    setSpecsCode,
    setTemplateOpenConfirmOpen,
    setTemplatePromptOpen,
    setToolingBillingMode,
    setToolingChargeUsd,
    setToolingScenario,
    showInkControlsCol,
    showLayerControlsCol,
    showStructureCosts,
    skuLabel,
    setSkuLabel,
    sleeveConfiguratorActive,
    snapBackConfirmOpen,
    solventTotalPerM2Usd,
    specsCode,
    stackLabel,
    structureColumns,
    structureDensity,
    structureGridStyle,
    structureHasPrinting,
    structureLocked,
    structureMetrics,
    structureTableHeight,
    structureTableRef,
    submitSaveAsTemplate,
    substrateLayerCount,
    templateClassification,
    templateCormRef,
    templateOpenConfirmOpen,
    templatePromptOpen,
    processesStale,
    processesConfirmOpen,
    pendingProcesses,
    setPendingProcesses,
    processesDiffLines,
    confirmProcesses,
    cancelProcessesConfirm,
    rederiveFromStructure,
    clientStructureForked,
    clientProcessesCustomized,
    tenant,
    tenantMarkupPercent,
    tenantOperatingCostMethod,
    tenantProfitMarginPercent,
    toolingBillingMode,
    toolingChargeUsd,
    toolingScenario,
    totalConstructionMicron,
    totalGsm,
    unitOptions,
    visualizerLayers,
    wasteBands,
    wastePrintMode,
    webConfiguratorActive,
    yieldSqmPerKg,
  };
}
