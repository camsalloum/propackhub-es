# Graph Report - apps\estimation-studio\packages\web\src  (2026-06-23)

## Corpus Check
- 39 files · ~34,176 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 300 nodes · 591 edges · 9 communities (8 shown, 1 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 82 edges
2. `useAuth()` - 19 edges
3. `getTemplateClassification()` - 10 edges
4. `roundUsd()` - 9 edges
5. `EstimateEditor()` - 9 edges
6. `useMasterDataReference()` - 8 edges
7. `Library()` - 7 edges
8. `StandardTemplates()` - 7 edges
9. `TemplateBuilder()` - 5 edges
10. `useVisibilityProfile()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts
- `TemplateBuilderProps` --references--> `ProductSubtypeOption`  [EXTRACTED]
  components/TemplateBuilder.tsx → lib/masterDataReference.ts
- `TemplateBuilder()` --calls--> `engineTypeForFamily()`  [EXTRACTED]
  components/TemplateBuilder.tsx → lib/productCatalog.ts
- `EstimateEditor()` --calls--> `useAuth()`  [EXTRACTED]
  pages/EstimateEditor.tsx → hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (34): ProtectedRoute(), Layout(), MasterDataProvider(), useMasterDataContext(), AuthState, AuthTenant, AuthUser, initialState (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (17): JobHeaderFields(), MasterDataContext, MasterDataContextValue, useMasterDataContextOptional(), useMasterDataReference(), DEFAULT_MASTER_REFERENCE, DEFAULT_RM_TYPE_OPTIONS, defaultProductTypeValue() (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (40): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, CustomerAutocompleteProps, CustomerOption, TemplateBuilder(), TemplateCardLayer (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (14): BuilderLayer, buildMaterialOptions(), FamilyGroup, groupByFamily(), MaterialOption, MaterialSelect(), PROCESS_DESCRIPTIONS, PROCESS_KEYS (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (19): displayToUsd(), formatPrice(), roundUsd(), usdToDisplay(), RmTypeOption, CategoryNode, DEFAULT_SUBSTRATE_FAMILIES, deriveSubstrateFamilies() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (7): Layer, Props, SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), DashboardSummary, SummaryEstimate

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (36): BottomSheetProps, LayerCard(), LayerCardLayer, LayerCardProps, ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, effectiveMarginPercent() (+28 more)

## Knowledge Gaps
- **75 isolated node(s):** `BottomSheetProps`, `CLASS_FILTER_ROWS`, `CustomerOption`, `CustomerAutocompleteProps`, `Layer` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.413) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 3`, `Community 7`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `useMasterDataReference()` connect `Community 2` to `Community 3`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `BottomSheetProps`, `CLASS_FILTER_ROWS`, `CustomerOption` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06346153846153846 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05844155844155844 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06901960784313725 - nodes in this community are weakly interconnected._