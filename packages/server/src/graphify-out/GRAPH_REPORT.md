# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-09)

## Corpus Check
- 101 files · ~78,136 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 872 nodes · 2589 edges · 27 communities (26 shown, 1 thin omitted)
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
1. `getDatabase()` - 190 edges
2. `sendCaughtError()` - 72 edges
3. `extractTenantFromRequest()` - 63 edges
4. `extractUserFromRequest()` - 45 edges
5. `updateEstimateRoute()` - 33 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `buildApp()` - 21 edges
8. `incrementMasterDataVersion()` - 21 edges
9. `getMaterialsMissingForTenant()` - 21 edges
10. `getEffectiveProfile()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `buildApp()` --calls--> `registerIntegrationRoutes()`  [INFERRED]
  app.ts → routes/integration.ts
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `syncPlatformMasterToAllTenants()` --calls--> `invalidateTemplatePrepareCache()`  [INFERRED]
  db/platform-master-data.ts → routes/templates.ts
- `generateProposalPdfRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts

## Import Cycles
- 2-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`

## Communities (27 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (24): createEstimateRoute(), EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, LaminationRecipeComponentSchema, LaminationRecipeSchema, LayerRow, quoteLockError() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (79): adminSeedConfig(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation() (+71 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (29): isTransientDatabaseError(), loginRoute(), LoginSchema, logoutRoute(), LogoutSchema, refreshRoute(), RefreshSchema, RegisterSchema (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (17): costingKeyForMasterKey(), materialSyncKey(), DbMaterial, findExistingMatch(), findOrphanSubstrateRows(), getMasterMaterialsList(), LEGACY_ADHESIVE_NAMES, LEGACY_INK_NAMES (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (19): estimateTotalDisplay(), buildProposalPdfBuffer(), buildQuoteProposalPdfBuffer(), Db, getUserVisibilityProfile(), laminateSvgFromLayers(), proposalsDir(), saveProposalPdf() (+11 more)

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
Cohesion: 0.14
Nodes (17): Database, CloneEstimateOptions, CloneEstimateResult, EstimateRow, LayerRow, MaterialRow, createQuote(), CreateQuoteInput (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (42): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+34 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (24): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (63): applyCatalogToTenant(), { buildAluMaterialsCatalog }, { buildBoppMaterialsCatalog }, { buildCppMaterialsCatalog }, buildMaterialsCatalog(), { buildPaMaterialsCatalog }, { buildPapMaterialsCatalog }, { buildPetMaterialsCatalog } (+55 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (23): MasterDataReference, DEFAULT_PRINTING_WEB, DEFAULT_PRINTING_WEB_ROWS, DEFAULT_PRODUCT_TYPE_ROWS, DEFAULT_PRODUCT_TYPES, DEFAULT_RM_TYPES, DEFAULT_UNITS, enrichMasterDataReference() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (114): getDatabase(), ensureCategoriesForTenant(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant(), meRoute(), registerRoute(), getCategoriesRoute() (+106 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (80): normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), materialAuditSnapshot(), referenceEntityKey(), referenceItemAuditSnapshot(), assertUniqueReferenceCodes(), assertValidBandList() (+72 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (16): LEGACY_UNIT_METADATA, UnitBasis, UnitRow, buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference(), listTenantReferenceItems(), mergeByCode() (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.27
Nodes (15): buildMasterDataReferenceFromDb(), ensurePlatformMasterState(), getPlatformCormScaleWithWaste(), getPlatformWasteBands(), getPlatformWasteBandsByPrintMode(), resolveOrderUnitDef(), calculateAndPersistEstimate(), calculateEstimateFromDatabase() (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (9): getMasterDataVersion(), duplicateEstimateRoute(), requoteEstimateRoute(), cloneEstimate(), inheritedQuoteFieldsFromParent(), loadQuoteForEstimate(), buildLayerInsertValues(), MaterialLineageSource (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (31): shutdown(), CustomerSyncResult, fetchPebiCustomersFromApi(), fetchPebiCustomersFromDb(), loadPebiCustomers(), PebiCustomerRow, pruneDuplicatePebiCustomers(), syncCustomersForPlatformCompany() (+23 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (30): appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince(), MasterAuditAction, MasterDataChangeRow, listPlatformMasterMaterialsWithIds() (+22 more)

### Community 23 - "Community 23"
Cohesion: 0.36
Nodes (7): buildEstimateClassificationSnapshot(), deriveStructureTierFromSubstrates(), EstimateClassificationSnapshot, isPrintedStack(), LayerLike, StructureTier, substrateCount()

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (11): estimates, layers, materials, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (10): DEFAULT_UNIT_ROWS, MasterMaterial, PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, lookup, materials, validIds (+2 more)

## Knowledge Gaps
- **251 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+246 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 25`?**
  _High betweenness centrality (0.326) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 18`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05694586312563841 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13852813852813853 - nodes in this community are weakly interconnected._