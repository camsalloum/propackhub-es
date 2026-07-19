# Graph Report - apps\estimation-studio\packages\engine\src  (2026-07-17)

## Corpus Check
- 48 files · ~34,330 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 332 nodes · 707 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b299d86f`
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
Cohesion: 0.07
Nodes (49): calculateEstimate(), calculateLayer(), calculatePrintingWebWidth(), calculateProductMetrics(), computeMfgProcessCosts(), isGsmDirectSubstrate(), priceWithNewModel(), GOLDEN_SCENARIOS (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (26): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (18): binderComponents(), calculateLaminationCost(), DEFAULT_LAMINATION_RECIPES, deriveBinderConcentrateStats(), LaminationComponentRole, LaminationCostResult, LaminationRecipeComponent, LaminationTier (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (39): buildRollSpecFromDims(), calculatePackagingCosts(), CARTON_OD_MATCH_TABLE, cartonPlatformKeyForOd(), ceilDiv(), coreFamilyKeyFromInsideMm(), coreMetersForJob(), costPouchBag() (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (15): calculateConsumablesCosts(), CONSUMABLES_PLATFORM_KEYS, ConsumablesConfig, ConsumablesCostDetail, ConsumablesCostLine, ConsumablesRole, defaultRepeatMFromEstimate(), emptyDetail() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (27): calculateInkMakeupSolventCost(), defaultInkPrintingProcess(), inkSolventRatioForProcess(), PE_FAMILY_CODES, resolveInkPrintingProcess(), resolveInkSolventRatio(), sumSbInkDryGsm(), materials (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (15): computeRollSpec(), computeRollSpecFromOd(), computeRollSpecFromWeight(), CoreInchPreset, coreOdMm(), coreWeightKg(), effectiveFilmDensityGcm3(), filmLengthMFromWeight() (+7 more)

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
Cohesion: 0.09
Nodes (18): ASSUMPTION_CATEGORY_LABELS, ASSUMPTION_EDIT_LABELS, AssumptionCategory, AssumptionEditability, ESTIMATION_ASSUMPTIONS, EstimationAssumption, defaultOrderQuantityUnit(), isLabelsRollContext() (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.39
Nodes (6): BAG_SUBTYPE_TO_CONFIGURATOR, BAG_SUBTYPE_VALUES, BagConfiguratorType, BagFlatSheetResult, calculateBagFlatSheetAreaM2(), resolveBagConfiguratorType()

## Knowledge Gaps
- **105 isolated node(s):** `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES`, `CommercialRoundStep`, `CommercialRoundingPrefs` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Material` connect `Community 1` to `Community 3`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Estimate` connect `Community 1` to `Community 3`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `calculateEstimate()` connect `Community 1` to `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 11`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07211538461538461 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1010752688172043 - nodes in this community are weakly interconnected._