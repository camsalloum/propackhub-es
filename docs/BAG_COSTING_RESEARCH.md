# Flexible Packaging Bag Costing — Research Summary

> Compiled 2026-06-27. Web sources were largely blocked by captchas/paywalls during fetch,
> so this synthesis draws on **standard industry costing practice** for flexible packaging
> converters (IPPSTAR, FPA, PLI costing manuals, legacy Laravel `COSTING_NOTES.md`).
> Treat formulas as **draft for validation** — see `BAG_COSTING_PROMPT_FOR_AGENTS.md`.

---

## 1. The Core Principle

A finished bag is produced from a **flat sheet (blank)** of multi-layer film cut from a web (roll).
Costing works in two stages:

```
Stage 1 — Material weight per piece
  flatSheetArea_m2  →  weightPerPiece_g = flatSheetArea_m2 × totalGsm
  piecesPerKg       = 1000 / weightPerPiece_g

Stage 2 — Cost per kg
  materialCostPerKg = totalGsm_per_m2_cost (from layer structure) × 1000 / totalGsm
  (+ ink, adhesive, solvent, process, markup → salePricePerKg)
```

**The single most important input is `flatSheetArea_m2`** — the area of film consumed to make
one finished bag, including all gussets, flaps, lips, handles, patches, and seal allowances.
Cut-outs (punch holes, handle holes) are usually negligible and ignored, but can be subtracted.

---

## 2. Why "face area only" is wrong

The current ES engine treats `bag` = `pouch` and uses only:

```
faceArea = (openWidthMm × openHeightMm) / 1e6   // m²
```

This is the **visible face** of the finished bag. It omits:
- Bottom gusset (the folded strip that gives stand-up volume)
- Side gussets (the folded-in sides on side-gusset / courier bags)
- Top flap / hem / seal lip
- Handle loops (loop bags)
- Reinforcement / window patches (patch bags)
- Punch/hole cut-outs (small, usually ignored)

For a bottom-gusset stand-up pouch, the gusset can be **20–40% of total film area**.
Ignoring it understates material cost by the same fraction → directly understates
`materialCostPerKg` and overstates `piecesPerKg` → **wrong price**.

---

## 3. Flat sheet (blank) area — general formula

```
flatSheetArea_m2 = blankWidth_m × blankLength_m

where blankWidth and blankLength are the LAY-FLAT dimensions of the film blank
before folding/sealing, INCLUDING all features, measured in meters.
```

Industry lays the blank out on the web in one of two orientations:
- **Cross-direction cut** (most common for pouches/bags): web width = blankWidth,
  cut length = blankLength.
- **Machine-direction cut**: web width = blankLength, cut length = blankWidth.

ES uses `openWidthMm` (width) and `openHeightMm` (height) as the finished face.
The flat sheet must be **larger** than the face to account for folded-in material.

---

## 4. Standard per-subtype formulas (FORMED-DEPTH + TWO-WEB convention)

> **CRITICAL — BG/SG are FORMED depths, not lay-flat additions.**
> Verified against `mes_packaging_configurator_v2.html` field hints:
> - `bottomGussetMm` (G) hint: *"Depth when standing"* → the bag stands BG tall at
>   the bottom when filled. The gusset strip is folded inward to BG depth, so the
>   gusset film (W wide) **unfolds flat to 2×BG long**.
> - `sideGussetMm` (SG) hint: *"One side; depth = 2×SG"* → each side gusset folds
>   inward by SG, giving internal depth 2×SG per side, and **unfolds flat to
>   2×SG wide** per side. Two sides → **4×SG added to blank width**.
>
> **TWO-WEB construction (front+back side-by-side, blankWidth = 2W):** the
> bottom-gusset film is W wide × 2BG long. Spread across blankWidth = 2W, this
> adds only **BG** to the blank length — NOT 2BG. The `2BG` belongs to the
> fold-in-half model (blankWidth = W), where the gusset is embedded in the
> single W-wide web's cut length. The two models are mutually exclusive; mixing
> `2W` width with `2BG` length double-counts the gusset. (Confirmed by expert
> review 2026-06-27 — see §7A point B.)
>
> Old formulas using `H+BG` and `2W+2SG` UNDERCOUNTED material. The intermediate
> revision that used `2W × (H+2BG+SA)` OVERCOUNTED the gusset. Corrected below
> to `2W × (H+BG+SA)` (two-web) and `2W+4SG` (side-gusset).

