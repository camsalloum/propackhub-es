# Graph Report - apps\estimation-studio\packages\web\src  (2026-06-21)

## Corpus Check
- 36 files · ~27,806 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 247 nodes · 487 edges · 9 communities (8 shown, 1 thin omitted)
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
1. `ApiClient` - 76 edges
2. `useAuth()` - 19 edges
3. `useMasterDataReference()` - 8 edges
4. `roundUsd()` - 8 edges
5. `getTemplateClassification()` - 8 edges
6. `Library()` - 7 edges
7. `StandardTemplates()` - 7 edges
8. `EstimateEditor()` - 6 edges
9. `useVisibilityProfile()` - 5 edges
10. `TemplateStructureTier` - 5 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts
- `Login()` --calls--> `useAuth()`  [EXTRACTED]
  pages/Login.tsx → hooks/useAuth.ts
- `MasterLibrary()` --calls--> `useAuth()`  [EXTRACTED]
  pages/MasterLibrary.tsx → hooks/useAuth.ts
- `Register()` --calls--> `useAuth()`  [EXTRACTED]
  pages/Register.tsx → hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (29): ProtectedRoute(), Layout(), useMasterDataContext(), AuthState, AuthTenant, AuthUser, initialState, useAuth() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (28): BottomSheetProps, JobHeaderFields(), LayerCard(), LayerCardLayer, LayerCardProps, MasterDataContext, MasterDataContextValue, MasterDataProvider() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (23): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, CustomerAutocompleteProps, CustomerOption, ClassFilter, deriveStructureTierFromSubstrates() (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (18): Layer, Props, TemplateCardLayer, TemplateStructureCard(), structureTierLabel(), cardMetaLine(), catalogInput(), classificationContext() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (18): formatPrice(), roundUsd(), usdToDisplay(), RmTypeOption, CategoryNode, DEFAULT_SUBSTRATE_FAMILIES, deriveSubstrateFamilies(), deriveSubstrateGrades() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (5): SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), DashboardSummary, SummaryEstimate

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (6): ClientCalcInput, ClientCalcMaterial, ClientCalcProcess, effectiveMarginPercent(), runClientCalculation(), toMaterial()

## Knowledge Gaps
- **51 isolated node(s):** `BottomSheetProps`, `CLASS_FILTER_ROWS`, `CustomerOption`, `CustomerAutocompleteProps`, `Layer` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.448) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 2`, `Community 4`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `useMasterDataReference()` connect `Community 2` to `Community 1`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `BottomSheetProps`, `CLASS_FILTER_ROWS`, `CustomerOption` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06497175141242938 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0726950354609929 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._