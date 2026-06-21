# Graph Report - apps\estimation-studio\packages\server\src  (2026-06-21)

## Corpus Check
- 66 files · ~35,391 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 457 nodes · 1211 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 102 edges
2. `extractTenantFromRequest()` - 45 edges
3. `extractUserFromRequest()` - 26 edges
4. `instantiateTemplateRoute()` - 16 edges
5. `getEffectiveProfile()` - 16 edges
6. `buildApp()` - 15 edges
7. `buildMasterMaterialsFromExcel()` - 14 edges
8. `relinkTemplatesForTenant()` - 14 edges
9. `updateEstimateRoute()` - 14 edges
10. `getMasterDataVersion()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `updateEstimateRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `saveProposalPdf()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `refreshRoute()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/auth.ts → db/index.ts
- `getDashboardSummaryRoute()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/dashboard.ts → db/index.ts
- `calculateEstimateRoute()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/estimates.ts → db/index.ts

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (61): normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince() (+53 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (51): getDatabase(), seedDefaultAdmin(), ensureCategoriesForTenant(), ensureMaterialsForTenant(), seedMaterialsForTenant(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant() (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (39): quantitiesForSlabTemplateKey(), loadTenantMaterials(), pruneDuplicateStandardTemplates(), relinkTemplatesForTenant(), syncMissingStandardTemplates(), syncTemplateKeysForTenant(), templateInsertRow(), templateKeyFromSeed() (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (42): ADHESIVE_COSTING_FAMILY_KEYS, adhesiveMaterialsFromRows(), assignUniqueKey(), buildMasterMaterialsFromExcel(), cell(), displayName(), fallbackInkCosting(), familyIsSolventBased() (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (34): estimateTotalDisplay(), getDashboardSummaryRoute(), getUserVisibilityProfile(), generateProposalPdfRoute(), auditActorFromRequest(), requireMasterDataAdmin(), requireMasterDataAdmin(), getTenantUsersRoute() (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (31): getMasterDataVersion(), calculateEstimateRoute(), createEstimateRoute(), duplicateEstimateRoute(), EstimateCreateSchema, generateRefNumber(), getEstimateRoute(), getEstimatesRoute() (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (36): activityLogs, categories, customers, customersRelations, estimates, estimatesRelations, estimateStatusEnum, estimationCosts (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (28): costingKeyForMasterKey(), MasterMaterial, materialSyncKey(), buildMasterDataReferenceFromDb(), listPlatformReferenceItems(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy() (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (24): MasterDataReference, PrintingWebRow, ProductTypeRow, DEFAULT_PRINTING_WEB, DEFAULT_PRINTING_WEB_ROWS, DEFAULT_PRODUCT_TYPE_ROWS, DEFAULT_PRODUCT_TYPES, DEFAULT_RM_TYPES (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (20): buildApp(), BuildAppOptions, closeDatabase(), Database, initializeDatabase(), PORT, start(), registerAuthRoutes() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

## Knowledge Gaps
- **129 isolated node(s):** `BuildAppOptions`, `Database`, `MASTER_DATA_SHEETS`, `TEMPLATE_REF_TO_MASTER_KEY`, `INK_COSTING_FAMILY_KEYS` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `extractUserFromRequest()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 5`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `extractTenantFromRequest()` connect `Community 1` to `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `BuildAppOptions`, `Database`, `MASTER_DATA_SHEETS` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06338028169014084 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08461131676361713 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09397163120567376 - nodes in this community are weakly interconnected._