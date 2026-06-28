# Bag Estimation Audit — Classification & Raw-Material Cost

**Date:** 2026-06-27
**Scope:** Estimation Studio (ES), `family = bag` path only.
**Reviewer stance:** Flexible-packaging conversion engineer (PE bags / blown-film tubing
& form-seal-cut converting), reasoning from first principles. The existing `@es/engine`
formulas were read but **not trusted blindly** — every subtype was re-derived independently
and then compared to the code.

This is a findings/decision document for later implementation. Nothing here has been
changed in code yet.

---

## 1. How bag cost is actually computed today (the real chain)

Tracing the code, not the docs:

1. **Catalog / classification**
   - `web/src/lib/productCatalog.ts` → `BAG_SUBTYPES` (9 subtypes, grouped Commercial / Industrial / Other).
   - `web/src/lib/bagConfiguratorCatalog.ts` → `BAG_CONFIGURATOR_CATALOG` (per-subtype input fields, hints, defaults).
   - `BAG_SUBTYPE_TO_CONFIGURATOR` maps `productSubtype` code → configurator type. **This map lives in two places** (web catalog *and* `engine/src/bag-flat-sheet.ts`); they currently agree, but it is duplicated and can drift.

2. **Geometry / weight** — `engine/src/bag-flat-sheet.ts` → `calculateBagFlatSheetAreaM2()`
   returns the **flat blank area (m²)** for one bag.

3. **Metrics** — `engine/src/calculator.ts` → `calculateProductMetrics()` (`case 'bag'`):
   - `piecesPerKg = 1000 / (areaM2 × totalGsm)`
   - `gramsPerPiece = 1000 / piecesPerKg = areaM2 × totalGsm`
   - Falls back to **face area `W×H`** (pouch-style) if the subtype can't be resolved.

4. **GSM** — `totalGsm = Σ layer gsm`, where substrate `gsm = micron × density`.

5. **kg → money** — `salePricePerKg = rmCostPerKg + markup + plates + delivery + operation`.
   Piece economics are implied by `gramsPerPiece` (see §6).

6. **Engine entry point (server, the number that gets saved)** —
   `server/.../estimate-engine-input.ts` sets `dimensions.productType = estimate.productType`
   (kept as `'bag'`) **and** injects `bagSubtype` from `productSubtype`. So on the **server**
   the flat-sheet model runs correctly. ✅

**The weight chain itself (area × GSM → pieces/kg → piece cost) is structurally correct.**
The accuracy of every quote therefore reduces to two things only:
**(a) is the flat blank area right, and (b) is the GSM right.** Everything else is arithmetic.

---

## 2. Verdict on the area model, subtype by subtype (independent re-derivation)

Convention used throughout the engine: **`W` = one face (front panel) width**, and a
lay-flat tube of face width `W` consumes film of girth `2W` (front + back). I re-derived
each formula; algebra below.

| Subtype | Engine formula (blank W × L) | My derivation | Verdict |
|---|---|---|---|
| bottom-gusset | `2W × (H + BG + SA)` | body `2W·H` + gusset panel `W·2BG = 2W·BG` + seal `2W·SA` = `2W(H+BG+SA)` | ✅ correct |
| side-gusset | `(2W+4SG) × (H + 2SA)` | girth `2W` + two side gussets each unfolding to `2SG` → `+4SG`; top+bottom seal `2SA` | ✅ correct |
| courier | `W × (2H + FL + SA)` | single web folded in half → length `2H`, +flap `FL`, +seal `SA`; width = `W` (single sheet, **not** 2W) | ✅ correct geometry (see §4 SA caveat) |
| diaper | `2W × (H + BG + FL + SA)` | bottom-gusset body + top flap `FL` | ✅ correct |
| industrial | `(2W+4SG) × (H + 2SA)` | same as side-gusset; `SG=0` → flat tube `2W` | ✅ correct |
| loop | `2W(H+BG+SA) + 2·HW·HL` | body + 2 welded handle strips | ⚠️ correct **only** for welded strips, and the `HW→W` fallback is a bug (§3.2) |
| patch | base `(2W+4SG)(H+2SA)` + `PW·PH` | base + separate patch piece | ⚠️ base hard-locked to side-gusset + patch GSM = body GSM (§3.1) |
| punch | `(2W+4SG)(H+2SA)` | flat/side-gusset body; slot cut-out negligible | ✅ correct |
| wicket | `2W(H+BG+SA+LH)` or flat `2W(H+2SA+LH)` | body + header lip `LH` | ✅ correct |

