# Graph Report - apps\estimation-studio\packages\engine\src  (2026-07-22)

## Corpus Check
- 51 files · ~34,997 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 341 nodes · 726 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
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
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `Material` - 22 edges
2. `Estimate` - 19 edges
3. `calculateEstimate()` - 17 edges
4. `costRoll()` - 14 edges
5. `computeRollSpec()` - 14 edges
6. `costSleeve()` - 13 edges
7. `calculateSolventCosts()` - 13 edges
8. `calculateConsumablesCosts()` - 11 edges
9. `costPouchBag()` - 10 edges
10. `EstimateDimensions` - 10 edges

## Surprising Connections (you probably didn't know these)
- `calculateProductMetrics()` --calls--> `calculateBagFlatSheetAreaM2()`  [EXTRACTED]
  calculator.ts → bag-flat-sheet.ts
- `calculateEstimate()` --calls--> `calculateConsumablesCosts()`  [EXTRACTED]
  calculator.ts → consumables-costing.ts
- `calculateEstimate()` --calls--> `calculatePackagingCosts()`  [EXTRACTED]
  calculator.ts → packaging-costing.ts
- `calculateEstimate()` --calls--> `calculateSolventCosts()`  [EXTRACTED]
  calculator.ts → solvent-costing.ts
- `calculateEstimate()` --calls--> `convertOrderQuantityToKg()`  [EXTRACTED]
  calculator.ts → unit-conversion.ts

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (18): buildRules(), DerivedProcess, DerivedProcessKey, deriveProcessesFromStructure(), normalizeProcessQuantity(), parseFiniteNumber(), PROCESS_LABELS, ProcessCatalog (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (46): calculateEstimate(), calculateLayer(), calculatePrintingWebWidth(), calculateProductMetrics(), isGsmDirectSubstrate(), GOLDEN_SCENARIOS, GoldenScenario, hpBinder (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (26): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (18): binderComponents(), calculateLaminationCost(), DEFAULT_LAMINATION_RECIPES, deriveBinderConcentrateStats(), LaminationComponentRole, LaminationCostResult, LaminationRecipeComponent, LaminationTier (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (37): buildRollSpecFromDims(), calculatePackagingCosts(), CARTON_OD_MATCH_TABLE, cartonPlatformKeyForOd(), ceilDiv(), coreFamilyKeyFromInsideMm(), coreMetersForJob(), costPouchBag() (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (22): calculateConsumablesCosts(), CONSUMABLES_PLATFORM_KEYS, ConsumablesConfig, ConsumablesCostDetail, ConsumablesCostLine, ConsumablesRole, defaultRepeatMFromEstimate(), emptyDetail() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (27): calculateInkMakeupSolventCost(), defaultInkPrintingProcess(), inkSolventRatioForProcess(), PE_FAMILY_CODES, resolveInkPrintingProcess(), resolveInkSolventRatio(), sumSbInkDryGsm(), materials (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (17): computeRollSpec(), computeRollSpecFromOd(), computeRollSpecFromWeight(), CORE_INSIDE_MM_BY_INCH, CoreInchPreset, coreOdMm(), coreWeightKg(), effectiveFilmDensityGcm3() (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (9): ConversionMetrics, convertOrderQuantityToKg(), LEGACY_UNIT_MAP, ORDER_QUANTITY_UNITS, OrderQuantityUnit, resolveUnitDef(), metrics, UNIT_BASES (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (12): COMMERCIAL_ROUND_STEPS, CommercialRoundingPrefs, CommercialRoundStep, DEFAULT_COMMERCIAL_ROUNDING, formatCommercialPrice(), formatSmartPrice(), formatStepPrice(), quotationPageOrientation() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (11): calculatePouchFlatGeom(), calculatePouchFlatSheetAreaM2(), familyForPouchType(), LEGACY_POUCH_SUBTYPE_STRINGS, POUCH_SUBTYPE_TO_CONFIGURATOR, POUCH_SUBTYPE_VALUES, PouchConfiguratorType, PouchFamily (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (13): CustomSlabRange, customSlabRangesFromBreakpoints(), defaultOrderQuantityUnit(), isLabelsRollContext(), DEFAULT_QUOTATION_FORMAT, QUOTATION_FIELD_META, QuotationFieldKey, QuotationFieldVisibility (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (12): BAG_SUBTYPE_TO_CONFIGURATOR, BAG_SUBTYPE_VALUES, BagConfiguratorType, BagFlatSheetResult, calculateBagFlatSheetAreaM2(), resolveBagConfiguratorType(), EMPTY, PouchAccessoryKind (+4 more)

## Knowledge Gaps
- **109 isolated node(s):** `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES`, `CommercialRoundStep`, `CommercialRoundingPrefs` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Material` connect `Community 1` to `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 12`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Estimate` connect `Community 1` to `Community 3`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `calculateEstimate()` connect `Community 1` to `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 11`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07814207650273224 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1010752688172043 - nodes in this community are weakly interconnected._