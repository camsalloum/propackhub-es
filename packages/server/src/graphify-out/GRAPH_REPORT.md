# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-07)

## Corpus Check
- 88 files · ~68,837 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 717 nodes · 2160 edges · 20 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 155 edges
2. `sendCaughtError()` - 66 edges
3. `extractTenantFromRequest()` - 58 edges
4. `extractUserFromRequest()` - 41 edges
5. `updateEstimateRoute()` - 33 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `getEffectiveProfile()` - 21 edges
8. `createEstimateRoute()` - 20 edges
9. `buildApp()` - 19 edges
10. `buildEngineMaterialMap()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `syncPlatformMasterToAllTenants()` --calls--> `invalidateTemplatePrepareCache()`  [INFERRED]
  db/platform-master-data.ts → routes/templates.ts
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts
- `generateProposalPdfRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts
- `updateEstimateRoute()` --calls--> `buildProposalPdfBuffer()`  [INFERRED]
  routes/estimates.ts → services/proposal-pdf.ts

## Import Cycles
- 2-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`

## Communities (20 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (82): normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince() (+74 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (76): ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates(), relinkTemplatesForTenant() (+68 more)

### Community 2 - "Community 2"
Cohesion: 0.24
Nodes (10): patternOr(), PLATFORM_TEMPLATE_NAME_PATTERNS, purgeIntegrationArtifacts(), PurgeIntegrationArtifactsResult, PurgeOptions, runIdEmailOr(), runIdNameOr(), STRUCTURE_TEMPLATE_NAME_PATTERNS (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (28): costingKeyForMasterKey(), MasterMaterial, materialSyncKey(), listPlatformReferenceItems(), backfillMaterialSubcategories(), BASE_TAXONOMY, buildTaxonomy(), ensureCategoriesForTenant() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (41): buildMasterDataReferenceFromDb(), getPlatformCormScaleWithWaste(), getPlatformWasteBandsByPrintMode(), materials, resolveOrderUnitDef(), estimateTotalDisplay(), calculateAndPersistEstimate(), calculateEstimateFromDatabase() (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (8): Db, EstimateAuditLog, logEstimateStateTransition(), buildStateSnapshot(), detectStateTransition(), EstimateState, StateTransition, validateProcessesCustomizeTransition()

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (41): activityLogs, categories, customers, customersRelations, estimates, estimatesRelations, estimateStatusEnum, estimationCosts (+33 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (26): buildProcessesFromDerived(), buildProcessesFromTemplateDefaults(), computeEstimateStructureSignature(), computeTemplateStructureSignature(), Db, detectProcessInsertMode(), EstimateRow, EstimateStructureLayer (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (16): Database, CloneEstimateOptions, CloneEstimateResult, EstimateRow, LayerRow, MaterialRow, CreateQuoteInput, deriveToolingFromColors() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (18): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, registerAdminPlatformTemplateRoutes(), registerAuthRoutes(), registerCategoryRoutes(), registerCustomerRoutes(), registerDashboardRoutes() (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (24): bootstrapPlatformStandardCatalog(), entryToInsertRow(), listPlatformStandards(), SeedEntry, SeedLayer, config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (31): isTransientDatabaseError(), adminSeedConfig(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), quantitiesForSlabTemplateKey() (+23 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (43): DEFAULT_UNIT_ROWS, LEGACY_UNIT_METADATA, MasterDataReference, PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, UnitBasis, UnitRow (+35 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (102): getDatabase(), meRoute(), getCategoriesRoute(), getSubcategoriesRoute(), autocompleteCustomersRoute(), createCustomerRoute(), createCustomerSchema, deleteCustomerRoute() (+94 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (25): getMasterDataVersion(), createEstimateRoute(), duplicateEstimateRoute(), EstimateCreateSchema, EstimateRow, EstimateUpdateSchema, LaminationRecipeComponentSchema, LaminationRecipeSchema (+17 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (9): closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection(), runMigrations(), shutdown(), hasDatabase (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (13): updateEstimateRoute(), isAuthError(), buildEstimateClassificationSnapshot(), deriveStructureTierFromSubstrates(), EstimateClassificationSnapshot, isPrintedStack(), LayerLike, mergeEstimateDimensionsClassification() (+5 more)

## Knowledge Gaps
- **204 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 20`?**
  _High betweenness centrality (0.265) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 0`, `Community 1`, `Community 11`, `Community 15`, `Community 17`, `Community 20`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05175438596491228 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.058002735978112174 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._