# Graph Report - apps\estimation-studio\packages\web\src  (2026-06-22)

## Corpus Check
- 37 files · ~30,678 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 269 nodes · 527 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `ApiClient` - 76 edges
2. `useAuth()` - 19 edges
3. `EstimateEditor()` - 9 edges
4. `useMasterDataReference()` - 8 edges
5. `roundUsd()` - 8 edges
6. `getTemplateClassification()` - 8 edges
7. `Library()` - 7 edges
8. `StandardTemplates()` - 7 edges
9. `useVisibilityProfile()` - 5 edges
10. `ProductTypeValue` - 5 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → hooks/useAuth.ts
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  components/Layout.tsx → hooks/useAuth.ts
- `useMasterDataReference()` --calls--> `useMasterDataContextOptional()`  [EXTRACTED]
  hooks/useMasterDataReference.ts → contexts/MasterDataContext.tsx
- `EstimateEditor()` --calls--> `useAuth()`  [EXTRACTED]
  pages/EstimateEditor.tsx → hooks/useAuth.ts
- `Login()` --calls--> `useAuth()`  [EXTRACTED]
  pages/Login.tsx → hooks/useAuth.ts

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (28): ProtectedRoute(), Layout(), useMasterDataContext(), AuthState, AuthTenant, AuthUser, initialState, useAuth() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (19): JobHeaderFields(), MasterDataContext, MasterDataContextValue, MasterDataProvider(), useMasterDataContextOptional(), DEFAULT_MASTER_REFERENCE, DEFAULT_RM_TYPE_OPTIONS, defaultProductTypeValue() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (39): CLASS_FILTER_ROWS, ClassFilterPanel(), ClassFilterPanelProps, EMPTY_CLASS_FILTER, CustomerAutocompleteProps, CustomerOption, TemplateCardLayer, TemplateStructureCard() (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (17): formatPrice(), roundUsd(), usdToDisplay(), CategoryNode, DEFAULT_SUBSTRATE_FAMILIES, deriveSubstrateFamilies(), deriveSubstrateGrades(), groupMaterialsForPicker() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (7): Layer, Props, SkeletonCard(), SkeletonDashboard(), SkeletonTableRows(), DashboardSummary, SummaryEstimate

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (38): BottomSheetProps, LayerCard(), LayerCardLayer, LayerCardProps, useMasterDataReference(), useVisibilityProfile(), ClientCalcInput, ClientCalcMaterial (+30 more)

## Knowledge Gaps
- **63 isolated node(s):** `BottomSheetProps`, `CLASS_FILTER_ROWS`, `CustomerOption`, `CustomerAutocompleteProps`, `Layer` (+58 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiClient` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.417) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 3`, `Community 7`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `useMasterDataReference()` connect `Community 7` to `Community 2`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `BottomSheetProps`, `CLASS_FILTER_ROWS`, `CustomerOption` to the rest of the system?**
  _63 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06497175141242938 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07215541165587419 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._