**Bottom line:** the gusset geometry and the two-web `2W` convention are sound. I confirm
the other agent's "gusset geometry is solid" conclusion. The problems are elsewhere.

---

## 3. CRITICAL issues (blockers before locking formulas)

### 3.1 Patch handle — base is hard-locked & patch GSM = body GSM
- The engine is **not** a literal stub (it resolves a base: side-gusset by default, or
  bottom-gusset when `BG>0 && SG==0`). But the base is **not user-selectable**, and the
  default (side-gusset, `+4SG`) is the **wrong default** for the most common patch-handle
  retail bag, which is typically a **bottom-gusset or flat** body. Defaulting to side-gusset
  can over-count body film.
- The patch area `PW·PH` is added at **body GSM**. Real reinforcement patches are usually a
  **heavier gauge / different film**. Same-GSM is an under- or mis-count of patch weight.

**Decision:** add a `patchBaseSubtype` selector (default **flat/bottom-gusset**, not
side-gusset) **and** a `patchGsmOverride` (or a separate patch material line). Until then,
treat patch quotes as approximate. *(Agrees with other agent; I additionally flag the wrong
default base.)*

### 3.2 Loop handle — `HW` falls back to `W` (geometry bug)
`bag-flat-sheet.ts`: `const handleWidth = HW > 0 ? HW : W;`
If `bagHandleWidthMm` is missing/0, handle width defaults to the **whole bag width** (e.g.
300 mm) instead of a real ribbon (~15–40 mm). Handle area `2·HW·HL` then overcounts handle
film by **~10–15×**, inflating `gramsPerPiece` and wrecking piece cost.

The configurator default of `HW=25` masks this *only* when the field is seeded; any path
that leaves it unset hits the bug.

**Decision:** never inherit `W`. Default `HW` to **25 mm** (or `0`), and add a
`handleConstruction: 'die-cut' | 'welded-strip'`:
- `die-cut` → handle is punched from the body → **drop** the `+2·HW·HL` term entirely (no extra film).
- `welded-strip` → keep `+2·HW·HL` with explicit `HW`.
*(Agrees with other agent.)*

### 3.3 Bottom-gusset **+** side-gusset combination is missing
No subtype produces both. This is a **very common GCC product** (coffee, pet-food,
detergent, salt — block-bottom / quad-seal style). Correct combined blank:

```
blankWidth  = 2W + 4SG
blankLength = H + BG + SA      (bottom gusset closes the base; single top seal)
area        = (2W + 4SG) × (H + BG + SA)
```

**Decision:** add a 10th subtype (e.g. `bag_quad_seal` / `bag_block_bottom`) **or** make it
parametric: on a "gusseted" subtype, if `BG>0 && SG>0`, apply the combined formula above.
*(Agrees with other agent.)*

### 3.4 **NEW — Seal/fold/header inputs are collected but ignored by the weight model**
This was **not** in the other agent's notes and is a real money bug.

The configurator collects and persists these keys, but `calculateBagFlatSheetAreaM2()`
**never reads them**; it reads only `sealAllowanceMm` (which **nothing in the UI sets**, so
it always falls back to the hard default `DEFAULT_BAG_SEAL_ALLOWANCE_MM = 10`):

| Field (UI) | Stored key | Used by engine? |
|---|---|---|
| Top fold `F` (bottom-gusset, diaper) | `bagTopFoldMm` | ❌ ignored |
| Top seal `TS` (side-gusset) | `bagTopSealMm` | ❌ ignored |
| Neck cut `NC` (diaper) | `bagNeckCutMm` | ❌ ignored |
| POD pocket (courier) | `bagPodHeightMm` | ❌ ignored |
| Valve (industrial) | `bagValveMm` | ❌ ignored (negligible, OK) |
| (seal allowance) | `sealAllowanceMm` | ✅ but never populated → always 10 mm |

Concrete impact: bottom-gusset defaults `F=50 mm`, but the length uses `H + BG + 10`. The
**top fold/seal is undercounted by ~40 mm of length on every gusset bag** — a direct,
systematic under-quote on body film. Courier "POD pocket" (default 80 mm of extra film) is
free in the current model.

