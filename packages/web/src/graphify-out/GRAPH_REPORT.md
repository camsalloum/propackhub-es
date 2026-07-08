# Graph Report - apps\estimation-studio\packages\web\src  (2026-07-07)

## Corpus Check
- 152 files · ~119,974 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1016 nodes · 2292 edges · 49 communities (47 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 122 edges
2. `useAuth()` - 36 edges
3. `dimLbl()` - 24 edges
4. `mkT()` - 24 edges
5. `useEntrance()` - 24 edges
6. `useReducedMotion()` - 17 edges
7. `EstimateEditor()` - 15 edges
8. `useDrawAreaSize()` - 13 edges
9. `PriceListUnit` - 12 edges
10. `substrateFilmHex()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `EntranceCard()` --calls--> `useEntrance()`  [EXTRACTED]
  pages/Dashboard.tsx → hooks/useEntrance.ts
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → contexts/AuthContext.tsx
- `CombinedPriceListPanel()` --calls--> `useAuth()`  [EXTRACTED]
  components/CombinedPriceListPanel.tsx → contexts/AuthContext.tsx
- `CombinedVariantPriceList()` --calls--> `usePriceListCustomSlabs()`  [EXTRACTED]
  components/CombinedVariantPriceList.tsx → hooks/usePriceListCustomSlabs.ts
- `CombinedVariantPriceList()` --calls--> `useQuotePriceListPrefs()`  [EXTRACTED]
  components/CombinedVariantPriceList.tsx → hooks/useQuotePriceListPrefs.ts

## Import Cycles
- None detected.

## Communities (49 total, 2 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (22): ProtectedRoute(), CatalogRefreshCoordinator(), CombinedVariantPriceList(), Layout(), useAuth(), MasterDataContext, MasterDataContextValue, MasterDataProvider() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (21): BottomSheet(), BottomSheetProps, LaminationFormulaModalProps, ROLES, NumberTicker(), NumberTickerProps, FOCUSABLE_SELECTOR, Overlay() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (9): NewQuoteDialog(), NewQuoteDialogProps, RepeatOrderCustomerDialog(), RepeatOrderCustomerDialogProps, SectionTitle(), SectionTitleProps, FolderFilter, FolderRow (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (63): Props, Props, PriceListPanel(), PriceListPanelProps, PriceListRow, Props, usePersistedCustomSlabs(), usePriceListCustomSlabs() (+55 more)

### Community 5 - "Community 5"
Cohesion: 0.27
Nodes (11): UsdPriceInput(), UsdPriceInputProps, cormDisplayPerKgToEngineUsd(), displayToUsd(), formatPrice(), formatUsdInput(), parseUsdInput(), roundUsd() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (16): BuilderLayer, buildMaterialOptions(), buildProcessCatalogFromOptions(), deriveDefaultProcesses(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (17): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, effectiveMarginPercent(), runClientCalculation(), toMaterial(), availablePriceListUnits(), ALL_SUBTYPES (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (9): UseDensityResult, applyDensityAttribute(), DENSITIES, Density, persistDensity(), resolveDensity(), nativeStore, PreferenceStore (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (17): FilmLayer, FilmStackVisualizer(), inkLabelClass(), inkPctClass(), inkVariant(), LayerAppearance, materialKey(), Props (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (20): buildProcessCostCatalog(), buildProcessCostCatalogFromReference(), dimensionsForSave(), estimateNeedsConfiguration(), hasConfiguredProcesses(), lookupProcessCostRow(), nonnegativeNumber(), normalizeProcessesForSave() (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (20): Sparkline(), SparklineProps, SparklineTone, toneVar(), StaggerStyle, useStagger(), UseStaggerOptions, UseStaggerResult (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (72): RollSpecFields(), ellipsePath(), fmt(), Props, RollVisualizer(), RollVisualizerSvg(), WebConfiguratorField, WebInputField() (+64 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (25): AccessoryMaterialOption, POUCH_TYPE_LABEL, PouchConfigurator(), accessoriesForPouchType(), ACCESSORY_APPLICABILITY, canonicalPouchSubtype(), configuratorTypeForPouchSubtype(), LEGACY_POUCH_SUBTYPE_ALIASES (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (22): useMasterDataContext(), PlatformMasterMaterialRow, canManageMasterData(), MasterDataScope, resolveMasterDataScope(), buildTenantMaterialPayload(), canEditTenantMaterialRow(), num() (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.39
Nodes (5): useEntrance(), UseEntranceOptions, UseEntranceResult, Login(), Register()

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (14): deriveStructureTierFromSubstrates(), deriveTemplateCatalogKey(), EstimateClassificationSnapshot, getEstimateClassification(), getTemplateClassification(), isPrintedTemplate(), matchesCatalogFilter(), matchesClassFilter() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (9): DuplicateEstimateDialog(), Props, Props, isLockedQuote(), QuoteEstimate, QuotePayload, quoteStatusLabel(), QuoteWorkspace() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (20): BagFlatBlank(), Band, CourierBlank(), ExtraPiece, extraPieces(), lengthBands(), Panel, TwoWebBlank() (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (21): DrawBottomGusset(), DrawCourier(), DrawDiaper(), DRAWERS, DrawGusseted(), DrawIndustrial(), DrawLoop(), DrawPatch() (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (10): ConfirmDialog(), ConfirmDialogProps, CustomerFormDialog(), CustomerFormDialogProps, CustomerFormValues, emptyForm, SkeletonCard(), SkeletonDashboard() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (51): QuickThemeSwitcher(), QuickThemeSwitcherProps, IDS, channelToLinear(), clampChannel(), contrastRatio(), expandShortHex(), parseColor() (+43 more)

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (10): LaminateStack3DLayer, LaminateStack3DProps, isSubstrateLayerType(), materialFamily, materialFamilyColorVar(), NON_SUBSTRATE_TYPES, resolveLayerType(), substrateFamily (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): MotionToken, NON_ESSENTIAL_MOTION_TOKENS, NORMAL_MOTION_DURATIONS, resolveMotionDurations()

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (9): CombinedPriceListPanel(), PriceListRow, Props, useDensity(), ADMIN_PROFILE, SALES_REP_PROFILE, useVisibilityProfile(), VISIBILITY_KEYS (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.28
Nodes (6): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, ClassFilter, TemplateStructureTier

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (18): isDraftStatus(), meaningfulRequotePriceChanges(), RequotePriceChange, CustomerExplorer(), ExplorerEstimate, ExplorerQuote, ExplorerRow, ExplorerSection (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (17): BagConfigurator(), BAG_CONFIGURATOR_CATALOG, BAG_CONFIGURATOR_DIMENSION_KEYS, BAG_SUBTYPE_TO_CONFIGURATOR, BagConfiguratorConfig, BagConfiguratorField, BagConfiguratorType, bagDefaultsPatchForSubtype() (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (17): BAG_BASE, BAG_SUBTYPES, defaultSubtypeForFamily(), dimensionFieldsFor(), dimensionFieldsForEstimation(), ESTIMATION_HIDDEN_DIMENSION_KEYS, getSubtype(), LEGACY_BAG_SUBTYPES (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (3): isNative, KEYS, tokenStore

### Community 32 - "Community 32"
Cohesion: 0.21
Nodes (11): defaultCutoffMm(), ROLL_CONFIGURATOR, ROLL_CONFIGURATOR_DIMENSION_KEYS, ROLL_DEFAULTS_CONTINUOUS, ROLL_DEFAULTS_GENERAL, ROLL_DEFAULTS_LABELS, RollConfiguratorConfig, rollConfiguratorDefaults() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (11): cardMetaLine(), catalogInput(), classificationContext(), classificationTag(), _MATERIAL_CLASS_OPTIONS, MaterialOption, _PROCESS_KEYS, productTypeLabel() (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (19): EstimateProcessesPanel(), EstimateProcessRow, Props, isExwDelivery(), JobHeaderFields(), productTypeForSave(), DEFAULT_PROCESS_OPTIONS, DEFAULT_PRODUCT_SUBTYPE_OPTIONS (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (22): LayerCard(), LayerCardLayer, LayerCardProps, GradeOption, Props, StructureGradeSelect(), CategoryNode, DEFAULT_SUBSTRATE_FAMILIES (+14 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (10): API_BASE_URL, MasterDataReferencePayload, MaterialsCatalogMeta, PlatformMasterMaterialInput, PlatformReferenceCategory, PlatformReferenceItemInput, PlatformTemplateSync, TenantSyncResult (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (7): LaminateStack3D(), Layer, layerShare(), layerThickness(), Props, TemplateCardLayer, TemplateStructureCard()

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (8): CustomerAutocomplete(), CustomerAutocompleteProps, CustomerOption, useCustomerAccess(), CustomerSource, LOCAL_CUSTOMER_ACCESS, resolveCustomerAccess(), CustomersList()

### Community 39 - "Community 39"
Cohesion: 0.24
Nodes (6): EmptyStateProps, ESTIMATE_STATUS_FILTERS, EstimateStatus, estimateStatusBadgeClass(), estimateStatusLabel(), EstimatesList()

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (13): AuthContext, AuthContextValue, AuthProvider(), AuthTenant, AuthUser, establishSession(), restoreSession(), useCatalogAccess() (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.36
Nodes (5): buildSpiralModel(), filmThicknessMm(), Pt2, SpiralInput, SpiralModel

### Community 43 - "Community 43"
Cohesion: 0.70
Nodes (4): clearWorkingEstimateForTemplate(), getWorkingEstimateForTemplate(), key(), setWorkingEstimateForTemplate()

## Knowledge Gaps
- **213 isolated node(s):** `Band`, `Panel`, `ExtraPiece`, `DRAWERS`, `BottomSheetProps` (+208 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 12`, `Community 15`, `Community 16`, `Community 18`, `Community 21`, `Community 25`, `Community 27`, `Community 33`, `Community 35`, `Community 36`, `Community 39`, `Community 40`, `Community 41`, `Community 44`, `Community 46`, `Community 48`, `Community 49`, `Community 50`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 33`, `Community 35`, `Community 4`, `Community 38`, `Community 6`, `Community 41`, `Community 15`, `Community 16`, `Community 25`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `PriceListUnit` connect `Community 4` to `Community 35`, `Community 7`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `Band`, `Panel`, `ExtraPiece` to the rest of the system?**
  _213 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05228070175438596 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12473118279569892 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05920444033302498 - nodes in this community are weakly interconnected._