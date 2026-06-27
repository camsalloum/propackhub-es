# Graph Report - apps\estimation-studio\packages\engine\src  (2026-06-27)

## Corpus Check
- 21 files · ~12,067 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 124 nodes · 273 edges · 7 communities
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

## God Nodes (most connected - your core abstractions)
1. `Material` - 14 edges
2. `calculateEstimate()` - 12 edges
3. `Estimate` - 11 edges
4. `calculateSolventCosts()` - 10 edges
5. `Layer` - 8 edges
6. `resolveInkPrintingProcess()` - 6 edges
7. `calculateLaminationCost()` - 6 edges
8. `stackNeedsSolventMix()` - 6 edges
9. `resolveInkSolventRatio()` - 5 edges
10. `LaminationRecipe` - 5 edges

## Surprising Connections (you probably didn't know these)
- `GoldenScenario` --references--> `Estimate`  [EXTRACTED]
  golden-fixtures.ts → types.ts
- `calculateEstimate()` --calls--> `calculateSolventCosts()`  [EXTRACTED]
  calculator.ts → solvent-costing.ts
- `SolventCostDetail` --references--> `resolveInkPrintingProcess()`  [EXTRACTED]
  solvent-costing.ts → ink-printing.ts
- `Material` --references--> `LaminationRecipe`  [EXTRACTED]
  types.ts → lamination-recipe.ts
- `calculateSolventCosts()` --calls--> `stackNeedsSolventMix()`  [EXTRACTED]
  solvent-costing.ts → layer-stack.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (15): derivePrintingWebClass(), MaterialLookup, stackHasUvInk(), stackNeedsSolventMix(), adhesiveSb, materials, pet, sbInk (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.28
Nodes (11): calculateEstimate(), calculatePrintingWebWidth(), calculateProcessCosts(), calculateProductMetrics(), calculateSalePrice(), calculateStructureDensity(), calculateSubstrateGaugeMicron(), calculateTotalConstructionMicron() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (14): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (12): InkPrintingProcess, LaminationRecipe, adhesiveSb, pet, sbInk, uvInk, CalculationResult, Estimate (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (14): GOLDEN_SCENARIOS, GoldenScenario, hpBinder, LARAVEL_REFERENCE_MATERIALS, binderComponents(), calculateLaminationCost(), DEFAULT_LAMINATION_RECIPES, deriveBinderConcentrateStats() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (12): countLayersByType(), PrintMode, reconcileTierToSubstrateCount(), ScaffoldLayerDescriptor, scaffoldLayerDescriptors(), StructureTier, structureTypeToDefaultTier(), printModeArb (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (13): calculateInkMakeupSolventCost(), defaultInkPrintingProcess(), inkSolventRatioForProcess(), PE_FAMILY_CODES, resolveInkPrintingProcess(), resolveInkSolventRatio(), sumSbInkDryGsm(), materials (+5 more)

## Knowledge Gaps
- **29 isolated node(s):** `hpBinder`, `materials`, `PE_FAMILY_CODES`, `LaminationTier`, `LaminationComponentRole` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Material` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `calculateEstimate()` connect `Community 1` to `Community 4`, `Community 6`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Estimate` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `hpBinder`, `materials`, `PE_FAMILY_CODES` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._