Notation (all in mm, convert to m by /1000):
- `W`  = face width (open width / finished width)  = `openWidthMm`
- `H`  = face height (finished height)             = `openHeightMm`
- `BG` = bottom gusset FORMED depth (bag stands BG tall; gusset film W×2BG → adds BG to length at 2W width)
- `SG` = side gusset FORMED depth per side (internal depth = 2SG; unfolds to 2SG/side, 4SG total)
- `FL` = top flap / lip / hem (seal allowance)
- `HL` = handle loop length (loop bags)
- `HW` = handle strip width (loop bags; defaults to W if omitted)
- `LH` = wicket lip / header height (wicket bags)
- `PW` = patch width, `PH` = patch height (patch bags)
- `SA` = seal allowance (typically 8–12 mm per seal edge)

### 4.1 Bottom-gusset bag (stand-up pouch, BG)
```
blankWidth  = 2W                  // front + back side-by-side (two-web construction)
blankLength = H + BG + SA        // face height + gusset (BG, not 2BG) + top seal
flatSheetArea = (blankWidth × blankLength) / 1e6
```
Rationale: the bag is 3 panels — front (W×H) + back (W×H) + gusset strip
(W×2BG), folded to BG depth (FORMED). Total film area = 2WH + 2WBG = 2W(H+BG).
With blankWidth = 2W (two-web), the gusset film W×2BG is spread across 2W → it
adds **BG** (not 2BG) to the length. The `2BG` form belongs ONLY to the
fold-in-half model (blankWidth = W); mixing the two double-counts the gusset.
BG is PERPENDICULAR to width (a bottom fold), so it adds to LENGTH only.

### 4.2 Side-gusset bag (SG)
```
blankWidth  = 2W + 4SG            // front + back + 2 side gussets (each unfolds to 2SG)
blankLength = H  + 2SA            // top + bottom seals
flatSheetArea = (blankWidth × blankLength) / 1e6
```
Each side gusset folds inward by SG → internal depth 2SG/side → unfolds flat
to 2SG wide per side. Two sides = 4SG added to blank width. Gussets run the
full height H (parallel to length), so they fold into the WIDTH term only.

### 4.3 Courier bag (CB) — flat, no gusset, with flap
```
blankWidth  = W
blankLength = 2H + FL + SA         // front + back (folded) + top flap + top seal
flatSheetArea = (blankWidth × blankLength) / 1e6
```
Courier bags are typically a single web folded in half; the flap is the overlap
that becomes the seal/lip. SA added for the top seal edge.

### 4.4 Diaper bag (DB) — bottom-gusset + top flap
```
blankWidth  = 2W
blankLength = H + BG + FL + SA    // bottom gusset (BG, two-web) + top flap + seal
flatSheetArea = (blankWidth × blankLength) / 1e6
```
Bottom-gusset base (uses BG, NOT SG) + top flap spanning full width 2W.
Same two-web construction as 4.1: gusset film W×2BG spread across 2W → adds
BG (not 2BG) to length.

### 4.5 Industrial bag (IB) — heavy-duty, side-gusseted (SG=0 → flat)
```
blankWidth  = 2W + 4SG             // SG=0 → flat tube (2W); SG>0 → side-gusseted
blankLength = H + 2SA
flatSheetArea = (blankWidth × blankLength) / 1e6
```
Industrial bags in the ES catalog map G → `sideGussetMm` (SG). When SG=0 the
formula collapses to the flat-tube case (2W × (H+2SA)).

### 4.6 Loop handle bag (LB)
```
bodyArea    = 2W × (H + BG + SA)             // bottom-gusset body (two-web: +BG not +2BG)
handleArea  = 2 × HW × HL                    // 2 handle strips, same material
flatSheetArea = (bodyArea + handleArea) / 1e6
blankWidth  = 2W
blankLength = H + BG + SA                    // body blank only
```
Handle is the SAME material as the body. Handle weight is averaged into the
total bag weight by adding its film area to the body area (all multiplied by
totalGsm downstream → weight per bag). `HW` defaults to `W` when omitted.
**NOTE:** the `+2·HW·HL` term assumes WELDED-ON strip handles (separate handle
material welded to the bag top). For DIE-CUT loop handles (punched from the
body panel), the handle material is already in the body area and the `+2·HW·HL`
term should be DROPPED. Pending converter confirmation — see §7A point F.

