# Prompt for other agents — Flexible Packaging Bag Costing Validation

> Copy everything below the line and paste it to another AI agent (or a packaging
> expert) to validate the bag costing approach before we implement it.

---

You are a flexible packaging costing expert. I'm building a costing engine
("Estimation Studio") for a flexible packaging converter. I need you to validate
my bag costing formulas and answer specific questions. Please be precise and cite
industry practice where possible.

## Context

- Product types: `roll`, `sleeve`, `pouch`, `bag` (bags are now SEPARATE from pouches).
- Bags have 9 subtypes: bottom-gusset, side-gusset, courier, diaper, industrial,
  loop-handle, patch, punch-hole, wicket.
- Multi-layer film structures; each layer has a micron + density → GSM.
- `totalGsm` = sum of all layer GSM (computed by a structure table).
- Engine works internally in **kilograms (kgs)**.
- Bags are sold by **kgs** or by **thousand pieces (kpcs)**.

## Current (buggy) behaviour

The engine currently treats `bag` = `pouch` and computes material area using only
the visible face:

```
faceArea_m2 = (openWidthMm × openHeightMm) / 1e6
piecesPerKg = 1000 / (faceArea_m2 × totalGsm)
```

This ignores bottom gussets, side gussets, flaps, lips, handles, patches, and seal
allowances — understating material area by 20–40% for gusseted bags.

## What I propose

### Stage 1 — Flat sheet (blank) area per bag subtype

All dimensions in mm; convert to m by /1000. Notation:
- `W`  = finished face width = `openWidthMm`
- `H`  = finished face height = `openHeightMm`
- `BG` = bottom gusset FORMED depth (bag stands BG tall; gusset film W×2BG → adds BG to length at 2W width)
- `SG` = side gusset FORMED depth per side (internal depth = 2SG; blank unfolds to 2SG/side, 4SG total)
- `FL` = top flap / lip / hem
- `HL` = handle loop length (loop bags)
- `HW` = handle strip width (loop bags; defaults to `W` when omitted)
- `PW`,`PH` = patch width / height (patch bags)
- `LH` = wicket lip / header strip height (wicket bags)
- `SA` = seal allowance (fixed 10 mm per seal edge)

> **FORMED-DEPTH + TWO-WEB convention (verified against configurator field hints
> and expert review 2026-06-27):**
> - `bottomGussetMm` hint: *"Depth when standing"* → BG is the formed depth; the
>   gusset film (W wide) unfolds flat to **2×BG long**. With the two-web
>   construction (blankWidth = 2W, front+back side-by-side), this film spreads
>   across 2W → adds only **BG** to the blank length. (The `2BG` form belongs to
>   the fold-in-half model, blankWidth = W — the two are mutually exclusive;
>   mixing 2W width with 2BG length double-counts the gusset.)
> - `sideGussetMm` hint: *"One side; depth = 2×SG"* → each side unfolds flat to
>   **2×SG** wide; two sides = **4×SG** added to blank width.

Corrected formulas (formed-depth, two-web, flat-blank area before folding):

| Subtype | blankWidth (mm) | blankLength (mm) | flatSheetArea (mm²) |
|---|---|---|---|
| bottom-gusset | `2W` | `H + BG + SA` | `2W × (H + BG + SA)` |
| side-gusset | `2W + 4SG` | `H + 2SA` | `(2W + 4SG) × (H + 2SA)` |
| courier | `W` | `2H + FL + SA` | `W × (2H + FL + SA)` |
| diaper | `2W` | `H + BG + FL + SA` | `2W × (H + BG + FL + SA)` |
| industrial | `2W + 4SG` | `H + 2SA` | `(2W + 4SG) × (H + 2SA)` (SG=0 → flat) |
| loop-handle | `2W` | `H + BG + SA` (body) | `2W × (H + BG + SA) + 2 × HW × HL` ⚠ see N6 |
| patch | base formula | (base) | base + `(PW × PH)` |
| punch-hole | `2W + 4SG` | `H + 2SA` | `(2W + 4SG) × (H + 2SA)` (SG=0 → flat) |
| wicket (BG>0) | `2W` | `H + BG + SA + LH` | `2W × (H + BG + SA + LH)` |
| wicket (BG=0) | `2W` | `H + 2SA + LH` | `2W × (H + 2SA + LH)` |