**Decision (pick one):**
- **(a)** Wire the real fields in: replace the flat `SA` with the subtype's actual seal/fold
  contribution — bottom-gusset/diaper length uses `bagTopFoldMm`; side-gusset uses
  `bagTopSealMm` (×2 if both ends); add `bagNeckCutMm` and `bagPodHeightMm` where present; **or**
- **(b)** Populate `sealAllowanceMm` from the configurator (sum the relevant fold/seal fields)
  so the existing single-`SA` slot is at least driven by user input rather than a constant 10.

Option (a) is correct; (b) is the minimum viable fix.

---

## 4. HIGH issues

### 4.1 `W` definition ambiguity — inconsistent, misleading hints
Formulas assume `W = one face`. Hints contradict this:
- industrial: **"Flat tube width"** — industry phrasing for *lay-flat = one face*, but easily
  read as girth. With `2W+4SG`, a user entering girth doubles body film.
- diaper: **"Bag width flat"** — same trap.
- bottom-gusset says "Front panel width" ✅, side-gusset "Front panel only" ✅ — already correct.

**Decision:** standardize every bag `W` hint to **"Front panel width (one face)"**. UI-only;
**no formula change.** *(Agrees with other agent's N1 verdict.)*

### 4.3 `H` definition ambiguity on gusset bags — double-count risk
Same class of problem as 4.1, on the **height** axis. The engine's gusset-bag length
(`H + BG + SA`) is correct **only under Convention A**: `H` = front-panel height from the
**bottom fold line to the mouth, excluding the gusset**. If a user follows **Convention B**
(`H` measured over the whole bag *including* the gusset zone), `BG` is already inside `H` and
the `+ BG` term **double-counts** the gusset → over-quote.

The bottom-gusset catalog hint currently reads **"Total bag height"**, which invites
Convention B. Diaper "Total height" has the same issue.

**Decision:** clarify hint to *"Front panel height (mouth to bottom fold, excluding gusset)."*
UI-only; **no formula change.** *(Raised by the second reviewer on the bottom-gusset check;
endorsed. Note the `+BG` factor itself is correct — gusset panel `W·2BG` over a `2W` blank =
`+BG` — and holds for both tube and two-web construction.)*

### 4.2 Loop construction toggle — see 3.2 (die-cut vs welded). High because die-cut loop
(the dominant PE grocery/retail style in the region) currently **over-counts** by the full
handle term.

---

## 5. MEDIUM issues

- **Courier seal allowance too small.** `W×(2H+FL+SA)` is geometrically right, but a courier
  peel-seal adhesive strip is typically **25–40 mm**, not the default 10. Either document
  "set SA higher for courier" or add a dedicated `adhesiveStripMm`. *(Agrees with other agent.)*
- **GSM depends on correct PE density.** `gsm = micron × density`. For PE this must be set
  realistically (LDPE/LLDPE ≈ 0.92, HDPE ≈ 0.95 g/cc). A density left at 1.0 over-states bag
  weight ~6–8%. Verify the PE substrate density values in Raw Materials — this silently scales
  **every** bag quote. *(My addition — not in the other notes.)*
- **kpcs → pcs unit trap: already handled correctly here.** The engine converts the order
  quantity to **true kg** first (`convertOrderQuantityToKg`), then `pieces = kg × piecesPerKg`
  with `piecesPerKg` in *pieces*/kg, and `runTime = pieces/(pcs_per_min×60)`. No 1000× error
  exists in the current code. I disagree that this is an open bug — but **keep the invariant**:
  store internal quantities in actual pieces/grams, convert to kpcs/kg only at display.
- **Duplicated `BAG_SUBTYPE_TO_CONFIGURATOR` map** (web + engine). Risk of drift. Make the
  engine the single source and re-export to web. *(My addition.)*

---

## 6. kg → piece cost conversion (the user's explicit ask)

`kg` is the master unit; piece cost is derived. The correct and only needed conversions:

```
gramsPerPiece = areaM2 × totalGsm                       (engine already computes this)
piecesPerKg   = 1000 / gramsPerPiece
costPerPiece  = salePricePerKg × gramsPerPiece / 1000   = salePricePerKg / piecesPerKg
costPerKpcs   = costPerPiece × 1000
```

These are arithmetically sound **given a correct `areaM2`**. So piece cost accuracy is fully
gated by §3–§4 (blank area) and the PE density (§5). I did not find an error in the conversion
math itself. **Action:** confirm a `salePricePerPiece` / `salePricePerKpcs` line is surfaced
in the quote UI for bags (the data is there via `gramsPerPiece`); if missing, add it.

⚠️ **Web vs server divergence to verify:** the in-editor live preview path
(`web/src/lib/estimateCalc.ts → runClientCalculation`) spreads `...input.dimensions` but does
**not** inject `bagSubtype` the way the server builder does. If a caller invokes it without
`bagSubtype`/`productSubtype` in `dimensions`, the engine can't resolve the subtype and
**falls back to face area `W×H`**, producing a *lighter* bag than the saved server number.
The saved figure (server) is the correct one; the preview may differ. Confirm callers pass
the subtype, or mirror the server's `bagSubtype` injection in `runClientCalculation`.

---

## 7. Classification / taxonomy gaps

- **Flat bag (no gusset)** has no explicit subtype — done today via side-gusset `SG=0`. Works,
  but showing a "side gusset = 0" field for a flat bag is confusing UX. Add an explicit
  `flat` subtype, or a `gussetType: none | side | bottom | both` selector. (Low.)
- **Zipper / resealable** not modeled for bags. Adds ~12–15 mm to height **and** is a separate
  purchased component (not film). Needs a modifier flag + `zipperTrackMm` for the length term
  **and** a separate BOM cost line. (Low for PE bags; higher if reclosable PE bags are quoted.)
- **Wicket / punch as modifiers, not subtypes.** Architecturally they are modifiers on a base
  (flat / side-gusset), not first-class shapes. Fine for now; note for a Phase-2 taxonomy
  refactor. (Low.)

---

## 8. Adjudication of the prior agent's notes (where I agree / differ)

| Their point | My verdict |
|---|---|
| Patch base is a "stub" | **Partly.** Engine resolves a base; real issue is it's not selectable **and the default base (side-gusset) is wrong** — should be flat/bottom-gusset. |
| Patch GSM ≠ body GSM | **Agree.** Add `patchGsmOverride` / separate line. |
| Loop `HW=W` default wrong | **Agree, it's a bug.** Default 25 mm, never inherit `W`. |
| Loop die-cut vs welded toggle | **Agree.** Die-cut drops the handle term. |
| BG+SG combination missing | **Agree.** Add 10th subtype or parametric combo. |
| `W` = one face; fix hints only | **Agree.** UI-only, formulas stay. |
| Courier SA too small for peel strip | **Agree.** Document or add `adhesiveStripMm`. |
| Q2 BG adds BG (not 2BG) | **Agree** — re-derived: gusset panel `W·2BG = 2W·BG` ⇒ `+BG` on a `2W` blank. ✅ |
| Q3 SG = 4SG total | **Agree** — two gussets, each unfolds to `2SG`. ✅ |
| Q4 courier single-web `W×(2H+FL+SA)` | **Agree.** ✅ |
| Q10 `piecesPerKg = 1000/(area×gsm)` | **Agree.** ✅ |
| Q12 kpcs→pcs trap | **Disagree it's open** — current code already converts to true kg first; no 1000× bug. Keep the invariant as guardrail. |
| Zipper / flat-bag / modifiers | **Agree** — Phase 2 / low priority. |
| **Seal/fold/header fields ignored by engine (`sealAllowanceMm` always 10)** | **My finding, not in their notes** — systematic body-film undercount on gusset bags. CRITICAL. |
| **PE density must be verified** | **My finding** — silently scales every bag weight. |
| **Duplicated subtype map (web+engine)** | **My finding** — drift risk. |
| **Preview (web) may skip `bagSubtype` → face-area fallback** | **My finding** — web/server number divergence. |

---

## 9. Prioritized action list

| # | Item | Severity | Fix |
|---|---|---|---|
| 1 | Seal/fold/header fields ignored; `SA` hard-defaults to 10 | **Critical** | Wire `bagTopFoldMm`/`bagTopSealMm`/`bagNeckCutMm`/`bagPodHeightMm` into length, or feed `sealAllowanceMm` from UI |
| 2 | Loop `HW` falls back to `W` | **Critical** | `HW` default 25 mm, never `W`; add `handleConstruction` (die-cut drops handle term) |
| 3 | BG+SG (block-bottom/quad-seal) missing | **Critical** | Add subtype or parametric `BG>0 && SG>0` → `(2W+4SG)(H+BG+SA)` |
| 4 | Patch base not selectable + wrong default + patch GSM = body GSM | **Critical/High** | `patchBaseSubtype` (default flat/bottom-gusset) + `patchGsmOverride` |
| 5 | `W` hints inconsistent ("flat tube width") | **High** | Standardize to "Front panel width (one face)"; no formula change |
| 6 | Courier peel-seal strip undercounted | **Medium** | `adhesiveStripMm` or doc note (25–40 mm) |
| 7 | PE substrate density realism | **Medium** | Verify LDPE/LLDPE≈0.92, HDPE≈0.95 in Raw Materials |
| 8 | Duplicated subtype map (web/engine) | **Medium** | Single source in engine, re-export |
| 9 | Web preview may skip `bagSubtype` | **Medium** | Inject `bagSubtype` in `runClientCalculation` |
| 10 | Surface `salePricePerPiece` / `perKpcs` for bags | **Low/Med** | Display-layer using existing `gramsPerPiece` |
| 11 | Explicit flat-bag subtype / `gussetType` selector | **Low** | UX |
| 12 | Zipper modifier (film + component BOM) | **Low** | Phase 2 |

**Conclusion:** the core weight model (flat blank area × GSM → pieces/kg → piece cost) and
the gusset geometry are correct and well-reasoned. Three of the prior agent's four critical
calls hold up. The single biggest *unflagged* risk is **#1 (seal/fold inputs silently ignored,
SA frozen at 10 mm)**, which systematically under-quotes body film on the most common gusset
bags. Resolve #1–#4 before locking the bag formulas.


