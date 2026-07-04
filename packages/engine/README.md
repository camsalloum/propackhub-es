# @es/engine — Costing Engine Contract

**Package:** `packages/engine`  
**Stability:** Locked — formula changes require golden-test coverage update  
**Rule:** USD-only. Never introduce FX conversion, DB access, or framework imports.

---

## Overview

`@es/engine` is a **pure TypeScript** costing library for flexible packaging. It has zero runtime dependencies beyond TypeScript types. It can be embedded in any server or bundled into a browser/mobile client without modification.

The engine is the shared costing core for:
- **ES** (Estimation Studio) — server + browser client
- **PEBI** — can embed or vendor this package to power its internal `/estimator`

---

## Primary export

```ts
import { calculateEstimate, MissingMaterialsError } from '@es/engine';
import type { Estimate, Material, CalculationResult } from '@es/engine';
```

---

## `calculateEstimate(estimate, materials)`

```ts
function calculateEstimate(
  estimate: Estimate,
  materials: Map<string, Material>   // materialId → Material
): CalculationResult
```

**Inputs:**
- `estimate` — an `Estimate` object with layers, dimensions, pricing config, processes, and slabs
- `materials` — a `Map` keyed by the `materialId` referenced in each layer

**Output:** `CalculationResult` with:
- `estimate` — updated with all calculated fields (`materialCostPerKg`, `salePricePerKg`, `totalGsm`, `totalMicron`, yield conversions, etc.)
- `slabs` — per-slab recomputed prices at each quantity tier
- `costBreakdown` — % breakdown (material / waste / markup / process)
- `warnings` — human-readable strings (e.g. zero-cost material)

**Throws:** `MissingMaterialsError` if any layer's `materialId` is absent from the map.

---

## USD-only rule

All monetary inputs and outputs are in **USD**. The engine never applies FX.  
The caller applies `exchangeRateUsdToDisplay` at the server/UI boundary.

```ts
// Correct:
const result = calculateEstimate(estimate, materials); // USD
const displayPrice = result.estimate.salePricePerKg * exchangeRate; // display currency

// Wrong:
estimate.markupPercent = price * fxRate; // never — keep engine inputs USD
```

---

## Key input types

### `Estimate` (abbreviated)

```ts
{
  layers: Layer[];              // ordered stack, position 0 = outer
  dimensions: EstimateDimensions;
  markupPercent: number;        // e.g. 15 (percent, not decimal)
  platesPerKg: number;          // USD — plate cost allocated per kg
  deliveryPerKg: number;        // USD
  processes: Process[];         // machine/operation costs
  slabs: Slab[];                // quantity breakpoints (quantityKg, pricePerKg seed)
  orderQuantityKg: number;      // primary order size in kg
  solventCostPerKgUsd?: number; // default 1.54 (Solvent Common)
  solventRatio?: number;        // default 1.0 — dry ink/adhesive gsm ÷ ratio = solvent gsm
  displayCurrencyCode: string;  // informational only — engine ignores
  exchangeRateUsdToDisplay: number; // informational only — engine ignores
}
```

### `Material`

```ts
{
  id: string;
  type: 'substrate' | 'ink' | 'adhesive';
  density: number;          // g/cm³
  solidPercent: number;     // 100 for substrate/adhesive, 30 for SB ink
  costPerKgUsd: number;     // USD
  wastePercent: number;     // 0–100
  isSolventBased?: boolean; // true for SB ink/adhesive → triggers solvent-mix calc
}
```

### `EstimateDimensions`

```ts
{
  productType: 'roll' | 'sleeve' | 'pouch' | 'bag'; // first-class product types
  // roll/sleeve:
  reelWidthMm: number; cutoffMm: number; numberOfUps: number;
  extraPrintingTrimMm: number; piecesPerCut: number;
  // pouch: (Bag uses the pouch path — UI code maps bag → pouch before calling engine)
  openWidthMm: number; openHeightMm: number;
  printingWebClass: 'wide_web' | 'narrow_web';
}
```

---

## Formulas reference

The formulas are ported from the Laravel legacy costing system and validated against 6 golden rows (see `golden-fixtures.ts`). Key formula chain:

```
GSM per layer  = micron × density
cost/m² per layer = (costPerKgUsd × GSM) / 1000   (adjusted for waste + solvent)
totalGSM      = Σ GSM[layer]
sqmPerKg      = 1000 / totalGSM
materialCost  = Σ (cost/m² × sqmPerKg)
operationCost = Σ process.totalCost / orderQuantityKg
salePriceUsd  = (materialCost + operationCost + platesPerKg + deliveryPerKg) × (1 + markupPercent/100)
slabPrice[i]  = same formula at slabs[i].quantityKg (process costs vary by volume)
```

---

## Testing & golden fixtures

```bash
npm test   # runs 34 tests in 4 files
```

| Test file | What it covers |
|---|---|
| `calculator.test.ts` | Unit tests for each formula component |
| `golden.test.ts` | 6 Laravel reference rows — **do not change without owner sign-off** |
| `layer-stack.test.ts` | `derivePrintingWebClass`, `stackNeedsSolventMix` |
| `template-classification.test.ts` | A/B/C substrate classification rules |

**Never change `golden-fixtures.ts` or the formulas in `calculator.ts` without:**
1. Running all 34 tests
2. Confirming the golden row values match the original Laravel output
3. Recording the change in `LOCKED_DECISIONS.md`

---

## PEBI integration notes

PEBI's `/estimator` can use this engine by:
1. Installing `@es/engine` (or vendoring `packages/engine/src/`)
2. Mapping PEBI's BOM/routing data to `Estimate` + `Material` inputs
3. Calling `calculateEstimate()` — all MES-specific logic (OEE, BOM2, routing) lives in PEBI, *on top of* the engine output

The engine deliberately excludes MES concepts. Keep it that way — divergence should live in PEBI, not here.

---

*Last updated: 2026-06-22*
