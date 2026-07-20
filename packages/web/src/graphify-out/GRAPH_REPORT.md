# Graph Report - apps\estimation-studio\packages\web\src  (2026-07-19)

## Corpus Check
- 168 files · ~132,346 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1145 nodes · 2552 edges · 60 communities (57 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a5c02440`
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

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 123 edges
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
- `CatalogRefreshCoordinator()` --calls--> `useAuth()`  [EXTRACTED]
  components/CatalogRefreshCoordinator.tsx → contexts/AuthContext.tsx
- `CombinedPriceListPanel()` --calls--> `useAuth()`  [EXTRACTED]
  components/CombinedPriceListPanel.tsx → contexts/AuthContext.tsx
- `CustomerAutocomplete()` --calls--> `useCustomerAccess()`  [EXTRACTED]
  components/CustomerAutocomplete.tsx → hooks/useCustomerAccess.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → contexts/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (60 total, 3 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (11): CatalogRefreshCoordinator(), useMasterDataContextOptional(), MaterialListItem, MaterialsContext, MaterialsContextValue, MaterialsProvider(), useMaterialsContextOptional(), CategoryNode (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (6): FOCUSABLE_SELECTOR, Overlay(), OverlayProps, OverlayVariant, PromptDialog(), PromptDialogProps

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (8): EmptyStateProps, NewQuoteDialog(), NewQuoteDialogProps, RepeatOrderCustomerDialog(), RepeatOrderCustomerDialogProps, EstimatesFolders(), FolderFilter, FolderRow

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (79): CombinedVariantPriceList(), Props, Props, DEFAULT_ROUNDING, PriceListPanel(), PriceListPanelProps, PriceListRow, Props (+71 more)

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (9): UsdPriceInput(), UsdPriceInputProps, formatPrice(), formatUsdInput(), parseUsdInput(), roundUsd(), saleUsdToDisplayAmount(), usdToDisplay() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (13): BuilderLayer, buildMaterialOptions(), buildProcessCatalogFromOptions(), deriveDefaultProcesses(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (20): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, effectiveMarginPercent(), runClientCalculation(), PET, toMaterial(), defaultUnitValue() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (30): CombinedPriceListPanel(), PriceListRow, Props, initialAppliedFromDom(), initialPreferenceFromStorage(), useDensity(), UseDensityResult, ADMIN_PROFILE (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (15): FilmLayer, inkLabelClass(), inkPctClass(), inkVariant(), LayerAppearance, materialKey(), Props, isMetallizedMaterial() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (23): buildProcessCostCatalog(), buildProcessCostCatalogFromReference(), dimensionsForSave(), estimateNeedsConfiguration(), hasConfiguredProcesses(), lookupProcessCostRow(), nonnegativeNumber(), normalizeProcessesForSave() (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (17): SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), Sparkline(), SparklineProps, SparklineTone, toneVar(), useStagger() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (72): RollSpecFields(), ellipsePath(), fmt(), Props, RollVisualizer(), RollVisualizerSvg(), WebConfiguratorField, WebInputField() (+64 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (31): AccessoryMaterialOption, POUCH_TYPE_LABEL, PouchConfigurator(), TOOLING_ACCESSORIES, accessoriesForPouchType(), ACCESSORY_BY_FAMILY, canonicalPouchSubtype(), configuratorTypeForPouchSubtype() (+23 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (16): ES_FAMILY_TO_PB, filterSubstrateMaterialsByFamilyTab(), PEBI_REVIEW_FAMILY_BY_TAB, SUBSTRATE_FAMILY_TABS, Props, SubstrateFamilyNav(), ACCESSORY_KIND_OPTIONS, dbTypeForRmCode() (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (7): CostCells(), lineFor(), Props, SolventCostLine, SolventOption, StructureCostingBlocks(), usdToDisplayPrecise()

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
Cohesion: 0.17
Nodes (11): ConfirmDialog(), ConfirmDialogProps, CustomerFormDialog(), CustomerFormDialogProps, CustomerFormValues, emptyForm, DocumentWithViewTransition, useViewTransition() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (51): QuickThemeSwitcher(), QuickThemeSwitcherProps, IDS, channelToLinear(), clampChannel(), contrastRatio(), expandShortHex(), parseColor() (+43 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (13): LaminateStack3D(), LaminateStack3DLayer, LaminateStack3DProps, TemplateCardLayer, TemplateStructureCard(), isSubstrateLayerType(), materialFamily, materialFamilyColorVar() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): MotionToken, NON_ESSENTIAL_MOTION_TOKENS, NORMAL_MOTION_DURATIONS, resolveMotionDurations()

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (8): CustomerAutocomplete(), CustomerAutocompleteProps, CustomerOption, useCustomerAccess(), CustomerSource, LOCAL_CUSTOMER_ACCESS, resolveCustomerAccess(), CustomerDetail()

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (6): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, ClassFilter, TemplateStructureTier

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (23): formatSalePricePerKgDisplay(), ESTIMATE_STATUS_FILTERS, EstimateStatus, estimateStatusBadgeClass(), isDraftStatus(), meaningfulRequotePriceChanges(), RequotePriceChange, CustomerExplorer() (+15 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (19): BagConfigurator(), BagFlatBlank(), BagSchematic(), BAG_CONFIGURATOR_CATALOG, BAG_CONFIGURATOR_DIMENSION_KEYS, BAG_SUBTYPE_TO_CONFIGURATOR, BagConfiguratorConfig, BagConfiguratorField (+11 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (16): BAG_BASE, BAG_SUBTYPES, defaultSubtypeForFamily(), ESTIMATION_HIDDEN_DIMENSION_KEYS, LEGACY_BAG_SUBTYPES, LEGACY_POUCH_SUBTYPES, POUCH_BASE, POUCH_PICKER_SUBTYPE_CODES (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (6): NumberTicker(), NumberTickerProps, HoverSpringProps, useHoverSpring(), UseHoverSpringOptions, useReducedMotion()

### Community 32 - "Community 32"
Cohesion: 0.21
Nodes (11): defaultCutoffMm(), ROLL_CONFIGURATOR, ROLL_CONFIGURATOR_DIMENSION_KEYS, ROLL_DEFAULTS_CONTINUOUS, ROLL_DEFAULTS_GENERAL, ROLL_DEFAULTS_LABELS, RollConfiguratorConfig, rollConfiguratorDefaults() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (11): cardMetaLine(), catalogInput(), classificationContext(), classificationTag(), _MATERIAL_CLASS_OPTIONS, MaterialOption, _PROCESS_KEYS, productTypeLabel() (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (24): EstimateProcessesPanel(), EstimateProcessRow, Props, isExwDelivery(), JobHeaderFields(), TemplateBuilderProps, MasterDataContext, MasterDataContextValue (+16 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (26): FilmStackVisualizer(), LayerCard(), LayerCardLayer, LayerCardProps, GradeOption, Props, StructureGradeSelect(), useBeforeUnloadGuard() (+18 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (5): ProtectedRoute(), SectionTitle(), SectionTitleProps, EstimateStart(), DensityProvider()

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (4): Layer, layerShare(), layerThickness(), Props

### Community 38 - "Community 38"
Cohesion: 0.31
Nodes (7): Band, ExtraPiece, extraPieces(), lengthBands(), Panel, TwoWebBlank(), widthPanels()

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (23): ALU_PB_CROSSWALK, BOPP_PB_CROSSWALK, CPP_PB_CROSSWALK, PA_PB_CROSSWALK, PAP_PB_CROSSWALK, PB_PET_GRADES, PB_SUBSTRATE_FAMILIES, PE_PB_CROSSWALK (+15 more)

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (4): canManageMasterData(), MasterDataScope, resolveMasterDataScope(), MasterData()

### Community 42 - "Community 42"
Cohesion: 0.36
Nodes (5): buildSpiralModel(), filmThicknessMm(), Pt2, SpiralInput, SpiralModel

### Community 43 - "Community 43"
Cohesion: 0.70
Nodes (4): clearWorkingEstimateForTemplate(), getWorkingEstimateForTemplate(), key(), setWorkingEstimateForTemplate()

### Community 44 - "Community 44"
Cohesion: 0.08
Nodes (17): API_BASE_URL, MasterDataReferencePayload, MaterialsCatalogMeta, PebiMissingMaterial, PebiMissingMaterialsResult, PlatformMasterMaterialInput, PlatformMasterMaterialRow, PlatformReferenceCategory (+9 more)

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (13): AuthContext, AuthContextValue, AuthProvider(), AuthTenant, AuthUser, establishSession(), restoreSession(), useCatalogAccess() (+5 more)

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (8): buildTenantMaterialPayload(), canEditAdhesivePhysicalProps(), canEditInkPhysicalProps(), canEditTenantMaterialRow(), num(), TenantMaterialRow, tenantMaterialToPlatformRow(), usd()

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (6): useEntrance(), UseEntranceOptions, UseEntranceResult, EntranceCard(), Login(), Register()

### Community 52 - "Community 52"
Cohesion: 0.32
Nodes (4): Layout(), useNarrowShell(), RouteTransition(), RouteTransitionProps

### Community 53 - "Community 53"
Cohesion: 0.38
Nodes (4): BottomSheet(), BottomSheetProps, useSwipeToDismiss(), UseSwipeToDismissOptions

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (3): DeckCardProps, TemplateDeck(), TemplateDeckProps

### Community 55 - "Community 55"
Cohesion: 0.38
Nodes (8): isGsmDirectSubstrate(), layerFieldsFromMaterial(), LayerMaterialPatch, materialKey(), MaterialNominalMicronInput, micronAfterMaterialChange(), nominalGsmFromHoover(), nominalMicronFromMaterial()

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (3): StaggerStyle, UseStaggerOptions, UseStaggerResult

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): priceOf(), resolveSeamingSolventCostPerKgUsd(), SeamingMaterialLike

## Knowledge Gaps
- **248 isolated node(s):** `Band`, `Panel`, `ExtraPiece`, `DRAWERS`, `BottomSheetProps` (+243 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 12`, `Community 15`, `Community 18`, `Community 21`, `Community 26`, `Community 27`, `Community 33`, `Community 34`, `Community 35`, `Community 40`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 50`, `Community 51`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 4` to `Community 1`, `Community 34`, `Community 35`, `Community 36`, `Community 33`, `Community 6`, `Community 9`, `Community 41`, `Community 45`, `Community 15`, `Community 51`, `Community 52`, `Community 25`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `PriceListUnit` connect `Community 4` to `Community 35`, `Community 7`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `Band`, `Panel`, `ExtraPiece` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14166666666666666 - nodes in this community are weakly interconnected._