---

## 10. Implementation log

### Stage 1 — Unified "Gusseted Shopping Bag" (2026-06-27) ✅ DONE
Merged `bottom-gusset` + `side-gusset` (+ flat) into **one** subtype `bag_gusseted_shopping`
with bottom/side tick-boxes. Resolves Critical issue **#3** (BG+SG combination) and removes
the patch/flat base-guessing ambiguity going forward.

**Parametric formula (engine, `bag-flat-sheet.ts` → `case 'gusseted'`):**
```
width  = 2W + (SG > 0 ? 4·SG : 0)
length = BG > 0 ? (H + BG + SA) : (H + 2·SA)
```
Numerically identical to the legacy types for single-gusset cases, so existing estimates do
not move:
- `BG>0, SG=0` → bottom-gusset
- `BG=0, SG>0` → side-gusset
- `BG=0, SG=0` → flat tube
- `BG>0, SG>0` → **block-bottom / quad-seal** (was missing)

**Files touched:**
- `packages/engine/src/bag-flat-sheet.ts` — `gusseted` type + case + `bag_gusseted_shopping` map
- `packages/engine/src/bag-flat-sheet.test.ts` — 5 new cases (none/bottom/side/both/resolve); count 9→10
- `packages/web/src/lib/bagConfiguratorCatalog.ts` — `gusseted` config; corrected W/H hints
- `packages/web/src/lib/productCatalog.ts` — picker entry; legacy codes kept resolvable (`LEGACY_BAG_SUBTYPES`)
- `packages/web/src/lib/masterDataReference.ts` — default subtype option swapped
- `packages/web/src/components/BagSchematic.tsx` — `DrawGusseted` renderer
- `packages/web/src/components/BagConfigurator.tsx` — bottom/side gusset tick-boxes
- `packages/web/src/lib/bagDrawDims.ts` — `bagFlatSheetLabel` rewritten to match the engine blank (also fixes the label/engine mismatch noted in §6)

