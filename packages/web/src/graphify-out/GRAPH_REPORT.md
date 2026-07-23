# Graph Report - apps\estimation-studio\packages\web\src  (2026-07-22)

## Corpus Check
- 181 files · ~135,638 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1196 nodes · 2669 edges · 67 communities (64 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bb148f2d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 124 edges
2. `useAuth()` - 36 edges
3. `dimLbl()` - 26 edges
4. `mkT()` - 26 edges
5. `useEntrance()` - 24 edges
6. `useReducedMotion()` - 17 edges
7. `EstimateEditor()` - 16 edges
8. `useDrawAreaSize()` - 13 edges
9. `PriceListUnit` - 12 edges
10. `substrateFilmHex()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → contexts/AuthContext.tsx
- `CombinedPriceListPanel()` --calls--> `useAuth()`  [EXTRACTED]
  components/CombinedPriceListPanel.tsx → contexts/AuthContext.tsx
- `CombinedVariantPriceList()` --calls--> `useAuth()`  [EXTRACTED]
  components/CombinedVariantPriceList.tsx → contexts/AuthContext.tsx
- `CombinedVariantPriceList()` --calls--> `usePriceListCustomSlabs()`  [EXTRACTED]
  components/CombinedVariantPriceList.tsx → hooks/usePriceListCustomSlabs.ts
- `CombinedVariantPriceList()` --calls--> `roundingSelectValue()`  [EXTRACTED]
  components/CombinedVariantPriceList.tsx → lib/quotePriceListPrefs.ts

## Import Cycles
- None detected.

## Communities (67 total, 3 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (15): ProtectedRoute(), CatalogRefreshCoordinator(), Layout(), useNarrowShell(), useAuth(), MasterDataProvider(), useMasterDataContextOptional(), MaterialListItem (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (6): FOCUSABLE_SELECTOR, Overlay(), OverlayProps, OverlayVariant, PromptDialog(), PromptDialogProps

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (6): NewQuoteDialog(), NewQuoteDialogProps, RepeatOrderCustomerDialog(), RepeatOrderCustomerDialogProps, FolderFilter, FolderRow

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (25): Props, bandRangeKg(), buildCustomSlabPrice(), customSlabKey(), CustomSlabPriceRow, customSlabRangeLabels(), formatBandRange(), formatCustomSlabQty() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.50
Nodes (4): UsdPriceInput(), UsdPriceInputProps, formatUsdInput(), parseUsdInput()

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (13): BuilderLayer, buildMaterialOptions(), buildProcessCatalogFromOptions(), deriveDefaultProcesses(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (19): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, runClientCalculation(), PET, toMaterial(), defaultUnitValue(), normalizeUnitValue() (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (22): initialAppliedFromDom(), initialPreferenceFromStorage(), UseDensityResult, applyDensityAttribute(), DENSITIES, Density, DENSITY_PREFERENCES, DensityPreference (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (17): FilmLayer, FilmStackVisualizer(), inkLabelClass(), inkPctClass(), inkVariant(), LayerAppearance, materialKey(), Props (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (23): buildProcessCostCatalog(), buildProcessCostCatalogFromReference(), dimensionsForSave(), estimateNeedsConfiguration(), hasConfiguredProcesses(), lookupProcessCostRow(), nonnegativeNumber(), normalizeProcessesForSave() (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (16): SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), Sparkline(), SparklineProps, SparklineTone, toneVar(), DashboardSummary (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (72): RollSpecFields(), ellipsePath(), fmt(), Props, RollVisualizer(), RollVisualizerSvg(), WebConfiguratorField, WebInputField() (+64 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (31): AccessoryMaterialOption, POUCH_TYPE_LABEL, PouchConfigurator(), TOOLING_ACCESSORIES, accessoriesForPouchType(), ACCESSORY_BY_FAMILY, canonicalPouchSubtype(), configuratorTypeForPouchSubtype() (+23 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (13): SUBSTRATE_FAMILY_TABS, Props, SubstrateFamilyNav(), ACCESSORY_KIND_OPTIONS, dbTypeForRmCode(), defaultFamilyForRmCode(), MaterialTab, newMaterialRow() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (12): CostCells(), lineFor(), Props, SolventCostLine, SolventOption, StructureCostingBlocks(), cormDisplayPerKgToEngineUsd(), displayToUsd() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (14): deriveStructureTierFromSubstrates(), deriveTemplateCatalogKey(), EstimateClassificationSnapshot, getEstimateClassification(), getTemplateClassification(), isPrintedTemplate(), matchesCatalogFilter(), matchesClassFilter() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (15): DuplicateEstimateDialog(), Props, deliveryTermSelectOptions(), Props, QuoteSummaryPanel(), COMMON_PAYMENT_TERM_OPTIONS, DELIVERY_TERM_OPTIONS, DeliveryTermOption (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (11): C, DimH(), DimV(), Grid(), useDrawAreaSize(), BlankRect(), ExtraPiece, PouchFlatBlank() (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (22): CourierBlank(), DrawBottomGusset(), DrawCourier(), DrawDiaper(), DRAWERS, DrawGusseted(), DrawIndustrial(), DrawLoop() (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (10): ConfirmDialog(), ConfirmDialogProps, CustomerFormDialog(), CustomerFormDialogProps, CustomerFormValues, emptyForm, DocumentWithViewTransition, useViewTransition() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (50): QuickThemeSwitcher(), QuickThemeSwitcherProps, IDS, channelToLinear(), clampChannel(), contrastRatio(), expandShortHex(), parseColor() (+42 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (12): LaminateStack3D(), LaminateStack3DLayer, LaminateStack3DProps, STACK_SRC, stackSrcForCount(), TemplateCardLayer, TemplateStructureCard(), materialFamily (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): MotionToken, NON_ESSENTIAL_MOTION_TOKENS, NORMAL_MOTION_DURATIONS, resolveMotionDurations()

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (8): CustomerAutocomplete(), CustomerAutocompleteProps, CustomerOption, useCustomerAccess(), CustomerSource, LOCAL_CUSTOMER_ACCESS, resolveCustomerAccess(), CustomerDetail()

### Community 26 - "Community 26"
Cohesion: 0.21
Nodes (7): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, EmptyStateProps, ClassFilter, TemplateStructureTier

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (20): formatSalePricePerKgDisplay(), isDraftStatus(), meaningfulRequotePriceChanges(), RequotePriceChange, CustomerExplorer(), ExplorerEstimate, ExplorerQuote, ExplorerRow (+12 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (19): BagConfigurator(), BagFlatBlank(), BagSchematic(), BAG_CONFIGURATOR_CATALOG, BAG_CONFIGURATOR_DIMENSION_KEYS, BAG_SUBTYPE_TO_CONFIGURATOR, BagConfiguratorConfig, BagConfiguratorField (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (19): BAG_BASE, BAG_SUBTYPES, defaultSubtypeForFamily(), dimensionFieldsFor(), dimensionFieldsForEstimation(), ESTIMATION_HIDDEN_DIMENSION_KEYS, getSubtype(), LEGACY_BAG_SUBTYPES (+11 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (8): NumberTicker(), NumberTickerProps, RouteTransition(), RouteTransitionProps, HoverSpringProps, useHoverSpring(), UseHoverSpringOptions, useReducedMotion()

### Community 32 - "Community 32"
Cohesion: 0.21
Nodes (11): defaultCutoffMm(), ROLL_CONFIGURATOR, ROLL_CONFIGURATOR_DIMENSION_KEYS, ROLL_DEFAULTS_CONTINUOUS, ROLL_DEFAULTS_GENERAL, ROLL_DEFAULTS_LABELS, RollConfiguratorConfig, rollConfiguratorDefaults() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (21): TemplateBrowserViewToggle(), TemplateGallery(), useStagger(), TemplateBrowserView, useTemplateBrowserView(), isSubstrateLayerType(), resolveLayerType(), Dashboard() (+13 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (22): EstimateProcessesPanel(), EstimateProcessRow, Props, isExwDelivery(), JobHeaderFields(), TemplateBuilderProps, MasterDataContext, MasterDataContextValue (+14 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (25): LayerCard(), LayerCardLayer, LayerCardProps, GradeOption, Props, StructureGradeSelect(), useBeforeUnloadGuard(), effectiveMarginPercent() (+17 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (10): SectionTitle(), SectionTitleProps, packageStatusBadgeClass(), packageStatusLabel(), RecentPackagesTable(), ESTIMATE_STATUS_FILTERS, EstimateStatus, estimateStatusBadgeClass() (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (4): Layer, layerShare(), layerThickness(), Props

### Community 38 - "Community 38"
Cohesion: 0.31
Nodes (7): Band, ExtraPiece, extraPieces(), lengthBands(), Panel, TwoWebBlank(), widthPanels()

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (26): ALU_PB_CROSSWALK, BOPP_PB_CROSSWALK, CPP_PB_CROSSWALK, ES_FAMILY_TO_PB, filterSubstrateMaterialsByFamilyTab(), PA_PB_CROSSWALK, PAP_PB_CROSSWALK, PB_PET_GRADES (+18 more)

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (5): useMasterDataContext(), canManageMasterData(), MasterDataScope, resolveMasterDataScope(), MasterData()

### Community 42 - "Community 42"
Cohesion: 0.36
Nodes (5): buildSpiralModel(), filmThicknessMm(), Pt2, SpiralInput, SpiralModel

### Community 43 - "Community 43"
Cohesion: 0.70
Nodes (4): clearWorkingEstimateForTemplate(), getWorkingEstimateForTemplate(), key(), setWorkingEstimateForTemplate()

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (13): API_BASE_URL, MasterDataReferencePayload, MaterialsCatalogMeta, PebiMissingMaterial, PebiMissingMaterialsResult, PlatformMasterMaterialInput, PlatformReferenceCategory, PlatformReferenceItemInput (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (13): AuthContext, AuthContextValue, AuthProvider(), AuthTenant, AuthUser, establishSession(), restoreSession(), useCatalogAccess() (+5 more)

### Community 47 - "Community 47"
Cohesion: 0.21
Nodes (12): PlatformMasterMaterialRow, formatPrice(), roundUsd(), buildTenantMaterialPayload(), canEditAdhesivePhysicalProps(), canEditInkPhysicalProps(), canEditTenantMaterialRow(), num() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.28
Nodes (7): useEntrance(), UseEntranceOptions, UseEntranceResult, EntranceCard(), EstimatesFolders(), EstimatesList(), Register()

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (16): CostBreakdownCard(), CostBreakdownCardProps, METHOD_OPTIONS, buildCostBreakdownRows(), CostBreakdownLayer, CostBreakdownMaterial, CostBreakdownRow, buildRmTotals() (+8 more)

### Community 53 - "Community 53"
Cohesion: 0.38
Nodes (4): BottomSheet(), BottomSheetProps, useSwipeToDismiss(), UseSwipeToDismissOptions

### Community 54 - "Community 54"
Cohesion: 0.28
Nodes (7): DeckCard(), DeckCardProps, dragStepForWidth(), FAN_X, fanXForWidth(), TemplateDeck(), TemplateDeckProps

### Community 55 - "Community 55"
Cohesion: 0.38
Nodes (8): isGsmDirectSubstrate(), layerFieldsFromMaterial(), LayerMaterialPatch, materialKey(), MaterialNominalMicronInput, micronAfterMaterialChange(), nominalGsmFromHoover(), nominalMicronFromMaterial()

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (3): StaggerStyle, UseStaggerOptions, UseStaggerResult

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): priceOf(), resolveSeamingSolventCostPerKgUsd(), SeamingMaterialLike

### Community 60 - "Community 60"
Cohesion: 0.19
Nodes (16): buildPrefsFromState(), canPersist(), DEFAULT_ROUNDING, Options, PatchOptions, PrefsState, readInitialState(), shouldPersist() (+8 more)

### Community 61 - "Community 61"
Cohesion: 0.17
Nodes (14): CombinedVariantPriceList(), Props, Props, useMasterDataReference(), useQuotePriceListPrefs(), bandKey(), findMatchingBand(), intersectPriceListUnits() (+6 more)

### Community 62 - "Community 62"
Cohesion: 0.21
Nodes (14): DEFAULT_ROUNDING, PriceListPanel(), PriceListPanelProps, PriceListRow, usePersistedCustomSlabs(), usePriceListCustomSlabs(), activeWasteBands(), buildCustomSlabPrices() (+6 more)

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (8): CombinedPriceListPanel(), PriceListRow, Props, ADMIN_PROFILE, SALES_REP_PROFILE, useVisibilityProfile(), VISIBILITY_KEYS, structureDisplayLines()

### Community 64 - "Community 64"
Cohesion: 0.23
Nodes (9): useDensity(), Settings(), DensityContext, useDensity(), OperatingCostSettingsFields(), Props, GROUPS, Props (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (3): isNative, KEYS, tokenStore

## Knowledge Gaps
- **254 isolated node(s):** `Band`, `Panel`, `ExtraPiece`, `DRAWERS`, `BottomSheetProps` (+249 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 3`, `Community 6`, `Community 12`, `Community 15`, `Community 18`, `Community 21`, `Community 26`, `Community 27`, `Community 33`, `Community 34`, `Community 35`, `Community 40`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 60`, `Community 61`, `Community 63`, `Community 64`, `Community 66`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 64`, `Community 33`, `Community 34`, `Community 35`, `Community 6`, `Community 41`, `Community 45`, `Community 15`, `Community 51`, `Community 25`, `Community 61`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `PriceListUnit` connect `Community 62` to `Community 35`, `Community 4`, `Community 7`, `Community 9`, `Community 60`, `Community 61`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `Band`, `Panel`, `ExtraPiece` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14166666666666666 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.1310344827586207 - nodes in this community are weakly interconnected._