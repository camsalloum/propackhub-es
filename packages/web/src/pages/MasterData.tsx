import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Trash2, Database, GripVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEntrance } from '../hooks/useEntrance';
import { useMasterDataContext } from '../contexts/MasterDataContext';
import { useMaterialsContextOptional } from '../contexts/MaterialsContext';
import {
  apiClient,
  type PlatformMasterMaterialRow,
  type PlatformReferenceCategory,
  type PlatformReferenceItemInput,
  type PlatformMasterMaterialInput,
} from '../lib/api';
import { DEFAULT_PRODUCT_SUBTYPE_OPTIONS } from '../lib/masterDataReference';
import { PRODUCT_FAMILY_LABELS } from '../lib/productCatalog';
import LaminationFormulaModal from '../components/LaminationFormulaModal';
import { UsdPriceInput } from '../components/UsdPriceInput';
import { roundUsd } from '../lib/currency';
import { SectionTitle } from '../components/SectionTitle';
import { deriveBinderConcentrateStats, type LaminationRecipe } from '@es/engine';
import { useCatalogAccess } from '../hooks/useCatalogAccess';
import {
  canManageMasterData,
  resolveMasterDataScope,
} from '../features/master-data/masterDataScope';
import {
  buildTenantMaterialPayload,
  canEditTenantMaterialRow,
  tenantMaterialToPlatformRow,
} from '../features/master-data/tenantMaterialBridge';
import { SubstrateFamilyNav } from '../features/master-data/SubstrateFamilyNav';
import {
  ES_FAMILY_TO_PB,
  filterSubstrateMaterialsByFamilyTab,
  sortPetSubstrateRows,
  SUBSTRATE_FAMILY_TABS,
} from '../lib/substratePbTaxonomy';

type MaterialTab = string; // now dynamic — any rm_type code can be a material tab
type RefTab = 'product_type' | 'product_subtype' | 'unit' | 'rm_type' | 'process' | 'waste_bands' | 'templates';
type Tab = MaterialTab | RefTab;

// Static ref tabs — these never change
const REF_TABS: { id: RefTab; label: string }[] = [
  { id: 'rm_type', label: 'RM Types' },
  { id: 'product_type', label: 'Product Types' },
  { id: 'unit', label: 'Units' },
  { id: 'process', label: 'Processes' },
  { id: 'waste_bands', label: 'Waste Bands' },
  { id: 'templates', label: 'CoRM' },
];

// Static reference tab IDs — used to distinguish material tabs from ref tabs
const REF_TAB_IDS = new Set<string>(['product_type', 'product_subtype', 'unit', 'rm_type', 'process', 'waste_bands', 'templates']);

const PACKAGING_FAMILY = 'Packaging';

// Standard material types — always present regardless of RM type config
const STANDARD_MATERIAL_TABS = [
  { id: 'substrate', label: 'Substrates' },
  { id: 'ink', label: 'Ink & Coating' },
  { id: 'adhesive', label: 'Adhesive' },
  { id: 'solvent', label: 'Solvent' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'accessory', label: 'Accessories' },
];

/** Accessory kinds + their rate basis (mirrors engine pouch-accessories.ts). */
const ACCESSORY_KIND_OPTIONS: { value: string; label: string; basis: 'per_meter' | 'per_piece' }[] = [
  { value: 'zipper', label: 'Zipper', basis: 'per_meter' },
  { value: 'spout', label: 'Spout + cap', basis: 'per_piece' },
  { value: 'valve', label: 'Degassing valve', basis: 'per_piece' },
  { value: 'handle', label: 'Handle', basis: 'per_piece' },
  { value: 'window', label: 'Window patch', basis: 'per_piece' },
];

function accessoryBasis(kind: string | null | undefined): 'per_meter' | 'per_piece' {
  return ACCESSORY_KIND_OPTIONS.find((o) => o.value === kind)?.basis ?? 'per_piece';
}

/** Map an RM type to the DB type field used for new rows */
function dbTypeForRmCode(code: string): 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'accessory' {
  if (code === 'ink') return 'ink';
  if (code === 'adhesive') return 'adhesive';
  if (code === 'solvent') return 'solvent';
  if (code === 'accessory') return 'accessory';
  return 'substrate'; // custom types map to substrate with substrateFamily = label
}

/** Default substrateFamily for a new row of a given RM type code */
function defaultFamilyForRmCode(code: string, label: string): string {
  if (code === 'packaging') return PACKAGING_FAMILY;
  if (code === 'solvent') return 'Solvent';
  if (code === 'accessory') return 'Accessory';
  if (code === 'substrate') return 'BOPP';
  if (code === 'ink') return 'Ink & Coating';
  if (code === 'adhesive') return 'Adhesive';
  return label; // custom types: family = label
}

/** Generate a stable key from a name */
function slugKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function normalizeUsdPrices(row: PlatformMasterMaterialRow): PlatformMasterMaterialRow {
  return {
    ...row,
    costPerKgUsd: roundUsd(row.costPerKgUsd),
    liquidCostUsd: row.liquidCostUsd != null ? roundUsd(row.liquidCostUsd) : row.liquidCostUsd,
    marketPriceUsd: row.marketPriceUsd != null ? roundUsd(row.marketPriceUsd) : null,
    costPerMeterUsd: row.costPerMeterUsd != null ? roundUsd(row.costPerMeterUsd) : null,
    costPerPieceUsd: row.costPerPieceUsd != null ? roundUsd(row.costPerPieceUsd) : null,
  };
}

function esFamilyForSubstrateTab(familyTabId: string): string {
  if (familyTabId === 'SLEEVE' || familyTabId === 'SPECIALTY') return familyTabId;
  const tab = SUBSTRATE_FAMILY_TABS.find((t) => t.id === familyTabId);
  if (tab?.esFamilies[0]) return tab.esFamilies[0];
  const fromPb = Object.entries(ES_FAMILY_TO_PB).find(([, pb]) => pb === familyTabId);
  return fromPb?.[0] ?? familyTabId;
}

/** Filter materials for a given RM type tab (supports dynamic custom types) */
function filterMaterialsForTab(
  tabCode: string,
  tabLabel: string,
  rows: PlatformMasterMaterialRow[],
  allRmTabs: { id: string; label: string }[]
): PlatformMasterMaterialRow[] {
  if (tabCode === 'packaging') {
    return rows.filter((m) => m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY);
  }
  if (tabCode === 'substrate') {
    const customFamilies = allRmTabs
      .filter((t) => !['substrate', 'ink', 'adhesive', 'packaging', 'solvent'].includes(t.id))
      .map((t) => t.label);
    return rows.filter(
      (m) => m.type === 'substrate' && m.substrateFamily !== PACKAGING_FAMILY && !customFamilies.includes(m.substrateFamily ?? '')
    );
  }
  if (tabCode === 'ink' || tabCode === 'adhesive') {
    return rows.filter((m) => m.type === tabCode);
  }
  if (tabCode === 'solvent') {
    return rows.filter((m) => m.type === 'solvent');
  }
  if (tabCode === 'accessory') {
    return rows.filter((m) => m.type === 'accessory');
  }
  // Custom RM type: match by substrateFamily = tab label
  return rows.filter((m) => m.type === 'substrate' && m.substrateFamily === tabLabel);
}

/** Create a new blank material row for a given RM type tab */
function newMaterialRow(tabCode: string, tabLabel: string): PlatformMasterMaterialRow {
  const dbType = dbTypeForRmCode(tabCode);
  const family = defaultFamilyForRmCode(tabCode, tabLabel);
  const defaultCost = tabCode === 'ink' ? 12 : tabCode === 'adhesive' ? 8 : 3;
  if (tabCode === 'accessory') {
    return {
      id: `new-${Date.now()}`,
      key: '',
      name: 'New accessory',
      type: 'accessory',
      solidPercent: 100,
      density: 1,
      costPerKgUsd: 0,
      liquidCostUsd: 0,
      wastePercent: 0,
      isSolventBased: false,
      substrateFamily: family,
      substrateGrade: '',
      hoover: '',
      marketPriceUsd: null,
      externalId: null,
      externalSource: null,
      accessoryKind: 'zipper',
      costPerMeterUsd: 0.05,
      costPerPieceUsd: null,
      weightGramPerMeter: 3,
      weightGramPerPiece: null,
    };
  }
  return {
    id: `new-${Date.now()}`,
    key: '',
    name: `New ${tabLabel.toLowerCase()}`,
    type: dbType,
    solidPercent: tabCode === 'solvent' ? 0 : 100,
    density: tabCode === 'solvent' ? 0.85 : 0.91,
    costPerKgUsd: tabCode === 'solvent' ? 1.54 : defaultCost,
    liquidCostUsd: defaultCost,
    wastePercent: 0,
    isSolventBased: tabCode === 'ink' || tabCode === 'adhesive',
    substrateFamily: family,
    substrateGrade: '',
    hoover: '',
    marketPriceUsd: null,
    externalId: null,
    externalSource: null,
  };
}