**Verification:** `@es/engine` full suite 125/125 pass (golden tests unchanged); engine rebuilt;
web changed-files typecheck clean (10 pre-existing unrelated TS errors remain in App/Customer/
MasterData/EstimateEditor).

**Backward compatibility:** legacy `bag_bottom_gusset_shopping` / `bag_side_gusset_shopping`
remain mapped in the engine and resolvable in the web catalog (hidden from the picker), so saved
estimates keep working and produce identical numbers.

**Worked check @ 60 GSM, W=400, H=500, SA=10 (BG=120, SG=80):**
| Gussets | Blank (mm) | Area (m²) | g/pc | pcs/kg |
|---|---|---|---|---|
| None (flat) | 800 × 520 | 0.4160 | 24.96 | 40.06 |
| Bottom only | 800 × 630 | 0.5040 | 30.24 | 33.07 |
| Side only | 1120 × 520 | 0.5824 | 34.94 | 28.62 |
| Both (block-bottom) | 1120 × 630 | 0.7056 | 42.34 | 23.62 |

### Stage 1b — Industrial bag folded into gusseted (2026-06-27) ✅ DONE
Owner confirmed industrial bag = flat / side-gusseted tube. `bag_industrial` now resolves to
the unified `gusseted` formula in both the engine and web maps (kept as its own picker entry so
users still find "Industrial Bag" by name; group "Industrial").
- Side-gusseted industrial → `(2W+4SG)(H+2SA)`, **numerically identical** to the old `industrial`
  case, so existing industrial estimates do not move. Flat (SG=0) and bottom also available.