Key principles:
- **Bottom-gusset BG is FORMED depth, TWO-WEB construction** — the gusset film
  (W wide × 2BG long) is spread across blankWidth = 2W, so it adds only **BG**
  (not 2BG) to the blank length. Adds to LENGTH only (perpendicular to width).
  The earlier `H+2BG` revision DOUBLE-COUNTED the gusset (4WBG vs correct 2WBG);
  fixed 2026-06-27.
- **Side-gusset SG is FORMED depth per side** — each side folds inward by SG
  (internal depth 2SG), so each side unfolds flat to 2SG wide. Two sides =
  4SG added to width. Old `2W+2SG` formula undercounted by 2SG.
- **Loop handle**: same material as body, weight averaged into total — body area
  plus 2 handle strips `2 × HW × HL`, all × totalGsm. BG formed → +BG (two-web).
  ⚠ The `+2·HW·HL` term assumes WELDED-ON strip handles; for DIE-CUT loop
  handles it should be dropped — see N6.
- **Wicket**: MODIFIER (holes for wicket pins), not a base shape. Catalog field
  `bottomGussetMm` hint: *"0 = flat bottom"* → supports BOTH flat (BG=0) and
  bottom-gusseted (BG>0) wicket bags. Lip `LH` adds a header strip at the top.
- **Industrial/Punch**: catalog maps G → `sideGussetMm` (SG). SG=0 → flat bag.

`flatSheetArea_m2 = flatSheetArea_mm2 / 1e6` (+ `patchArea` for patch bags)

### Stage 2 — Weight and pieces

```
weightPerPiece_g = flatSheetArea_m2 × totalGsm
piecesPerKg      = 1000 / weightPerPiece_g
```

### Stage 3 — Unit conversion

```
orderQuantityKg     = orderQuantityPieces / piecesPerKg
orderQuantityPieces = orderQuantityKg × piecesPerKg
```
Bag units limited to `['kgs', 'kpcs']`.

## Questions I need you to answer

1. **Are the flat sheet (blank) area formulas above correct for each of the 9
   subtypes?** If not, give the correct formula and explain the geometry
   (how the blank is laid out on the web before folding/sealing).

2. **Bottom gusset**: For a stand-up pouch with bottom gusset, is the gusset
   strip width = `2W` (full bag width) and does it add `BG` to blank length
   AND `2BG` to blank width? Or is it `BG` added only once?

3. **Side gusset**: Does each side gusset add `SG` to blank width (so `2SG`
   total), or is the gusset already counted inside `W`?

4. **Courier bag**: Is it a single web folded in half (blank = `W × 2H + FL`),
   or two faces sewn/welded (blank = `2W × H + FL`)? Which is industry standard?

5. **Seal allowance (SA)**: Should it be a fixed 10 mm per seal edge, a
   configurable input per estimate, or a subtype-specific constant? What's the
   typical range (5–15 mm)?

6. **Patch bag**: Is the patch a separate film piece added to the base blank
   (so `flatSheetArea = baseArea + patchArea`), or is it cut from the same
   blank (no extra area)? Should the patch be a separate material line with its
   own GSM, or assumed same as base?

7. **Loop handle**: ANSWERED — handle is the SAME material as the body; weight
   is averaged into the total bag weight by adding 2 handle strips
   (`2 × HW × HL`) to the body area, all multiplied by `totalGsm`.

8. **Punch hole / wicket holes**: Punch cut-outs are negligible (slot cut from
   body panel, no net film lost). Wicket is a MODIFIER, not a base shape —
   base is flat tube (no gusset), with a lip `LH` header strip at the top.

