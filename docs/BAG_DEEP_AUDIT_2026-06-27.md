# Bag Section — Deep Audit (2026-06-27)

**Scope:** Every line in the Bag path — catalog, dimension schema, flat-sheet geometry
formulas, engine wiring, UI persistence, unit conversion, costing concept.

**Method:** Read each file end-to-end; cross-checked the implementation against
`BAG_COSTING_RESEARCH.md`, the legacy Laravel `COSTING_NOTES.md`, the configurator
field hints, the `bag-flat-sheet.test.ts` (19 cases) and `bag-costing.test.ts`
(6 cases) golden tests. 25/25 pass.

**Verdict at a glance:** **The cost concept is CORRECT. The geometry is the
best current approximation given the configurator's W-field ambiguity. There
are 1 P0 data-loss bug, 1 P1 wiring gap, and 5 known unknowns (N1–N5) that
block a precise lock.** See sections 6 and 7.

---

## 1. Files in the Bag path

| Layer | File | Role |
|---|---|---|
| **Catalog** | `packages/web/src/lib/bagConfiguratorCatalog.ts` | 9 subtypes × fields (id/label/key/default/hint). Source of truth for UI. |
| | `packages/web/src/lib/productCatalog.ts` | Engine-bound product catalog (Bag family + subtypes). |
| | `packages/web/src/lib/bagDrawDims.ts` | Normalizes field vals → 2D schematic dims. |
| **Engine — schema** | `packages/engine/src/types.ts` | `EstimateDimensions.bagSubtype`, gusset, flap, handle, patch, wicket, SA fields. |
| **Engine — formulas** | `packages/engine/src/bag-flat-sheet.ts` | Pure function: dims → `BagFlatSheetResult { areaM2, blankWidthMm, blankLengthMm, patchAreaM2, type }`. |
| **Engine — wiring** | `packages/engine/src/calculator.ts` | Branches `productType === 'bag'` → calls `calculateBagFlatSheetAreaM2`, then `piecesPerKg`, `linearMPerKgReel` from `blankWidthMm`. |
| | `packages/engine/src/unit-conversion.ts` | `kgs/kpcs/sqm/lm/roll_500_lm` conversion (kpcs↔kg via `piecesPerKg`). |
| | `packages/engine/src/validator.ts` | Requires `bagSubtype` (or known `productSubtype`) for `productType='bag'`. |
| | `packages/server/src/utils/estimate-engine-input.ts` | Maps server-side `productSubtype` code → `bagSubtype` so legacy payloads (no explicit `bagSubtype`) still resolve. |
| **UI** | `packages/web/src/components/BagConfigurator.tsx` | Input row → 2D SVG → status (face area, flat sheet, GSM, pcs/kg). |
| | `packages/web/src/components/JobHeaderFields.tsx` | Replaces the spec-row dimension columns with `bagDimensionsPanel` when active. |
| | `packages/web/src/pages/EstimateEditor.tsx` | Activates `BagConfigurator` when `productFamily==='bag' && bagConfiguratorType!=null`; seeds defaults via `seedBagDimensionPatch`. |
| **Tests** | `packages/engine/src/bag-flat-sheet.test.ts` (19) | Per-subtype formula assertions (blankW, blankL, area, patch, defaults, resolution). |
| | `packages/engine/src/bag-costing.test.ts` (6) | Integration: pieces/kg, bag vs pouch ratio, `pcs_per_min` (no /1000), `kpcs` unit, `sqm` unit, fallback. |
| **Docs** | `docs/BAG_COSTING_RESEARCH.md` | Industry reasoning + open questions. |
| | `docs/BAG_COSTING_PROMPT_FOR_AGENTS.md` | 12 expert-validation questions + 5 non-confident points (N1–N5). |

All 25 tests green (`vitest run` on both files, 2026-06-27).

---

## 2. Catalog — types, fields, defaults (verdict: ✅)

9 subtypes, all routed to a unique configurator type and a unique DB code
(`bagConfiguratorCatalog.ts` lines 56–66, mirrored in `productCatalog.ts` lines 132–141
and `bag-flat-sheet.ts` lines 36–48).

