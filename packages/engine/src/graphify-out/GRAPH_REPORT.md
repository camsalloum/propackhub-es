# Graph Report - apps\estimation-studio\packages\engine\src  (2026-07-05)

## Corpus Check
- 35 files · ~25,625 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 207 nodes · 442 edges · 11 communities
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `Material` - 18 edges
2. `calculateEstimate()` - 15 edges
3. `Estimate` - 15 edges
4. `calculateSolventCosts()` - 10 edges
5. `EstimateDimensions` - 10 edges
6. `Layer` - 8 edges
7. `deriveProcessesFromStructure()` - 6 edges
8. `resolveInkPrintingProcess()` - 6 edges
9. `calculateLaminationCost()` - 6 edges
10. `stackNeedsSolventMix()` - 6 edges

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

## Communities (11 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (18): buildRules(), DerivedProcess, DerivedProcessKey, deriveProcessesFromStructure(), normalizeProcessQuantity(), parseFiniteNumber(), PROCESS_LABELS, ProcessCatalog (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (24): calculateEstimate(), calculatePrintingWebWidth(), calculateProductMetrics(), computeMfgProcessCosts(), InkPrintingProcess, calculatePouchAccessories(), EMPTY, PouchAccessoryKind (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (14): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (20): GOLDEN_SCENARIOS, GoldenScenario, hpBinder, LARAVEL_REFERENCE_MATERIALS, binderComponents(), calculateLaminationCost(), DEFAULT_LAMINATION_RECIPES, deriveBinderConcentrateStats() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (11): BAG_SUBTYPE_TO_CONFIGURATOR, BAG_SUBTYPE_VALUES, BagConfiguratorType, BagFlatSheetResult, calculateBagFlatSheetAreaM2(), resolveBagConfiguratorType(), stackNeedsSolventMix(), hasSolventBasedLayers() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (12): countLayersByType(), PrintMode, reconcileTierToSubstrateCount(), ScaffoldLayerDescriptor, scaffoldLayerDescriptors(), StructureTier, structureTypeToDefaultTier(), printModeArb (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (21): calculateInkMakeupSolventCost(), defaultInkPrintingProcess(), inkSolventRatioForProcess(), PE_FAMILY_CODES, resolveInkPrintingProcess(), resolveInkSolventRatio(), sumSbInkDryGsm(), materials (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.39
Nodes (6): calculatePouchFlatSheetAreaM2(), POUCH_SUBTYPE_TO_CONFIGURATOR, POUCH_SUBTYPE_VALUES, PouchConfiguratorType, PouchFlatSheetResult, resolvePouchConfiguratorType()

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (10): ConversionMetrics, convertOrderQuantityToKg(), LEGACY_UNIT_MAP, ORDER_QUANTITY_UNITS, OrderQuantityUnit, resolveUnitDef(), metrics, UNIT_BASES (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (16): priceWithNewModel(), materials, DEFAULT_WASTE_BANDS, DEFAULT_WASTE_BANDS_BY_PRINT_MODE, DEFAULT_WASTE_BANDS_PLAIN, effectiveCormPerKg(), plainBandsFromPrinted(), plainCormFromPrinted() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.60
Nodes (4): computeStructureSignature(), fnv1a32(), normalizeToken(), StructureSignatureLayer

## Knowledge Gaps
- **62 isolated node(s):** `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES`, `CATALOG`, `ProcessLayerType` (+57 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Material` connect `Community 1` to `Community 9`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `calculateEstimate()` connect `Community 1` to `Community 8`, `Community 9`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Estimate` connect `Community 3` to `Community 1`, `Community 4`, `Community 6`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES` to the rest of the system?**
  _62 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12834224598930483 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11264367816091954 - nodes in this community are weakly interconnected._