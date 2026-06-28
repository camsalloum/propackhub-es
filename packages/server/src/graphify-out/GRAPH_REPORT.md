# Graph Report - apps\estimation-studio\packages\server\src  (2026-06-28)

## Corpus Check
- 73 files · ~47,893 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 528 nodes · 1424 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 126 edges
2. `extractTenantFromRequest()` - 45 edges
3. `extractUserFromRequest()` - 31 edges
4. `buildApp()` - 18 edges
5. `instantiateTemplateRoute()` - 17 edges
6. `buildEngineMaterialMap()` - 17 edges
7. `getEffectiveProfile()` - 17 edges
8. `errorBody()` - 15 edges
9. `replacePlatformReferenceCategory()` - 14 edges
10. `updateEstimateRoute()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts
- `generateProposalPdfRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `requireMasterDataAdmin()` --calls--> `extractUserFromRequest()`  [EXTRACTED]
  routes/platform-master-data.ts → utils/auth.ts
- `auditActorFromRequest()` --calls--> `extractUserFromRequest()`  [EXTRACTED]
  routes/platform-master-data.ts → utils/auth.ts
- `start()` --calls--> `initializeDatabase()`  [EXTRACTED]
  index.ts → db/index.ts

## Import Cycles
- None detected.

## Communities (17 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (47): normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), materialAuditSnapshot(), referenceEntityKey(), referenceItemAuditSnapshot(), assertUniqueReferenceCodes(), buildMasterDataReferenceFromDb() (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (57): getDatabase(), listPlatformReferenceItems(), seedDefaultAdmin(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy(), ensureCategoriesForTenant(), seedCategoriesForTenant() (+49 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (53): quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates(), relinkTemplatesForTenant(), seedEntryToSource() (+45 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (21): applyPlatformDelete(), applyPlatformUpdate(), buildPlatformRow(), createPlatformTemplateRoute(), CreatePlatformTemplateSchema, deletePlatformTemplateByKeyRoute(), deletePlatformTemplateRoute(), getPlatformTemplateRoute() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (46): getMasterMaterialsList(), getCustomersRoute(), EstimateRow, getDashboardSummaryRoute(), getUserVisibilityProfile(), calculateEstimateRoute(), deleteEstimateRoute(), EstimateCreateSchema (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (38): getMasterDataVersion(), estimateTotalDisplay(), createEstimateRoute(), duplicateEstimateRoute(), generateRefNumber(), requoteEstimateRoute(), updateEstimateRoute(), calculateAndPersistEstimate() (+30 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (35): activityLogs, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts, layersRelations (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (20): costingKeyForMasterKey(), MasterMaterial, materialSyncKey(), TEMPLATE_REF_TO_MASTER_KEY, DbMaterial, findExistingMatch(), findOrphanSubstrateRows(), LEGACY_ADHESIVE_NAMES (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (25): MasterDataReference, PrintingWebRow, ProductTypeRow, DEFAULT_PRINTING_WEB, DEFAULT_PRINTING_WEB_ROWS, DEFAULT_PRODUCT_TYPE_ROWS, DEFAULT_PRODUCT_TYPES, DEFAULT_RM_TYPES (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (29): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), Database, initializeDatabase(), runMigrations(), bootstrapPlatformStandardCatalog() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (31): appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince(), MasterAuditAction, MasterDataChangeRow, listPlatformMasterMaterialsWithIds() (+23 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (9): estimates, layers, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow, resolveSolventCostPerKgUsd() (+1 more)

## Knowledge Gaps
- **158 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 14`?**
  _High betweenness centrality (0.305) - this node is a cross-community bridge._
- **Why does `extractUserFromRequest()` connect `Community 4` to `Community 11`, `Community 2`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09879336349924585 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06606990622335891 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08415300546448087 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._