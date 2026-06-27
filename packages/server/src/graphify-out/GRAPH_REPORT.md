# Graph Report - apps\estimation-studio\packages\server\src  (2026-06-27)

## Corpus Check
- 70 files · ~42,584 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 495 nodes · 1315 edges · 15 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 110 edges
2. `extractTenantFromRequest()` - 45 edges
3. `extractUserFromRequest()` - 29 edges
4. `instantiateTemplateRoute()` - 17 edges
5. `getEffectiveProfile()` - 17 edges
6. `buildApp()` - 16 edges
7. `errorBody()` - 15 edges
8. `buildEngineMaterialMap()` - 15 edges
9. `replacePlatformReferenceCategory()` - 14 edges
10. `updateEstimateRoute()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts
- `updateEstimateRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `saveProposalPdf()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `requireMasterDataAdmin()` --calls--> `extractUserFromRequest()`  [EXTRACTED]
  routes/platform-master-data.ts → utils/auth.ts
- `auditActorFromRequest()` --calls--> `extractUserFromRequest()`  [EXTRACTED]
  routes/platform-master-data.ts → utils/auth.ts

## Import Cycles
- None detected.

## Communities (15 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (63): normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince() (+55 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (46): getDatabase(), listPlatformReferenceItems(), seedDefaultAdmin(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy(), ensureCategoriesForTenant(), seedCategoriesForTenant() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (49): quantitiesForSlabTemplateKey(), loadTenantMaterials(), pruneDuplicateStandardTemplates(), relinkTemplatesForTenant(), syncMissingStandardTemplates(), syncTemplateKeysForTenant(), templateInsertRow(), templateKeyFromSeed() (+41 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (30): autocompleteCustomersRoute(), createCustomerRoute(), createCustomerSchema, deleteCustomerRoute(), escapeLike(), getCustomerEstimatesRoute(), getCustomerRoute(), getCustomersRoute() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (33): meRoute(), EstimateRow, estimateTotalDisplay(), getDashboardSummaryRoute(), getUserVisibilityProfile(), generateProposalPdfRoute(), getTenantUsersRoute(), normalizeVisibilityProfile() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (35): getMasterDataVersion(), calculateEstimateRoute(), createEstimateRoute(), duplicateEstimateRoute(), EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, generateRefNumber() (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (44): activityLogs, categories, customers, customersRelations, estimates, estimatesRelations, estimateStatusEnum, estimationCosts (+36 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (25): costingKeyForMasterKey(), MasterMaterial, materialSyncKey(), PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, DbMaterial, findExistingMatch() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (23): MasterDataReference, DEFAULT_PRINTING_WEB, DEFAULT_PRINTING_WEB_ROWS, DEFAULT_PRODUCT_TYPE_ROWS, DEFAULT_PRODUCT_TYPES, DEFAULT_RM_TYPES, DEFAULT_UNITS, enrichMasterDataReference() (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (22): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), Database, initializeDatabase(), runMigrations(), registerAuthRoutes() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (13): createPlatformServiceKey(), pepper(), ServiceKeyListItem, toListItem(), VerifiedServiceKey, verifyPlatformServiceKey(), Bucket, buckets (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

## Knowledge Gaps
- **151 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 14`?**
  _High betweenness centrality (0.273) - this node is a cross-community bridge._
- **Why does `extractUserFromRequest()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06582952815829528 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08521303258145363 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._