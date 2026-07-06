# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-05)

## Corpus Check
- 87 files · ~67,751 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 697 nodes · 2111 edges · 23 communities (22 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 152 edges
2. `sendCaughtError()` - 66 edges
3. `extractTenantFromRequest()` - 58 edges
4. `extractUserFromRequest()` - 41 edges
5. `updateEstimateRoute()` - 32 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `getEffectiveProfile()` - 21 edges
8. `buildApp()` - 19 edges
9. `createEstimateRoute()` - 18 edges
10. `buildEngineMaterialMap()` - 17 edges

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

## Communities (23 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (80): normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince() (+72 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (76): quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates() (+68 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (15): seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), registerRoute(), requirePlatformAdmin(), requirePlatformAdmin(), hashPassword(), isPlatformAdmin() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (38): costingKeyForMasterKey(), DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, MasterMaterial, materialSyncKey(), PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (40): getPlatformCormScaleWithWaste(), getPlatformWasteBandsByPrintMode(), estimates, layers, materials, estimateTotalDisplay(), calculateAndPersistEstimate(), calculateEstimateFromDatabase() (+32 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (24): EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, LaminationRecipeComponentSchema, LaminationRecipeSchema, LayerRow, RequoteBodySchema, updateEstimateRoute() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (39): activityLogs, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts, layersRelations (+31 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (25): buildProcessesFromDerived(), buildProcessesFromTemplateDefaults(), computeEstimateStructureSignature(), computeTemplateStructureSignature(), Db, EstimateRow, EstimateStructureLayer, findEstimateTemplate() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (16): Database, CloneEstimateOptions, CloneEstimateResult, EstimateRow, LayerRow, MaterialRow, CreateQuoteInput, deriveToolingFromColors() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (17): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, registerAdminPlatformTemplateRoutes(), registerAuthRoutes(), registerCategoryRoutes(), registerCustomerRoutes(), registerDashboardRoutes() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.21
Nodes (16): isTransientDatabaseError(), loginRoute(), LoginSchema, logoutRoute(), LogoutSchema, refreshRoute(), RefreshSchema, RegisterSchema (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (38): MasterDataReference, buildMasterDataReferenceFromDb(), buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference(), listTenantReferenceItems(), mergeByCode(), mergeProcessRowsByCode() (+30 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (93): getDatabase(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant(), meRoute(), getSubcategoriesRoute(), autocompleteCustomersRoute(), createCustomerRoute() (+85 more)

### Community 17 - "Community 17"
Cohesion: 0.31
Nodes (13): getMasterDataVersion(), createEstimateRoute(), duplicateEstimateRoute(), requoteEstimateRoute(), cloneEstimate(), createQuote(), inheritedQuoteFieldsFromParent(), loadQuoteForEstimate() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (10): bootstrapPlatformStandardCatalog(), entryToInsertRow(), listPlatformStandards(), SeedEntry, SeedLayer, log, Db, logQuoteStatusTransition() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.35
Nodes (8): closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection(), runMigrations(), shutdown(), hasDatabase

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (7): buildEstimateClassificationSnapshot(), deriveStructureTierFromSubstrates(), EstimateClassificationSnapshot, isPrintedStack(), LayerLike, StructureTier, substrateCount()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): CachedRate, fetchExchangeRate(), fetchMultipleRates(), FXResponse, rateCache

## Knowledge Gaps
- **195 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 22`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 5`, `Community 11`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _195 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053989488772097464 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06134453781512605 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07183673469387755 - nodes in this community are weakly interconnected._