- Tick-on default depths set logically: bottom 120 mm, side 80 mm per side (loaded into the field
  when ticked; matches the gusseted catalog initial load of BG=120, side off).
- **Minor nuance to revisit:** because `bag_industrial` shares the `gusseted` configurator, it
  inherits the shopping-bag defaults (W=400, H=500, bottom-on) and the label "Gusseted shopping
  bag" in the schematic header. Costing is correct; only the default seed (industrial is usually
  *side*, not bottom) and the cosmetic label differ. Fix when handle/per-subtype defaults move to
  the Stage 2 modifier model.

### Still open (not in Stage 1)
- #1 seal/fold inputs ignored (SA frozen at 10) — partly addressed (diaper top fold + courier
  POD now wired); the **gusseted top hem/fold** is still modelled by the flat SA=10 — revisit if
  shopping bags need an explicit top-fold/hem field.
- Stage 2: promote handle (none/punch/loop/patch) and wicket to modifiers on a base shape.
- Patch heavier-gauge film: **GSM is structure-derived, not a manual number** (totalGsm = Σ layer
  gsm from the structure + ink, then × bag flat area). The reinforcement patch is cut from the
  same film and weighed at the body structure GSM. A genuinely different-gauge patch would need
  its **own structure**, not a typed GSM — deferred as a separate feature (the earlier
  `bagPatchGsmOverride` manual field was removed for conflicting with the structure-driven model).


### Stage 1c — Remaining bag types fixed (2026-06-27) ✅ DONE
| Type | Fix | Status |
|---|---|---|
| Courier | POD pocket now adds a `W×POD` film panel (was ignored); flap hint = peel-seal depth (~25–40mm, default 40) | ✅ #6 |
| Diaper | Top fold now read from `bagTopFoldMm` (was reading `flapMm`, never set → undercount). Neck cut/vents = die-cut, not subtracted. `W` hint → "front panel (one face)" | ✅ #1 (diaper) |
| Loop | `HW` fallback fixed: default 25 mm, **never** inherits `W`. Added `bagLoopWelded` (Welded strip / Die-cut) toggle; die-cut drops the `2·HW·HL` handle term | ✅ #2 |
| Patch | Base now uses unified gusset parametric (default **bottom-gusset**, not side); `bagPatchGsmOverride` weighs a heavier patch film separately in the calculator | ✅ #4 (base); GSM UI pending |
| Punch | Verified — flat/side-gusset body, die-cut slot negligible. No change | ✅ |
| Wicket | Verified — header lip `LH` added to length, holes negligible. No change | ✅ |

**Engine files:** `bag-flat-sheet.ts` (courier/diaper/loop/patch cases), `calculator.ts` (patch GSM
override), `types.ts` (bagLoopWelded, bagTopFoldMm, bagPodHeightMm, bagPatchGsmOverride).
**Web files:** `bagConfiguratorCatalog.ts` (loop/patch/diaper/courier hints + defaults; new keys
in dimension set), `BagConfigurator.tsx` (loop Welded/Die-cut selector).
**Tests:** bag-flat-sheet 26 cases pass; full engine suite **127/127**; engine rebuilt; changed
web files typecheck clean.

