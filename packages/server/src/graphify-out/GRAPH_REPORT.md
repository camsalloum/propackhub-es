# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-05)

## Corpus Check
- 87 files · ~67,507 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 690 nodes · 2076 edges · 20 communities (19 shown, 1 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 152 edges
2. `sendCaughtError()` - 65 edges
3. `extractTenantFromRequest()` - 58 edges
4. `extractUserFromRequest()` - 41 edges
5. `updateEstimateRoute()` - 29 edges
6. `instantiateTemplateRoute()` - 24 edges
7. `getEffectiveProfile()` - 21 edges
8. `buildApp()` - 19 edges
9. `createEstimateRoute()` - 17 edges
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

## Communities (20 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (22): normalizeReferenceShape(), resolveMasterDataReferencePath(), referenceEntityKey(), referenceItemAuditSnapshot(), assertUniqueReferenceCodes(), assertValidBandList(), countMaterialsUsingRmTypeCode(), DEFAULT_PROCESS_ROWS (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (75): quantitiesForSlabTemplateKey(), ensureTemplatesForTenant(), insertOrUpdateTenantStandard(), isUniqueViolation(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates() (+67 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (41): isTransientDatabaseError(), seedDefaultAdmin(), ensureMaterialsForTenant(), seedMaterialsForTenant(), loginRoute(), LoginSchema, logoutRoute(), LogoutSchema (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (23): costingKeyForMasterKey(), DEFAULT_UNIT_ROWS, MasterMaterial, materialSyncKey(), PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, backfillMaterialSubcategories() (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (40): buildMasterDataReferenceFromDb(), getPlatformCormScaleWithWaste(), getPlatformWasteBands(), getPlatformWasteBandsByPrintMode(), estimates, layers, materials, resolveOrderUnitDef() (+32 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (62): Database, getMasterDataVersion(), createEstimateRoute(), detectProcessInsertMode(), duplicateEstimateRoute(), EstimateCreateSchema, EstimateRow, EstimateUpdateSchema (+54 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (39): activityLogs, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts, layersRelations (+31 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (22): buildProcessesFromDerived(), buildProcessesFromTemplateDefaults(), computeTemplateStructureSignature(), Db, EstimateRow, EstimateStructureLayer, loadProcessReferenceMap(), loadRawEstimateProcesses() (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (19): appendMasterAuditEntry(), AppendMasterAuditInput, AuditActor, AuditActorType, listMasterDataChangesSince(), MasterAuditAction, MasterDataChangeRow, listPlatformMasterMaterialsWithIds() (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (40): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+32 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (13): createPlatformServiceKey(), pepper(), ServiceKeyListItem, toListItem(), VerifiedServiceKey, verifyPlatformServiceKey(), Bucket, buckets (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (39): LEGACY_UNIT_METADATA, MasterDataReference, UnitBasis, UnitRow, buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference(), listTenantReferenceItems() (+31 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (94): getDatabase(), DEFAULT_SLAB_TEMPLATES, ensureSlabTemplatesForTenant(), seedSlabTemplatesForTenant(), meRoute(), getSubcategoriesRoute(), autocompleteCustomersRoute(), createCustomerRoute() (+86 more)

### Community 17 - "Community 17"
Cohesion: 0.36
Nodes (14): appendMasterAuditEntries(), materialAuditSnapshot(), createPlatformMasterMaterial(), deletePlatformMasterMaterial(), ensurePlatformMasterState(), getPlatformMasterMaterialById(), incrementMasterDataVersion(), masterMaterialInputToDbValues() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.31
Nodes (10): ensureLaminationAdhesivesSeeded(), ensurePlatformMasterSeeded(), ensureProcessesSeeded(), ensureSolventCatalogSeeded(), listPlatformMasterMaterials(), loadSeedMaterialsFromJson(), placeholderCost(), resolveSeedJsonPath() (+2 more)

## Knowledge Gaps
- **192 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY`, `AuditActorType`, `MasterAuditAction` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 17`, `Community 18`?**
  _High betweenness centrality (0.255) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 16` to `Community 1`, `Community 2`, `Community 5`, `Community 8`, `Community 15`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `TEMPLATE_REF_TO_MASTER_KEY` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05910364145658263 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06966618287373004 - nodes in this community are weakly interconnected._