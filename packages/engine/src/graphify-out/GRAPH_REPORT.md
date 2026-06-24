# Graph Report - apps\estimation-studio\packages\engine\src  (2026-06-23)

## Corpus Check
- 13 files · ~8,574 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 77 nodes · 138 edges · 6 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]

## God Nodes (most connected - your core abstractions)
1. `calculateEstimate()` - 10 edges
2. `Material` - 7 edges
3. `Estimate` - 6 edges
4. `substrateFamilyAllowed()` - 5 edges
5. `resolveTemplateStoreClassification()` - 4 edges
6. `calculateSolventMix()` - 3 edges
7. `materialAllowedForTemplateLayer()` - 3 edges
8. `Layer` - 3 edges
9. `EstimateDimensions` - 3 edges
10. `MissingMaterialsError` - 3 edges

## Surprising Connections (you probably didn't know these)
- `GoldenScenario` --references--> `Estimate`  [EXTRACTED]
  golden-fixtures.ts → types.ts
- `calculateSolventMix()` --calls--> `hasSolventBasedLayers()`  [EXTRACTED]
  calculator.ts → validator.ts

## Import Cycles
- None detected.

## Communities (6 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (10): derivePrintingWebClass(), LayerMaterialRef, MaterialLookup, stackNeedsSolventMix(), adhesiveSb, materials, pet, sbInk (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.30
Nodes (8): calculateEstimate(), calculatePrintingWebWidth(), calculateProcessCosts(), calculateProductMetrics(), calculateSalePrice(), calculateSolventMix(), calculateTotalMicron(), hasSolventBasedLayers()

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (13): ClassifiableMaterial, inferMaterialClassFromSubstrateFamilies(), inferStructureTypeFromSubstrateCount(), materialAllowedForTemplateLayer(), MaterialClass, normFamily(), ProductTypeCode, resolveTemplateStoreClassification() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (11): CalculationResult, EstimateDimensions, Layer, LayerType, MissingMaterialsError, Process, Slab, VisibilityProfile (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.43
Nodes (4): GOLDEN_SCENARIOS, GoldenScenario, LARAVEL_REFERENCE_MATERIALS, Estimate

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (12): countLayersByType(), PrintMode, reconcileTierToSubstrateCount(), ScaffoldLayerDescriptor, scaffoldLayerDescriptors(), StructureTier, structureTypeToDefaultTier(), printModeArb (+4 more)

## Knowledge Gaps
- **19 isolated node(s):** `sbInk`, `uvInk`, `adhesiveSb`, `pet`, `materials` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `calculateEstimate()` connect `Community 1` to `Community 4`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Material` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `MissingMaterialsError` connect `Community 3` to `Community 1`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `sbInk`, `uvInk`, `adhesiveSb` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._