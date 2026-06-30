# Pouch Accessories & Subtype Revamp — Implementation Plan

Status: Draft for review
Owner: (assign)
Scope: Estimation Studio (`apps/estimation-studio`) — web configurator, `@es/engine` costing, server schema / master data.
Related docs: `docs/POUCH_COSTING_RESEARCH.md` (§7 Accessories), `docs/ES_PRD_v3_FINAL_BUILD_SPEC.md` (zipper Phase 1.1), `apps/pph/docs/BOM2_ENHANCEMENT_PLAN.md` (zipper formulas).

---

## 1. Why this work exists (the problem)

### 1.1 "With zipper" and "without zipper" pouches look identical
They render identically because **the zipper does nothing today**. Two separate facts cause this:

1. The web product catalog (`packages/web/src/lib/productCatalog.ts`, `POUCH_SUBTYPES`) defines zip variants as **separate subtype codes** that differ only by appending a boolean field `F.zipper` (`hasZipper`):
   - `pouch_3_side_seal` vs `pouch_3_side_seal_zip`
   - `pouch_stand_up` vs `pouch_stand_up_zip`
   - `pouch_kseal_stand_up` vs `pouch_kseal_stand_up_zip`
2. `POUCH_SUBTYPE_TO_CONFIGURATOR` (`pouchConfiguratorCatalog.ts`) **collapses every zip/non-zip pair to the same configurator type** (e.g. both 3-side variants → `three-side-seal`). The configurator, schematic, and flat-blank therefore draw the same thing.
3. The `hasZipper` boolean is **never read by `@es/engine`** — it is not part of `EstimateDimensions` and never reaches `calculator.ts`. Its hint ("Adds zipper weight/cost per piece") is aspirational only.

**Net effect:** the zipper subtypes add UI clutter and a dead flag with zero cost/weight impact. This matches the open items in `ES_DEEP_AUDIT_AND_ENHANCEMENT_PLAN` ("gusset/zipper add-on costing — display-only today") and `POUCH_COSTING_RESEARCH §7` ("the configurator draws accessories but assigns them no cost or weight").

### 1.2 No accessory costing at all
Zippers, spouts, valves, windows add real weight and real cost, but the engine has **no component-cost term**. `EstimateDimensions` has no accessory fields, and `materials` only supports **per-kg** pricing — there is no per-metre or per-piece pricing column for hardware like spouts/valves/zip tape.

### 1.3 Pouch gussets are structural subtypes, not toggles
Unlike bags (where bottom/side gusset are **checkboxes** that write a default mm value or `0`), pouch gussets are baked into the subtype:
- bottom gusset → `stand-up`
- side gusset → `side-gusset`
- side gusset + folded base → `flat-bottom`

There is no pouch gusset toggle UI. The user asked "where are the gussets in the pouch" and to mirror the bag's "with/without gusset" option pattern.

---

## 2. Current state (reference map)

| Area | File | Key symbols |
|---|---|---|
| Pouch configurator UI | `packages/web/src/components/PouchConfigurator.tsx` | builds `engineDims`; no add-on toggles |
| Pouch catalog | `packages/web/src/lib/pouchConfiguratorCatalog.ts` | 6 types: `three-side-seal, center-seal, four-side-seal, stand-up, side-gusset, flat-bottom`; `POUCH_SUBTYPE_TO_CONFIGURATOR` |
| Legacy subtype catalog | `packages/web/src/lib/productCatalog.ts` | `POUCH_SUBTYPES` (10 codes incl. `_zip`), `F.zipper` |
| Draw helpers | `packages/web/src/lib/pouchDrawDims.ts`, `PouchSchematic.tsx`, `PouchFlatBlank.tsx` | blank geometry |
| Bag toggle pattern | `packages/web/src/components/BagConfigurator.tsx` | `toggleGusset(fieldId,on)` → writes default mm or `0` |
| Engine blank area | `packages/engine/src/pouch-flat-sheet.ts` | `calculatePouchFlatSheetAreaM2`, per-subtype formulas |
| Engine cost flow | `packages/engine/src/calculator.ts` | `calculateLayer`, `calculateProductMetrics` (pouch branch), `calculateSalePrice`, `calculateProcessCosts` |
| Engine types | `packages/engine/src/types.ts` | `EstimateDimensions` (no accessory fields) |
| Material schema | `packages/server/src/db/schema.ts` | `materials` (per-kg only), `layerTypeEnum = [substrate, ink, adhesive, solvent]`, `itemClass` soft tag |
| Material seed | `packages/server/src/db/seed-materials.ts`, `utils/item-class.ts` | platform→tenant sync |
| PRD zipper (deferred) | `docs/ES_PRD_v3_FINAL_BUILD_SPEC.md` | `zipper_enabled`, `zipper_weight_g_m`, `zipper_cost_per_m` |

