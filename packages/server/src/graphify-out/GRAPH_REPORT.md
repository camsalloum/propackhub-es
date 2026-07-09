# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-08)

## Corpus Check
- 101 files · ~74,805 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 812 nodes · 2410 edges · 27 communities (26 shown, 1 thin omitted)
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 180 edges
2. `sendCaughtError()` - 72 edges
3. `extractTenantFromRequest()` - 63 edges
4. `extractUserFromRequest()` - 45 edges
5. `updateEstimateRoute()` - 33 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `buildApp()` - 21 edges
8. `getEffectiveProfile()` - 21 edges
9. `createEstimateRoute()` - 20 edges
10. `errorBody()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `buildApp()` --calls--> `registerIntegrationRoutes()`  [INFERRED]
  app.ts → routes/integration.ts
- `syncPlatformMasterToAllTenants()` --calls--> `invalidateTemplatePrepareCache()`  [INFERRED]
  db/platform-master-data.ts → routes/templates.ts
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts
- `generateProposalPdfRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts

## Import Cycles
- 2-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`

## Communities (27 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (17): createPlatformServiceKey(), listPlatformServiceKeys(), pepper(), revokePlatformServiceKey(), ServiceKeyListItem, toListItem(), VerifiedServiceKey, verifyPlatformServiceKey() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (82): bootstrapPlatformStandardCatalog(), entryToInsertRow(), listPlatformStandards(), SeedEntry, SeedLayer, ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation() (+74 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (46): isTransientDatabaseError(), adminSeedConfig(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), quantitiesForSlabTemplateKey() (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (18): costingKeyForMasterKey(), MasterMaterial, materialSyncKey(), DbMaterial, findExistingMatch(), findOrphanSubstrateRows(), getMasterMaterialsList(), LEGACY_ADHESIVE_NAMES (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (41): buildMasterDataReferenceFromDb(), getPlatformCormScaleWithWaste(), getPlatformWasteBandsByPrintMode(), estimates, layers, materials, resolveOrderUnitDef(), estimateTotalDisplay() (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (8): Db, EstimateAuditLog, logEstimateStateTransition(), buildStateSnapshot(), detectStateTransition(), EstimateState, StateTransition, validateProcessesCustomizeTransition()

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (40): activityLogs, catalogSourceEnum, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (25): buildProcessesFromDerived(), buildProcessesFromTemplateDefaults(), computeEstimateStructureSignature(), computeTemplateStructureSignature(), Db, EstimateRow, EstimateStructureLayer, findEstimateTemplate() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (17): Database, CloneEstimateOptions, CloneEstimateResult, EstimateRow, LayerRow, MaterialRow, CreateQuoteInput, deriveToolingFromColors() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (36): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (12): getMaterialsCatalogMeta(), MaterialsCatalogMeta, buildTenantCatalogAccess(), CatalogSource, normalizeCatalogSource(), TenantCatalogAccess, TenantCatalogAccessInput, buildTenantCustomerAccess() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (43): DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, MasterDataReference, PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, UnitBasis, UnitRow (+35 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (101): getDatabase(), meRoute(), getSubcategoriesRoute(), autocompleteCustomersRoute(), createCustomerRoute(), createCustomerSchema, deleteCustomerRoute(), escapeLike() (+93 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (23): normalizeReferenceShape(), resolveMasterDataReferencePath(), assertValidBandList(), DEFAULT_PROCESS_ROWS, ensurePlatformMasterState(), getPlatformWasteBands(), here, LAMINATION_ADHESIVE_KEYS (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (15): updateEstimateRoute(), isAuthError(), buildEstimateClassificationSnapshot(), deriveStructureTierFromSubstrates(), EstimateClassificationSnapshot, isPrintedStack(), LayerLike, mergeEstimateDimensionsClassification() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (10): patternOr(), PLATFORM_TEMPLATE_NAME_PATTERNS, purgeIntegrationArtifacts(), PurgeIntegrationArtifactsResult, PurgeOptions, runIdEmailOr(), runIdNameOr(), STRUCTURE_TEMPLATE_NAME_PATTERNS (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (26): getMasterDataVersion(), createEstimateRoute(), duplicateEstimateRoute(), EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, LaminationRecipeComponentSchema, LaminationRecipeSchema (+18 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (54): shutdown(), pebiOraclePushRoute(), registerIntegrationRoutes(), CustomerSyncResult, fetchPebiCustomersFromApi(), fetchPebiCustomersFromDb(), loadPebiCustomers(), PebiCustomerRow (+46 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (15): appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince(), MasterAuditAction, MasterDataChangeRow, listPlatformMasterMaterialsWithIds() (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.36
Nodes (12): ensureLaminationAdhesivesSeeded(), ensurePetSubstratesFromSeed(), ensurePlatformMasterSeeded(), ensureProcessesSeeded(), ensureSolventCatalogSeeded(), listPlatformMasterMaterials(), loadSeedMaterialsFromJson(), masterMaterialInputToDbValues() (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.44
Nodes (11): appendMasterAuditEntries(), materialAuditSnapshot(), createPlatformMasterMaterial(), deletePlatformMasterMaterial(), getPlatformMasterMaterialById(), incrementMasterDataVersion(), refreshSolventCommonRow(), replacePlatformMasterMaterials() (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (7): referenceEntityKey(), referenceItemAuditSnapshot(), assertUniqueReferenceCodes(), countMaterialsUsingRmTypeCode(), deriveRmTypeCode(), replacePlatformReferenceCategory(), updateCostingDefaults()

## Knowledge Gaps
- **231 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.306) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 1`, `Community 2`, `Community 15`, `Community 18`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _231 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05306217858812529 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.061952074810052604 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13405797101449277 - nodes in this community are weakly interconnected._