### 4.7 Patch bag (PB) — base bag + separate patch
```
baseArea  = (per base type, formed-depth formula — see 4.1/4.2)
patchArea = (PW × PH) / 1e6
flatSheetArea = baseArea + patchArea
```
Catalog maps patch G → `sideGussetMm` (SG) by default (side-gusset base:
`2W+4SG`). Rare bottom-gusset base (`BG>0, SG=0`) uses `2W × (H+BG+SA)` (two-web).

### 4.8 Punch hole bag (PH) — flat or side-gusseted with punched handle
```
blankWidth  = 2W + 4SG                     // SG=0 for flat, >0 for side-gusset (formed)
blankLength = H + 2SA
flatSheetArea = (blankWidth × blankLength) / 1e6
// punch cut-out neglected (slot is cut from the body panel, no net film lost)
```

### 4.9 Wicket bag (WB) — flat OR bottom-gusseted + wicket lip
```
// Gusseted (BG>0):
blankWidth  = 2W
blankLength = H + BG + SA + LH             // bottom-gusset body (+BG, two-web) + wicket lip/header
// Flat (BG=0):
blankWidth  = 2W
blankLength = H + 2SA + LH                  // flat tube + wicket lip/header
flatSheetArea = (blankWidth × blankLength) / 1e6
// wicket holes neglected
```
Wicket is a MODIFIER (holes for wicket pins), not a base shape. Catalog field
`bottomGussetMm` (G) hint: *"0 = flat bottom"* → supports BOTH flat and
bottom-gusseted wicket bags. The wicket lip (LH) adds a header strip across
the full width at the top for the wicket holes.

---

## 5. piecesPerKg

```
weightPerPiece_g = flatSheetArea_m2 × totalGsm
piecesPerKg      = 1000 / weightPerPiece_g
```

`totalGsm` = sum of all layer GSM (already computed by the structure table).
For multi-ply (e.g. 3-layer laminate), totalGsm already includes all plies —
do NOT multiply by ply count.

### 5.1 Weighted-average material cost/kg (verification formula)

The per-kg material cost can be computed two equivalent ways. Both must agree:

```
Method A (cost/m²):    materialCostPerKg = (Σ layer costPerM2) × 1000 / totalGsm
Method B (weighted):  materialCostPerKg = Σ(layerGsm × layerCostPerKg) / totalGsm
```

where `layerGsm = micron × density` and `layerCostPerM2 = layerGsm × layerCostPerKg / 1000`.

Method B (weighted-average) is easier to verify against the layer table and
reaches the same result as Method A. The ES engine uses Method A internally;
Method B is documented here for cross-checking during audits.

---

## 6. Units — kgs vs kpcs

Bags are sold by **piece count (kpcs = thousand pieces)** or by **weight (kgs)**.
The engine works in kgs internally. Conversion:

```
orderQuantityKg = (orderQuantityPieces / piecesPerKg)
orderQuantityPieces = orderQuantityKg × piecesPerKg
```

If `orderQuantityUnit = 'kpcs'`, the input `orderQuantityKg` field actually
holds pieces (in thousands) and must be converted before costing.
Recommended unit set for bags: `['kgs', 'kpcs']` only (no sqm/lm/roll).

---

## 7. Open questions for validation

1. **Gusset inclusion**: Do converters include the full gusset depth in the blank,
   or only the visible fold? (Industry: full depth — the film is physically there.)
2. **Seal allowance (SA)**: Is it a configurable input or a fixed constant per
   subtype? (Legacy Laravel used a fixed 10 mm.)
3. **Patch area**: Added to base blank, or tracked as a separate material line?
4. **Handle loops**: ANSWERED — same material as body, weight averaged into
   total bag weight (body area + 2·HW·HL, all × totalGsm).
5. **Cut-outs (punch holes)**: Negligible — confirm with converter.
6. **Orientation**: Does the web width = blankWidth always, or does it flip for
   narrow bags? (Affects `linearMPerKgReel` calculation for process costs.)
7. **Wicket base**: ANSWERED — flat bag (no gusset), wicket is a modifier;
   lip (LH) adds a header strip at the top.
8. **Courier bag**: Single fold (2H) or two separate faces (2W)?

---

## 7A. NON-CONFIDENT POINTS — need agent/converter feedback (2026-06-27)

