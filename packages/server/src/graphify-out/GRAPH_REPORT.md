# Graph Report - apps\estimation-studio\packages\server\src  (2026-06-29)

## Corpus Check
- 74 files · ~50,816 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 550 nodes · 1493 edges · 16 communities
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

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 131 edges
2. `extractTenantFromRequest()` - 46 edges
3. `extractUserFromRequest()` - 32 edges
4. `buildApp()` - 18 edges
5. `instantiateTemplateRoute()` - 18 edges
6. `buildEngineMaterialMap()` - 17 edges
7. `getEffectiveProfile()` - 17 edges
8. `errorBody()` - 15 edges
9. `replacePlatformReferenceCategory()` - 14 edges
10. `updateEstimateRoute()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `updateEstimateRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `saveProposalPdf()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `start()` --calls--> `initializeDatabase()`  [EXTRACTED]
  index.ts → db/index.ts
- `createPlatformTemplateRoute()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/admin-platform-templates.ts → db/index.ts

## Import Cycles
- None detected.

## Communities (16 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (61): costingKeyForMasterKey(), normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType (+53 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (46): getMasterMaterialsList(), quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates(), relinkTemplatesForTenant() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (77): getDatabase(), listPlatformReferenceItems(), seedDefaultAdmin(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy(), ensureCategoriesForTenant(), seedCategoriesForTenant() (+69 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (33): seedEntryToSource(), applyPlatformDelete(), applyPlatformUpdate(), buildPlatformRow(), createPlatformTemplateRoute(), CreatePlatformTemplateSchema, deletePlatformTemplateByKeyRoute(), deletePlatformTemplateRoute() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (28): EstimateRow, estimateTotalDisplay(), getDashboardSummaryRoute(), getUserVisibilityProfile(), generateProposalPdfRoute(), buildProposalPdfBuffer(), Db, getUserVisibilityProfile() (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (31): getMasterDataVersion(), createEstimateRoute(), duplicateEstimateRoute(), EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, generateRefNumber(), LaminationRecipeComponentSchema (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (36): activityLogs, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts, layersRelations (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (10): estimates, layers, materials, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (28): DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, MasterMaterial, materialSyncKey(), PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, UnitBasis (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (29): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), Database, initializeDatabase(), runMigrations(), bootstrapPlatformStandardCatalog() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (17): createPlatformServiceKey(), listPlatformServiceKeys(), pepper(), revokePlatformServiceKey(), ServiceKeyListItem, toListItem(), VerifiedServiceKey, verifyPlatformServiceKey() (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (37): MasterDataReference, buildMasterDataReferenceFromDb(), buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference(), listTenantReferenceItems(), mergeByCode(), RefCategory (+29 more)

## Knowledge Gaps
- **163 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+158 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.311) - this node is a cross-community bridge._
- **Why does `extractUserFromRequest()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 11`, `Community 15`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _163 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07289002557544758 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08176100628930817 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05613951266125179 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12063492063492064 - nodes in this community are weakly interconnected._