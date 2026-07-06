# Graph Report - apps\estimation-studio\packages\web\src  (2026-07-05)

## Corpus Check
- 115 files · ~113,788 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 849 nodes · 1839 edges · 46 communities (43 shown, 3 thin omitted)
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
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 120 edges
2. `useAuth()` - 30 edges
3. `useEntrance()` - 29 edges
4. `dimLbl()` - 24 edges
5. `mkT()` - 24 edges
6. `useReducedMotion()` - 15 edges
7. `EstimateEditor()` - 14 edges
8. `buildCustomSlabPrice()` - 11 edges
9. `ThemeId` - 11 edges
10. `useMasterDataReference()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts
- `RollVisualizer()` --calls--> `F`  [INFERRED]
  components/RollVisualizer.tsx → lib/productCatalog.ts
- `EntranceCard()` --calls--> `useEntrance()`  [EXTRACTED]
  pages/Dashboard.tsx → hooks/useEntrance.ts
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `PlatformAdminRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (46 total, 3 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (10): BuilderLayer, buildMaterialOptions(), buildProcessCatalogFromOptions(), deriveDefaultProcesses(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (6): LaminationFormulaModalProps, ROLES, FOCUSABLE_SELECTOR, Overlay(), OverlayProps, OverlayVariant

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (12): CustomerAutocompleteProps, CustomerOption, NewQuoteDialog(), NewQuoteDialogProps, RepeatOrderCustomerDialog(), RepeatOrderCustomerDialogProps, SectionTitle(), SectionTitleProps (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (50): CombinedVariantPriceList(), Props, Props, PriceListPanel(), PriceListPanelProps, PriceListRow, Props, usePersistedCustomSlabs() (+42 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (18): formatPrice(), roundUsd(), usdToDisplay(), RmTypeOption, CategoryNode, DEFAULT_SUBSTRATE_FAMILIES, deriveSubstrateFamilies(), deriveSubstrateGrades() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (15): TemplateBuilder(), structureTierLabel(), cardMetaLine(), catalogInput(), classificationContext(), classificationTag(), _MATERIAL_CLASS_OPTIONS, MaterialOption (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (18): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, runClientCalculation(), toMaterial(), productTypeForSave(), defaultProductTypeValue(), defaultUnitValue() (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (10): UseDensityResult, applyDensityAttribute(), DENSITIES, Density, persistDensity(), resolveDensity(), createPreferenceStore(), nativeStore (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (14): FilmLayer, FilmStackVisualizer(), inkLabelClass(), inkPctClass(), inkVariant(), isMetallizedName(), isNaturalName(), isPaperName() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (21): buildProcessCostCatalog(), buildProcessCostCatalogFromReference(), dimensionsForSave(), estimateNeedsConfiguration(), hasConfiguredProcesses(), lookupProcessCostRow(), nonnegativeNumber(), normalizeProcessesForSave() (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (15): SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), SparklineTone, useStagger(), Dashboard(), DashboardSummary, EntranceCard() (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (10): COS30, ellipsePoints(), fmt(), project(), Props, Pt, RollVisualizer(), SIN30 (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (25): AccessoryMaterialOption, POUCH_TYPE_LABEL, PouchConfigurator(), accessoriesForPouchType(), ACCESSORY_APPLICABILITY, canonicalPouchSubtype(), configuratorTypeForPouchSubtype(), LEGACY_POUCH_SUBTYPE_ALIASES (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (20): API_BASE_URL, PlatformMasterMaterialInput, PlatformMasterMaterialRow, PlatformReferenceCategory, PlatformReferenceItemInput, PlatformTemplateSync, TenantSyncResult, UnitBasis (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (16): PlatformAdminRoute(), ProtectedRoute(), MasterDataProvider(), AuthState, AuthTenant, AuthUser, initialState, useAuth() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (14): deriveStructureTierFromSubstrates(), deriveTemplateCatalogKey(), EstimateClassificationSnapshot, getEstimateClassification(), getTemplateClassification(), isPrintedTemplate(), matchesCatalogFilter(), matchesClassFilter() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (6): Layer, layerShare(), layerThickness(), Props, TemplateCardLayer, TemplateStructureCard()

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (58): BagConfigurator(), BagFlatBlank(), Band, CourierBlank(), ExtraPiece, extraPieces(), lengthBands(), Panel (+50 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (11): CustomerFormDialog(), CustomerFormDialogProps, CustomerFormValues, emptyForm, EmptyStateProps, DocumentWithViewTransition, useViewTransition(), CustomerDetail() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (51): QuickThemeSwitcher(), QuickThemeSwitcherProps, IDS, channelToLinear(), clampChannel(), contrastRatio(), expandShortHex(), parseColor() (+43 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (13): Cat, CATS, Row, TenantReferenceEditor(), UNIT_BASES, useMasterDataContext(), MasterDataReferencePayload, MasterData() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): MotionToken, NON_ESSENTIAL_MOTION_TOKENS, NORMAL_MOTION_DURATIONS, resolveMotionDurations()

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (9): CombinedPriceListPanel(), PriceListRow, Props, useDensity(), ADMIN_PROFILE, SALES_REP_PROFILE, useVisibilityProfile(), VISIBILITY_KEYS (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (6): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, ClassFilter, TemplateStructureTier

### Community 27 - "Community 27"
Cohesion: 0.06
Nodes (30): DuplicateEstimateDialog(), Props, Props, ESTIMATE_STATUS_FILTERS, EstimateStatus, estimateStatusBadgeClass(), isDraftStatus(), meaningfulRequotePriceChanges() (+22 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (17): BAG_BASE, BAG_SUBTYPES, defaultSubtypeForFamily(), dimensionFieldsFor(), dimensionFieldsForEstimation(), ESTIMATION_HIDDEN_DIMENSION_KEYS, getSubtype(), LEGACY_BAG_SUBTYPES (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (3): isNative, KEYS, tokenStore

### Community 33 - "Community 33"
Cohesion: 0.70
Nodes (4): clearWorkingEstimateForTemplate(), getWorkingEstimateForTemplate(), key(), setWorkingEstimateForTemplate()

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (15): EstimateProcessesPanel(), EstimateProcessRow, Props, TemplateBuilderProps, MasterDataContext, MasterDataContextValue, useMasterDataContextOptional(), useMasterDataReference() (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (21): LayerCard(), LayerCardLayer, LayerCardProps, GradeOption, Props, StructureGradeSelect(), effectiveMarginPercent(), estimateStatusLabel() (+13 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (11): isExwDelivery(), JobHeaderFields(), selectOnFocus(), ProductTypeOption, ProductTypeValue, UnitOption, DimensionFieldDef, normalizeToolingScenario() (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (6): NumberTicker(), NumberTickerProps, HoverSpringProps, useHoverSpring(), UseHoverSpringOptions, useReducedMotion()

### Community 41 - "Community 41"
Cohesion: 0.38
Nodes (4): BottomSheet(), BottomSheetProps, useSwipeToDismiss(), UseSwipeToDismissOptions

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (3): Layout(), RouteTransition(), RouteTransitionProps

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (3): StaggerStyle, UseStaggerOptions, UseStaggerResult

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (3): Sparkline(), SparklineProps, toneVar()

## Knowledge Gaps
- **193 isolated node(s):** `Band`, `Panel`, `ExtraPiece`, `DRAWERS`, `BottomSheetProps` (+188 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 12`, `Community 15`, `Community 16`, `Community 21`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 34`, `Community 35`, `Community 38`, `Community 40`, `Community 46`, `Community 48`, `Community 49`, `Community 50`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 16` to `Community 1`, `Community 35`, `Community 4`, `Community 6`, `Community 42`, `Community 15`, `Community 23`, `Community 25`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `F` connect `Community 13` to `Community 30`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `Band`, `Panel`, `ExtraPiece` to the rest of the system?**
  _193 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05368382080710848 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._