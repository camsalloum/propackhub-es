# Graph Report - apps\estimation-studio\packages\web\src  (2026-06-28)

## Corpus Check
- 86 files · ~75,851 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 616 nodes · 1287 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 92 edges
2. `useEntrance()` - 25 edges
3. `dimLbl()` - 24 edges
4. `mkT()` - 24 edges
5. `useAuth()` - 19 edges
6. `useReducedMotion()` - 15 edges
7. `EstimateEditor()` - 14 edges
8. `ThemeId` - 11 edges
9. `getTemplateClassification()` - 10 edges
10. `useDrawAreaSize()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts
- `QuickThemeSwitcher()` --calls--> `useTheme()`  [EXTRACTED]
  components/QuickThemeSwitcher.tsx → theme/ThemeProvider.tsx
- `RouteTransition()` --calls--> `useReducedMotion()`  [EXTRACTED]
  components/RouteTransition.tsx → hooks/useReducedMotion.ts
- `TemplateBuilderProps` --references--> `ProductSubtypeOption`  [EXTRACTED]
  components/TemplateBuilder.tsx → lib/masterDataReference.ts

## Import Cycles
- None detected.

## Communities (27 total, 2 thin omitted)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (19): BottomSheet(), BottomSheetProps, LaminationFormulaModalProps, ROLES, NumberTicker(), NumberTickerProps, FOCUSABLE_SELECTOR, Overlay() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (10): BuilderLayer, buildMaterialOptions(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect(), STRUCTURE_TIERS, TemplateBuilderProps (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (59): BagConfigurator(), BagFlatBlank(), Band, CourierBlank(), ExtraPiece, extraPieces(), lengthBands(), Panel (+51 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (17): formatPrice(), roundUsd(), RmTypeOption, CategoryNode, DEFAULT_SUBSTRATE_FAMILIES, deriveSubstrateFamilies(), deriveSubstrateGrades(), groupMaterialsForPicker() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (17): TemplateBuilder(), TemplateCardLayer, TemplateStructureCard(), structureTierLabel(), cardMetaLine(), catalogInput(), classificationContext(), classificationTag() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (14): deriveStructureTierFromSubstrates(), deriveTemplateCatalogKey(), EstimateClassificationSnapshot, getEstimateClassification(), getTemplateClassification(), isPrintedTemplate(), matchesCatalogFilter(), matchesClassFilter() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (16): useDensity(), UseDensityResult, ADMIN_PROFILE, SALES_REP_PROFILE, useVisibilityProfile(), VISIBILITY_KEYS, Settings(), applyDensityAttribute() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (13): FilmLayer, FilmStackVisualizer(), inkLabelClass(), inkPctClass(), inkVariant(), isMetallizedName(), isNaturalName(), isPaperName() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.28
Nodes (6): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, ClassFilter, TemplateStructureTier

### Community 12 - "Community 12"
Cohesion: 0.70
Nodes (4): clearWorkingEstimateForTemplate(), getWorkingEstimateForTemplate(), key(), setWorkingEstimateForTemplate()

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (4): Layer, layerShare(), layerThickness(), Props

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (17): PouchConfigurator(), canonicalPouchSubtype(), configuratorTypeForPouchSubtype(), LEGACY_POUCH_SUBTYPE_ALIASES, POUCH_CONFIGURATOR_CATALOG, POUCH_CONFIGURATOR_DIMENSION_KEYS, POUCH_SUBTYPE_TO_CONFIGURATOR, PouchConfiguratorConfig (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (15): EmptyStateProps, useEntrance(), UseEntranceOptions, UseEntranceResult, DocumentWithViewTransition, useViewTransition(), ESTIMATE_STATUS_FILTERS, EstimateStatus (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (3): isNative, KEYS, tokenStore

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (17): SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), Sparkline(), SparklineProps, SparklineTone, toneVar(), useStagger() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (16): MasterDataContext, MasterDataContextValue, MasterDataProvider(), useMasterDataContextOptional(), useMasterDataReference(), DEFAULT_MASTER_REFERENCE, DEFAULT_PROCESS_OPTIONS, DEFAULT_RM_TYPE_OPTIONS (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.43
Nodes (7): channelToLinear(), clampChannel(), contrastRatio(), expandShortHex(), parseColor(), relativeLuminance(), Rgb

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (18): useMasterDataContext(), API_BASE_URL, PlatformMasterMaterialInput, PlatformMasterMaterialRow, PlatformReferenceCategory, PlatformReferenceItemInput, TenantSyncResult, DEFAULT_PRODUCT_SUBTYPE_OPTIONS (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.05
Nodes (55): LayerCard(), LayerCardLayer, LayerCardProps, GradeOption, Props, StructureGradeSelect(), displayToUsd(), usdToDisplay() (+47 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (42): QuickThemeSwitcher(), QuickThemeSwitcherProps, IDS, AURORA_OVERRIDES, CLASSIC_OVERRIDES, DARK_OVERRIDES, FOREST_OVERRIDES, FROST_OVERRIDES (+34 more)

### Community 24 - "Community 24"
Cohesion: 0.60
Nodes (4): MotionToken, NON_ESSENTIAL_MOTION_TOKENS, NORMAL_MOTION_DURATIONS, resolveMotionDurations()

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): ProtectedRoute(), Layout(), RouteTransition(), RouteTransitionProps, AuthState, AuthTenant, AuthUser, initialState (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (7): CustomerAutocompleteProps, CustomerOption, JobHeaderFields(), ProductTypeOption, ProductTypeValue, UnitOption, DimensionFieldDef

## Knowledge Gaps
- **137 isolated node(s):** `Band`, `Panel`, `ExtraPiece`, `DRAWERS`, `BottomSheetProps` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 34`, `Community 3`, `Community 5`, `Community 6`, `Community 9`, `Community 15`, `Community 17`, `Community 18`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 34` to `Community 9`, `Community 20`, `Community 21`, `Community 6`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `useEntrance()` connect `Community 15` to `Community 2`, `Community 34`, `Community 5`, `Community 6`, `Community 9`, `Community 17`, `Community 20`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `Band`, `Panel`, `ExtraPiece` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.055534987041836355 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06707317073170732 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06690140845070422 - nodes in this community are weakly interconnected._