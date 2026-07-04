# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-04)

## Corpus Check
- 81 files · ~59,539 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 626 nodes · 1821 edges · 17 communities
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
1. `getDatabase()` - 140 edges
2. `sendCaughtError()` - 53 edges
3. `extractTenantFromRequest()` - 46 edges
4. `extractUserFromRequest()` - 33 edges
5. `updateEstimateRoute()` - 25 edges
6. `instantiateTemplateRoute()` - 21 edges
7. `buildApp()` - 18 edges
8. `buildEngineMaterialMap()` - 17 edges
9. `getEffectiveProfile()` - 17 edges
10. `errorBody()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
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

## Communities (17 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (84): costingKeyForMasterKey(), DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, MasterMaterial, normalizeReferenceShape(), PrintingWebRow, ProductTypeRow, resolveMasterDataReferencePath() (+76 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (55): quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates() (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (45): isTransientDatabaseError(), materialSyncKey(), listPlatformReferenceItems(), seedDefaultAdmin(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy(), ensureCategoriesForTenant() (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (20): applyPlatformDelete(), applyPlatformUpdate(), buildPlatformRow(), createPlatformTemplateRoute(), CreatePlatformTemplateSchema, decimalField(), deletePlatformTemplateByKeyRoute(), deletePlatformTemplateRoute() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (10): getPlatformCormScaleWithWaste(), buildProposalPdfBuffer(), Db, getUserVisibilityProfile(), laminateSvgFromLayers(), proposalsDir(), saveProposalPdf(), calculateEstimateFromRows() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (69): Database, getMasterDataVersion(), createEstimateRoute(), detectProcessInsertMode(), duplicateEstimateRoute(), EstimateCreateSchema, EstimateRow, EstimateUpdateSchema (+61 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (37): activityLogs, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts, layersRelations (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (10): estimates, layers, materials, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.32
Nodes (5): estimateTotalDisplay(), cormDisplayPerKgToEngineUsd(), displayToUsd(), slabsUsdToDisplay(), usdToDisplay()

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (30): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (16): AuditActor, createPlatformServiceKey(), pepper(), ServiceKeyListItem, toListItem(), VerifiedServiceKey, verifyPlatformServiceKey(), Bucket (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (37): MasterDataReference, buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference(), listTenantReferenceItems(), mergeByCode(), mergeProcessRowsByCode(), RefCategory (+29 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (80): getDatabase(), getMasterMaterialsList(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant(), meRoute(), getCategoriesRoute(), getSubcategoriesRoute() (+72 more)

## Knowledge Gaps
- **173 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.265) - this node is a cross-community bridge._
- **Why does `log` connect `Community 2` to `Community 0`, `Community 1`, `Community 5`, `Community 9`, `Community 10`, `Community 15`, `Community 16`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.050915211445402904 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07787698412698413 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07058001397624039 - nodes in this community are weakly interconnected._