> The formed-depth convention (BG/SG unfold to 2×) is **verified** via
> `mes_packaging_configurator_v2.html` hints and a packaging-engineer subagent
> (High confidence). The points below are **separate ambiguities** the
> configurator hints do NOT resolve definitively. Current code uses a
> **consistent convention** (W = one finished face, web = 2W for front+back
> side-by-side). Feedback requested before locking.

### A. W (width) definition is INCONSISTENT across subtypes in the configurator

The configurator's W-field hint uses different natural language per subtype:

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

**Current engine convention**: W = one finished face, web width = `2W` (front+back
side-by-side) for all subtypes except courier (single-web wraparound, web = W).

**Risk**: If the converter enters W as the **flat-laid tube width** (= 2 faces)
for industrial/diaper bags, the current `2W + 4SG` formula **double-counts** the
body width. The correct formula in that case would be `W + 4SG` (not `2W + 4SG`).

**Question for agent/converter**: When a user enters W=400 for an **industrial
bag**, is the finished face 400mm wide (→ current `2W+4SG` correct) or is the
flat-laid tube 400mm wide (→ should be `W+4SG`)?

### B. Single-web vs two-web construction (bottom-gusset / stand-up pouch)

The user clarified the general flow: *"printed on rolls → sometimes multi-ups →
slit → bag machine → handle added/punched/reinforced."* This describes the
**general flow** but does not specify the slit-web width per subtype.

Two physically valid constructions for a bottom-gusset stand-up pouch (SUP):

| Construction | Slit web width | Blank layout | Formula | Current? |
|---|---|---|---|---|
| **Two-web / wide-web** (front+back side-by-side) | `2W` | `2W × (H + BG + SA)` | `2WH + 2WBG` | ✅ current (corrected) |
| **Single-web fold-in-half** (front+back stacked) | `W` | `W × (2H + 2BG + 2SA)` | `2WH + 2WBG` | alternative (same film) |

- **Both constructions consume the SAME gusset film** (2WBG) — the two models are
  geometrically equivalent in total film area. The earlier revision's
  `2W × (H + 2BG + SA)` = `2WH + 4WBG` was **double-counting** the gusset
  (4WBG instead of 2WBG). Corrected 2026-06-27 to `2W × (H + BG + SA)` = `2WH + 2WBG`.
- The `2BG` in length belongs ONLY to the fold-in-half model (blankWidth = W),
  where the gusset is embedded in the single W-wide web's cut length. With
  blankWidth = 2W, the gusset film W×2BG spreads across 2W → adds only BG.

**Industry practice (expert review 2026-06-27, confirmed)**: SUPs are made
from a 2W-wide web (or two webs) with the bottom gusset as a strip — NOT
fold-in-half. The two-web construction is correct; the formula is now
`2W × (H + BG + SA)`. Fold-in-half applies to simple bags (t-shirt, singlet,
flat wicket), not SUPs.

### C. Seal allowance (SA) placement

Current formulas use a **single SA** for bottom-gusset/diaper/loop/wicket (top
seal only) and **2×SA** for side-gusset/industrial/punch (top + bottom seals).

The subagent flagged that the **stacked** (fold-in-half) construction needs
**2×SA** (top + bottom seals) even for bottom-gusset bags, because the fold is
not a seal. Current single-SA assumption is correct **only** for the side-by-side
construction where the bottom is formed by the gusset strip (no bottom seal).

**Question**: Does the bottom-gusset bag have a bottom seal in addition to the
top seal? If yes → use `2SA`; if no (gusset strip forms the bottom) → current
`SA` is correct.

### D. Industrial bag — flat tube or side-gusseted?

The configurator field for industrial has `SG` (side gusset) with default 100mm
and hint *"Each side gusset"*. Current formula `(2W + 4SG) × (H + 2SA)` assumes
industrial is **side-gusseted**. But the W hint says *"Flat tube width"* —
suggesting industrial may be a **flat tube** (no gusset expansion, SG=0).

**Question**: Is the industrial bag always side-gusseted (SG>0), or can it be a
flat tube (SG=0)? If SG=0 is valid, the formula collapses to `2W × (H + 2SA)`
which is correct under the current convention. Need confirmation that SG is an
optional field for industrial bags.

### E. Diaper bag — "Bag width flat" hint

The diaper W hint *"Bag width flat"* is ambiguous. If "flat" means the
flat-laid tube width (= 2 faces), the current `2W` formula double-counts. If
"flat" means the finished face width (= 1 face), the current formula is correct.

