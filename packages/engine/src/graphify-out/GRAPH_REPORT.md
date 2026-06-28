# Graph Report - apps\estimation-studio\packages\engine\src  (2026-06-28)

## Corpus Check
- 28 files · ~18,919 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 148 nodes · 330 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `Material` - 15 edges
2. `calculateEstimate()` - 14 edges
3. `Estimate` - 12 edges
4. `calculateSolventCosts()` - 10 edges
5. `Layer` - 8 edges
6. `EstimateDimensions` - 7 edges
7. `resolveInkPrintingProcess()` - 6 edges
8. `calculateLaminationCost()` - 6 edges
9. `stackNeedsSolventMix()` - 6 edges
10. `resolveBagConfiguratorType()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `validateDimensions()` --calls--> `resolveBagConfiguratorType()`  [EXTRACTED]
  validator.ts → bag-flat-sheet.ts
- `calculateProductMetrics()` --calls--> `calculateBagFlatSheetAreaM2()`  [EXTRACTED]
  calculator.ts → bag-flat-sheet.ts
- `calculateEstimate()` --calls--> `calculateSolventCosts()`  [EXTRACTED]
  calculator.ts → solvent-costing.ts
- `calculateProductMetrics()` --calls--> `calculatePouchFlatSheetAreaM2()`  [EXTRACTED]
  calculator.ts → pouch-flat-sheet.ts
- `GoldenScenario` --references--> `Estimate`  [EXTRACTED]
  golden-fixtures.ts → types.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (14): derivePrintingWebClass(), LayerMaterialRef, MaterialLookup, stackHasUvInk(), stackNeedsSolventMix(), adhesiveSb, materials, pet (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (17): calculateEstimate(), calculatePrintingWebWidth(), calculateProcessCosts(), calculateProductMetrics(), calculateSalePrice(), calculateStructureDensity(), calculateSubstrateGaugeMicron(), calculateTotalConstructionMicron() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (14): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (20): GOLDEN_SCENARIOS, GoldenScenario, hpBinder, LARAVEL_REFERENCE_MATERIALS, binderComponents(), calculateLaminationCost(), DEFAULT_LAMINATION_RECIPES, deriveBinderConcentrateStats() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (12): countLayersByType(), PrintMode, reconcileTierToSubstrateCount(), ScaffoldLayerDescriptor, scaffoldLayerDescriptors(), StructureTier, structureTypeToDefaultTier(), printModeArb (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (13): calculateInkMakeupSolventCost(), defaultInkPrintingProcess(), InkPrintingProcess, inkSolventRatioForProcess(), PE_FAMILY_CODES, resolveInkPrintingProcess(), resolveInkSolventRatio(), sumSbInkDryGsm() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (18): BAG_SUBTYPE_TO_CONFIGURATOR, BAG_SUBTYPE_VALUES, BagConfiguratorType, BagFlatSheetResult, calculateBagFlatSheetAreaM2(), resolveBagConfiguratorType(), calculatePouchFlatSheetAreaM2(), POUCH_SUBTYPE_TO_CONFIGURATOR (+10 more)

## Knowledge Gaps
- **39 isolated node(s):** `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES`, `hpBinder`, `materials` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Material` connect `Community 1` to `Community 0`, `Community 3`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Estimate` connect `Community 3` to `Community 0`, `Community 1`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `calculateEstimate()` connect `Community 1` to `Community 3`, `Community 6`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `BagConfiguratorType`, `BagFlatSheetResult`, `BAG_SUBTYPE_VALUES` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11264367816091954 - nodes in this community are weakly interconnected._
- **Should `Community 7` be split into smaller, more focused modules?**
  _Cohesion score 0.13405797101449277 - nodes in this community are weakly interconnected._