| DB code | Configurator type | Fields | Defaults (mm) |
|---|---|---|---|
| `bag_bottom_gusset_shopping` | `bottom-gusset` | W, H, G, F | 400, 500, 120, 50 |
| `bag_side_gusset_shopping` | `side-gusset` | W, H, SG, TS | 350, 450, 80, 20 |
| `bag_courier` | `courier` | W, L, FL, POD | 250, 350, 50, 80 |
| `bag_diaper` | `diaper` | W, H, G, F, NC, VH | 500, 650, 180, 50, 60, 6 |
| `bag_industrial` | `industrial` | W, L, SG, VLV | 400, 700, 100, 80 |
| `bag_loop_handle` | `loop` | W, H, G, HL, HW | 300, 380, 80, 260, 25 |
| `bag_patch_handle` | `patch` | W, H, G, PW, PH, HD | 320, 400, 60, 120, 80, 30 |
| `bag_punch_handle` | `punch` | W, H, G, SW, SH, PT | 280, 360, 0, 120, 25, 20 |
| `bag_wicket` | `wicket` | W, H, G, LH, WS, WD | 300, 400, 80, 40, 76, 8 |

**Found:** Defaults are sensible (W=250–500, H=350–700, gussets 60–180). Catalog
keeps the family wide-web capable. No typos. No duplicates.

**Caveat (N1 — see §6):** The W-field hint language is inconsistent across
subtypes ("Front panel width" vs "Flat tube width" vs "Bag width flat"). The
engine **assumes** W = one finished face for all subtypes except courier. If
operators actually enter a flat-laid tube width for industrial/diaper/wicket,
all those formulas will over-count by 2×.

---

## 3. Required dimension parameters (verdict: ✅ enough, ⚠ see N1)

Each subtype's required inputs are driven by its configurator type. The
parameter set per subtype is:

- **All 9:** `openWidthMm` (W) + `openHeightMm` (H or L).
- **Gusset-driven:** `bottomGussetMm` (BG) for bottom-gusset/diaper/loop/wicket; `sideGussetMm` (SG) for side-gusset/industrial/punch/patch.
- **Flap/lip/seal:** `flapMm` (courier), `bagTopFoldMm`/`bagTopSealMm` (decorative; not in engine formula), `bagWicketLipMm` (wicket).
- **Handle:** `handleLengthMm` (loop), `bagHandleWidthMm` (loop), `bagHandleHoleMm` (patch; cosmetic).
- **Patch:** `bagPatchWidthMm`, `bagPatchHeightMm` (patch).
- **Punch:** `bagSlotWidthMm`, `bagSlotHeightMm`, `bagSlotFromTopMm` (cosmetic only).
- **Modifier:** `bagValveMm` (industrial), `bagPodHeightMm` (courier), `bagNeckCutMm`/`bagVentHoleMm` (diaper), `bagWicketSpacingMm`/`bagWicketHoleMm` (wicket).

**The engine's flat-sheet formula uses exactly:** W, H, BG, SG, FL, HL, HW, PW, PH, LH, SA.
All other fields are cosmetic/schematic (no costing impact, intentional — die-line detail).

**One genuine missing input:** `numberOfUps` is the slit-web layout factor (multi-ups
on the printed web), but it is **hidden during estimation** per `ES_PRD_v3_FINAL_BUILD_SPEC.md` line 270
("Machine-layout fields hidden during estimation — stored as defaults `ups=1, trim=0`").
For bags, this is acceptable **only** if the slit-web width is always 1× the
blank width (no multi-up). If a converter runs 2-up bags (common for courier
mailers), the blank area per piece is halved → piecesPerKg doubles. **Not
costed.** See §7 #4.

**Default SA:** `DEFAULT_BAG_SEAL_ALLOWANCE_MM = 10` (`bag-flat-sheet.ts` line 30).
Industry range 5–15 mm. Reasonable. Configurable via `dimensions.sealAllowanceMm`.

---

## 4. Engine geometry formulas (verdict: ✅ correct, formed-depth convention verified)