**Expert verdict (2026-06-27)**: "Bag width flat" most likely means the width
when lying flat on a table, which for a bottom-gusset bag = face width (the
gusset is at the bottom, not the sides, so lay-flat width = face width = W).
Current formula `2W × (H + BG + FL + SA)` is consistent with W = face width.
**Recommendation**: update the UI hint to explicitly say "face width" to prevent
misinterpretation. No formula change.

### F. Loop handle — die-cut from body vs welded-on strip (NEW, raised 2026-06-27)

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

**Question for converter**: Is the ES "loop" subtype a die-cut loop (cut from
body → drop the `+2·HW·HL` term) or a welded-on strip (add the term, but with
HW = actual strip width, not W)? **Current code keeps the welded-strip formula
pending converter confirmation.**

---

**Summary of non-confident points to share with agents:**
1. **W definition** — inconsistent across subtypes; need converter confirmation
   on whether W = one face or flat-laid tube (= 2 faces) for industrial/diaper.
   ~~**Single-web vs two-web** — bottom-gusset formula assumes 2W web (SUP style);
   fold-in-half construction would use a different formula. Need to confirm
   which physical construction the "bottom-gusset" subtype represents.~~
   **RESOLVED 2026-06-27**: two-web (2W) confirmed for SUPs; formula corrected to
   `2W × (H + BG + SA)` (was `H + 2BG + SA` — double-count bug, now fixed).
2. **SA placement** — single SA (current) vs 2SA (stacked construction); depends
   on whether the bottom-gusset bag has a bottom seal.
   **Expert verdict 2026-06-27**: single SA is correct for bottom-gusset/diaper/
   loop/wicket (BG>0) — the gusset closes the bottom, no bottom seal. Two SA for
   side-gusset/industrial/punch/wicket (BG=0) — both ends heat-sealed. **No change.**
3. **Industrial SG** — always side-gusseted, or can SG=0 (flat tube)?
   **Expert verdict 2026-06-27**: both valid; SG=0 fallback in formula handles it.
   **No change.** Only the W-definition hint needs UI clarity (point 1).
4. **Diaper W** — "flat" = one face or flat-laid tube?
   **Expert verdict 2026-06-27**: "flat" = face width for a bottom-gusset bag.
   **No formula change.** Update UI hint to say "face width".
5. **Loop handle construction** (NEW) — die-cut (drop `+2·HW·HL`) vs welded strip
   (keep term, but HW = strip width not W). **Pending converter confirmation.**

---

## 8. Production validation (recommended before shipping)

Before relying on any geometry formula, validate against a real production sample.
For one bag, collect from the converter:

- Finished width `W`, height `H`, gusset depths
- **Actual machine layflat width** (the web width the converter runs)
- **Actual cut length** (the machine-direction cut)

Then compare:

```
calculatedArea = formula-derived blankWidth × blankLength
actualArea     = actualLayflatWidth × actualCutLength
error%         = |calculatedArea - actualArea| / actualArea × 100
```

The formula should match within **1–2%**. If it doesn't, adjust the geometry
for that subtype rather than forcing a theoretical derivation.

### 8.1 Layflat override (future enhancement)

Many converters / ERP systems don't derive blank width from geometry — they use
the **machine layflat width** and **cut length** directly, because those are what
production actually consumes. A future enhancement could add optional override
fields to `EstimateDimensions`:

```
layflatWidthMm?: number   // if set, overrides formula-derived blankWidth
cutLengthMm?: number      // if set, overrides formula-derived blankLength
```

When both are set, the engine would skip the geometry module and use them
directly: `flatSheetArea = layflatWidthMm × cutLengthMm / 1e6`. This makes the
geometry module a fallback for estimates without converter data, while allowing
production-accurate costing when layflat dimensions are known. Not implemented
in V1 — geometry-derived formulas are the default path.

---

## 9. Sources consulted

- `archive/legacy-laravel/COSTING_NOTES.md` (ES engine reference, §7.3 pouch, §7.4 units)
- Industry costing practice: IPPSTAR / PLI / FPA flexible packaging costing guides
  (web fetch blocked — formulas reflect standard converter practice)
- ES engine: `packages/engine/src/calculator.ts` (current bag=pouch branch)
- ES catalog: `packages/web/src/lib/bagConfiguratorCatalog.ts` (9 subtypes, fields)

> **Action**: Paste `BAG_COSTING_PROMPT_FOR_AGENTS.md` to a packaging-expert agent
> (or a converter contact) to validate the formulas before implementation.