const MasterData = () => {
  const { user, tenant, isLoading } = useAuth();
  const catalogAccess = useCatalogAccess();
  const scope = resolveMasterDataScope(user?.role);
  const canEditAdmin = canManageMasterData(user?.role, tenant?.type);
  const { invalidate, version: catalogReloadToken } = useMasterDataContext();
  const materialsCtx = useMaterialsContextOptional();
  // Single-play mount entrance for the library content; no-op under reduced motion (R22.3, R22.5).
  const { ref: entranceRef } = useEntrance<HTMLDivElement>();
  const [tab, setTab] = useState<Tab>('rm_type');
  const [substrateFamilyTab, setSubstrateFamilyTab] = useState('PET');
  const [materials, setMaterials] = useState<PlatformMasterMaterialRow[]>([]);
  const [refItems, setRefItems] = useState<PlatformReferenceItemInput[]>([]);
  /** Subtypes (all parents) — edited nested under Product Types. */
  const [subtypeRows, setSubtypeRows] = useState<Array<{ label: string; code: string; parent: string }>>([]);
  /** Process definitions — edited under the Processes tab. */
  const [processRows, setProcessRows] = useState<Array<{ label: string; code: string; description: string; costPerHour: number; speedBasis: string; speedValue: number; setupHours: number; costPerKgUsd: number }>>([]);
  /** Platform-wide waste bands: Printed vs Plain (estimates pick by structure). */
  type WasteBandRow = { minKg: number; maxKg: number | null; wastePercent: number };
  const [wasteBandsByMode, setWasteBandsByMode] = useState<{ printed: WasteBandRow[]; plain: WasteBandRow[] }>({
    printed: [],
    plain: [],
  });
  const [wasteBandMode, setWasteBandMode] = useState<'printed' | 'plain'>('printed');
  /** CoRM tracks waste % by this factor (default 1 = waste 10% → CoRM +10%). */
  const [cormScaleWithWaste, setCormScaleWithWaste] = useState(1);
  /**
   * Platform standard templates — CoRM Printed/Plain (display currency/kg) + MOQ.
   * Used by `fixed_per_group`; CoRM is scaled by band waste % at estimate time.
   */
  const [platformTemplates, setPlatformTemplates] = useState<Array<{
    id: string;
    templateKey: string;
    name: string;
    pebiParentPg: string;
    productType: string;
    cormPrintedDisplay: string;
    savedCormPrinted: string;
    cormPlainDisplay: string;
    savedCormPlain: string;
    moqDisplay: string;
    savedMoq: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  /** In-flight per-template CoRM PATCHes (blur auto-save) so Save does not double-fire. */
  const cormSaveInflight = useRef(new Map<string, Promise<void>>());
  /** Latest CoRM value claimed by an in-flight or completed save (state can lag). */
  const cormClaimed = useRef(new Map<string, string>());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formulaMaterialId, setFormulaMaterialId] = useState<string | null>(null);
  const [cleaningDefaultKg, setCleaningDefaultKg] = useState(20);
  const [tenantSettings, setTenantSettings] = useState<{ displayCurrency: string, exchangeRateUsdToDisplay: number } | null>(null);

  const formulaMaterial = materials.find((m) => m.id === formulaMaterialId) ?? null;
  const formulaRecipe = (formulaMaterial?.laminationRecipe as LaminationRecipe | null) ?? null;

  const isMaterialTab = (t: Tab): boolean => !REF_TAB_IDS.has(t);

  // Dynamic material tabs built from loaded RM types — starts with standard tabs,
  // then any custom RM types are appended automatically
  const [rmTypeTabs, setRmTypeTabs] = useState<{ id: string; label: string }[]>(STANDARD_MATERIAL_TABS);

  const loadMaterials = useCallback(async () => {
    if (scope === 'tenant') {
      const rows = await apiClient.getMaterials();
      setMaterials((rows as Parameters<typeof tenantMaterialToPlatformRow>[0][]).map((m) => normalizeUsdPrices(tenantMaterialToPlatformRow(m))));
      return;
    }
    const rows = await apiClient.getPlatformMasterDataMaterials();
    // Derive liquidCostUsd for ink/adhesive rows: liquidCostUsd = costPerKgUsd × (solidPercent/100)
    // (reverse of the computation — so when user opens the page they see the liquid price)
    const withLiquid = rows.map((row) => {
      // Use stored liquidCostUsd if available (avoids floating-point round-trip loss).
      // Fall back to reverse-calculation only for legacy rows that predate this column.
      if (row.liquidCostUsd != null) {
        return normalizeUsdPrices({ ...row, liquidCostUsd: Number(row.liquidCostUsd) });
      }
      if ((row.type === 'ink' || row.type === 'adhesive') && row.solidPercent > 0 && row.solidPercent < 100) {
        return normalizeUsdPrices({
          ...row,
          liquidCostUsd: roundUsd((row.costPerKgUsd * row.solidPercent) / 100),
        });
      }
      return normalizeUsdPrices({ ...row, liquidCostUsd: row.costPerKgUsd });
    });
    setMaterials(withLiquid);
  }, [scope]);

  const loadReference = useCallback(async () => {
    const ref =
      scope === 'platform'
        ? await apiClient.getPlatformMasterDataReference()
        : await apiClient.getMasterDataReference();
    const map: Record<RefTab, PlatformReferenceItemInput[]> = {
      product_type: (() => {
        const rows = (ref.productTypeRows ?? []).map((r) => ({
          label: r.label,
          code: (r.code || '').toLowerCase(),
        }));
        // Heal legacy seed where "Bag" was given the engine code "pouch": treat it as Pouch,
        // then ensure a distinct Bag(bag) exists. Result: Roll, Sleeve, Pouch, Bag.
        const healed = rows.map((r) =>
          r.label.trim().toLowerCase() === 'bag' && r.code === 'pouch' ? { label: 'Pouch', code: 'pouch' } : r
        );
        for (const c of [
          { label: 'Roll', code: 'roll' },
          { label: 'Sleeve', code: 'sleeve' },
          { label: 'Pouch', code: 'pouch' },
          { label: 'Bag', code: 'bag' },
        ]) {
          if (!healed.some((r) => r.code === c.code)) healed.push(c);
        }
        return healed;
      })(),
      product_subtype: (() => {
        const rows = (ref.productSubtypeRows ?? []).map((r) => ({
          label: r.label,
          code: (r.code || '').toLowerCase(),
        }));
        return rows;
      })(),
      unit: (ref.unitRows ?? []).map((r) => ({ label: r.label })),
      rm_type: (ref.rmTypeRows ?? []).map((r) => ({ label: r.label, code: r.code })),
      process: [],
      waste_bands: [],
      // Templates tab is loaded separately (own endpoint, own data shape) — the
      // Templates tab renders its own table, so the ref slot is unused. We keep
      // it as an empty array so the RefTab contract is satisfied.
      templates: [],
    };

    // Build dynamic material tabs from RM types.
    // Standard types always present; custom types (id not already a standard tab)
    // are appended. Exclude every standard tab id — including 'solvent' and
    // 'accessory' — and de-dupe custom ids so two rows can't collide on a React key.
    const STANDARD_CODES = new Set(STANDARD_MATERIAL_TABS.map((t) => t.id.toLowerCase()));
    const seenCustom = new Set<string>();
    const customRmTabs = map.rm_type
      .map((r) => ({ id: (r.code || slugKey(r.label)).toLowerCase(), label: r.label.trim() }))
      .filter((t) => {
        if (!t.label || STANDARD_CODES.has(t.id) || seenCustom.has(t.id)) return false;
        seenCustom.add(t.id);
        return true;
      });
    setRmTypeTabs([...STANDARD_MATERIAL_TABS, ...customRmTabs]);
    setCleaningDefaultKg(
      (ref as { costingDefaults?: { cleaningSolventKgPerJob?: number } }).costingDefaults
        ?.cleaningSolventKgPerJob ?? 20
    );
    if (!isMaterialTab(tab)) {
      setRefItems((map as Record<string, PlatformReferenceItemInput[]>)[tab] ?? []);
    }
    if (tab === 'product_type') {
      const subRows = ((ref as { productSubtypeRows?: Array<{ label: string; code: string; parent?: string }> })
        .productSubtypeRows ?? []);
      setSubtypeRows(
        subRows.length > 0
          ? subRows.map((r) => ({ label: r.label, code: r.code, parent: (r.parent || '').toLowerCase() }))
          : DEFAULT_PRODUCT_SUBTYPE_OPTIONS.map((s) => ({ label: s.label, code: s.code, parent: s.parent }))
      );
    }
    // Always load process rows (used by Processes tab)
    const pRows = ((ref as { processRows?: Array<{ label: string; code: string; description?: string; costPerHour?: number; speedBasis?: string; speedValue?: number; setupHours?: number; costPerKgUsd?: number }> })
      .processRows ?? []);
    if (pRows.length > 0) {
      setProcessRows(pRows.map((p) => ({
        label: p.label,
        code: p.code,
        description: p.description ?? '',
        costPerHour: roundUsd(p.costPerHour ?? 50),
        speedBasis: p.speedBasis ?? 'kg_per_hour',
        speedValue: p.speedValue ?? 100,
        setupHours: p.setupHours ?? 1,
        costPerKgUsd: roundUsd(p.costPerKgUsd ?? 0),
      })));
    }
    // Always load platform waste bands (used by Waste Bands tab)
    const byMode = (ref as {
      wasteBandsByPrintMode?: { printed?: WasteBandRow[]; plain?: WasteBandRow[] };
    }).wasteBandsByPrintMode;
    const mapBands = (rows?: WasteBandRow[]) =>
      (rows ?? []).map((b) => ({
        minKg: Number(b.minKg) || 0,
        maxKg: b.maxKg == null ? null : Number(b.maxKg),
        wastePercent: Number(b.wastePercent) || 0,
      }));
    setWasteBandsByMode({
      printed: mapBands(byMode?.printed),
      plain: mapBands(byMode?.plain),
    });
    const scale = (ref as { cormScaleWithWaste?: number }).cormScaleWithWaste;
    setCormScaleWithWaste(typeof scale === 'number' && scale >= 0 ? scale : 1);
  }, [tab, scope]);

  const canEdit =
    scope === 'platform' ? user?.role === 'platform_admin' : canEditAdmin && isMaterialTab(tab);

  const showSaveButton =
    scope === 'platform'
      ? user?.role === 'platform_admin'
      : canEditAdmin && isMaterialTab(tab);

  const materialRowEditable = (row: PlatformMasterMaterialRow & { isTenantOnly?: boolean }) =>
    scope === 'platform'
      ? user?.role === 'platform_admin'
      : canEditAdmin && canEditTenantMaterialRow(row, catalogAccess.canEditSyncedMaterials);

  const materialMarketEditable = (row: PlatformMasterMaterialRow & { isTenantOnly?: boolean; externalSource?: string | null }) => {
    if (materialRowEditable(row)) return true;
    return (
      scope !== 'platform' &&
      canEditAdmin &&
      catalogAccess.catalogSource === 'pebi' &&
      !row.isTenantOnly &&
      row.externalSource === 'pebi'
    );
  };

  const normalizeCorm = useCallback((value: string | null | undefined) => {
    const raw = value?.trim() ?? '';
    const numeric = raw === '' || raw === '.' ? 0 : Number(raw);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : null;
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          loadMaterials(),
          loadReference(),
          apiClient.getSettings().then((settings) => {
            setTenantSettings({
              displayCurrency: settings.displayCurrency,
              exchangeRateUsdToDisplay: Number(settings.exchangeRateUsdToDisplay) || 1,
            });
          })
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load materials');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMaterials, loadReference]);

  useEffect(() => {
    if (catalogReloadToken === 0) return;
    void Promise.all([loadMaterials(), loadReference()]);
  }, [catalogReloadToken, loadMaterials, loadReference]);

  useEffect(() => {
    if (!isMaterialTab(tab)) {
      loadReference().catch(() => {});
    }
  }, [tab, loadReference]);

  const loadPlatformTemplates = useCallback(async () => {
    try {
      const rows = await apiClient.listPlatformTemplates();
      const settings = await apiClient.getSettings();
      const exchangeRate = Number(settings.exchangeRateUsdToDisplay) || 1;
      setTenantSettings({
        displayCurrency: settings.displayCurrency,
        exchangeRateUsdToDisplay: exchangeRate,
      });
      setPlatformTemplates(
        (rows ?? [])
          .filter((r: { isActive?: boolean | null }) => r.isActive !== false)
          .map(
            (r: {
              id: string;
              templateKey: string;
              name: string;
              pebiParentPg: string;
              productType: string;
              cormPerKgUsd: string | null;
              cormPerKgPlain?: string | null;
              moqKg?: string | null;
            }) => {
              const printed =
                r.cormPerKgUsd == null ? '0.00' : Number(r.cormPerKgUsd).toFixed(2);
              const plain =
                r.cormPerKgPlain == null
                  ? (Number(printed) * 0.5).toFixed(2)
                  : Number(r.cormPerKgPlain).toFixed(2);
              const moq = r.moqKg == null || r.moqKg === '' ? '' : Number(r.moqKg).toFixed(0);
              return {
                id: r.id,
                templateKey: r.templateKey,
                name: r.name,
                pebiParentPg: r.pebiParentPg,
                productType: r.productType,
                cormPrintedDisplay: printed,
                savedCormPrinted: printed,
                cormPlainDisplay: plain,
                savedCormPlain: plain,
                moqDisplay: moq,
                savedMoq: moq,
              };
            }
          )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }, []);

  // Templates tab needs its own load (separate endpoint, separate data shape).
  useEffect(() => {
    if (tab !== 'templates') return;
    loadPlatformTemplates().catch(() => {});
  }, [tab, loadPlatformTemplates]);

  useEffect(() => {
    const handlePlatformTemplatesChanged = () => {
      if (tab !== 'templates') return;
      loadPlatformTemplates().catch(() => {});
    };
    window.addEventListener('platform-templates-changed', handlePlatformTemplatesChanged);
    return () => window.removeEventListener('platform-templates-changed', handlePlatformTemplatesChanged);
  }, [tab, loadPlatformTemplates]);

  const handleTemplatePricingBlur = useCallback(
    async (templateId: string) => {
      const tpl = platformTemplates.find((row) => row.id === templateId);
      if (!tpl) return;

      const printed = normalizeCorm(tpl.cormPrintedDisplay);
      const plain = normalizeCorm(tpl.cormPlainDisplay);
      if (printed == null || plain == null) {
        setError(`Invalid CoRM value for "${tpl.name}"`);
        return;
      }
      const moqRaw = tpl.moqDisplay.trim();
      const moq =
        moqRaw === ''
          ? ''
          : Number.isFinite(Number(moqRaw)) && Number(moqRaw) >= 0
            ? String(Math.round(Number(moqRaw)))
            : null;
      if (moq === null) {
        setError(`Invalid MOQ for "${tpl.name}"`);
        return;
      }

      const claimKey = `${printed}|${plain}|${moq}`;
      const unchanged =
        printed === tpl.savedCormPrinted &&
        plain === tpl.savedCormPlain &&
        moq === tpl.savedMoq;
      if (unchanged) {
        setPlatformTemplates((prev) =>
          prev.map((row) =>
            row.id === templateId
              ? { ...row, cormPrintedDisplay: printed, cormPlainDisplay: plain }
              : row
          )
        );
        return;
      }
      if (cormClaimed.current.get(templateId) === claimKey) return;
      if (cormSaveInflight.current.has(templateId)) return;

      setSavingTemplateId(templateId);
      setError(null);
      cormClaimed.current.set(templateId, claimKey);
      setPlatformTemplates((prev) =>
        prev.map((row) =>
          row.id === templateId
            ? {
                ...row,
                cormPrintedDisplay: printed,
                savedCormPrinted: printed,
                cormPlainDisplay: plain,
                savedCormPlain: plain,
                moqDisplay: moq,
                savedMoq: moq,
              }
            : row
        )
      );

      const savePromise = (async () => {
        try {
          const res = await apiClient.updatePlatformTemplate(templateId, {
            cormPerKgUsd: printed,
            cormPerKgPlain: plain,
            moqKg: moq === '' ? null : moq,
          });
          const total =
            (res.syncedTenants ?? 0) + (res.deactivatedTenants ?? 0) + (res.inserted ?? 0);
          setStatus(`Saved CoRM/MOQ for "${tpl.name}" — synced to ${total} tenant(s)`);
          invalidate();
        } catch (err) {
          cormClaimed.current.set(
            templateId,
            `${tpl.savedCormPrinted}|${tpl.savedCormPlain}|${tpl.savedMoq}`
          );
          setPlatformTemplates((prev) =>
            prev.map((row) =>
              row.id === templateId
                ? {
                    ...row,
                    savedCormPrinted: tpl.savedCormPrinted,
                    savedCormPlain: tpl.savedCormPlain,
                    savedMoq: tpl.savedMoq,
                  }
                : row
            )
          );
          setError(err instanceof Error ? err.message : 'Failed to save CoRM/MOQ');
        } finally {
          cormSaveInflight.current.delete(templateId);
          setSavingTemplateId(null);
        }
      })();
      cormSaveInflight.current.set(templateId, savePromise);
      await savePromise;
    },
    [invalidate, normalizeCorm, platformTemplates]
  );

  const substrateFamilyCounts = useMemo(() => {
    const allSubstrates = filterMaterialsForTab('substrate', 'Substrates', materials, rmTypeTabs);
    const counts: Record<string, number> = {};
    for (const familyTab of SUBSTRATE_FAMILY_TABS) {
      counts[familyTab.id] = filterSubstrateMaterialsByFamilyTab(allSubstrates, familyTab.id).length;
    }
    return counts;
  }, [materials, rmTypeTabs]);

  const visibleMaterials = useMemo(() => {
    if (!isMaterialTab(tab)) return [];
    const currentTab = rmTypeTabs.find((t) => t.id === tab);
    let rows = filterMaterialsForTab(tab, currentTab?.label ?? tab, materials, rmTypeTabs);
    if (tab === 'substrate') {
      rows = filterSubstrateMaterialsByFamilyTab(rows, substrateFamilyTab);
      if (substrateFamilyTab === 'PET') {
        rows = sortPetSubstrateRows(rows);
      }
    }
    return rows;
  }, [tab, materials, rmTypeTabs, substrateFamilyTab]);

  // Drag-and-drop reordering state — hoisted above the early returns below so
  // the hook order stays identical on every render (Rules of Hooks).
  const [ptDragFrom, setPtDragFrom] = useState<number | null>(null);
  const [ptDragHover, setPtDragHover] = useState<number | null>(null);
  const [subDragFrom, setSubDragFrom] = useState<number | null>(null);
  const [subDragHover, setSubDragHover] = useState<number | null>(null);
  const [procDragFrom, setProcDragFrom] = useState<number | null>(null);
  const [procDragHover, setProcDragHover] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading…
      </div>
    );
  }

  const syncToast = (sync: { tenantsSynced: number; updated: number; inserted: number }) => {
    if (sync.tenantsSynced > 0) {
      setStatus(
        `Published to ${sync.tenantsSynced} tenant(s) — ${sync.inserted} inserted, ${sync.updated} updated`
      );
    } else {
      setStatus('Catalog saved — no managed tenants to publish');
    }
    invalidate();
    materialsCtx?.invalidate();
  };

  const handlePublishToTenants = async () => {
    if (scope !== 'platform' || user?.role !== 'platform_admin') return;
    setPublishing(true);
    setError(null);
    try {
      const sync = await apiClient.publishPlatformMasterData();
      syncToast(sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveMaterials = async () => {
    if (!isMaterialTab(tab)) return;
    setSaving(true);
    setError(null);
    try {
      if (scope === 'tenant') {
        let created = 0;
        let updated = 0;
        for (const row of visibleMaterials) {
          if (!row.id.startsWith('new-') && !materialRowEditable(row)) continue;
          const payload = buildTenantMaterialPayload(row);
          if (row.id.startsWith('new-')) {
            await apiClient.createMaterial(payload);
            created++;
          } else {
            await apiClient.updateMaterial(row.id, payload);
            updated++;
          }
        }
        await loadMaterials();
        invalidate();
        materialsCtx?.invalidate();
        setStatus(`Saved — ${created} added, ${updated} updated.`);
        return;
      }

      const tabRows = visibleMaterials.map((row, i) => {
        const key = row.key || slugKey(row.name || `item-${i}`);
        const name = row.name.trim() || key;
        return {
          ...row,
          id: undefined,
          key,
          name,
          marketPriceUsd: row.marketPriceUsd ?? row.costPerKgUsd,
          sortOrder: i,
        };
      });

      const currentTab = rmTypeTabs.find((t) => t.id === tab);
      const isInCurrentTab = (m: PlatformMasterMaterialRow) => {
        return filterMaterialsForTab(tab, currentTab?.label ?? tab, [m], rmTypeTabs).length > 0;
      };
      const other = materials.filter((m) => !isInCurrentTab(m));
      const merged = [...other, ...tabRows].map(
        ({ id: _id, costingKey: _ck, ...rest }) => rest as PlatformMasterMaterialInput
      );
      const result = await apiClient.updateMasterMaterials(merged);
      if (tab === 'solvent') {
        await apiClient.updateCostingDefaults(cleaningDefaultKg);
      }
      await loadMaterials();
      syncToast(result.sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReference = async () => {
    if (isMaterialTab(tab)) return;
    setSaving(true);
    setError(null);
    try {
      if (tab === 'product_type') {
        // Save product types + their nested subtypes (linked by parent) together.
        const ptResult = await apiClient.savePlatformReferenceCategory(
          'product_type',
          refItems.filter((i) => i.label.trim()).map((i) => ({ label: i.label.trim(), code: (i.code ?? '').trim() }))
        );
        await apiClient.savePlatformReferenceCategory(
          'product_subtype',
          subtypeRows
            .filter((s) => s.label.trim() && s.code.trim() && s.parent.trim())
            .map((s) => ({ label: s.label.trim(), code: s.code.trim(), metadata: { parent: s.parent.trim() } }))
        );
        syncToast(ptResult.sync);
        invalidate();
        return;
      }
      if (tab === 'process') {
        const result = await apiClient.savePlatformReferenceCategory(
          'process' as PlatformReferenceCategory,
          processRows
            .filter((p) => p.label.trim() && p.code.trim())
            .map((p) => ({
              label: p.label.trim(),
              code: p.code.trim(),
              metadata: {
                description: p.description,
                costPerHour: p.costPerHour,
                speedBasis: p.speedBasis,
                speedValue: p.speedValue,
                setupHours: p.setupHours,
                costPerKgUsd: p.costPerKgUsd,
              },
            }))
        );
        syncToast(result.sync);
        invalidate();
        return;
      }
      if (tab === 'waste_bands') {
        const normalizeList = (bands: WasteBandRow[], label: string): WasteBandRow[] | null => {
          const normalized = bands
            .filter((b) => Number.isFinite(b.minKg) && Number.isFinite(b.wastePercent))
            .map((b) => ({
              minKg: Math.max(0, Number(b.minKg) || 0),
              maxKg: b.maxKg == null ? null : Math.max(0, Number(b.maxKg) || 0),
              wastePercent: Math.min(100, Math.max(0, Number(b.wastePercent) || 0)),
            }))
            .sort((a, b) => {
              if (a.maxKg === null) return 1;
              if (b.maxKg === null) return -1;
              return a.maxKg - b.maxKg;
            });
          if (normalized.length === 0) {
            setError(`At least one ${label} waste band is required`);
            return null;
          }
          if (normalized.filter((b) => b.maxKg === null).length > 1) {
            setError(`Only one open-ended (max = ∞) ${label} waste band is allowed`);
            return null;
          }
          return normalized;
        };
        const printed = normalizeList(wasteBandsByMode.printed, 'Printed');
        if (!printed) return;
        const plain = normalizeList(wasteBandsByMode.plain, 'Plain');
        if (!plain) return;
        const result = await apiClient.updatePlatformWasteBands({
          printed,
          plain,
          cormScaleWithWaste,
        });
        setWasteBandsByMode({ printed: result.printed, plain: result.plain });
        setCormScaleWithWaste(result.cormScaleWithWaste);
        setStatus(
          `Saved Printed (${result.printed.length}) + Plain (${result.plain.length}) waste bands — synced to all tenants`
        );
        invalidate();
        return;
      }
      if (tab === 'templates') {
        // Wait for blur auto-saves so we do not double-PATCH the same template.
        await Promise.all([...cormSaveInflight.current.values()]);

        let updated = 0;
        let totalSynced = 0;
        let totalDeactivated = 0;
        let totalInserted = 0;
        for (const tpl of platformTemplates) {
          const printed = normalizeCorm(tpl.cormPrintedDisplay);
          const plain = normalizeCorm(tpl.cormPlainDisplay);
          if (printed == null || plain == null) {
            setError(`Invalid CoRM value for "${tpl.name}"`);
            return;
          }
          const moqRaw = tpl.moqDisplay.trim();
          const moq =
            moqRaw === ''
              ? ''
              : Number.isFinite(Number(moqRaw)) && Number(moqRaw) >= 0
                ? String(Math.round(Number(moqRaw)))
                : null;
          if (moq === null) {
            setError(`Invalid MOQ for "${tpl.name}"`);
            return;
          }
          const claimKey = `${printed}|${plain}|${moq}`;
          const unchanged =
            printed === tpl.savedCormPrinted &&
            plain === tpl.savedCormPlain &&
            moq === tpl.savedMoq;
          if (unchanged) continue;
          if (cormClaimed.current.get(tpl.id) === claimKey) continue;
          cormClaimed.current.set(tpl.id, claimKey);
          try {
            const res = await apiClient.updatePlatformTemplate(tpl.id, {
              cormPerKgUsd: printed,
              cormPerKgPlain: plain,
              moqKg: moq === '' ? null : moq,
            });
            updated++;
            totalSynced += res.syncedTenants ?? 0;
            totalDeactivated += res.deactivatedTenants ?? 0;
            totalInserted += res.inserted ?? 0;
          } catch (err) {
            cormClaimed.current.set(
              tpl.id,
              `${tpl.savedCormPrinted}|${tpl.savedCormPlain}|${tpl.savedMoq}`
            );
            throw err;
          }
        }
        setPlatformTemplates((prev) =>
          prev.map((tpl) => {
            const printed = normalizeCorm(tpl.cormPrintedDisplay);
            const plain = normalizeCorm(tpl.cormPlainDisplay);
            if (printed == null || plain == null) return tpl;
            const moqRaw = tpl.moqDisplay.trim();
            const moq =
              moqRaw === ''
                ? ''
                : Number.isFinite(Number(moqRaw)) && Number(moqRaw) >= 0
                  ? String(Math.round(Number(moqRaw)))
                  : tpl.moqDisplay;
            return {
              ...tpl,
              cormPrintedDisplay: printed,
              savedCormPrinted: printed,
              cormPlainDisplay: plain,
              savedCormPlain: plain,
              moqDisplay: moq,
              savedMoq: moq,
            };
          })
        );
        const total = totalSynced + totalDeactivated + totalInserted;
        setStatus(
          total > 0
            ? `Saved CoRM/MOQ for ${updated} template(s) — synced to ${total} tenant copy/copies`
            : `Saved CoRM/MOQ for ${updated} template(s) — no tenant copies to update`
        );
        invalidate();
        return;
      }
      const result = await apiClient.savePlatformReferenceCategory(
        tab as PlatformReferenceCategory,
        refItems.filter((i) => i.label.trim())
      );
      syncToast(result.sync);
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // --- Product Types + nested Subtypes editors ---
  const addProductType = () =>
    setRefItems((prev) => [...prev, { label: 'New type', code: '' }]);

  const updateProductType = (i: number, patch: Partial<PlatformReferenceItemInput>) => {
    setRefItems((prev) => {
      const next = [...prev];
      const before = next[i];
      next[i] = { ...before, ...patch };
      // Keep child subtypes pointing at the renamed code.
      if (patch.code !== undefined && before.code && patch.code !== before.code) {
        setSubtypeRows((rows) =>
          rows.map((s) => (s.parent === (before.code ?? '').toLowerCase() ? { ...s, parent: (patch.code ?? '').toLowerCase() } : s))
        );
      }
      return next;
    });
  };

  const removeProductType = (i: number) => {
    const pt = refItems[i];
    const code = (pt.code ?? '').toLowerCase();
    if (!confirm(`Remove product type "${pt.label}" and its subtypes?`)) return;
    setRefItems((prev) => prev.filter((_, j) => j !== i));
    setSubtypeRows((rows) => rows.filter((s) => s.parent !== code));
  };

  /** Move a product type up or down in the order. */
  const moveProductType = (i: number, dir: -1 | 1) => {
    const next = i + dir;
    if (next < 0 || next >= refItems.length) return;
    setRefItems((prev) => {
      const copy = [...prev];
      [copy[i], copy[next]] = [copy[next], copy[i]];
      return copy;
    });
  };

  // ── Drag-and-drop reordering (product types) ───────────────────────────────
  const reorderProductType = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= refItems.length || to >= refItems.length) return;
    setRefItems((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };
  const commitPtDrag = () => {
    if (ptDragFrom !== null && ptDragHover !== null) reorderProductType(ptDragFrom, ptDragHover);
    setPtDragFrom(null);
    setPtDragHover(null);
  };

  const addSubtype = (parent: string) =>
    setSubtypeRows((prev) => [...prev, { label: 'New subtype', code: '', parent: parent.toLowerCase() }]);

  const updateSubtype = (idx: number, patch: Partial<{ label: string; code: string }>) =>
    setSubtypeRows((prev) => prev.map((s, j) => (j === idx ? { ...s, ...patch } : s)));

  const removeSubtype = (idx: number) =>
    setSubtypeRows((prev) => prev.filter((_, j) => j !== idx));

  /** Move a subtype up or down within its parent group. */
  const moveSubtype = (idx: number, dir: -1 | 1) => {
    const parent = subtypeRows[idx]?.parent;
    if (!parent) return;
    const groupIdxs = subtypeRows
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.parent === parent)
      .map(({ i }) => i);
    const posInGroup = groupIdxs.indexOf(idx);
    const targetPosInGroup = posInGroup + dir;
    if (targetPosInGroup < 0 || targetPosInGroup >= groupIdxs.length) return;
    const targetIdx = groupIdxs[targetPosInGroup];
    setSubtypeRows((prev) => {
      const copy = [...prev];
      [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
      return copy;
    });
  };

  // ── Drag-and-drop reordering (subtypes — constrained to same parent) ────────
  const commitSubDrag = () => {
    if (
      subDragFrom !== null &&
      subDragHover !== null &&
      subDragFrom !== subDragHover &&
      subtypeRows[subDragFrom]?.parent === subtypeRows[subDragHover]?.parent
    ) {
      setSubtypeRows((prev) => {
        const copy = [...prev];
        const [item] = copy.splice(subDragFrom, 1);
        // Account for index shift when removing an earlier element.
        const insertAt = subDragFrom < subDragHover ? subDragHover - 1 : subDragHover;
        copy.splice(insertAt, 0, item);
        return copy;
      });
    }
    setSubDragFrom(null);
    setSubDragHover(null);
  };

  // ── Drag-and-drop reordering (processes) ────────────────────────────────────
  const commitProcDrag = () => {
    if (procDragFrom !== null && procDragHover !== null && procDragFrom !== procDragHover) {
      setProcessRows((prev) => {
        const copy = [...prev];
        const [item] = copy.splice(procDragFrom, 1);
        const insertAt = procDragFrom < procDragHover ? procDragHover - 1 : procDragHover;
        copy.splice(insertAt, 0, item);
        return copy;
      });
    }
    setProcDragFrom(null);
    setProcDragHover(null);
  };

  const updateMaterialRow = (id: string, patch: Partial<PlatformMasterMaterialRow>) => {
    const usdKeys = [
      'costPerKgUsd',
      'liquidCostUsd',
      'marketPriceUsd',
      'costPerMeterUsd',
      'costPerPieceUsd',
    ] as const;
    const roundedPatch = { ...patch };
    for (const key of usdKeys) {
      if (key in roundedPatch && roundedPatch[key] != null) {
        roundedPatch[key] = roundUsd(Number(roundedPatch[key])) as never;
      }
    }

    setMaterials((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const updated = { ...m, ...roundedPatch };
      // Auto-compute costPerKgUsd when liquidCostUsd or solidPercent changes (ink/adhesive only)
      if ((updated.type === 'ink' || updated.type === 'adhesive') &&
          ('liquidCostUsd' in roundedPatch || 'solidPercent' in roundedPatch)) {
        const liquid = updated.liquidCostUsd ?? updated.costPerKgUsd;
        const solid = Math.max(1, updated.solidPercent || 100);
        updated.costPerKgUsd = roundUsd(liquid / (solid / 100));
        if (updated.liquidCostUsd != null) {
          updated.liquidCostUsd = roundUsd(updated.liquidCostUsd);
        }
      }
      return updated;
    }));
  };

  const addMaterialRow = () => {
    if (!isMaterialTab(tab)) return;
    const currentTab = rmTypeTabs.find((t) => t.id === tab);
    const row = newMaterialRow(tab, currentTab?.label ?? tab);
    if (tab === 'substrate') {
      row.substrateFamily = esFamilyForSubstrateTab(substrateFamilyTab);
    }
    setMaterials((prev) => [...prev, row]);
  };

  const removeMaterialRow = async (row: PlatformMasterMaterialRow & { isTenantOnly?: boolean }) => {
    if (row.id.startsWith('new-')) {
      setMaterials((prev) => prev.filter((m) => m.id !== row.id));
      return;
    }
    if (!materialRowEditable(row) && scope === 'tenant') return;
    const label = scope === 'platform' ? 'platform master' : 'your materials';
    if (!confirm(`Remove "${row.name}" from ${label}?`)) return;
    setSaving(true);
    try {
      if (scope === 'tenant') {
        await apiClient.deleteMaterial(row.id);
        setMaterials((prev) => prev.filter((m) => m.id !== row.id));
        invalidate();
        setStatus('Material removed.');
        return;
      }
      const result = await apiClient.deletePlatformMasterMaterial(row.id);
      setMaterials((prev) => prev.filter((m) => m.id !== row.id));
      syncToast(result.sync);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  /** Delete an RM type item with a usage warning. */
  const removeRmTypeItem = (i: number) => {
    const item = refItems[i];
    const STANDARD_CODES = ['substrate', 'ink', 'adhesive', 'packaging'];
    const isStandard =
      STANDARD_CODES.includes((item.code ?? '').toLowerCase()) ||
      ['substrate', 'ink & coating', 'adhesive', 'packaging'].includes(
        item.label.trim().toLowerCase()
      );

    const warning = isStandard
      ? `⚠️ "${item.label}" is a standard material type.\n\nRemoving it will hide all materials of this type from Master Data filters. The materials themselves are NOT deleted.\n\nContinue?`
      : `Remove RM type "${item.label}"?\n\nAny materials of this type (family = "${item.label}") will no longer appear in Master Data filters. The materials are NOT deleted.\n\nContinue?`;

    if (!confirm(warning)) return;
    setRefItems((prev) => prev.filter((_, j) => j !== i));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-mist">
        Loading master data…
      </div>
    );
  }

  return (
    <div ref={entranceRef} className="w-full pb-24 lg:pb-8">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
            <Database className="w-7 h-7 text-gold shrink-0" />
            {scope === 'platform' ? 'Platform Variables' : 'Master Data'}
          </h1>
          <p className="text-mist mt-1 text-sm">
            {scope === 'platform'
              ? 'Platform variables — materials, units, processes, product types, CoRM and waste bands (Printed / Plain): the golden catalog for all tenants.'
              : `Master data for ${tenant?.name ?? 'your account'} — materials, units, processes, CoRM and waste bands. ${catalogAccess.priceSourceLabel}.`}
            {scope === 'platform' && canEdit && ' Changes sync to managed tenants automatically.'}
            {!canEditAdmin && ' Contact your group administrator to update master data.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {scope === 'platform' && user?.role === 'platform_admin' && (
            <button
              type="button"
              className="btn-secondary flex items-center gap-2"
              disabled={publishing || saving}
              onClick={() => void handlePublishToTenants()}
            >
              {publishing ? 'Publishing…' : 'Publish to tenants'}
            </button>
          )}
          {showSaveButton && (
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            disabled={saving || publishing}
            onClick={isMaterialTab(tab) ? handleSaveMaterials : handleSaveReference}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save tab'}
          </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card bg-danger/10 border-danger/30 mb-4 text-danger text-sm">{error}</div>
      )}
      {status && (
        <div className="card bg-success/10 border-success/30 mb-4 text-success text-sm">{status}</div>
      )}

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {[REF_TABS[0], ...rmTypeTabs, ...REF_TABS.slice(1)].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-micro ease-micro shrink-0 ${
              tab === t.id ? 'bg-gold/15 text-gold' : 'bg-surface-raised text-ink hover:bg-slate'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isMaterialTab(tab) ? (
        <div className="card overflow-hidden">
          {tab === 'solvent' && canEdit && scope === 'platform' && (
            <div className="px-3 py-3 border-b border-border bg-warning/10 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-mist mb-1">
                  Default cleaning EA (kg/job)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input w-full font-mono"
                  value={cleaningDefaultKg}
                  onChange={(e) => setCleaningDefaultKg(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-mist mt-1">New estimates default to this when SB ink is in the stack.</p>
              </div>
            </div>
          )}
          {tab === 'substrate' && (
            <SubstrateFamilyNav
              activeId={substrateFamilyTab}
              onChange={setSubstrateFamilyTab}
              countsByFamily={substrateFamilyCounts}
            />
          )}
          <div className="flex justify-between items-center px-3 py-2 border-b border-border bg-slate/30">
            <span className="text-sm text-mist">{visibleMaterials.length} row(s)</span>
            {canEditAdmin && (
              <button type="button" className="btn-secondary text-sm flex items-center gap-1 py-1.5" onClick={addMaterialRow}>
                <Plus className="w-4 h-4" /> Add row
              </button>
            )}
          </div>
          {tab === 'accessory' ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th className="text-right">Cost / m ($)</th>
                    <th className="text-right">Weight (g/m)</th>
                    <th className="text-right">Cost / pc ($)</th>
                    <th className="text-right">Weight (g/pc)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleMaterials.map((row) => {
                    const basis = accessoryBasis(row.accessoryKind);
                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            className="cell-input w-full min-w-0"
                            value={row.name}
                            disabled={!materialRowEditable(row)}
                            onChange={(e) => updateMaterialRow(row.id, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            className="cell-input w-full"
                            value={row.accessoryKind ?? 'zipper'}
                            disabled={!materialRowEditable(row)}
                            onChange={(e) =>
                              updateMaterialRow(row.id, {
                                accessoryKind: e.target.value as PlatformMasterMaterialRow['accessoryKind'],
                              })
                            }
                          >
                            {ACCESSORY_KIND_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {basis === 'per_meter' ? (
                            <UsdPriceInput
                              className="cell-input cell-num w-[80px]"
                              value={row.costPerMeterUsd ?? 0}
                              disabled={!materialRowEditable(row)}
                              onChange={(v) => updateMaterialRow(row.id, { costPerMeterUsd: v })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td>
                          {basis === 'per_meter' ? (
                            <input
                              type="number" step="0.01" className="cell-input cell-num w-[80px]"
                              value={row.weightGramPerMeter ?? 0} disabled={!materialRowEditable(row)}
                              onChange={(e) => updateMaterialRow(row.id, { weightGramPerMeter: Number(e.target.value) })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td>
                          {basis === 'per_piece' ? (
                            <UsdPriceInput
                              className="cell-input cell-num w-[80px]"
                              value={row.costPerPieceUsd ?? 0}
                              disabled={!materialRowEditable(row)}
                              onChange={(v) => updateMaterialRow(row.id, { costPerPieceUsd: v })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td>
                          {basis === 'per_piece' ? (
                            <input
                              type="number" step="0.01" className="cell-input cell-num w-[80px]"
                              value={row.weightGramPerPiece ?? 0} disabled={!materialRowEditable(row)}
                              onChange={(e) => updateMaterialRow(row.id, { weightGramPerPiece: Number(e.target.value) })}
                            />
                          ) : <span className="text-mist">—</span>}
                        </td>
                        <td className="text-center">
                          {materialRowEditable(row) && (
                            <button
                              type="button"
                              className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro"
                              onClick={() => removeMaterialRow(row)}
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visibleMaterials.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-mist py-4 text-sm">No accessories yet — click “Add row”. Used by the Pouch configurator (zipper/spout/valve/window/handle).</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {tab !== 'substrate' && <th>Family</th>}
                  <th>Name</th>
                  <th>{tab === 'substrate' ? 'PB grade' : 'Grade'}</th>
                  <th className="text-right">Density</th>
                  <th className="text-right">Solid %</th>
                  {(tab === 'ink' || tab === 'adhesive') && (
                    <th className="text-right">Liquid Cost<br/><span className="font-normal text-[10px]">$/kg liquid</span></th>
                  )}
                  <th className="text-right">
                    {(tab === 'ink' || tab === 'adhesive') ? (
                      <>Cost/kg<br/><span className="font-normal text-[10px]">dry equiv (auto)</span></>
                    ) : 'Cost/kg'}
                  </th>
                  <th className="text-right">
                    {tab === 'substrate' ? (
                      <>Market<br/><span className="font-normal text-[10px]">PB market_ref</span></>
                    ) : 'Market'}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleMaterials.map((row) => (
                  <tr key={row.id}>
                    {tab !== 'substrate' && (
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.substrateFamily ?? ''}
                        title={row.substrateFamily ?? ''}
                        disabled={!materialRowEditable(row)}
                        onChange={(e) => updateMaterialRow(row.id, { substrateFamily: e.target.value })}
                      />
                    </td>
                    )}
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.name}
                        title={row.name}
                        disabled={!materialRowEditable(row)}
                        onChange={(e) => updateMaterialRow(row.id, { name: e.target.value })}
                        onDoubleClick={() => {
                          if (tab === 'adhesive' && row.isSolventBased) setFormulaMaterialId(row.id);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input w-full min-w-0"
                        value={row.substrateGrade ?? ''}
                        title={row.substrateGrade ?? ''}
                        disabled={!materialRowEditable(row)}
                        onChange={(e) => updateMaterialRow(row.id, { substrateGrade: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="cell-input cell-num w-[72px]"
                        value={row.density}
                        disabled={!materialRowEditable(row)}
                        onChange={(e) => updateMaterialRow(row.id, { density: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="cell-input cell-num w-[64px]"
                        value={row.solidPercent}
                        disabled={!materialRowEditable(row)}
                        onChange={(e) =>
                          updateMaterialRow(row.id, { solidPercent: Number(e.target.value) })
                        }
                      />
                    </td>
                    {/* Liquid Cost — editable for ink/adhesive; derives costPerKgUsd automatically */}
                    {(tab === 'ink' || tab === 'adhesive') && (
                      <td>
                        <UsdPriceInput
                          className="cell-input cell-num w-[72px]"
                          value={row.liquidCostUsd ?? row.costPerKgUsd}
                          title="Price you pay per kg of liquid ink/adhesive"
                          disabled={!materialRowEditable(row)}
                          onChange={(v) => updateMaterialRow(row.id, { liquidCostUsd: v })}
                        />
                      </td>
                    )}
                    <td>
                      {(tab === 'ink' || tab === 'adhesive') ? (
                        <span
                          className="cell-num font-mono text-sm font-semibold text-warning px-2"
                          title={`${(row.liquidCostUsd ?? row.costPerKgUsd).toFixed(2)} ÷ ${row.solidPercent}% = ${row.costPerKgUsd.toFixed(4)}`}
                        >
                          {row.costPerKgUsd.toFixed(2)}
                        </span>
                      ) : (
                        <UsdPriceInput
                          className="cell-input cell-num w-[72px]"
                          value={row.costPerKgUsd}
                          disabled={!materialRowEditable(row)}
                          onChange={(v) => updateMaterialRow(row.id, { costPerKgUsd: v })}
                        />
                      )}
                    </td>
                    <td>
                      <UsdPriceInput
                        className="cell-input cell-num w-[72px]"
                        value={row.marketPriceUsd ?? row.costPerKgUsd}
                        disabled={!materialMarketEditable(row)}
                        onChange={(v) => updateMaterialRow(row.id, { marketPriceUsd: v })}
                      />
                    </td>
                    <td className="text-center">
                      {tab === 'adhesive' && row.isSolventBased && canEdit && (
                        <button
                          type="button"
                          className="text-xs text-accent-text hover:text-accent mr-1 transition-colors duration-micro ease-micro"
                          onClick={() => setFormulaMaterialId(row.id)}
                        >
                          Formula
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro"
                          onClick={() => removeMaterialRow(row)}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      ) : tab === 'product_type' ? (
        <div className="card p-3 space-y-3">
          <div className="flex justify-between items-center">
            <SectionTitle
              as="span"
              className="text-sm text-mist"
              hint="Each product type has its own code (e.g. pouch, bag). Subtypes nest under a type with a parentcode_subtype code (e.g. bag_wicket) — they drive the estimate dropdowns."
            >
              {refItems.length} product type(s)
            </SectionTitle>
            <button type="button" className="btn-secondary text-sm flex items-center gap-1 py-1.5" onClick={addProductType} disabled={!canEdit}>
              <Plus className="w-4 h-4" /> Add product type
            </button>
          </div>
          {refItems.map((pt, i) => {
            const ptCode = (pt.code ?? '').toLowerCase();
            return (
              <div
                key={i}
                onDragEnter={() => { if (ptDragFrom !== null) setPtDragHover(i); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); commitPtDrag(); }}
                className={`border border-border rounded-lg p-3 bg-slate/10 transition-colors ${
                  ptDragFrom === i ? 'opacity-50' : ''
                } ${ptDragHover === i && ptDragFrom !== null && ptDragFrom !== i ? 'outline outline-1 outline-gold/50 bg-gold/5' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* Drag handle */}
                  <span
                    draggable
                    onDragStart={() => setPtDragFrom(i)}
                    onDragEnd={commitPtDrag}
                    className="text-mist hover:text-navy cursor-grab active:cursor-grabbing touch-none shrink-0"
                    aria-label="Drag to reorder product type"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveProductType(i, -1)}
                      className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                      aria-label="Move type up"
                    >▲</button>
                    <button
                      type="button"
                      disabled={i === refItems.length - 1}
                      onClick={() => moveProductType(i, 1)}
                      className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                      aria-label="Move type down"
                    >▼</button>
                  </div>
                  <input
                    className="input !min-h-[34px] !py-1 !px-2 text-sm flex-1 min-w-[8rem]"
                    placeholder="Product type label"
                    value={pt.label}
                    onChange={(e) => updateProductType(i, { label: e.target.value })}
                  />
                  <input
                    className="input !min-h-[34px] !py-1 !px-2 text-sm font-mono w-32"
                    placeholder="code"
                    value={pt.code ?? ''}
                    onChange={(e) => updateProductType(i, { code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                  />
                  <button type="button" className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro" onClick={() => removeProductType(i)} aria-label="Delete product type">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 ml-3 pl-3 border-l-2 border-border space-y-1">
                  {subtypeRows.map((s, idx) => {
                    if (s.parent !== ptCode) return null;
                    // Find position within this parent's group for disabling arrows
                    const groupIdxs = subtypeRows
                      .map((r, j) => ({ r, j }))
                      .filter(({ r }) => r.parent === ptCode)
                      .map(({ j }) => j);
                    const posInGroup = groupIdxs.indexOf(idx);
                    return (
                      <div
                        key={idx}
                        onDragEnter={() => {
                          if (subDragFrom !== null && subtypeRows[subDragFrom]?.parent === ptCode) setSubDragHover(idx);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); commitSubDrag(); }}
                        className={`flex flex-wrap items-center gap-2 rounded transition-colors ${
                          subDragFrom === idx ? 'opacity-50' : ''
                        } ${subDragHover === idx && subDragFrom !== null && subDragFrom !== idx ? 'outline outline-1 outline-gold/50 bg-gold/5' : ''}`}
                      >
                        {/* Drag handle */}
                        <span
                          draggable
                          onDragStart={() => setSubDragFrom(idx)}
                          onDragEnd={commitSubDrag}
                          className="text-mist hover:text-navy cursor-grab active:cursor-grabbing touch-none shrink-0"
                          aria-label="Drag to reorder subtype"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        {/* Subtype reorder */}
                        <div className="flex flex-col gap-0">
                          <button
                            type="button"
                            disabled={posInGroup === 0}
                            onClick={() => moveSubtype(idx, -1)}
                            className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                            aria-label="Move subtype up"
                          >▲</button>
                          <button
                            type="button"
                            disabled={posInGroup === groupIdxs.length - 1}
                            onClick={() => moveSubtype(idx, 1)}
                            className="text-mist hover:text-navy disabled:opacity-20 leading-none text-xs px-0.5"
                            aria-label="Move subtype down"
                          >▼</button>
                        </div>
                        <input
                          className="input !min-h-[30px] !py-0.5 !px-2 text-sm flex-1 min-w-[8rem]"
                          placeholder="Subtype label"
                          value={s.label}
                          onChange={(e) => updateSubtype(idx, { label: e.target.value })}
                        />
                        <input
                          className="input !min-h-[30px] !py-0.5 !px-2 text-sm font-mono w-40"
                          placeholder={`${ptCode || 'type'}_subtype`}
                          value={s.code}
                          onChange={(e) => updateSubtype(idx, { code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                        />
                        <button type="button" className="p-1 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro" onClick={() => removeSubtype(idx)} aria-label="Delete subtype">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="text-xs text-gold hover:underline flex items-center gap-1 mt-1 disabled:opacity-40"
                    onClick={() => addSubtype(ptCode)}
                    disabled={!ptCode}
                    title={ptCode ? '' : 'Set a code on the product type first'}
                  >
                    <Plus className="w-3 h-3" /> Add subtype
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'process' ? (
        <div className="card p-3 space-y-3">
          <div className="flex justify-between items-center">
            <SectionTitle
              as="span"
              className="text-sm text-mist"
              hint="Processes drive template selection and estimate instantiation defaults (cost/hour, speed, setup). The code (e.g. pouch_making) is the stable key stored in templates."
            >
              {processRows.length} process(es)
            </SectionTitle>
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1 py-1.5"
              onClick={() => setProcessRows((prev) => [...prev, { label: 'New process', code: '', description: '', costPerHour: 50, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1, costPerKgUsd: 0 }])}
            >
              <Plus className="w-4 h-4" /> Add process
            </button>
          </div>
          <div className="space-y-2">
            {processRows.map((proc, i) => {
              const groupIdxCount = processRows.length;
              return (
                <div
                  key={i}
                  onDragEnter={() => { if (procDragFrom !== null) setProcDragHover(i); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); commitProcDrag(); }}
                  className={`border border-border rounded-lg p-3 bg-slate/10 space-y-2 transition-colors ${
                    procDragFrom === i ? 'opacity-50' : ''
                  } ${procDragHover === i && procDragFrom !== null && procDragFrom !== i ? 'outline outline-1 outline-gold/50 bg-gold/5' : ''}`}
                >
                  {/* Row 1: reorder + label + code + delete */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      draggable
                      onDragStart={() => setProcDragFrom(i)}
                      onDragEnd={commitProcDrag}
                      className="text-mist hover:text-navy cursor-grab active:cursor-grabbing touch-none shrink-0"
                      aria-label="Drag to reorder process"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <div className="flex flex-col gap-0 shrink-0">
                      <button type="button" disabled={i === 0} onClick={() => setProcessRows((prev) => { const c = [...prev]; [c[i], c[i-1]] = [c[i-1], c[i]]; return c; })} className="text-mist hover:text-navy disabled:opacity-20 text-xs leading-none px-0.5" aria-label="Move up">▲</button>
                      <button type="button" disabled={i === groupIdxCount - 1} onClick={() => setProcessRows((prev) => { const c = [...prev]; [c[i], c[i+1]] = [c[i+1], c[i]]; return c; })} className="text-mist hover:text-navy disabled:opacity-20 text-xs leading-none px-0.5" aria-label="Move down">▼</button>
                    </div>
                    <input className="input !min-h-[34px] !py-1 !px-2 text-sm flex-1 min-w-[8rem]" placeholder="Label (e.g. Extrusion)" value={proc.label} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, label: e.target.value } : p))} />
                    <input className="input !min-h-[34px] !py-1 !px-2 text-sm font-mono w-36" placeholder="code" value={proc.code} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') } : p))} />
                    <button type="button" className="p-1.5 text-danger hover:bg-danger/10 rounded shrink-0 transition-colors duration-micro ease-micro" onClick={() => setProcessRows((prev) => prev.filter((_, j) => j !== i))} aria-label="Delete process"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {/* Row 2: description + cost defaults */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-6">
                    <div className="col-span-2">
                      <label className="block text-xs text-mist mb-0.5">Description</label>
                      <input className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" placeholder="Short description" value={proc.description} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, description: e.target.value } : p))} />
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">$/hr</label>
                      <UsdPriceInput
                        className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full"
                        value={proc.costPerHour}
                        onChange={(v) =>
                          setProcessRows((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, costPerHour: v } : p))
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">Setup hrs</label>
                      <input type="number" className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" value={proc.setupHours} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, setupHours: Number(e.target.value) } : p))} />
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">Speed basis</label>
                      <select className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" value={proc.speedBasis} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, speedBasis: e.target.value } : p))}>
                        <option value="kg_per_hour">kg / hr</option>
                        <option value="m_per_min">m / min</option>
                        <option value="pcs_per_min">pcs / min</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">Speed value</label>
                      <input type="number" className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full" value={proc.speedValue} onChange={(e) => setProcessRows((prev) => prev.map((p, j) => j === i ? { ...p, speedValue: Number(e.target.value) } : p))} />
                    </div>
                    <div>
                      <label className="block text-xs text-mist mb-0.5">Cost $/kg</label>
                      <UsdPriceInput
                        className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-full"
                        value={proc.costPerKgUsd}
                        onChange={(v) =>
                          setProcessRows((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, costPerKgUsd: v } : p))
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === 'waste_bands' ? (
        <div className="card p-3 space-y-3">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <SectionTitle
              as="span"
              className="text-sm text-mist"
              hint="Two tables: Printed (structure has ink) and Plain (no ink). Estimates pick automatically. Plain defaults to 50% of Printed. CoRM scale: waste 10% raises Fixed CoRM by 10% when factor is 1."
            >
              {wasteBandsByMode[wasteBandMode].length} {wasteBandMode === 'printed' ? 'Printed' : 'Plain'} band(s)
            </SectionTitle>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-base" role="tablist" aria-label="Waste band print mode">
                {(['printed', 'plain'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={wasteBandMode === mode}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      wasteBandMode === mode
                        ? 'bg-brand text-white'
                        : 'text-text-secondary hover:text-brand'
                    }`}
                    onClick={() => setWasteBandMode(mode)}
                  >
                    {mode === 'printed' ? 'Printed' : 'Plain'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-secondary text-sm flex items-center gap-1 py-1.5"
                onClick={() =>
                  setWasteBandsByMode((prev) => ({
                    ...prev,
                    [wasteBandMode]: [
                      ...prev[wasteBandMode],
                      {
                        minKg: 0,
                        maxKg: null,
                        wastePercent: wasteBandMode === 'plain' ? 2.5 : 5,
                      },
                    ],
                  }))
                }
                disabled={!canEdit}
              >
                <Plus className="w-4 h-4" /> Add band
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-mist" htmlFor="corm-scale-with-waste">
              CoRM scale with waste
            </label>
            <input
              id="corm-scale-with-waste"
              type="number"
              step="0.1"
              min={0}
              max={10}
              className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-20"
              value={cormScaleWithWaste}
              onChange={(e) => setCormScaleWithWaste(Math.max(0, Number(e.target.value) || 0))}
              disabled={!canEdit}
            />
            <span className="text-xs text-mist">1 = waste 10% → CoRM +10%; 0 = flat CoRM</span>
          </div>
          <div className="table-wrap">
            <table className="data-table min-w-[520px]">
              <thead>
                <tr>
                  <th>Min kg</th>
                  <th>Max kg</th>
                  <th>Waste %</th>
                  <th aria-label="actions"></th>
                </tr>
              </thead>
              <tbody>
                {wasteBandsByMode[wasteBandMode].length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-mist py-4">No bands — using engine defaults</td>
                  </tr>
                ) : (
                  wasteBandsByMode[wasteBandMode].map((band, i) => (
                    <tr key={`${wasteBandMode}-${i}`}>
                      <td>
                        <input
                          type="number"
                          className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-28"
                          value={band.minKg}
                          min={0}
                          onChange={(e) =>
                            setWasteBandsByMode((prev) => ({
                              ...prev,
                              [wasteBandMode]: prev[wasteBandMode].map((b, j) =>
                                j === i ? { ...b, minKg: Number(e.target.value) } : b
                              ),
                            }))
                          }
                          disabled={!canEdit}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-28"
                          value={band.maxKg ?? ''}
                          min={0}
                          placeholder="∞ (open)"
                          onChange={(e) => {
                            const v = e.target.value;
                            setWasteBandsByMode((prev) => ({
                              ...prev,
                              [wasteBandMode]: prev[wasteBandMode].map((b, j) =>
                                j === i ? { ...b, maxKg: v === '' ? null : Number(v) } : b
                              ),
                            }));
                          }}
                          disabled={!canEdit}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-24"
                          value={band.wastePercent}
                          min={0}
                          max={100}
                          onChange={(e) =>
                            setWasteBandsByMode((prev) => ({
                              ...prev,
                              [wasteBandMode]: prev[wasteBandMode].map((b, j) =>
                                j === i ? { ...b, wastePercent: Number(e.target.value) } : b
                              ),
                            }))
                          }
                          disabled={!canEdit}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro"
                          onClick={() =>
                            setWasteBandsByMode((prev) => ({
                              ...prev,
                              [wasteBandMode]: prev[wasteBandMode].filter((_, j) => j !== i),
                            }))
                          }
                          disabled={!canEdit}
                          aria-label="Delete band"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'templates' ? (
        <div className="card p-3 space-y-3">
          <div className="flex justify-between items-center">
            <SectionTitle
              as="span"
              className="text-sm text-mist"
              hint="Base CoRM Printed/Plain (display currency/kg) and MOQ. Estimates pick Printed vs Plain from structure; CoRM is amplified by band waste % × scale factor (Waste Bands tab)."
            >
              {platformTemplates.length} template(s)
            </SectionTitle>
          </div>
          <div className="table-wrap">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th className="text-center">Product Group</th>
                  <th className="text-center">Product Type</th>
                  <th className="text-center">Template Name</th>
                  <th className="text-center">
                    CoRM Printed ({tenantSettings?.displayCurrency || 'USD'}/kg)
                  </th>
                  <th className="text-center">
                    CoRM Plain ({tenantSettings?.displayCurrency || 'USD'}/kg)
                  </th>
                  <th className="text-center">MOQ (kg)</th>
                </tr>
              </thead>
              <tbody>
                {platformTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-mist py-4">
                      No platform templates yet. Create one in the platform admin catalog.
                    </td>
                  </tr>
                ) : (
                  [...platformTemplates]
                    .sort((a, b) =>
                      a.pebiParentPg.localeCompare(b.pebiParentPg) || a.name.localeCompare(b.name)
                    )
                    .map((tpl) => (
                      <tr key={tpl.id}>
                        <td className="text-mist text-sm">{tpl.pebiParentPg}</td>
                        <td className="text-mist text-sm">
                          {PRODUCT_FAMILY_LABELS[tpl.productType] ?? tpl.productType}
                        </td>
                        <td className="font-medium">{tpl.name}</td>
                        <td className="text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="input block !min-h-[30px] !py-0.5 !px-2 text-xs w-24 mx-auto text-center tabular-nums"
                            value={tpl.cormPrintedDisplay}
                            disabled={!canEdit || savingTemplateId === tpl.id}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (!/^\d*(\.\d{0,2})?$/.test(next)) return;
                              setPlatformTemplates((prev) =>
                                prev.map((p) =>
                                  p.id === tpl.id ? { ...p, cormPrintedDisplay: next } : p
                                )
                              );
                            }}
                            onBlur={() => void handleTemplatePricingBlur(tpl.id)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="input block !min-h-[30px] !py-0.5 !px-2 text-xs w-24 mx-auto text-center tabular-nums"
                            value={tpl.cormPlainDisplay}
                            disabled={!canEdit || savingTemplateId === tpl.id}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (!/^\d*(\.\d{0,2})?$/.test(next)) return;
                              setPlatformTemplates((prev) =>
                                prev.map((p) =>
                                  p.id === tpl.id ? { ...p, cormPlainDisplay: next } : p
                                )
                              );
                            }}
                            onBlur={() => void handleTemplatePricingBlur(tpl.id)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="input block !min-h-[30px] !py-0.5 !px-2 text-xs w-24 mx-auto text-center tabular-nums"
                            value={tpl.moqDisplay}
                            disabled={!canEdit || savingTemplateId === tpl.id}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (!/^\d*$/.test(next)) return;
                              setPlatformTemplates((prev) =>
                                prev.map((p) =>
                                  p.id === tpl.id ? { ...p, moqDisplay: next } : p
                                )
                              );
                            }}
                            onBlur={() => void handleTemplatePricingBlur(tpl.id)}
                            placeholder="—"
                          />
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-3">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-mist">{refItems.length} item(s)</span>
            {canEdit && (
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1 py-1.5"
              onClick={() =>
                setRefItems((prev) => [
                  ...prev,
                  tab === 'unit'
                    ? { label: '', code: '', metadata: { basis: 'kg', multiplier: 1 } }
                    : { label: '', code: '' },
                ])
              }
            >
              <Plus className="w-4 h-4" /> Add
            </button>
            )}
          </div>
          {tab === 'unit' && (
            <p className="text-xs text-mist mb-2">
              Each unit converts the order quantity to kg via a <strong>basis</strong> (kg, pieces, m²,
              or reel-width linear metre) times a <strong>multiplier</strong>. E.g. Kpcs = pieces × 1000,
              Roll 500 LM = linear metre × 500, 1 MT = kg × 1000. Check <strong>Variable length</strong> to let
              the user enter the length (e.g. a roll's linear metres) on each estimate instead of using a fixed
              multiplier — the multiplier column then becomes just the fallback default.
            </p>
          )}
          {tab === 'product_subtype' && (
            <p className="text-xs text-mist mb-2">
              <strong>Code</strong> sets the family + dimension fields: prefix{' '}
              <code className="bg-slate rounded px-1">pouch_</code> for pouches,{' '}
              <code className="bg-slate rounded px-1">bag_</code> for bags (e.g.{' '}
              <code className="bg-slate rounded px-1">pouch_stand_up</code>,{' '}
              <code className="bg-slate rounded px-1">bag_wicket</code>). Known codes map to specific
              dimension fields; custom codes get the base width/height/ups/trim set.
            </p>
          )}
          <div className="table-wrap">
            <table className="data-table min-w-[420px]">
              <thead>
                <tr>
                  <th>Label</th>
                  {(tab === 'rm_type' || tab === 'product_subtype') && (
                    <th>
                      Code{tab === 'rm_type' && <span className="normal-case tracking-normal text-mist/70 ml-1">(DB type)</span>}
                    </th>
                  )}
                  {tab === 'unit' && (
                    <>
                      <th>Basis</th>
                      <th className="text-right">Multiplier</th>
                      <th className="text-center">Variable length</th>
                    </>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {refItems.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="cell-input w-full min-w-[160px]"
                        placeholder="Label"
                        value={item.label}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const next = [...refItems];
                          next[i] = { ...next[i], label: e.target.value };
                          setRefItems(next);
                        }}
                      />
                    </td>
                    {(tab === 'rm_type' || tab === 'product_subtype') && (
                      <td>
                        <input
                          className="cell-input w-full min-w-[120px] font-mono"
                          placeholder={tab === 'rm_type' ? 'e.g. substrate, ink, plate' : 'code'}
                          value={item.code ?? ''}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const next = [...refItems];
                            next[i] = { ...next[i], code: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') };
                            setRefItems(next);
                          }}
                        />
                      </td>
                    )}
                    {tab === 'unit' && (
                      <>
                        <td>
                          <select
                            className="cell-input w-full min-w-[150px]"
                            value={(item.metadata?.basis as string) ?? 'kg'}
                            disabled={!canEdit}
                            onChange={(e) => {
                              const next = [...refItems];
                              next[i] = {
                                ...next[i],
                                metadata: { ...(next[i].metadata ?? {}), basis: e.target.value },
                              };
                              setRefItems(next);
                            }}
                          >
                            <option value="kg">Kg (weight)</option>
                            <option value="pieces">Pieces</option>
                            <option value="sqm">m² (area)</option>
                            <option value="lm">Linear metre (reel width)</option>
                          </select>
                        </td>
                        <td className="text-right">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            className="cell-input w-24 text-right font-mono"
                            title={
                              item.metadata?.variableMultiplier
                                ? 'Fallback default until the user enters a length on the estimate'
                                : 'Base units per entered unit (e.g. Kpcs = 1000)'
                            }
                            value={String((item.metadata?.multiplier as number) ?? 1)}
                            onChange={(e) => {
                              const next = [...refItems];
                              next[i] = {
                                ...next[i],
                                metadata: { ...(next[i].metadata ?? {}), multiplier: Number(e.target.value) || 0 },
                              };
                              setRefItems(next);
                            }}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            title="User enters the length (multiplier) per estimate, e.g. a roll's linear metres"
                            checked={item.metadata?.variableMultiplier === true}
                            onChange={(e) => {
                              const next = [...refItems];
                              next[i] = {
                                ...next[i],
                                metadata: { ...(next[i].metadata ?? {}), variableMultiplier: e.target.checked },
                              };
                              setRefItems(next);
                            }}
                          />
                        </td>
                      </>
                    )}
                    <td className="text-center">
                      <button
                        type="button"
                        className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors duration-micro ease-micro"
                        onClick={() =>
                          tab === 'rm_type'
                            ? removeRmTypeItem(i)
                            : setRefItems((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <LaminationFormulaModal
        open={formulaMaterialId != null}
        title={formulaMaterial ? `Master formula — ${formulaMaterial.name}` : 'Master formula'}
        recipe={formulaRecipe}
        onClose={() => setFormulaMaterialId(null)}
        onSave={(recipe) => {
          if (!formulaMaterialId) return;
          const stats = deriveBinderConcentrateStats(recipe);
          updateMaterialRow(formulaMaterialId, {
            laminationRecipe: recipe as unknown as Record<string, unknown>,
            solidPercent: stats.solidPercent,
            costPerKgUsd: stats.costPerKgUsd,
            liquidCostUsd: stats.liquidCostUsd,
          });
        }}
      />
    </div>
  );
};

export default MasterData;
