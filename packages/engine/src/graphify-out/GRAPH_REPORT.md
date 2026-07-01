# Graph Report - apps\estimation-studio\packages\engine\src  (2026-06-30)

## Corpus Check
- 32 files · ~23,164 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 171 nodes · 387 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
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

## God Nodes (most connected - your core abstractions)
1. `Material` - 18 edges
2. `calculateEstimate()` - 16 edges
3. `Estimate` - 15 edges
4. `calculateSolventCosts()` - 10 edges
5. `EstimateDimensions` - 10 edges
6. `Layer` - 8 edges
7. `resolveInkPrintingProcess()` - 6 edges
8. `calculateLaminationCost()` - 6 edges
9. `stackNeedsSolventMix()` - 6 edges
10. `resolveBagConfiguratorType()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `calculateProductMetrics()` --calls--> `calculateBagFlatSheetAreaM2()`  [EXTRACTED]
  calculator.ts → bag-flat-sheet.ts
- `calculateEstimate()` --calls--> `calculateSolventCosts()`  [EXTRACTED]
  calculator.ts → solvent-costing.ts
- `calculateEstimate()` --calls--> `convertOrderQuantityToKg()`  [EXTRACTED]
  calculator.ts → unit-conversion.ts
- `calculateProductMetrics()` --calls--> `calculatePouchFlatSheetAreaM2()`  [EXTRACTED]
  calculator.ts → pouch-flat-sheet.ts
- `GoldenScenario` --references--> `Estimate`  [EXTRACTED]
  golden-fixtures.ts → types.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.21
Nodes (9): derivePrintingWebClass(), LayerMaterialRef, MaterialLookup, stackHasUvInk(), adhesiveSb, materials, pet, sbInk (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (19): calculateEstimate(), calculatePrintingWebWidth(), calculateProcessCosts(), calculateProductMetrics(), calculateSalePrice(), priceWithNewModel(), calculatePouchAccessories(), materials (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (14): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (19): GOLDEN_SCENARIOS, GoldenScenario, hpBinder, LARAVEL_REFERENCE_MATERIALS, binderComponents(), calculateLaminationCost(), DEFAULT_LAMINATION_RECIPES, deriveBinderConcentrateStats() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (11): BAG_SUBTYPE_TO_CONFIGURATOR, BAG_SUBTYPE_VALUES, BagConfiguratorType, BagFlatSheetResult, calculateBagFlatSheetAreaM2(), resolveBagConfiguratorType(), stackNeedsSolventMix(), hasSolventBasedLayers() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (12): countLayersByType(), PrintMode, reconcileTierToSubstrateCount(), ScaffoldLayerDescriptor, scaffoldLayerDescriptors(), StructureTier, structureTypeToDefaultTier(), printModeArb (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (13): calculateInkMakeupSolventCost(), defaultInkPrintingProcess(), InkPrintingProcess, inkSolventRatioForProcess(), PE_FAMILY_CODES, resolveInkPrintingProcess(), resolveInkSolventRatio(), sumSbInkDryGsm() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (18): LaminationRecipe, EMPTY, PouchAccessoryKind, PouchAccessoryResult, PouchAccessorySelection, noMaterials, calculatePouchFlatSheetAreaM2(), POUCH_SUBTYPE_TO_CONFIGURATOR (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (10): ConversionMetrics, convertOrderQuantityToKg(), LEGACY_UNIT_MAP, ORDER_QUANTITY_UNITS, OrderQuantityUnit, resolveUnitDef(), metrics, UNIT_BASES (+2 more)

## Knowledge Gaps
- **47 isolated node(s):** `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES`, `hpBinder`, `materials` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Material` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Estimate` connect `Community 3` to `Community 1`, `Community 4`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `calculateEstimate()` connect `Community 1` to `Community 8`, `Community 3`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11576354679802955 - nodes in this community are weakly interconnected._
- **Should `Community 7` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._