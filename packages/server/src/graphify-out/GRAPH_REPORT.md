# Graph Report - apps\estimation-studio\packages\server\src  (2026-07-22)

## Corpus Check
- 112 files · ~90,063 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 985 nodes · 2876 edges · 34 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bb148f2d`
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
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 205 edges
2. `sendCaughtError()` - 72 edges
3. `extractTenantFromRequest()` - 63 edges
4. `extractUserFromRequest()` - 45 edges
5. `updateEstimateRoute()` - 35 edges
6. `getMaterialsMissingForTenant()` - 25 edges
7. `incrementMasterDataVersion()` - 24 edges
8. `instantiateTemplateRoute()` - 24 edges
9. `createEstimateRoute()` - 23 edges
10. `syncFamilyMaterialsFromPebiForTenant()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `buildApp()` --calls--> `registerIntegrationRoutes()`  [INFERRED]
  app.ts → routes/integration.ts
- `getQuoteProposalPdfRoute()` --calls--> `quoteProposalDownloadFilename()`  [INFERRED]
  routes/quotes.ts → utils/commercial-quotation-pdf.ts
- `canManageTenantReference()` --calls--> `getDatabase()`  [EXTRACTED]
  routes/master-data.ts → db/index.ts
- `syncPlatformMasterToAllTenants()` --calls--> `invalidateTemplatePrepareCache()`  [INFERRED]
  db/platform-master-data.ts → routes/templates.ts
- `getMaterialsRoute()` --calls--> `ensureCategoriesForTenant()`  [INFERRED]
  routes/materials.ts → db/seed-categories.ts

