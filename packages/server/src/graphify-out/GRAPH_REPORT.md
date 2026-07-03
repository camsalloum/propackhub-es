# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-03)

## Corpus Check
- 78 files · ~55,752 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 597 nodes · 1607 edges · 19 communities
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
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 129 edges
2. `extractTenantFromRequest()` - 46 edges
3. `extractUserFromRequest()` - 33 edges
4. `updateEstimateRoute()` - 23 edges
5. `buildApp()` - 18 edges
6. `instantiateTemplateRoute()` - 18 edges
7. `buildEngineMaterialMap()` - 17 edges
8. `getEffectiveProfile()` - 17 edges
9. `resolveEstimateProcesses()` - 15 edges
10. `replacePlatformReferenceCategory()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `afterPlatformMutation()` --calls--> `syncPlatformMasterToAllTenants()`  [EXTRACTED]
  routes/platform-master-data.ts → db/platform-master-data.ts
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts
- `updateEstimateRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `saveProposalPdf()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts

## Import Cycles
- None detected.

## Communities (19 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (70): getDatabase(), costingKeyForMasterKey(), normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActorType (+62 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (56): quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates(), relinkTemplatesForTenant(), seedEntryToSource() (+48 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (27): isTransientDatabaseError(), resetDatabaseConnection(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (19): applyPlatformDelete(), applyPlatformUpdate(), buildPlatformRow(), createPlatformTemplateRoute(), CreatePlatformTemplateSchema, deletePlatformTemplateByKeyRoute(), deletePlatformTemplateRoute(), getPlatformTemplateRoute() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (33): meRoute(), EstimateRow, estimateTotalDisplay(), getDashboardSummaryRoute(), getUserVisibilityProfile(), generateProposalPdfRoute(), getTenantUsersRoute(), normalizeVisibilityProfile() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (71): Database, getMasterDataVersion(), calculateEstimateRoute(), createEstimateRoute(), detectProcessInsertMode(), duplicateEstimateRoute(), EstimateCreateSchema, EstimateRow (+63 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (38): activityLogs, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts, layersRelations (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (10): estimates, layers, materials, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (14): MasterMaterial, materialSyncKey(), DbMaterial, findOrphanSubstrateRows(), getMasterMaterialsList(), LEGACY_ADHESIVE_NAMES, LEGACY_INK_NAMES, loadPlatformMasterMaterials() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (30): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), runMigrations() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (28): AuditActor, ReferenceItemInUseError, createPlatformServiceKey(), listPlatformServiceKeys(), pepper(), revokePlatformServiceKey(), ServiceKeyListItem, toListItem() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (23): MasterDataReference, DEFAULT_PRINTING_WEB, DEFAULT_PRINTING_WEB_ROWS, DEFAULT_PRODUCT_TYPE_ROWS, DEFAULT_PRODUCT_TYPES, DEFAULT_RM_TYPES, DEFAULT_UNITS, enrichMasterDataReference() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (31): autocompleteCustomersRoute(), createCustomerRoute(), createCustomerSchema, deleteCustomerRoute(), escapeLike(), getCustomerEstimatesRoute(), getCustomerRoute(), getCustomersRoute() (+23 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (14): buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference(), listTenantReferenceItems(), mergeByCode(), mergeProcessRowsByCode(), RefCategory, replaceTenantReferenceCategory() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (7): DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, UnitBasis, UnitRow

## Knowledge Gaps
- **175 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.278) - this node is a cross-community bridge._
- **Why does `extractUserFromRequest()` connect `Community 11` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07226107226107226 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07596153846153846 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._