# Graph Report - apps\estimation-studio\packages\web\src  (2026-07-04)

## Corpus Check
- 94 files · ~97,122 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 706 nodes · 1462 edges · 39 communities (37 shown, 2 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 100 edges
2. `useEntrance()` - 25 edges
3. `dimLbl()` - 24 edges
4. `mkT()` - 24 edges
5. `useAuth()` - 24 edges
6. `useReducedMotion()` - 15 edges
7. `EstimateEditor()` - 12 edges
8. `ThemeId` - 11 edges
9. `getTemplateClassification()` - 10 edges
10. `useDrawAreaSize()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `RollVisualizer()` --calls--> `F`  [INFERRED]
  components/RollVisualizer.tsx → lib/productCatalog.ts
- `EntranceCard()` --calls--> `useEntrance()`  [EXTRACTED]
  pages/Dashboard.tsx → hooks/useEntrance.ts
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `PlatformAdminRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (39 total, 2 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (12): BuilderLayer, buildMaterialOptions(), buildProcessCatalogFromOptions(), deriveDefaultProcesses(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (23): BottomSheet(), BottomSheetProps, ConfirmDialog(), ConfirmDialogProps, LaminationFormulaModalProps, ROLES, NumberTicker(), NumberTickerProps (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.50
Nodes (3): SectionTitle(), SectionTitleProps, EstimateStart()

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (60): BagConfigurator(), BagFlatBlank(), Band, CourierBlank(), ExtraPiece, extraPieces(), lengthBands(), Panel (+52 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (28): formatSmartPrice(), PriceListPanelProps, PriceListRow, PriceListUnit, smartPriceDecimals(), smartPriceShownDecimals(), UNIT_LABELS, UNIT_QTY_DECIMALS (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (17): TemplateBuilder(), defaultUnitValue(), normalizeUnitValue(), structureTierLabel(), cardMetaLine(), catalogInput(), classificationContext(), classificationTag() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.50
Nodes (3): EstimateProcessesPanel(), EstimateProcessRow, Props

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (10): UseDensityResult, applyDensityAttribute(), DENSITIES, Density, persistDensity(), resolveDensity(), createPreferenceStore(), nativeStore (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (13): FilmLayer, FilmStackVisualizer(), inkLabelClass(), inkPctClass(), inkVariant(), isMetallizedName(), isNaturalName(), isPaperName() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (18): buildProcessCostCatalog(), buildProcessCostCatalogFromReference(), dimensionsForSave(), estimateNeedsConfiguration(), hasConfiguredProcesses(), lookupProcessCostRow(), normalizeProcessesForSave(), normProcessToken() (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (13): Sparkline(), SparklineProps, SparklineTone, toneVar(), DashboardSummary, EntranceCard(), ResolvedStat, resolveStat() (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (10): COS30, ellipsePoints(), fmt(), project(), Props, Pt, RollVisualizer(), SIN30 (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (24): AccessoryMaterialOption, POUCH_TYPE_LABEL, PouchConfigurator(), accessoriesForPouchType(), ACCESSORY_APPLICABILITY, canonicalPouchSubtype(), configuratorTypeForPouchSubtype(), LEGACY_POUCH_SUBTYPE_ALIASES (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (11): DEFAULT_PRODUCT_SUBTYPE_OPTIONS, ACCESSORY_KIND_OPTIONS, dbTypeForRmCode(), defaultFamilyForRmCode(), MaterialTab, newMaterialRow(), REF_TAB_IDS, REF_TABS (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (12): PlatformAdminRoute(), ProtectedRoute(), Layout(), RouteTransition(), RouteTransitionProps, MasterDataProvider(), AuthState, AuthTenant (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (14): deriveStructureTierFromSubstrates(), deriveTemplateCatalogKey(), EstimateClassificationSnapshot, getEstimateClassification(), getTemplateClassification(), isPrintedTemplate(), matchesCatalogFilter(), matchesClassFilter() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (6): Layer, layerShare(), layerThickness(), Props, TemplateCardLayer, TemplateStructureCard()

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (8): useEntrance(), UseEntranceOptions, UseEntranceResult, CustomerDetail(), MasterLibrary(), MasterMaterial, Register(), TemplateGridCell()

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (9): API_BASE_URL, PlatformMasterMaterialInput, PlatformMasterMaterialRow, PlatformReferenceCategory, PlatformReferenceItemInput, PlatformTemplateSync, TenantSyncResult, UnitBasis (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (10): CustomerAutocompleteProps, CustomerOption, SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), ESTIMATE_STATUS_FILTERS, EstimateStatus, estimateStatusBadgeClass() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (51): QuickThemeSwitcher(), QuickThemeSwitcherProps, IDS, channelToLinear(), clampChannel(), contrastRatio(), expandShortHex(), parseColor() (+43 more)

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (9): Cat, CATS, Row, TenantReferenceEditor(), UNIT_BASES, useMasterDataContext(), MasterDataReferencePayload, MasterData() (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): MotionToken, NON_ESSENTIAL_MOTION_TOKENS, NORMAL_MOTION_DURATIONS, resolveMotionDurations()

### Community 25 - "Community 25"
Cohesion: 0.39
Nodes (6): useDensity(), ADMIN_PROFILE, SALES_REP_PROFILE, useVisibilityProfile(), VISIBILITY_KEYS, Settings()

### Community 26 - "Community 26"
Cohesion: 0.28
Nodes (6): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, ClassFilter, TemplateStructureTier

### Community 27 - "Community 27"
Cohesion: 0.28
Nodes (5): EmptyStateProps, DocumentWithViewTransition, useViewTransition(), CustomersList(), EstimatesList()

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (4): ACCESSORY_KINDS, MaterialRow, TabId, TABS

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (20): ALL_SUBTYPES, BAG_BASE, BAG_SUBTYPES, defaultSubtypeForFamily(), DimensionFieldDef, dimensionFieldsFor(), dimensionFieldsForEstimation(), ESTIMATION_HIDDEN_DIMENSION_KEYS (+12 more)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (3): isNative, KEYS, tokenStore

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (5): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, runClientCalculation(), toMaterial()

### Community 33 - "Community 33"
Cohesion: 0.70
Nodes (4): clearWorkingEstimateForTemplate(), getWorkingEstimateForTemplate(), key(), setWorkingEstimateForTemplate()

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (3): LayerCard(), LayerCardLayer, LayerCardProps

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (14): usdToDisplayPrecise(), effectiveMarginPercent(), findDefaultSolventMaterialId(), listSolventMaterials(), resolveSolventCostPerKgUsd(), SolventMaterialLike, DimensionState, EstimateEditor() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (16): JobHeaderFields(), MasterDataContext, MasterDataContextValue, useMasterDataContextOptional(), useMasterDataReference(), DEFAULT_MASTER_REFERENCE, DEFAULT_RM_TYPE_OPTIONS, defaultProductTypeValue() (+8 more)

### Community 37 - "Community 37"
Cohesion: 0.50
Nodes (3): GradeOption, Props, StructureGradeSelect()

## Knowledge Gaps
- **166 isolated node(s):** `Band`, `Panel`, `ExtraPiece`, `DRAWERS`, `BottomSheetProps` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 35`, `Community 36`, `Community 5`, `Community 38`, `Community 6`, `Community 12`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 25`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.240) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 16` to `Community 1`, `Community 35`, `Community 6`, `Community 15`, `Community 19`, `Community 23`, `Community 25`, `Community 28`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `F` connect `Community 13` to `Community 30`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `Band`, `Panel`, `ExtraPiece` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.052531645569620256 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05990338164251208 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06306306306306306 - nodes in this community are weakly interconnected._