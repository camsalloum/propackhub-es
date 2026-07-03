# Graph Report - apps\estimation-studio\packages\web\src  (2026-07-03)

## Corpus Check
- 93 files · ~92,664 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 686 nodes · 1427 edges · 31 communities (29 shown, 2 thin omitted)
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 100 edges
2. `useEntrance()` - 25 edges
3. `dimLbl()` - 24 edges
4. `mkT()` - 24 edges
5. `useAuth()` - 22 edges
6. `useReducedMotion()` - 15 edges
7. `EstimateEditor()` - 11 edges
8. `ThemeId` - 11 edges
9. `getTemplateClassification()` - 10 edges
10. `useDrawAreaSize()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `RollVisualizer()` --calls--> `F`  [INFERRED]
  components/RollVisualizer.tsx → lib/productCatalog.ts
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `PlatformAdminRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts
- `QuickThemeSwitcher()` --calls--> `useTheme()`  [EXTRACTED]
  components/QuickThemeSwitcher.tsx → theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (31 total, 2 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (13): BuilderLayer, buildMaterialOptions(), buildProcessCatalogFromOptions(), deriveDefaultProcesses(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (22): BottomSheet(), BottomSheetProps, ConfirmDialog(), ConfirmDialogProps, LaminationFormulaModalProps, ROLES, NumberTicker(), NumberTickerProps (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (14): deriveStructureTierFromSubstrates(), deriveTemplateCatalogKey(), EstimateClassificationSnapshot, getEstimateClassification(), getTemplateClassification(), isPrintedTemplate(), matchesCatalogFilter(), matchesClassFilter() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (58): BagConfigurator(), BagFlatBlank(), Band, CourierBlank(), ExtraPiece, extraPieces(), lengthBands(), Panel (+50 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (28): MasterDataContext, MasterDataContextValue, MasterDataProvider(), useMasterDataContextOptional(), useMasterDataReference(), displayToUsd(), formatPrice(), roundUsd() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (15): TemplateBuilder(), structureTierLabel(), cardMetaLine(), catalogInput(), classificationContext(), classificationTag(), _MATERIAL_CLASS_OPTIONS, MaterialOption (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (6): Layer, layerShare(), layerThickness(), Props, TemplateCardLayer, TemplateStructureCard()

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (10): UseDensityResult, applyDensityAttribute(), DENSITIES, Density, persistDensity(), resolveDensity(), createPreferenceStore(), nativeStore (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (13): FilmLayer, FilmStackVisualizer(), inkLabelClass(), inkPctClass(), inkVariant(), isMetallizedName(), isNaturalName(), isPaperName() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (17): buildProcessCostCatalog(), buildProcessCostCatalogFromReference(), dimensionsForSave(), estimateNeedsConfiguration(), hasConfiguredProcesses(), lookupProcessCostRow(), normalizeProcessesForSave(), normProcessToken() (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.70
Nodes (4): clearWorkingEstimateForTemplate(), getWorkingEstimateForTemplate(), key(), setWorkingEstimateForTemplate()

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (10): COS30, ellipsePoints(), fmt(), project(), Props, Pt, RollVisualizer(), SIN30 (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (25): AccessoryMaterialOption, POUCH_TYPE_LABEL, PouchConfigurator(), accessoriesForPouchType(), ACCESSORY_APPLICABILITY, canonicalPouchSubtype(), configuratorTypeForPouchSubtype(), LEGACY_POUCH_SUBTYPE_ALIASES (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (10): ACCESSORY_KIND_OPTIONS, dbTypeForRmCode(), defaultFamilyForRmCode(), MaterialTab, newMaterialRow(), REF_TAB_IDS, REF_TABS, RefTab (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (14): PlatformAdminRoute(), ProtectedRoute(), Layout(), RouteTransition(), AuthState, AuthTenant, AuthUser, initialState (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.50
Nodes (4): productTypeForSave(), defaultProductTypeValue(), normalizeProductType(), engineTypeForFamily()

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (12): API_BASE_URL, PlatformMasterMaterialInput, PlatformMasterMaterialRow, PlatformReferenceCategory, PlatformReferenceItemInput, TenantSyncResult, UnitBasis, UnitRow (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (42): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, EmptyStateProps, SectionTitle(), SectionTitleProps, SkeletonCard() (+34 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (50): QuickThemeSwitcher(), QuickThemeSwitcherProps, IDS, channelToLinear(), clampChannel(), contrastRatio(), expandShortHex(), parseColor() (+42 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (13): Cat, CATS, Row, TenantReferenceEditor(), UNIT_BASES, useMasterDataContext(), MasterDataReferencePayload, MasterData() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): MotionToken, NON_ESSENTIAL_MOTION_TOKENS, NORMAL_MOTION_DURATIONS, resolveMotionDurations()

### Community 25 - "Community 25"
Cohesion: 0.39
Nodes (6): useDensity(), ADMIN_PROFILE, SALES_REP_PROFILE, useVisibilityProfile(), VISIBILITY_KEYS, Settings()

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (3): LayerCard(), LayerCardLayer, LayerCardProps

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (19): ALL_SUBTYPES, BAG_BASE, BAG_SUBTYPES, defaultSubtypeForFamily(), DimensionFieldDef, dimensionFieldsFor(), dimensionFieldsForEstimation(), EngineProductType (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (6): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, effectiveMarginPercent(), runClientCalculation(), toMaterial()

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (16): EstimateProcessesPanel(), EstimateProcessRow, Props, GradeOption, Props, StructureGradeSelect(), findDefaultSolventMaterialId(), listSolventMaterials() (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (11): JobHeaderFields(), selectOnFocus(), DEFAULT_PRODUCT_SUBTYPE_OPTIONS, defaultUnitValue(), normalizeUnitValue(), PrintingWebOption, PrintingWebValue, ProductTypeOption (+3 more)

## Knowledge Gaps
- **161 isolated node(s):** `Band`, `Panel`, `ExtraPiece`, `DRAWERS`, `BottomSheetProps` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 35`, `Community 5`, `Community 6`, `Community 15`, `Community 16`, `Community 20`, `Community 21`, `Community 23`, `Community 25`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Why does `F` connect `Community 13` to `Community 30`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 16` to `Community 35`, `Community 5`, `Community 6`, `Community 15`, `Community 23`, `Community 25`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `Band`, `Panel`, `ExtraPiece` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.052531645569620256 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05673758865248227 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06651017214397496 - nodes in this community are weakly interconnected._