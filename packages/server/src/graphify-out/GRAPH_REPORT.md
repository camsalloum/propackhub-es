# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-10)

## Corpus Check
- 102 files · ~82,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 904 nodes · 2702 edges · 31 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f2ffe2ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 196 edges
2. `sendCaughtError()` - 72 edges
3. `extractTenantFromRequest()` - 63 edges
4. `extractUserFromRequest()` - 45 edges
5. `updateEstimateRoute()` - 34 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `getMaterialsMissingForTenant()` - 24 edges
8. `incrementMasterDataVersion()` - 23 edges
9. `syncFamilyMaterialsFromPebiForTenant()` - 22 edges
10. `buildApp()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `buildApp()` --calls--> `registerIntegrationRoutes()`  [INFERRED]
  app.ts → routes/integration.ts
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `syncPlatformMasterToAllTenants()` --calls--> `invalidateTemplatePrepareCache()`  [INFERRED]
  db/platform-master-data.ts → routes/templates.ts
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts
- `generateProposalPdfRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts

## Import Cycles
- 2-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`

## Communities (31 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.27
Nodes (8): materials, loadTenantMaterialsByIds(), loadTenantMaterialsForEstimate(), loadTenantPackagingMaterials(), loadTenantSeamingSolventMaterials(), MaterialRow, PACKAGING_PLATFORM_KEYS, SEAMING_SOLVENT_KEYS

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (60): adminSeedConfig(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation() (+52 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (23): isTransientDatabaseError(), loginRoute(), LoginSchema, logoutRoute(), LogoutSchema, meRoute(), refreshRoute(), RefreshSchema (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (25): canManageTenantMaterials(), createMaterialRoute(), deleteMaterialRoute(), getMaterialsMetaRoute(), isMaterialAdmin(), loadTenantCatalogAccess(), MASTER_DATA_FORBIDDEN, MaterialSchema (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (32): buildMasterDataReferenceFromDb(), ensurePlatformMasterState(), getPlatformCormScaleWithWaste(), getPlatformWasteBands(), getPlatformWasteBandsByPrintMode(), resolveOrderUnitDef(), estimateTotalDisplay(), calculateAndPersistEstimate() (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (22): EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, LaminationRecipeComponentSchema, LaminationRecipeSchema, LayerRow, quoteLockError(), RequoteBodySchema (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (40): activityLogs, catalogSourceEnum, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (23): buildProcessesFromDerived(), buildProcessesFromTemplateDefaults(), computeEstimateStructureSignature(), computeTemplateStructureSignature(), Db, EstimateRow, EstimateStructureLayer, loadProcessReferenceMap() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (20): Database, getMasterDataVersion(), duplicateEstimateRoute(), requoteEstimateRoute(), cloneEstimate(), CloneEstimateOptions, CloneEstimateResult, EstimateRow (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (48): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+40 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (23): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (72): allowsManualPriceFallback(), applyCatalogToTenant(), applyComponentPricesToRecipe(), asLaminationRecipe(), buildMaterialsCatalog(), CATALOG_MODULES, CatalogBuilder, catalogBuilderCache (+64 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (40): LEGACY_UNIT_METADATA, MasterDataReference, ProductTypeRow, UnitBasis, UnitRow, buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference() (+32 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (27): getCustomerEstimatesRoute(), getCustomerRoute(), calculateEstimateRoute(), deleteEstimateRoute(), estimatesByCustomerRoute(), generateProposalPdfRoute(), getEstimateRoute(), getEstimatesRoute() (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (39): referenceEntityKey(), referenceItemAuditSnapshot(), assertUniqueReferenceCodes(), assertValidBandList(), BOPP_SUBSTRATE_KEYS, countMaterialsUsingRmTypeCode(), CPP_SUBSTRATE_KEYS, DEFAULT_PROCESS_ROWS (+31 more)

### Community 18 - "Community 18"
Cohesion: 0.23
Nodes (14): createEstimateRoute(), createQuote(), CreateQuoteInput, deriveToolingFromColors(), developmentTotalDisplay(), generateQuoteRefNumber(), mapEstimateStatusToQuoteStatus(), nextEstimateSortOrder() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (41): bootstrapPlatformStandardCatalog(), entryToInsertRow(), listPlatformStandards(), SeedEntry, SeedLayer, seedEntryToSource(), applyPlatformDelete(), applyPlatformUpdate() (+33 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (29): costingKeyForMasterKey(), DEFAULT_UNIT_ROWS, MasterMaterial, materialSyncKey(), normalizeReferenceShape(), PrintingWebRow, resolveMasterDataReferencePath(), TEMPLATE_REF_TO_MASTER_KEY (+21 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (31): shutdown(), CustomerSyncResult, fetchPebiCustomersFromApi(), fetchPebiCustomersFromDb(), loadPebiCustomers(), PebiCustomerRow, pruneDuplicatePebiCustomers(), syncCustomersForPlatformCompany() (+23 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (27): appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince(), MasterAuditAction, MasterDataChangeRow (+19 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (21): autocompleteCustomersRoute(), createCustomerRoute(), createCustomerSchema, deleteCustomerRoute(), escapeLike(), getCustomersRoute(), loadTenantCustomerAccess(), updateCustomerRoute() (+13 more)

### Community 24 - "Community 24"
Cohesion: 0.39
Nodes (21): ensureBoppSubstratesFromSeed(), ensureCppSubstratesFromSeed(), ensureLaminationAdhesivesSeeded(), ensurePackagingCatalogSeeded(), ensurePapSubstratesFromSeed(), ensurePaSubstratesFromSeed(), ensurePeSubstratesFromSeed(), ensurePetSubstratesFromSeed() (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (21): getCustomerExplorerRoute(), AddEstimateSchema, addEstimateToQuoteRoute(), duplicateEstimateOnQuoteRoute(), DuplicateEstimateSchema, enrichEstimateSummary(), getQuotePriceListRoute(), getQuoteRoute() (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (17): EstimateRow, getDashboardSummaryRoute(), getUserVisibilityProfile(), getTenantUsersRoute(), normalizeVisibilityProfile(), PatchUserVisibilitySchema, updateUserVisibilityRoute(), VisibilityProfileSchema (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (16): createPlatformServiceKey(), listPlatformServiceKeys(), pepper(), revokePlatformServiceKey(), ServiceKeyListItem, toListItem(), VerifiedServiceKey, verifyPlatformServiceKey() (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.23
Nodes (14): getDatabase(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant(), registerRoute(), getSubcategoriesRoute(), getSlabTemplatesRoute(), getSupportedCurrenciesRoute() (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (9): estimates, layers, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow, resolveSolventCostPerKgUsd() (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (3): priceOf(), resolveSeamingSolventCostPerKgUsd(), SeamingMaterialLike

## Knowledge Gaps
- **253 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 28` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.333) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 8`, `Community 15`, `Community 18`, `Community 19`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 28`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06734867860187553 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12962962962962962 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.12051282051282051 - nodes in this community are weakly interconnected._