## Import Cycles
- 2-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 3-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 4-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> db/tenant-reference-data.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/clone-estimate.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/proposal-pdf.ts -> services/estimate-calculation.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/admin-platform-templates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`
- 5-file cycle: `db/platform-master-data.ts -> routes/templates.ts -> routes/estimates.ts -> services/estimate-calculation.ts -> utils/estimate-processes.ts -> db/platform-master-data.ts`

## Communities (34 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.23
Nodes (10): materials, CONSUMABLES_PLATFORM_KEYS, loadTenantConsumablesMaterials(), loadTenantMaterialsByIds(), loadTenantMaterialsForEstimate(), loadTenantPackagingMaterials(), loadTenantSeamingSolventMaterials(), MaterialRow (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (77): quantitiesForSlabTemplateKey(), insertOrUpdateTenantStandard(), isUniqueViolation(), loadPlatformStandardSources(), loadTenantMaterials(), PlatformStandardSource, pruneDuplicateStandardTemplates(), relinkTemplatesForTenant() (+69 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (48): EsSsoPayload, jwt, parsePlatformUserId(), require, consumeSsoJti(), DbTenant, DbUser, ensureUserFromSso() (+40 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (31): canManageTenantMaterials(), createMaterialRoute(), deleteMaterialRoute(), getMaterialsMetaRoute(), isMaterialAdmin(), loadTenantCatalogAccess(), MASTER_DATA_FORBIDDEN, MaterialSchema (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (19): buildQuoteProposalPdfBuffer(), Db, getUserVisibilityProfile(), laminateSvgFromLayers(), parseDims(), proposalsDir(), saveProposalPdf(), StoredPrefs (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (27): calculateEstimateRoute(), deleteEstimateRoute(), EstimateCreateSchema, EstimateRow, estimatesByCustomerRoute(), EstimateUpdateSchema, generateProposalPdfRoute(), getEstimateRoute() (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (41): activityLogs, catalogSourceEnum, categories, customers, customersRelations, estimatesRelations, estimateStatusEnum, estimationCosts (+33 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (47): updateEstimateRoute(), Db, EstimateAuditLog, logEstimateStateTransition(), buildEstimateClassificationSnapshot(), deriveStructureTierFromSubstrates(), EstimateClassificationSnapshot, isPrintedStack() (+39 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (19): Database, getMasterDataVersion(), duplicateEstimateRoute(), requoteEstimateRoute(), cloneEstimate(), CloneEstimateOptions, CloneEstimateResult, EstimateRow (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (36): buildApp(), BuildAppOptions, CAPACITOR_ORIGINS, closeDatabase(), initializeDatabase(), parseEnvBool(), parseEnvInt(), resetDatabaseConnection() (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (14): config, FALLBACK_RESIN_USD_PER_KG, FAMILY_TO_RESIN, getYahooFuturesUsdPerKg(), HTTP_HEADERS, MarketRefreshChange, MarketRefreshResult, MaterialRow (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (72): allowsManualPriceFallback(), applyCatalogToTenant(), applyComponentPricesToRecipe(), asLaminationRecipe(), buildMaterialsCatalog(), CATALOG_MODULES, CatalogBuilder, catalogBuilderCache (+64 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (10): getRawCostProvider(), _pebiProvider, PebiRawCostProvider, PlatformMasterProvider, _platformProvider, RawCostContext, RawCostProvider, RawCostResult (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (23): MasterDataReference, DEFAULT_PRINTING_WEB, DEFAULT_PRINTING_WEB_ROWS, DEFAULT_PRODUCT_TYPE_ROWS, DEFAULT_PRODUCT_TYPES, DEFAULT_RM_TYPES, DEFAULT_UNITS, enrichMasterDataReference() (+15 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (27): getCustomerExplorerRoute(), AddEstimateSchema, addEstimateToQuoteRoute(), createQuoteRoute(), deleteQuoteRoute(), duplicateEstimateOnQuoteRoute(), DuplicateEstimateSchema, enrichEstimateSummary() (+19 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (111): getDatabase(), normalizeReferenceShape(), resolveMasterDataReferencePath(), appendMasterAuditEntries(), appendMasterAuditEntry(), AppendMasterAuditInput, AuditActorType, listMasterDataChangesSince() (+103 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (14): createEstimateRoute(), createQuote(), CreateQuoteInput, deriveToolingFromColors(), generateQuoteRefNumber(), mapEstimateStatusToQuoteStatus(), maybeCopyDeliveryTermToQuote(), normalizeToolingScenario() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (14): requirePlatformAdmin(), requirePlatformAdmin(), isPlatformAdmin(), AppError, ErrorCode, ErrorEnvelope, isAuthExpired(), isUniqueViolation() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (16): costingKeyForMasterKey(), materialSyncKey(), ADHESIVE_RETIREMENT_MAP, DbMaterial, findExistingMatch(), findOrphanSubstrateRows(), getMasterMaterialsList(), LEGACY_ADHESIVE_NAMES (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (43): shutdown(), pebiOraclePushRoute(), registerIntegrationRoutes(), customerCommercialFields(), CustomerSyncResult, fetchPebiCustomersFromApi(), fetchPebiCustomersFromDb(), loadPebiCustomers() (+35 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (16): LEGACY_UNIT_METADATA, UnitBasis, UnitRow, buildMasterDataReferenceForTenant(), isTenantExtensibleCategory(), listTenantOwnReference(), listTenantReferenceItems(), mergeByCode() (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (16): BRANDING_DIR, cellText(), CommercialQuotationInput, CommercialQuotationRow, FOOTER_CANDIDATES, HEADER_CANDIDATES, PdfTextDoc, quoteProposalDownloadFilename() (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (15): meRoute(), getTenantUsersRoute(), normalizeVisibilityProfile(), PatchUserVisibilitySchema, updateUserVisibilityRoute(), VisibilityProfileSchema, DEFAULT_ADMIN_PROFILE, DEFAULT_SALES_REP_PROFILE (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (14): autocompleteCustomersRoute(), createCustomerRoute(), createCustomerSchema, deleteCustomerRoute(), escapeLike(), getCustomerEstimatesRoute(), getCustomerRoute(), getCustomersRoute() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (17): buildMasterDataReferenceFromDb(), getPlatformCormScaleWithWaste(), getPlatformWasteBands(), getPlatformWasteBandsByPrintMode(), resolveOrderUnitDef(), calculateAndPersistEstimate(), calculateEstimateFromDatabase(), Db (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (17): AuditActor, createPlatformServiceKey(), pepper(), revokePlatformServiceKey(), ServiceKeyListItem, toListItem(), VerifiedServiceKey, verifyPlatformServiceKey() (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.28
Nodes (7): getSlabTemplatesRoute(), getSupportedCurrenciesRoute(), getTenantSettingsRoute(), refreshExchangeRateRoute(), updateTenantSettingsRoute(), filterSupportedCurrencies(), SUPPORTED_CURRENCIES

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (12): estimates, layers, EstimateRow, LayerRow, MaterialRow, ProcessRow, SlabRow, priceOf() (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (6): bandKey(), displayToUsd(), priceUsdPerKgForBand(), QuotationMatrixInput, QuotationPriceUnit, resolveBand()

### Community 32 - "Community 32"
Cohesion: 0.38
Nodes (6): EstimateRow, estimateTotalDisplay(), getDashboardSummaryRoute(), getUserVisibilityProfile(), packageKey(), QuoteRow

### Community 34 - "Community 34"
Cohesion: 0.43
Nodes (4): applySolventCommonAverage(), computeSolventCommonAverage(), PEER_KEY_SET, SOLVENT_COMMON_PEER_KEYS

### Community 35 - "Community 35"
Cohesion: 0.19
Nodes (10): DEFAULT_UNIT_ROWS, MasterMaterial, PrintingWebRow, ProductTypeRow, TEMPLATE_REF_TO_MASTER_KEY, lookup, materials, validIds (+2 more)

## Knowledge Gaps
- **273 isolated node(s):** `BuildAppOptions`, `CAPACITOR_ORIGINS`, `DbUser`, `DbTenant`, `require` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDatabase()` connect `Community 17` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 16`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 32`?**
  _High betweenness centrality (0.322) - this node is a cross-community bridge._
- **Why does `sendCaughtError()` connect `Community 25` to `Community 32`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 24`, `Community 28`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateEstimateRoute()` (e.g. with `buildProposalPdfBuffer()` and `saveProposalPdf()`) actually correct?**
  _`updateEstimateRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `BuildAppOptions`, `CAPACITOR_ORIGINS`, `DbUser` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06073871409028728 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06654567453115548 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._