### 2.1 How cost flows today (so we know where to inject accessories)
1. Per layer: `gsm = micron × density`; `costPerM2 = (gsm/1000) × costPerKgUsd`.
2. `totalGsm = Σ gsm`; `layerRmCostPerKg = (Σ costPerM2 / totalGsm) × 1000`.
3. Pouch metrics: `area = calculatePouchFlatSheetAreaM2()`; `gramsPerPiece = area_m² × totalGsm`; `piecesPerKg = 1000 / gramsPerPiece`.
4. Sale price = `(layerRm + solvent) × markup + platesPerKg + deliveryPerKg + operationCostPerKg`; waste = `Σ(costM2 × wastePercent)`.

**Injection points for accessories:** (a) add accessory weight to `gramsPerPiece`; (b) add accessory cost as a new per-kg term in `calculateSalePrice`; (c) optionally add window/patch film area into `flatSheetArea`.

---

## 3. Pouch conversion & accessories — research summary

Sources are external and were paraphrased for licensing compliance; content was rephrased.

### 3.1 Pouch families (confirms our 6 configurator types are sound)
- A stand-up pouch stays upright because of a structural **gusset** at the base ([reddotpackaging](https://reddotpackaging.com/blog/what-is-a-stand-up-pouch)).
- Stand-up base styles split into **Doyen, K-seal, and corner-bottom**, chosen mainly by product weight ([ecopackables](https://www.ecopackables.com/blogs/news/stand-up-pouch-styles)). Our `stand-up` maps to Doyen; K-seal is a base-fold variant.
- Doypack pouches can be made from one or more layers and can carry extra features such as spouts, valves and punched handles ([spspouches](https://www.spspouches.com/blog/what-is-a-doypack)).

### 3.2 Accessories / add-on features
- Pre-made stand-up pouches commonly add **zippers, sliders, spouts, handles, safety caps, and laser scoring** ([packagingstrategies](https://www.packagingstrategies.com/articles/89181-stand-up-pouches-converting-considerations-for-brand-packagers)).
- **Spouted pouches** (a.k.a. fitment / refill pouches) target liquids and are lighter than rigid alternatives ([glenroy](https://www.glenroy.com/flexible-packaging/stand-up-pouches/spouted-pouches/)).
- **Degassing valves** are typical on coffee pouches; market listings show one-way valve coffee pouches with side zipper ([amazon listing](https://www.amazon.com/Barrier-Natural-Zipper-Coffee-Degassing/dp/B07Y7XX6XC)).
- Various **zip closures** can be integrated so consumers can reseal ([packaging-warehouse](https://www.packaging-warehouse.com/en/adviser/pouch-production-343)).

### 3.3 Cost magnitude (sanity-check for the model)
- One B2B guide states a zipper mechanism can add roughly **15–25%** to base packaging cost ([alibaba seller guide](https://seller.alibaba.com/blogs/2026/southeast-asia/packaging/pouch-style-selection-guide-stand-up-flat-bottom-zipper-alibaba-b2b)). Treat as an order-of-magnitude check, not a formula.
- Degassing-valve unit pricing ranges widely in bulk listings (cents-per-piece scale) ([accio](https://www.accio.com/plp/degassing-valve-bag)). Real rates must come from tenant master data, not hardcoded.

### 3.4 Accessory applicability matrix (proposed default)
| Accessory | Cost basis | Adds film/area? | Default-applicable subtypes |
|---|---|---|---|
| Zipper / slider | per **linear metre** (≈ pouch width) | small seal only | three-side-seal, four-side-seal, stand-up, side-gusset, flat-bottom |
| Spout + cap | per **unit** | local seal patch | stand-up, flat-bottom (liquids/refill) |
| Degassing valve | per **unit** | small applied patch | stand-up, flat-bottom (coffee) |
| Window / patch | per **m²** of patch film | adds `PW×PH` area | any printed pouch |
| Tear notch / euro-slot / hang-hole | negligible (die/punch) | none | most (optional flag, ~0 cost) |
| Handle | per **unit** | none (separate part) | stand-up, flat-bottom (large packs) |

Center-seal (VFFS pillow) is intentionally excluded from zipper/spout/valve defaults (high-speed form-fill format); keep configurable but off by default.

---

## 4. Target design

### 4.1 Collapse `_zip` subtypes → one subtype + accessory options
Mirror the bag pattern: a single structural subtype with **option toggles** instead of duplicated `_zip` codes.

- Retire `pouch_3_side_seal_zip`, `pouch_stand_up_zip`, `pouch_kseal_stand_up_zip` as selectable subtypes.
- Keep them only as **legacy aliases** (the alias map already routes them) for backward-compatible reads.
- On open of a legacy `_zip` estimate: resolve to its base subtype + set `accessories.zipper.enabled = true` (migration, §7).

### 4.2 Accessory options UI (mirror `BagConfigurator` gusset toggle)
Add an "Accessories" group to `PouchConfigurator`, rendered only for applicable subtypes (matrix §3.4):
- Checkboxes: **Zipper**, **Spout**, **Valve**, **Window**, (optional) **Tear notch**, **Handle**.
- When ticked, reveal the minimal inputs needed:
  - Zipper: dropdown of zipper materials (from master data) — length auto = pouch open width (× count of zips, default 1).
  - Spout / Valve / Handle: material dropdown + count (default 1).
  - Window: width × height (mm) → adds patch area.
- Follow the bag mechanism exactly: a toggle writes a structured selection; "off" = absent. Use a structured `accessories` object rather than the `0 = none` mm convention, because accessories are not single mm values.

### 4.3 Pouch gussets — recommendation
Keep gussets as **structural subtypes** (stand-up / side-gusset / flat-bottom) because the blank-area formula changes fundamentally per gusset type (see `pouch-flat-sheet.ts`). Do **not** force them into a single toggle the way bags do, since bag faces are symmetric and the pouch gusset reshapes the die-line.
- Optional future enhancement: a unified "Custom pouch" mode where bottom/side gusset are toggles (0 = none) for power users. Flag as Phase 3; not required for the accessory work.
- Action now: add a short helper note in the UI explaining that the gusset is chosen via the pouch subtype (answers "where are the gussets").

### 4.4 Accessories as master-data items linked to cost structure
Accessories must be **priced in raw-material master data**, not hardcoded — same governance as films.
Two pricing bases are required that `materials` does not currently support:
- **per linear metre** (zipper tape) + **weight g/m**.
- **per piece** (spout, valve, handle) + **weight g/piece**.

---

## 5. Data model changes

### 5.1 Engine `EstimateDimensions` (packages/engine/src/types.ts)
Add a structured, optional accessories block (kept optional so existing estimates are unaffected):

```ts
export interface PouchAccessorySelection {
  kind: 'zipper' | 'spout' | 'valve' | 'window' | 'handle' | 'tear_notch';
  materialId?: string;        // FK into materials/accessory master
  count?: number;             // per-piece accessories (spout/valve/handle); default 1
  // resolved rates snapshotted at calc time (so re-quote is explicit):
  costPerMeterUsd?: number;   // zipper
  weightGramPerMeter?: number;// zipper
  costPerPieceUsd?: number;   // spout/valve/handle
  weightGramPerPiece?: number;
  costPerM2Usd?: number;      // window patch film (or reference a film materialId)
  widthMm?: number;           // window
  heightMm?: number;          // window
}

// on EstimateDimensions:
accessories?: PouchAccessorySelection[];
```

> Note: snapshotting resolved rates mirrors how layers snapshot `costPerKgUsd`. Live re-quote can re-resolve from master data.

### 5.2 Materials schema (packages/server/src/db/schema.ts)
Option A (recommended, least disruptive): keep the `materials` table, add nullable accessory pricing columns + use `itemClass` as the accessory class tag (avoid expanding the hard `layerTypeEnum`, which gates costing branches):

```sql
ALTER TABLE materials ADD COLUMN cost_per_meter_usd   DECIMAL(12,4);
ALTER TABLE materials ADD COLUMN cost_per_piece_usd   DECIMAL(12,4);
ALTER TABLE materials ADD COLUMN weight_g_per_meter   DECIMAL(10,4);
ALTER TABLE materials ADD COLUMN weight_g_per_piece   DECIMAL(10,4);
-- accessory_kind: 'zipper' | 'spout' | 'valve' | 'handle' | 'window'
ALTER TABLE materials ADD COLUMN accessory_kind       VARCHAR(32);
```
- `itemClass = 'accessory'` (or the specific kind) classifies these rows; `type` (layerTypeEnum) stays out of the costing layer branches.
- Mirror the same columns on `platformMasterMaterials` and the platform→tenant sync (`seed-materials.ts`).

Option B (cleaner long-term, more work): a dedicated `accessories` master table + `estimate_accessories` join. Defer unless master-data volume warrants it.

**Decision needed:** A vs B. Plan assumes **A**.

### 5.3 Estimate persistence (server)
- Persist `dimensions.accessories[]` in the existing estimate `dimensions` JSONB (no new table needed for Option A).
- Reuse the deferred PRD columns where convenient (`zipper_enabled`, `zipper_weight_g_m`, `zipper_cost_per_m`) OR fold them into the generic accessories array. Recommend the generic array for extensibility; treat the PRD zipper columns as superseded.

---

## 6. Engine costing changes (packages/engine)

### 6.1 New helper: `calculatePouchAccessories(dimensions, productMetrics)`
Returns `{ accessoryWeightGramPerPiece, accessoryCostUsdPerPiece, accessoryFilmAreaM2 }`.

Formulas (zipper formula reuses `apps/pph/docs/BOM2_ENHANCEMENT_PLAN.md`):

```
# Zipper (per metre, length ≈ open width × zipCount)
zipperLenM   = (openWidthMm / 1000) × zipCount
zipperWeightG = zipperLenM × weightGramPerMeter
zipperCostUsd = zipperLenM × costPerMeterUsd

# Spout / Valve / Handle (per piece)
unitWeightG  = count × weightGramPerPiece
unitCostUsd  = count × costPerPieceUsd

# Window / patch (per m² of added film)
windowAreaM2 = (widthMm × heightMm) / 1e6
windowCostUsd= windowAreaM2 × costPerM2Usd   # or via referenced film materialId
# windowAreaM2 also added to flatSheetArea (extra film weight) like bag patchAreaM2
```

Aggregate:
```
accessoryWeightGramPerPiece = Σ weights
accessoryCostUsdPerPiece    = Σ costs
accessoryFilmAreaM2         = Σ window/patch areas
```

### 6.2 Wire into `calculateProductMetrics` (pouch branch)
- Add `accessoryFilmAreaM2` to the pouch `area` before computing weight, OR compute film weight from the larger area: `gramsPerPiece = (area + accessoryFilmAreaM2) × totalGsm + accessoryWeightGramPerPiece`.
- Recompute `piecesPerKg = 1000 / gramsPerPiece`.

### 6.3 Wire into `calculateSalePrice`
- Convert per-piece accessory cost to per-kg: `accessoryCostPerKg = accessoryCostUsdPerPiece × piecesPerKg`.
- Add `accessoryCostPerKg` as a **new additive term** (treat like `platesPerKg`/`deliveryPerKg` — i.e. typically **outside** the RM×markup, since hardware is a pass-through component; confirm markup policy with owner).
- Expose `accessoryCostPerKg` in the cost breakdown and gate it behind the existing visibility profile (§6.8 PRD).

### 6.4 Optional: pouch-making process
Per BOM2, pouch making is a process (`pouch_hours = setup + (pieces / speed_pcs_min / 60)`). This already fits the existing `processes[]` + `calculateProcessCosts` (`pcs_per_min` basis). Ensure a "Pouch making" process exists in master data; no engine change needed.

---

## 7. UI changes (packages/web)

1. **Subtype list:** remove `_zip` entries from the selectable `POUCH_SUBTYPES`; keep alias resolution.
2. **PouchConfigurator:** add an Accessories group (checkboxes + conditional inputs) mirroring `BagConfigurator`'s gusset block; write into `dimensions.accessories`. Filter visible accessories by subtype (matrix §3.4).
3. **Material pickers:** accessory dropdowns list `materials` where `itemClass='accessory'` (filtered by `accessory_kind`).
4. **Schematic / flat-blank:** draw enabled accessories — zipper as a dashed line near the top seal, spout at top, valve as a small circle, window as a dashed patch rectangle. (Cosmetic; reuses existing SVG primitives.)
5. **MasterData page:** add an "Accessories" tab/section to create/edit accessory materials with per-metre / per-piece price + weight.
6. **Cost breakdown:** show accessory cost line; respect visibility profile.

---

## 8. Migration & backward compatibility
- Legacy `_zip` estimates: on load, map subtype → base subtype and synthesize `accessories=[{kind:'zipper', enabled, ...}]`. The alias map already exists.
- Old estimates without `accessories`: behave exactly as today (term = 0). No recalculation drift for existing quotes unless re-quoted.
- Seed a small set of platform accessory materials (generic zipper tape, spout+cap, degassing valve) with placeholder rates flagged for tenant override (never ship hard rates as truth).

---

## 9. Phased delivery

| Phase | Deliverable | Files | Est. |
|---|---|---|---|
| P1 — Data model | Engine `EstimateDimensions.accessories`; materials columns + migration; platform/tenant sync | engine `types.ts`; server `schema.ts`, `seed-materials.ts`, migration | 1.5 d |
| P2 — Engine costing | `calculatePouchAccessories` + wiring into metrics & sale price; unit tests (property-style consistent with repo) | engine `calculator.ts`, new `pouch-accessories.ts` | 2 d |
| P3 — Master data UI | Accessories CRUD in MasterData; price/weight fields | web `MasterData.tsx` | 1.5 d |
| P4 — Configurator UI | Collapse `_zip`; accessory toggles; subtype filtering; schematic/flat-blank glyphs | web `PouchConfigurator.tsx`, catalogs, `PouchSchematic.tsx`, `PouchFlatBlank.tsx` | 2.5 d |
| P5 — Migration & QA | Legacy `_zip` mapping; visibility gating; end-to-end quote check vs sanity ranges | server + web | 1 d |

Total ≈ 8.5 dev-days. P1/P2 are the critical path (everything else depends on the data + cost terms existing).

---

## 10. Open decisions (need owner input)
1. Materials schema **Option A** (add columns) vs **Option B** (dedicated accessories table). Plan assumes A.
2. Are accessory costs **inside** or **outside** the RM×markup? (Recommend outside / pass-through like plates & delivery.)
3. Default per-metre / per-piece **placeholder rates** for seeded platform accessories (or ship empty, require tenant entry?).
4. Pouch gussets: keep structural subtypes (recommended) vs add a unified toggle mode (Phase 3).
5. Should window/patch reference an existing **film material** (reuse its $/m² and density) instead of a standalone $/m² rate? (Recommend reuse film material — single source of truth.)

---

## 11. Acceptance criteria
- Selecting a pouch subtype and toggling **Zipper** changes **grams/piece** and **selling price** (no longer cosmetic).
- Accessory rates resolve from **master data**; changing a rate and re-quoting updates cost.
- A 3-side-seal **with** vs **without** zipper now produces **visibly different** weight, cost, and schematic.
- Legacy `_zip` estimates open without error and show the zipper accessory enabled.
- Estimates with no accessories cost identically to pre-change behaviour (no regression).

---

### Appendix A — sources
- ecopackables — stand-up pouch base styles (Doyen / K-seal / corner-bottom).
- reddotpackaging — stand-up pouch & gusset; spout pouch definition.
- packagingstrategies — SUP add-on features (zipper, slider, spout, handle, cap).
- glenroy — spouted / fitment / refill pouches.
- packaging-warehouse — integrated zip closures.
- spspouches — Doypack extra features (spout, valve, handle).
- alibaba seller guide — zipper cost uplift order-of-magnitude.
- accio / amazon listings — degassing valve & coffee pouch unit pricing (bulk).

All external content paraphrased; verbatim kept under source limits. Content was rephrased for compliance with licensing restrictions.

---

## 12. Implementation status (built)

Decisions taken: Materials **Option A** (columns on `materials`/`platform_master_materials`); accessory cost is **outside markup** (pass-through like plates/delivery); gussets kept as **structural subtypes**; window patch uses an optional per-m² rate plus added film area.

Done:
- **Engine** — `packages/engine/src/pouch-accessories.ts` (`calculatePouchAccessories`, `PouchAccessorySelection`). Wired into `calculator.ts`: accessory film area + hardware weight fold into grams/piece; `accessoryCostPerKg` added to sale price and `costBreakdown.accessoryPercent`. `Material` and `EstimateDimensions` extended. All 146 engine tests pass.
- **Schema/migration** — `drizzle/0008_pouch_accessories.sql`: `accessory` added to `layer_type` enum; per-metre/per-piece/weight + `accessory_kind` columns on `materials` and `platform_master_materials`. Drizzle schema + `MasterMaterial` + item-class + seed mapping + platform-master mapping updated.
- **API** — `materials` and `platform/master-data/materials` routes accept and return accessory fields (`type:'accessory'`, kind, rates, weights).
- **Web** — `PouchConfigurator` renders accessory toggles (zipper/spout/valve/window/handle) per subtype applicability, snapshotting rates from accessory materials; `EstimateEditor` stores `accessories`, loads/saves them in `dimensions`, and feeds the live client calc. Legacy `_zip` subtypes removed from the selectable list (`productCatalog.ts`).
- **Data migration** — `scripts/migrate-pouch-zip-accessory.ts`: seeds generic zipper/spout/valve accessory materials (placeholder rates), deactivates `_zip` subtypes, migrates existing `_zip` estimates → base subtype + zipper accessory, bumps master-data version.

To run on deploy: `npm run db:migrate` (applies 0008), then `tsx scripts/migrate-pouch-zip-accessory.ts`.

Remaining (follow-up): **none — both items below are now implemented.**

- **MasterData platform UI** — DONE. Added an "Accessories" tab to the platform Master Data screen (`MasterData.tsx`) with a dedicated editor: name, kind (zipper/spout/valve/handle/window), and basis-aware rate + weight inputs (per-metre for zipper, per-piece for the rest). Saves through the existing bulk material endpoint and syncs to tenants.
- **Schematic glyphs** — DONE. `PouchSchematic` draws zipper / spout / valve / window / handle glyphs over the finished pouch (viewport-anchored overlay, works for all six subtypes); `PouchFlatBlank` shows a zipper line just inside the top seal and a window patch on the blank.

### Verification
- Engine: 146/146 tests pass; `tsup` build clean.
- Web: `tsc --noEmit` clean; full `vite build` succeeds.
- Server: no accessory-related type errors; affected unit tests pass.
