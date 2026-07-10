# Graph Report - apps\estimation-studio\packages\engine\src  (2026-07-10)

## Corpus Check
- 41 files · ~27,990 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 242 nodes · 516 edges · 12 communities
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
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `Material` - 19 edges
2. `Estimate` - 16 edges
3. `calculateEstimate()` - 15 edges
4. `calculateSolventCosts()` - 13 edges
5. `computeRollSpec()` - 12 edges
6. `EstimateDimensions` - 10 edges
7. `Layer` - 9 edges
8. `deriveProcessesFromStructure()` - 6 edges
9. `resolveInkPrintingProcess()` - 6 edges
10. `calculateLaminationCost()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `calculateProductMetrics()` --calls--> `calculateBagFlatSheetAreaM2()`  [EXTRACTED]
  calculator.ts → bag-flat-sheet.ts
- `calculateEstimate()` --calls--> `calculateSolventCosts()`  [EXTRACTED]
  calculator.ts → solvent-costing.ts
- `calculateEstimate()` --calls--> `convertOrderQuantityToKg()`  [EXTRACTED]
  calculator.ts → unit-conversion.ts
- `calculateProductMetrics()` --calls--> `calculatePouchFlatSheetAreaM2()`  [EXTRACTED]
  calculator.ts → pouch-flat-sheet.ts
- `priceWithNewModel()` --calls--> `wastePercentForQuantity()`  [EXTRACTED]
  calculator.ts → waste-bands.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (18): buildRules(), DerivedProcess, DerivedProcessKey, deriveProcessesFromStructure(), normalizeProcessQuantity(), parseFiniteNumber(), PROCESS_LABELS, ProcessCatalog (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (37): calculateEstimate(), calculateLayer(), calculatePrintingWebWidth(), calculateProductMetrics(), computeMfgProcessCosts(), isGsmDirectSubstrate(), priceWithNewModel(), GoldenScenario (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (13): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (16): GOLDEN_SCENARIOS, hpBinder, LARAVEL_REFERENCE_MATERIALS, binderComponents(), calculateLaminationCost(), DEFAULT_LAMINATION_RECIPES, deriveBinderConcentrateStats(), LaminationComponentRole (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.26
Nodes (9): BAG_SUBTYPE_TO_CONFIGURATOR, BAG_SUBTYPE_VALUES, BagConfiguratorType, BagFlatSheetResult, calculateBagFlatSheetAreaM2(), resolveBagConfiguratorType(), validateDimensions(), validateEstimate() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (12): countLayersByType(), PrintMode, reconcileTierToSubstrateCount(), ScaffoldLayerDescriptor, scaffoldLayerDescriptors(), StructureTier, structureTypeToDefaultTier(), printModeArb (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (29): calculateInkMakeupSolventCost(), defaultInkPrintingProcess(), inkSolventRatioForProcess(), PE_FAMILY_CODES, resolveInkPrintingProcess(), resolveInkSolventRatio(), sumSbInkDryGsm(), materials (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (17): computeRollSpec(), computeRollSpecFromOd(), computeRollSpecFromWeight(), CORE_INSIDE_MM_BY_INCH, CoreInchPreset, coreOdMm(), coreWeightKg(), effectiveFilmDensityGcm3() (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (10): ConversionMetrics, convertOrderQuantityToKg(), LEGACY_UNIT_MAP, ORDER_QUANTITY_UNITS, OrderQuantityUnit, resolveUnitDef(), metrics, UNIT_BASES (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (13): materials, DEFAULT_WASTE_BANDS, DEFAULT_WASTE_BANDS_BY_PRINT_MODE, DEFAULT_WASTE_BANDS_PLAIN, plainBandsFromPrinted(), plainCormFromPrinted(), slabQuantitiesFromMoq(), sortBands() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.39
Nodes (6): calculatePouchFlatSheetAreaM2(), POUCH_SUBTYPE_TO_CONFIGURATOR, POUCH_SUBTYPE_VALUES, PouchConfiguratorType, PouchFlatSheetResult, resolvePouchConfiguratorType()

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (6): defaultOrderQuantityUnit(), isLabelsRollContext(), computeStructureSignature(), fnv1a32(), normalizeToken(), StructureSignatureLayer

## Knowledge Gaps
- **72 isolated node(s):** `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES`, `CATALOG`, `ProcessLayerType` (+67 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Material` connect `Community 1` to `Community 9`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `calculateEstimate()` connect `Community 1` to `Community 3`, `Community 6`, `Community 8`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Estimate` connect `Community 1` to `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES` to the rest of the system?**
  _72 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08776595744680851 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13768115942028986 - nodes in this community are weakly interconnected._