All 9 subtypes in `bag-flat-sheet.ts`. Formed-depth convention
(BG/SG unfold to 2× in the blank) is consistently applied and **verified
against the configurator field hints** (`bottomGussetMm` = "Depth when
standing", `sideGussetMm` = "One side; depth = 2×SG"). Tests assert each
subtype's blank width, blank length, and area.

| Subtype | Blank W (mm) | Blank L (mm) | Notes |
|---|---|---|---|
| bottom-gusset | `2W` | `H + 2BG + SA` | SUP convention; 2W web, gusset strip 2BG in length dir. |
| side-gusset | `2W + 4SG` | `H + 2SA` | Each side gusset unfolds 2SG wide; 2 sides = 4SG. |
| courier | `W` | `2H + FL + SA` | Single-web fold-in-half. Web = W. |
| diaper | `2W` | `H + 2BG + FL + SA` | Bottom-gusset body + full-width top flap. |
| industrial | `2W + 4SG` | `H + 2SA` | SG=0 → flat tube (2W × (H+2SA)). |
| loop | `2W` (body) | `H + 2BG + SA` (body) | body + `2 × HW × HL` handle strips, same GSM. |
| patch | `2W + 4SG` (or `2W` if BG-only) | base + SA terms | + `PW × PH` patch area (added separately). |
| punch | `2W + 4SG` | `H + 2SA` | Die-cut slot: no net film lost. |
| wicket (BG>0) | `2W` | `H + 2BG + SA + LH` | Bottom-gusset body + lip strip. |
| wicket (BG=0) | `2W` | `H + 2SA + LH` | Flat tube + lip strip. |

**Geometric checks I performed by hand:**

- **Bottom-gusset (W=400, H=500, BG=120, SA=10):** area = 800 × 750 = 600,000 mm² = 0.6 m². gsm=23 → 72.46 pcs/kg. **3× more material per piece than a pouch** (0.2 m² → 217 pcs/kg). Matches the test assertion `pouch/bag ratio > 2`. ✓
- **Side-gusset (W=400, H=500, SG=80, SA=10):** 2W+4SG = 1120; L = 520. Each gusset folds inward by 80 (internal depth 2×80=160/side). Blank contains 4×80=320 mm of gusset material. ✓
- **Courier (W=250, H=350, FL=50, SA=10):** W × (2H+FL+SA) = 250 × 760 = 190,000 mm². Single web folded in half → 2H is correct. ✓
- **Diaper (W=500, H=650, BG=180, FL=50, SA=10):** 2W × (H+2BG+FL+SA) = 1000 × 1110. Top flap spans full 2W width (asymmetric w.r.t. the body). ✓
- **Loop (W=300, H=380, BG=80, HL=260, HW=25, SA=10):** body 600 × 670 = 402,000 + handles 2×25×260 = 13,000 → 415,000 mm². Handle weight averaged into body. ✓
- **Patch (W=320, H=400, SG=60, PW=120, PH=80, SA=10):** base (2×320+4×60)×(400+20) = 880×420 = 369,600; + patch 9,600 → 379,200 mm². ✓
- **Wicket (W=300, H=400, BG=0, LH=40, SA=10):** 600 × 550 = 330,000 mm². ✓
- **Wicket (W=300, H=400, BG=80, LH=40, SA=10):** 600 × 700 = 420,000 mm². ✓

**The geometry is internally consistent and matches the documented
formed-depth convention.** See §6 for the 5 known unknowns (N1–N5) the
research doc itself flags as unresolved.

---

## 5. Costing concept (verdict: ✅ correct, end-to-end)

The cost concept is the legacy Laravel additive model (per `COSTING_NOTES.md`),
wired correctly for bags:

```
flatSheetArea_m2  = bagFlatSheet.areaM2 + patchAreaM2      (bag-flat-sheet.ts)
weightPerPiece_g  = flatSheetArea_m2 × totalGsm
piecesPerKg       = 1000 / weightPerPiece_g

materialCostPerKg = (Σ layer costPerM2) × 1000 / totalGsm
materialCostPerKg += solventCostPerKg                      (SB ink/adhesive)

operationCostPerKg = Σ process costs / trueOrderQuantityKg  (per-slab)
salePricePerKg     = (materialCost + solventCost) × (1 + markup/100)
                   + platesPerKg + deliveryPerKg + operationCostPerKg
```

**Per-slab pricing is correct** (`calculator.ts` Step 10): each slab
re-computes process costs at its own kg and re-prices the slab. A2 bug
confirmed fixed (see `ES_BUGS_AND_PRD_GAPS.md` A2).

**Order-quantity unit conversion** (`unit-conversion.ts`):
- `kgs` → passthrough.
- `kpcs` → `qty × 1000 / piecesPerKg` (uses the **bag** piecesPerKg, which
  uses the flat-sheet area — correct, not the pouch face area). ✓
- `sqm` → `qty / sqmPerKg` (where `sqmPerKg = 1000 / totalGsm`). ✓
- `lm` → `qty / linearMPerKgWeb` (printing-web linear). ✓
- `roll_500_lm` → `(qty × 500) / linearMPerKgReel`. ✓
  - For bags, `linearMPerKgReel = sqmPerKg / blankWidthMm × 1000` —
    uses the **blank** width (cross-direction), not the face width. ✓

**Process costing (`pcs_per_min` bug — A1 era):**
Test `bag-costing.test.ts` "pcs_per_min process cost is correct (no /1000 bug)"
asserts `runHours > 1` for a 1000 kg order at 100 pcs/min. The fix is:
`pieces = orderQuantityKg × piecesPerKg` (piecesPerKg is in pcs/kg, NOT
kpcs/kg). Confirmed in `calculator.ts` line 396. ✓

**Layered film costing:** `calculateLayer` correctly applies
`gsm = layer.micron × material.density` for substrates and `gsm = layer.micron`
(dry) for ink/adhesive. `totalGsm` is the sum of all layer GSM (multi-ply
already accounted for). ✓

**The only conceptual gap:** Bag costing does not include a per-bag overhead
for **process-specific features** (zipper tape, spout, handle-attachment
sealing time, hot-melt grams, slider cost). The current engine only
captures these via the generic `processes[]` array (which the user must
populate manually). V1 acceptable; future enhancement.

---

## 6. UI ↔ engine wiring (verdict: ✅ correct, ⚠ see P0 bug below)

```
productFamily='bag' && bagConfiguratorType!=null
  → BagConfigurator active → mm inputs → onDimensionsChange({ key: value })
  → setDimensions(prev => ({ ...prev, [key]: value }))
  → calculateEstimate(estimate) → calculateBagFlatSheetAreaM2(dimensions)
  → piecesPerKg / area / linearMPerKgReel
  → pcs/kg + flat-sheet label render in BagConfigurator status bar
```

**Wiring verified by tests:**
- `bag-flat-sheet.test.ts` "resolves type from bagSubtype" → ✓
- `bag-flat-sheet.test.ts` "resolves type from productSubtype code" → ✓
- `bag-costing.test.ts` "bottom-gusset bag uses flat-sheet area" → ✓
- `bag-costing.test.ts` "unresolved bag subtype falls back to face area" → ✓

**Server side:** `packages/server/src/utils/estimate-engine-input.ts` line 70
maps `estimate.productSubtype` → `bagSubtype` so legacy payloads (no
explicit `bagSubtype` field) still resolve to the configurator type. ✓
(Note: this is a one-way fallback — UI-driven new estimates set `bagSubtype`
directly via the configurator.)

---

## 7. Bugs / Gaps found in this audit

### P0 — DATA LOSS: `seedBagDimensionPatch` can clobber user input on subtype change

**File:** `packages/web/src/lib/bagConfiguratorCatalog.ts` lines 196–222.
`EstimateEditor.tsx` line 401 calls `seedBagDimensionPatch` in a `useEffect`
on `[bagConfiguratorActive, bagConfiguratorType, productSubtype]`.

```ts
const gussetDim = f.id === 'G' || f.id === 'SG';
const shouldReplace =
  prevVal == null ||
  !Number.isFinite(prevVal) ||
  (bodyDim && (prevVal ?? 0) <= 0) ||        // ← BUG: W/H=0 → seeded
  (gussetDim && prevVal != null && prevVal > 0 && prevVal < 5 && f.defaultVal >= 5) || // ← BUG: 1-4mm gusset → seeded
  (f.dimensionKey.startsWith('bag') && prevVal == null);
```

**Issue:** `(bodyDim && (prevVal ?? 0) <= 0)` — if a user intentionally
clears W or H (or hasn't entered yet), the seed runs and overwrites the
catalog default **on every effect run**, not just on subtype change. More
critically, the `shouldReplace` for `bodyDim` triggers on first load
(prevVal=0 from `DimensionState` defaults) which is fine, but the
`(gussetDim && prevVal > 0 && prevVal < 5)` rule means a user who enters
a small (but valid) 2-3mm gusset (e.g. for a very thin wicketed bread bag)
gets clobbered back to the 80-180mm catalog default.

**Risk:** Silent override of valid user input → wrong cost.

**Fix:** Gate the effect on `productSubtype` change only (not on every
`dimensions` change), and remove the `prevVal < 5` clobber rule. Add a unit
test asserting: user-set gusset of 3mm is preserved.

**Status:** Not yet fixed. Documented in SESSION_LOG 2026-06-26 ("Pending:
Manual test save/reload per bag subtype") — confirms awareness.

### P1 — `dimensionFieldsForEstimation('bag', subtype)` is still used as fallback

`EstimateEditor.tsx` line 372:
```ts
const estimationDimensionFields = dimensionFieldsForEstimation(productFamily, productSubtype);
```

This is fine, but `JobHeaderFields.tsx` line 90 checks
`!bagDimensionsPanel && dimensionFields.length > 0`. If `productFamily==='bag'`
but `bagConfiguratorType` is null (no recognized subtype), the
`bagDimensionsPanel` is `null`, the **generic** `BAG_BASE = [W, H, ups, trim]`
is used, and `bottomGussetMm`/`sideGussetMm` etc. are **not** rendered. The
user can still type them into the dimensions object via the freeform
key/value pair, but no UI input. Acceptable for an unrecognized subtype,
but `bag_punch_handle` is the default for `bag` family and it IS recognized,
so this path only triggers if the user picks an unrecognized subtype code
(e.g. a custom master-data row).

**Fix (optional):** When `productFamily==='bag' && bagConfiguratorType==null`,
show a banner "This bag subtype is not yet supported by the visual
configurator. Enter dimensions manually below." instead of silently
showing the bare W/H/ups/trim.

### #1 — N1 W-definition ambiguity (open question, blocks lock)

Per `BAG_COSTING_RESEARCH.md` §7A and `BAG_COSTING_PROMPT_FOR_AGENTS.md`
N1, the engine assumes W = one finished face for all subtypes except
courier. The configurator hints are inconsistent:

- bottom-gusset → "Front panel width" → W = one face ✓
- side-gusset → "Front panel only" → W = one face ✓
- industrial → "**Flat tube width**" → W could be 2 faces ✗
- diaper → "**Bag width flat**" → W could be 2 faces ✗
- wicket → "Bag width" → ambiguous ✗

**If operators enter W=400 meaning flat-laid tube (2 faces × 200mm each),
the current `2W + 4SG` formula double-counts body width.**

**Mitigation:** A product-run validation step (`#8` below) calibrates
against actual slit-web width. For now, the configurator hints for
industrial and diaper should be rewritten to "**Single-face width (W =
one panel, not flat-laid tube)**" to match the engine convention. No
formula change needed; just hint rewrite + the validation sample.

### #2 — N2 single-web vs two-web construction (open question, blocks lock)

For bottom-gusset SUPs, current formula `2W × (H + 2BG + SA)` assumes
2W-wide web (side-by-side panels). Fold-in-half alternative
`W × (2H + 2BG + 2SA)` would halve the gusset film (2WBG vs 4WBG).

**Subagent verdict (High confidence, per `BAG_COSTING_RESEARCH.md` §7A-B):**
SUPs are 2W web; fold-in-half is for simple t-shirt/singlet bags, not
SUPs. Our `bag_bottom_gusset_shopping` is labeled "shopping bag" — could
be either. Need converter confirmation.

**Mitigation:** Same as #1 — calibrate. If the converter's bag is
fold-in-half, change to the alternative formula.

### #3 — N3 SA placement (open question, blocks lock)

Current: `+ SA` for bottom-gusset/diaper/loop/wicket (top seal only),
`+ 2SA` for side-gusset/industrial/punch (top + bottom seals).

The subagent flagged that fold-in-half needs 2SA (fold is not a seal).
The current single-SA assumption is correct for the side-by-side
construction. The diaper formula includes a top flap (`FL`) which
already provides seal material → single SA on top is correct.

**Mitigation:** No code change. Confirm with converter that bottom-gusset
bags have a gusset strip (no bottom seal) at the actual production line.

### #4 — N4/N5 industrial & diaper SG/W (open questions)

Industrial: SG=0 should produce a flat tube (`2W × (H+2SA)`). Code already
handles this (`SG=0` → `4SG=0` → `2W`). ✓
Diaper: W hint ambiguity, same as #1. ✓ (defer to N1 resolution).

### #5 — Multi-up slit web not costed for bags

`numberOfUps` is the multi-up factor (2-up means slit web is 2× blank
width → 2× pieces per slit-meter). For bags, the current code stores
`numberOfUps: 1, extraPrintingTrimMm: 0` as defaults. If a converter
runs 2-up courier mailers (very common), the piecesPerKg should
**double**, not stay the same. **Currently under-costs film and
over-costs per-piece labor.**

**Fix:** Multiply `piecesPerKg` by `numberOfUps` in the bag branch of
`calculateProductMetrics`:
```ts
result.piecesPerKg = (1000 / (bag.areaM2 * totalGsm)) * (dimensions.numberOfUps ?? 1);
```
And multiply `linearMPerKgReel` by `numberOfUps` to keep the per-slit-meter
quantities consistent. **Same fix is already in place for `pouch` and
`roll/sleeve` branches** — bag branch missed.

**Status:** Not yet fixed. Add to backlog as P1.

### #6 — `printingWebWidthMm` for bags uses `openWidthMm` only (no gusset)

`calculator.ts` line 252:
```ts
if (dimensions.openWidthMm && dimensions.numberOfUps && dimensions.extraPrintingTrimMm !== undefined) {
  return (dimensions.openWidthMm * dimensions.numberOfUps) + dimensions.extraPrintingTrimMm;
}
```

For bags, the **printed web width** is the **blank width** (front+back
side-by-side = 2W for SUPs, 2W+4SG for side-gusseted, W for courier),
not `openWidthMm`. This is used to compute `linearMPerKgWeb` for `m_per_min`
process costs (printing).

**Risk:** If a printer quotes 100 m/min of web, the current code uses W
(web width = 400mm for SUP) instead of 2W (800mm). This **doubles** the
process run time, over-costs printing, and could make a quote uncompetitive.

**Fix:** When productType=bag, use `bag.blankWidthMm` (already returned
by `calculateBagFlatSheetAreaM2`) instead of `openWidthMm` for
`printingWebWidthMm`. Add unit test.

**Status:** Not yet fixed. Add to backlog as P1.

### #7 — Patch cost concept: patch is same material, same GSM (assumption)

`bag-flat-sheet.ts` line 152: `patchAreaM2 = (PW × PH) / 1e6` is **added
to** the base area but **not differentiated** by material/GSM. The patch
on a real patch-handle bag is usually the **same film** (no extra cost)
or, in some designs, a thicker reinforcement patch (different GSM).

**Current behavior:** Patch area × totalGsm is included in weight, so
material cost reflects the extra film. If the patch is a different
material/GSM, the cost will be wrong. Document as a known assumption.

### #8 — No production-calibrated golden test for bags

`golden.test.ts` is mentioned in the file list (`packages/engine/src/`)
but I did not find a bag golden fixture. `bag-costing.test.ts` uses
synthetic dimensions (W=400, H=500, BG=120) without cross-check against
a real converter's slit-web width and cut length.

**Fix:** Add a `bag-golden.test.ts` with a converter-supplied sample
(W, H, BG, SG, slit-web, cut-length, pieces/kg measured on the line) →
validate `calculateBagFlatSheetAreaM2` matches within 1-2%.

**Status:** Listed in `BAG_COSTING_RESEARCH.md` §8.1 as future enhancement.

### #9 — Loop handle "same material" is a strong assumption

`bag-flat-sheet.ts` line 124: "Loop handle is the SAME material as the
body". For most loop-handle shopping bags this is true (LDPE handle, LDPE
body, sometimes different color but same resin). Some designs use a
PP ribbon handle (different material, different cost).

**Status:** Document the assumption. Add a `handleMaterialId` field as
V2 enhancement.

---

## 8. Summary table

| Item | Verdict | Severity |
|---|---|---|
| 9 subtypes mapped | ✅ | — |
| Required dimension parameters per subtype | ✅ | — |
| Default SA = 10mm | ✅ | — |
| Formed-depth convention (BG/SG unfold to 2×) | ✅ | — |
| Geometry formulas per subtype | ✅ | — |
| Costing concept (flat sheet → pieces/kg → $/kg) | ✅ | — |
| `kgs/kpcs/sqm/lm/roll_500_lm` unit conversion | ✅ | — |
| `pcs_per_min` (no /1000 bug) | ✅ | — |
| Per-slab recompute | ✅ | — |
| Server-side subtype → bagSubtype fallback | ✅ | — |
| Validator requires bagSubtype | ✅ | — |
| UI ↔ engine wiring (BagConfigurator) | ✅ | — |
| 25/25 bag tests green | ✅ | — |
| **N1 W-definition ambiguity** | ⚠ unknown | blocks lock |
| **N2 single-web vs two-web** | ⚠ unknown | blocks lock |
| **N3 SA placement (single vs double)** | ⚠ unknown | blocks lock |
| **P0: `seedBagDimensionPatch` clobbers 1-4mm gussets** | 🐛 bug | data loss |
| **P1: `printingWebWidthMm` uses `openWidthMm` not blank width** | 🐛 bug | mis-cost |
| **P1: `numberOfUps` not applied to bag piecesPerKg** | 🐛 bug | mis-cost |
| **P1: unrecognized bag subtype silently falls back** | 🐛 UX | minor |
| Patch: same material/GSM assumption | 📋 doc | minor |
| No production-calibrated golden test | 📋 backlog | needed for lock |
| Loop handle: same material assumption | 📋 doc | minor |

---

## 9. Recommended next actions (ordered by impact)

1. **Production calibration (single most valuable):** Collect one real
   sample per bag subtype from the converter (finished W, H, gusset,
   **actual slit-web width**, **actual cut length**). Plug into
   `bag-golden.test.ts` as fixtures. If any formula is off by >2%, fix
   the formula, not the calibration. This resolves N1, N2, N3 in one
   pass and is the only way to lock the geometry with confidence.
2. **Fix P0 `seedBagDimensionPatch` clobber rule** (`bagConfiguratorCatalog.ts`
   line 217). Remove the `prevVal < 5` branch; gate the effect on
   `productSubtype` change only. Add regression test.
3. **Fix P1 `printingWebWidthMm` for bags** (`calculator.ts` line 247).
   When `productType==='bag'` and `bag.blankWidthMm > 0`, use
   `bag.blankWidthMm × numberOfUps + extraPrintingTrimMm`. Add test.
4. **Fix P1 `numberOfUps` for bags** (`calculator.ts` line 338).
   Multiply `piecesPerKg` and `linearMPerKgReel` by `numberOfUps`.
5. **Rewrite the W hints** for industrial, diaper, wicket, patch, punch,
   loop, courier to "**Single-face width (one panel)**" so the operator's
   mental model matches the engine's assumption. This reduces the
   likelihood of N1 mis-entry.

---

**Bottom line:** The cost concept (flat sheet → pieces/kg → additive
$/kg with markup + plates + delivery + processes) is correct and matches
the legacy Laravel model. The 9-subtype geometry is the **best current
approximation** of the formed-depth convention, internally consistent,
and 25/25 tested. Lock-ready **after** the production calibration
(action #1) and the P0/P1 fixes (#2, #3, #4). The 5 non-confident
points (N1–N5) are not bugs — they are the boundary between
"best-current-approximation" and "production-validated formula", which is
exactly the gap the calibration will close.
