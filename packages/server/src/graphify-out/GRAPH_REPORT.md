# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-07)

## Corpus Check
- 93 files · ~70,706 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 742 nodes · 2230 edges · 23 communities
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

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 164 edges
2. `sendCaughtError()` - 69 edges
3. `extractTenantFromRequest()` - 61 edges
4. `extractUserFromRequest()` - 44 edges
5. `updateEstimateRoute()` - 33 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `buildApp()` - 21 edges
8. `getEffectiveProfile()` - 21 edges
9. `createEstimateRoute()` - 20 edges
10. `buildEngineMaterialMap()` - 17 edges

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
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`

## Communities (23 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (81): normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince() (+73 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (86): bootstrapPlatformStandardCatalog(), entryToInsertRow(), listPlatformStandards(), SeedEntry, SeedLayer, quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), insertOrUpdateTenantStandard() (+78 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (40): isTransientDatabaseError(), adminSeedConfig(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant() (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (28): costingKeyForMasterKey(), MasterMaterial, materialSyncKey(), listPlatformReferenceItems(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy(), ensureCategoriesForTenant() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (17): estimateTotalDisplay(), buildProposalPdfBuffer(), buildQuoteProposalPdfBuffer(), Db, getUserVisibilityProfile(), laminateSvgFromLayers(), proposalsDir(), saveProposalPdf() (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (20): EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, LaminationRecipeComponentSchema, LaminationRecipeSchema, LayerRow, RequoteBodySchema, updateEstimateRoute() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (39): activityLogs, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts, layersRelations (+31 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (25): buildProcessesFromDerived(), buildProcessesFromTemplateDefaults(), computeEstimateStructureSignature(), computeTemplateStructureSignature(), Db, EstimateRow, EstimateStructureLayer, findEstimateTemplate() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (13): createEstimateRoute(), createQuote(), CreateQuoteInput, deriveToolingFromColors(), developmentTotalDisplay(), generateQuoteRefNumber(), mapEstimateStatusToQuoteStatus(), nextEstimateSortOrder() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (38): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+30 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (12): estimates, layers, materials, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (43): DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, MasterDataReference, PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, UnitBasis, UnitRow (+35 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (106): getDatabase(), meRoute(), getCategoriesRoute(), getSubcategoriesRoute(), autocompleteCustomersRoute(), createCustomerRoute(), createCustomerSchema, deleteCustomerRoute() (+98 more)

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (9): Database, CloneEstimateOptions, CloneEstimateResult, EstimateRow, LayerRow, MaterialRow, ToolingBillingMode, ToolingScenario (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.36
Nodes (7): buildEstimateClassificationSnapshot(), deriveStructureTierFromSubstrates(), EstimateClassificationSnapshot, isPrintedStack(), LayerLike, StructureTier, substrateCount()

### Community 19 - "Community 19"
Cohesion: 0.30
Nodes (13): buildMasterDataReferenceFromDb(), getPlatformCormScaleWithWaste(), getPlatformWasteBands(), getPlatformWasteBandsByPrintMode(), resolveOrderUnitDef(), calculateAndPersistEstimate(), calculateEstimateFromDatabase(), Db (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.35
Nodes (10): getMasterDataVersion(), duplicateEstimateRoute(), requoteEstimateRoute(), cloneEstimate(), inheritedQuoteFieldsFromParent(), loadQuoteForEstimate(), buildLayerInsertValues(), MaterialLineageSource (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.31
Nodes (8): CustomerSyncResult, fetchPebiCustomersFromApi(), fetchPebiCustomersFromDb(), loadPebiCustomers(), PebiCustomerRow, pruneDuplicatePebiCustomers(), syncCustomersForPlatformCompany(), syncCustomersFromPebiForTenant()

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (3): detectProcessInsertMode(), insertEstimateProcess(), insertProcessCompat()

## Knowledge Gaps
- **210 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 19`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 5`, `Community 8`, `Community 15`, `Community 20`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05218365061590145 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05175438596491228 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07058823529411765 - nodes in this community are weakly interconnected._