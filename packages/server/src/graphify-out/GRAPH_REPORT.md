# Graph Report - apps\estimation-studio\packages\server\src  (2026-06-22)

## Corpus Check
- 62 files · ~32,938 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 414 nodes · 1094 edges · 14 communities
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
1. `getDatabase()` - 100 edges
2. `extractTenantFromRequest()` - 45 edges
3. `extractUserFromRequest()` - 26 edges
4. `instantiateTemplateRoute()` - 16 edges
5. `getEffectiveProfile()` - 16 edges
6. `buildApp()` - 15 edges
7. `updateEstimateRoute()` - 14 edges
8. `getMasterDataVersion()` - 13 edges
9. `replacePlatformReferenceCategory()` - 12 edges
10. `relinkTemplatesForTenant()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `refreshRoute()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/auth.ts → db/index.ts
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts
- `generateProposalPdfRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `saveProposalPdf()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts

## Import Cycles
- None detected.

## Communities (14 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (48): costingKeyForMasterKey(), normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (45): getDatabase(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant(), getCategoriesRoute(), getSubcategoriesRoute(), autocompleteCustomersRoute(), createCustomerRoute() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (36): quantitiesForSlabTemplateKey(), loadTenantMaterials(), pruneDuplicateStandardTemplates(), relinkTemplatesForTenant(), syncMissingStandardTemplates(), syncTemplateKeysForTenant(), templateInsertRow(), templateKeyFromSeed() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (29): listPlatformReferenceItems(), seedDefaultAdmin(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy(), ensureCategoriesForTenant(), seedCategoriesForTenant(), STANDARD_RM_CODES (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (24): estimateTotalDisplay(), getUserVisibilityProfile(), buildProposalPdfBuffer(), Db, getUserVisibilityProfile(), laminateSvgFromLayers(), ProposalLayerRow, ProposalProcessRow (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (27): getMasterDataVersion(), calculateEstimateRoute(), createEstimateRoute(), duplicateEstimateRoute(), EstimateCreateSchema, generateRefNumber(), getUserVisibilityProfile(), requoteEstimateRoute() (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (36): activityLogs, categories, customers, customersRelations, estimates, estimatesRelations, estimateStatusEnum, estimationCosts (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (23): MasterMaterial, materialSyncKey(), PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, listPlatformMasterMaterials(), DbMaterial, findExistingMatch() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (23): MasterDataReference, DEFAULT_PRINTING_WEB, DEFAULT_PRINTING_WEB_ROWS, DEFAULT_PRODUCT_TYPE_ROWS, DEFAULT_PRODUCT_TYPES, DEFAULT_RM_TYPES, DEFAULT_UNITS, enrichMasterDataReference() (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (20): buildApp(), BuildAppOptions, closeDatabase(), Database, initializeDatabase(), PORT, start(), registerAuthRoutes() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (16): referenceEntityKey(), createPlatformServiceKey(), listPlatformServiceKeys(), pepper(), revokePlatformServiceKey(), ServiceKeyListItem, toListItem(), VerifiedServiceKey (+8 more)

## Knowledge Gaps
- **122 isolated node(s):** `BuildAppOptions`, `Database`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.270) - this node is a cross-community bridge._
- **Why does `extractUserFromRequest()` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `extractTenantFromRequest()` connect `Community 1` to `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `BuildAppOptions`, `Database`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07744107744107744 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09869375907111756 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10808080808080808 - nodes in this community are weakly interconnected._