9. **Web orientation**: Does the web (roll) width always equal `blankWidth`,
   or does it flip to `blankLength` for narrow bags? This affects
   `linearMPerKgReel` for process cost calculation.

10. **piecesPerKg formula**: Is `1000 / (flatSheetArea_m2 × totalGsm)` correct,
    assuming totalGsm already sums all plies? Any correction for trim/waste
    (we'll add slab waste % later, ignore for now)?

11. **Units**: Is limiting bag order units to `['kgs', 'kpcs']` correct, or do
    converters also quote bags by sqm / linear meter / roll? If so, give the
    conversion formulas.

12. **Process cost (pcs_per_min basis)**: For a process with speedBasis =
    `pcs_per_min` and speedValue `V`, is the run time
    `orderQuantityPieces / V` minutes, or `orderQuantityPieces / V / 1000`
    (if orderQuantity is in kpcs)? Confirm the unit consistency.

Please answer each question numbered 1–12. If a formula is wrong, give the
correct one with a one-line rationale. If you need more info (e.g. a schematic
or specific bag image), say so. Be concise but technically precise.

---

## NON-CONFIDENT POINTS — specifically need your feedback (2026-06-27)

> The **formed-depth convention** (BG/SG unfold to 2×) is **verified** via
> configurator field hints (`bottomGussetMm` = "Depth when standing",
> `sideGussetMm` = "One side; depth = 2×SG") and confirmed by a packaging-
> engineer subagent (High confidence). The points below are **separate
> ambiguities** the configurator hints do NOT resolve. Current engine uses a
> **consistent convention**: W = one finished face, web width = `2W` (front+back
> side-by-side) for all subtypes except courier (single-web wraparound, web = W).

### N1. W (width) definition is INCONSISTENT across subtypes in our configurator

The W-field hint uses different natural language per subtype:

| Subtype | Configurator hint for W | Implied W meaning |
|---|---|---|
| bottom-gusset | *"Front panel width"* | W = one face |
| side-gusset | *"Front panel only"* | W = one face |
| courier | *"Bag width"* | ambiguous |
| diaper | *"Bag width flat"* | ambiguous (flat-laid tube = 2 faces?) |
| industrial | *"Flat tube width"* | **W = flat-laid tube = 2 faces?** |
| loop | *"Bag body width"* | ambiguous |
| patch | *"Bag width"* | ambiguous |
| punch | *"Bag width"* | ambiguous |
| wicket | *"Bag width"* | ambiguous |

**Risk**: If the converter enters W as the **flat-laid tube width** (= 2 faces)
for industrial/diaper bags, the current `2W + 4SG` formula **double-counts** the
body width. The correct formula in that case would be `W + 4SG` (not `2W + 4SG`).

**Q**: When a user enters W=400 for an **industrial bag**, is the finished face
400mm wide (→ current `2W+4SG` correct) or is the flat-laid tube 400mm wide
(→ should be `W+4SG`)?

### N2. Single-web vs two-web construction (bottom-gusset / stand-up pouch) — RESOLVED

Our production flow: *"printed on rolls → sometimes multi-ups → slit → bag
machine → handle added/punched/reinforced."*

Two physically valid constructions for a bottom-gusset stand-up pouch (SUP):

| Construction | Slit web width | Blank layout | Formula | Current? |
|---|---|---|---|---|
| **Two-web / wide-web** (front+back side-by-side) | `2W` | `2W × (H + BG + SA)` | `2WH + 2WBG` | ✅ current (corrected) |
| **Single-web fold-in-half** (front+back stacked) | `W` | `W × (2H + 2BG + 2SA)` | `2WH + 2WBG` | alternative (same film) |

- **Both constructions consume the SAME gusset film (2WBG)** — the two models are
  geometrically equivalent in total film area.
- The earlier revision's `2W × (H + 2BG + SA)` = `2WH + 4WBG` was
  **double-counting** the gusset (4WBG instead of 2WBG). Corrected 2026-06-27 to
  `2W × (H + BG + SA)` = `2WH + 2WBG`.
- The `2BG` in length belongs ONLY to the fold-in-half model (blankWidth = W).
  With blankWidth = 2W, the gusset film W×2BG spreads across 2W → adds only BG.

**Expert verdict (2026-06-27)**: SUPs are made from a 2W-wide web (or two webs)
with the bottom gusset as a strip — NOT fold-in-half. Two-web construction
confirmed; formula corrected to `2W × (H + BG + SA)`. Fold-in-half applies to
simple bags (t-shirt, singlet, flat wicket), not SUPs. **RESOLVED — no further
feedback needed on N2.**

### N3. Seal allowance (SA) placement — RESOLVED

Current formulas use **single SA** for bottom-gusset/diaper/loop/wicket (BG>0)
and **2×SA** for side-gusset/industrial/punch/wicket (BG=0).

**Expert verdict (2026-06-27)**: Single SA is correct for bottom-gusset/diaper/
loop/wicket (BG>0) — the gusset closes the bottom, no bottom seal. Two SA for
side-gusset/industrial/punch/wicket (BG=0) — both ends heat-sealed. Courier:
single SA at top (fold closes bottom). **RESOLVED — no formula change.**

### N4. Industrial bag — flat tube or side-gusseted? — RESOLVED

The configurator field for industrial has `SG` default 100mm, hint *"Each side
gusset"*. Current formula `(2W + 4SG) × (H + 2SA)` assumes side-gusseted. But the
W hint says *"Flat tube width"* — suggesting industrial may be a flat tube
(SG=0, no gusset expansion).

**Expert verdict (2026-06-27)**: Both are valid for industrial bags. The SG=0
fallback in the formula handles the flat-tube case (collapses to
`2W × (H + 2SA)`). **No formula change.** Only the W-definition hint needs UI
clarity (see N1) — the formula is correct for W = face width.

### N5. Diaper bag — "Bag width flat" hint — RESOLVED

The diaper W hint *"Bag width flat"* is ambiguous.

**Expert verdict (2026-06-27)**: "Bag width flat" most likely means the width
when lying flat on a table, which for a bottom-gusset bag = face width (the
gusset is at the bottom, not the sides, so lay-flat width = face width = W).
Current formula `2W × (H + BG + FL + SA)` is consistent with W = face width.
**No formula change.** Recommendation: update the UI hint to explicitly say
"face width" to prevent misinterpretation.

### N6. Loop handle — die-cut from body vs welded-on strip (NEW, raised 2026-06-27)

The current loop formula adds `2 × HW × HL` of handle film to the body area,
assuming the handle is a **separate strip welded to the bag top** (common for
higher-end carrier bags). For a **die-cut loop handle** (handles punched from
the same body panel — common for PE shopping bags), the handle material is
ALREADY included in the body area, and the cut-out just removes it. In that case
the `+2·HW·HL` term should be **dropped** (no addition; possibly a small
deduction for the cut-out, but that's negligible like punch holes).

Additionally, for welded-on strip handles, `HW` should be the **strip width**
(typically 15–40 mm for a ribbon-style handle), NOT the full bag width W.
Defaulting `HW = W` implies handle patches as wide as the entire face, which is
typically not the geometry.

**Q**: Is the ES "loop" subtype a die-cut loop (cut from body → drop the
`+2·HW·HL` term) or a welded-on strip (keep the term, but with HW = actual strip
width, not W)? **Current code keeps the welded-strip formula pending converter
confirmation.**

---

**Please address N1 and N6 explicitly** in addition to questions 1–12 above.
N2–N5 are now resolved (expert review 2026-06-27); N1 (W-definition hint
consistency) and N6 (loop handle construction) are the remaining open points
needing your expert verdict before locking the formulas.