**Worked checks @ 60 GSM, catalog default dims, SA=10:**
| Type | Dims | Blank (mm) | Area (m²) | g/pc | pcs/kg |
|---|---|---|---|---|---|
| Courier (POD=80) | W250 H350 FL40 | 250 × 830 | 0.2075 | 12.45 | 80.3 |
| Courier (no POD) | W250 H350 FL40 | 250 × 750 | 0.1875 | 11.25 | 88.9 |
| Diaper | W500 H650 BG180 F50 | 1000 × 890 | 0.8900 | 53.40 | 18.7 |
| Loop (welded) | W300 H380 BG80 HL260 HW25 | 600 × 470 +handles | 0.2950 | 17.70 | 56.5 |
| Loop (die-cut) | same | 600 × 470 | 0.2820 | 16.92 | 59.1 |
| Patch (bottom base) | W320 H400 BG80 PW120 PH80 | 640 × 490 +patch | 0.3232 | 19.39 | 51.6 |
| Punch (flat) | W280 H360 | 560 × 380 | 0.2128 | 12.77 | 78.3 |
| Wicket | W300 H400 BG80 LH40 | 600 × 530 | 0.3180 | 19.08 | 52.4 |


---

## 11. Session log — 2026-06-28 (UI, flat-blank view, data migration)

### Flat-blank die-line view (NEW)
- `packages/web/src/components/bagSvgPrimitives.tsx` — shared SVG primitives (colours `C`,
  scale `mkT`, dimension arrows `DimH`/`DimV`, `Grid`, `useDrawAreaSize`). Single source for
  both renderers.
- `packages/web/src/components/BagSchematic.tsx` — refactored to import the shared primitives
  (finished-bag front view).
- `packages/web/src/components/BagFlatBlank.tsx` — NEW. Flat unfolded die-line whose OUTER
  blank size comes straight from the engine (`calculateBagFlatSheetAreaM2`), so the picture
  always equals the costed area. Per-type bands (seal/gusset/fold/lip/flap/POD), side-gusset
  width panels, handle/patch extra pieces, courier single-web layout.
- `packages/web/src/components/BagConfigurator.tsx` — wired a responsive **two-up panel**
  (Finished bag | Flat blank), building an engine-shaped `engineDims` from the live fields.

### UI cleanup (per owner feedback)
- Bag type now defaults to **"Select type…"** when Bag is chosen (no auto-pick); user selects
  from the list. Genuinely empty subtype renders no bag.
- Centered header above the inputs; removed the bag-type **title** (duplicated the dropdown) —
  header now just the instruction line.
- Dimension inputs restyled: **light-yellow highlight** (amber-50/100, amber border, centered
  bold values) to signal editable; loop Welded/Die-cut selector matches.
- Status (Live) row trimmed: removed **Type**, **Total GSM**, **Pcs/kg** (and the "needs
  structure" placeholder). Now shows Live · Face area · Flat sheet, with a note beneath:
  *"Flat blank = the film each bag is cut from (drives weight & cost). Bleed, register marks,
  knife & machine allowances are excluded from this blank and accounted for in the waste
  calculation."*
- Removed the "Flat blank (die-line) · indicative" header from the top of the right view.
- Production die-line params (bleed, register, knife/cut tolerance, machine allowances) are
  **excluded from the blank and covered by the per-material waste %**; detailed tooling specs
  deferred to the **MES** stage — documented as a code remark in `BagFlatBlank.tsx` (not shown
  in the UI).

### Default sizing + legacy handling
- `bagFieldValuesFromDimensions` now falls back to the field default for body dims (W/H/L) when
  stored value is missing/0/non-finite → every type loads with a logical size.
- `canonicalBagSubtype()` + `LEGACY_BAG_SUBTYPE_ALIASES` map legacy `bag_bottom_gusset_shopping`
  / `bag_side_gusset_shopping` → `bag_gusseted_shopping` at load, so the picker shows the right
  active option (no orphan "Select type…").

### Database migration (applied to the live DB)
- `packages/server/scripts/migrate-gusseted-subtype.ts` (idempotent):
  - inserted `bag_gusseted_shopping` (active); deactivated the two legacy gusset rows;
  - **migrated 75 existing estimates** + templates from legacy codes → `bag_gusseted_shopping`
    (verified: 0 legacy codes remain);
  - bumped the master-data version so clients refetch the subtype list.
- `repair-product-catalog.ts` seed list updated to the unified subtype.

### Verification
- `@es/engine` suite **127/127** (golden tests unchanged); engine rebuilt.
- All changed web files: **no diagnostics**. Pre-existing unrelated TS errors remain in
  App/CustomerAutocomplete/MasterData/EstimateEditor (not touched by this work).

### State at session close
- All changes are **uncommitted** working-tree edits (not git-committed).
- DB migration is **applied** (live).
- Pending / next: optionally remove the left "Finished bag" header for symmetry; Stage 2
  (handle/wicket as modifiers); start dev servers to view; git checkpoint.
