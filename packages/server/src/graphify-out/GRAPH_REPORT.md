# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-10)

## Corpus Check
- 102 files · ~81,569 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 897 nodes · 2679 edges · 23 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 194 edges
2. `sendCaughtError()` - 72 edges
3. `extractTenantFromRequest()` - 63 edges
4. `extractUserFromRequest()` - 45 edges
5. `updateEstimateRoute()` - 34 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `getMaterialsMissingForTenant()` - 23 edges
8. `incrementMasterDataVersion()` - 22 edges
9. `buildApp()` - 21 edges
10. `createEstimateRoute()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `syncPlatformMasterToAllTenants()` --calls--> `invalidateTemplatePrepareCache()`  [INFERRED]
  db/platform-master-data.ts → routes/templates.ts
- `buildApp()` --calls--> `registerIntegrationRoutes()`  [INFERRED]
  app.ts → routes/integration.ts
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `afterPlatformMutation()` --calls--> `syncPlatformMasterToAllTenants()`  [EXTRACTED]
  routes/platform-master-data.ts → db/platform-master-data.ts
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts

## Import Cycles
- 2-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`

## Communities (23 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.27
Nodes (12): createEstimateRoute(), updateEstimateRoute(), mapEstimateStatusToQuoteStatus(), syncQuoteStatusFromEstimates(), validateEstimateSaveRefs(), detectProcessInsertMode(), findEstimateTemplate(), insertEstimateProcess() (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (76): quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates() (+68 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (38): isTransientDatabaseError(), adminSeedConfig(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), loginRoute(), LoginSchema, logoutRoute() (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (31): canManageTenantMaterials(), createMaterialRoute(), deleteMaterialRoute(), getMaterialsMetaRoute(), isMaterialAdmin(), loadTenantCatalogAccess(), MASTER_DATA_FORBIDDEN, MaterialSchema (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (50): buildMasterDataReferenceFromDb(), getPlatformCormScaleWithWaste(), getPlatformWasteBands(), getPlatformWasteBandsByPrintMode(), estimates, layers, materials, resolveOrderUnitDef() (+42 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (15): EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, LaminationRecipeComponentSchema, LaminationRecipeSchema, LayerRow, RequoteBodySchema, Db (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (40): activityLogs, catalogSourceEnum, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (23): buildProcessesFromDerived(), buildProcessesFromTemplateDefaults(), computeEstimateStructureSignature(), computeTemplateStructureSignature(), Db, EstimateRow, EstimateStructureLayer, loadProcessReferenceMap() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (19): Database, getMasterDataVersion(), duplicateEstimateRoute(), requoteEstimateRoute(), cloneEstimate(), CloneEstimateOptions, CloneEstimateResult, EstimateRow (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (40): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+32 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (69): allowsManualPriceFallback(), applyCatalogToTenant(), applyComponentPricesToRecipe(), asLaminationRecipe(), buildMaterialsCatalog(), CATALOG_MODULES, CatalogBuilder, catalogBuilderCache (+61 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (43): DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, MasterDataReference, PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, UnitBasis, UnitRow (+35 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (94): getDatabase(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant(), meRoute(), getSubcategoriesRoute(), autocompleteCustomersRoute(), createCustomerRoute() (+86 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (97): costingKeyForMasterKey(), MasterMaterial, materialSyncKey(), normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), materialAuditSnapshot(), referenceEntityKey() (+89 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (14): quoteLockError(), instantiateTemplateRoute(), createQuote(), CreateQuoteInput, deriveToolingFromColors(), generateQuoteRefNumber(), isQuoteLocked(), nextEstimateSortOrder() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (10): patternOr(), PLATFORM_TEMPLATE_NAME_PATTERNS, purgeIntegrationArtifacts(), PurgeIntegrationArtifactsResult, PurgeOptions, runIdEmailOr(), runIdNameOr(), STRUCTURE_TEMPLATE_NAME_PATTERNS (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (30): shutdown(), CustomerSyncResult, fetchPebiCustomersFromApi(), fetchPebiCustomersFromDb(), loadPebiCustomers(), PebiCustomerRow, pruneDuplicatePebiCustomers(), syncCustomersForPlatformCompany() (+22 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (35): appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince(), MasterAuditAction, MasterDataChangeRow, listPlatformMasterMaterialsWithIds() (+27 more)

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (9): buildEstimateClassificationSnapshot(), deriveStructureTierFromSubstrates(), EstimateClassificationSnapshot, isPrintedStack(), LayerLike, mergeEstimateDimensionsClassification(), stripConfigureFromTemplateFlag(), StructureTier (+1 more)

## Knowledge Gaps
- **251 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+246 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.330) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 15`, `Community 18`, `Community 22`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05663474692202462 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07585568917668825 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._