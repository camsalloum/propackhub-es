# Graph Report - apps\estimation-studio\packages\web\src  (2026-06-27)

## Corpus Check
- 52 files · ~50,585 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 411 nodes · 808 edges · 23 communities (19 shown, 4 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 85 edges
2. `useAuth()` - 19 edges
3. `EstimateEditor()` - 13 edges
4. `dimLbl()` - 10 edges
5. `mkT()` - 10 edges
6. `getTemplateClassification()` - 10 edges
7. `roundUsd()` - 9 edges
8. `LayerAppearance` - 8 edges
9. `useMasterDataReference()` - 8 edges
10. `Library()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts
- `TemplateBuilder()` --calls--> `engineTypeForFamily()`  [EXTRACTED]
  components/TemplateBuilder.tsx → lib/productCatalog.ts
- `EstimateEditor()` --calls--> `useAuth()`  [EXTRACTED]
  pages/EstimateEditor.tsx → hooks/useAuth.ts
- `Login()` --calls--> `useAuth()`  [EXTRACTED]
  pages/Login.tsx → hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (23 total, 4 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.21
Nodes (10): Layout(), AuthState, AuthTenant, AuthUser, initialState, useAuth(), Login(), MasterLibrary() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (33): CustomerAutocompleteProps, CustomerOption, JobHeaderFields(), BuilderLayer, buildMaterialOptions(), FamilyGroup, groupByFamily(), MaterialOption (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (45): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, TemplateBuilder(), TemplateCardLayer, TemplateStructureCard(), clearWorkingEstimateForTemplate() (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (32): BagConfigurator(), BagScene3D, PreviewMode, BagSchematic(), C, dimLbl(), DrawBottomGusset(), DrawCourier() (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (24): SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), displayToUsd(), formatPrice(), roundUsd(), usdToDisplay(), RmTypeOption (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (4): Layer, layerShare(), layerThickness(), Props

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (15): ALL_SUBTYPES, BAG_BASE, BAG_SUBTYPES, defaultSubtypeForFamily(), EngineProductType, ESTIMATION_HIDDEN_DIMENSION_KEYS, F, POUCH_BASE (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (17): dimensionsForSave(), estimateNeedsConfiguration(), normalizeProcessesForSave(), PERSISTABLE_PRODUCT_TYPES, PersistableProductType, PROCESS_SPEED_BASES, ProcessSpeedBasis, productTypeForSave() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (13): FilmLayer, FilmStackVisualizer(), inkLabelClass(), inkPctClass(), inkVariant(), isMetallizedName(), isNaturalName(), isPaperName() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (10): API_BASE_URL, PlatformMasterMaterialInput, PlatformMasterMaterialRow, PlatformReferenceCategory, PlatformReferenceItemInput, TenantSyncResult, StructureTemplateLike, isNative (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (11): useMasterDataContext(), dbTypeForRmCode(), defaultFamilyForRmCode(), MasterData(), MaterialTab, newMaterialRow(), REF_TAB_IDS, REF_TABS (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.32
Nodes (4): BagGeometry3D(), BagGeometry3DProps, panelMaterialProps(), BagScene3DProps

### Community 15 - "Community 15"
Cohesion: 0.43
Nodes (5): ADMIN_PROFILE, SALES_REP_PROFILE, useVisibilityProfile(), VISIBILITY_KEYS, Settings()

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (6): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, effectiveMarginPercent(), runClientCalculation(), toMaterial()

### Community 18 - "Community 18"
Cohesion: 0.60
Nodes (5): usdToDisplayPrecise(), dimensionFieldsFor(), dimensionFieldsForEstimation(), getSubtype(), EstimateEditor()

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (4): findDefaultSolventMaterialId(), listSolventMaterials(), resolveSolventCostPerKgUsd(), SolventMaterialLike

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (3): LayerCard(), LayerCardLayer, LayerCardProps

### Community 21 - "Community 21"
Cohesion: 0.50
Nodes (3): GradeOption, Props, StructureGradeSelect()

## Knowledge Gaps
- **93 isolated node(s):** `BagScene3D`, `PreviewMode`, `BagGeometry3DProps`, `BagScene3DProps`, `C` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 15`?**
  _High betweenness centrality (0.324) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 3`, `Community 9`, `Community 12`, `Community 13`, `Community 15`, `Community 18`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `useMasterDataReference()` connect `Community 2` to `Community 9`, `Community 18`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `BagScene3D`, `PreviewMode`, `BagGeometry3DProps` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06151062867480778 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06565656565656566 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06291591046581972 - nodes in this community are weakly interconnected._