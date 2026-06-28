# Pouch Classification & Material-Cost Calculation

> Compiled 2026-06-27. Companion to `BAG_COSTING_RESEARCH.md` (which covers
> carrier/shopping **bags**). This document covers **pouches** — the six
> laminate-film subtypes in `pouch_configurator_v2.html`:
> 3-side seal, center seal (pillow), 4-side seal, stand-up (doypack),
> side-gusset, and flat-bottom (box).
>
> Conventions are kept identical to the engine's bag model
> (`packages/engine/src/bag-flat-sheet.ts`) so the two share one costing spine:
> formed-depth gussets, **two-web** lay-flat construction, a default **10 mm**
> seal allowance, and `piecesPerKg = 1000 / (flatSheetArea_m2 × totalGsm)`.

---

## 0. TL;DR for the implementer

1. A pouch's material cost is driven by **one number: `flatSheetArea_m2`** — the
   area of laminate film consumed to make one pouch, including the back panel,
   all gussets, and seal allowances. Everything else (weight, pieces/kg, cost)
   follows from it.
2. **The current engine `pouch` branch is wrong for costing.** It uses
   `openWidthMm × openHeightMm` (one face only). A pouch always has at least a
   front **and** a back, so the true blank is ~2× that for a flat pouch and more
   once gussets are added. See §6.
3. The six subtypes and their flat-sheet formulas are in §4. They are the pouch
   analogue of `calculateBagFlatSheetAreaM2()` and should live in a new
   `pouch-flat-sheet.ts` module with the same return contract.

---

## 1. The core principle (same as bags)

A finished pouch is formed from a **flat blank** of multi-layer laminate film cut
from a printed web (roll). Costing is two stages:

```
Stage 1 — Material weight per piece
  flatSheetArea_m2  →  weightPerPiece_g = flatSheetArea_m2 × totalGsm
  piecesPerKg       = 1000 / weightPerPiece_g

Stage 2 — Cost per piece
  materialCostPerKg     = (Σ layer costPerM2) × 1000 / totalGsm   // engine Method A
  materialCostPerPiece  = (weightPerPiece_g / 1000) × materialCostPerKg
                        = flatSheetArea_m2 × (Σ layer costPerM2)
  (+ ink, adhesive, solvent, process, markup → salePricePerKg, handled by engine)
```

`totalGsm` is the sum of all layer GSM (already produced by the structure table);
it already includes every ply of a laminate — do **not** multiply by ply count.

---

## 2. Why "face area only" is wrong for a pouch

The engine's pouch branch (`calculator.ts`) computes:

```
faceArea_m2 = (openWidthMm × openHeightMm) / 1e6
piecesPerKg = 1000 / (openWidthMm × openHeightMm × totalGsm × 1e-6)
```

`openWidthMm × openHeightMm` is the **visible front face** of the finished pouch.
Every pouch is a closed envelope, so the film actually consumed includes:

- The **back panel** (≈ a second W×H face) — by itself this doubles the area.
- **Gussets** — bottom gusset (stand-up) or side gussets (side-gusset, box),
  20–40 % of the blank on a typical stand-up pouch.
- **Bottom panel** on a flat-bottom/box pouch.
- **Seal allowances** — the welded lips at every heat-sealed edge (≈10 mm/edge).

Ignoring these understates `flatSheetArea` → understates `weightPerPiece` →
**overstates `piecesPerKg`** → **understates cost/piece**. For a stand-up pouch
the error is commonly **50–60 %** (one face vs. front+back+gusset+seals).

---

## 3. Notation & the two-web convention

All dimensions in **mm**; convert to metres with `/1000`, areas to m² with `/1e6`.

| Symbol | Meaning | Engine field |
|---|---|---|
| `W`  | Finished **face** width (one panel, lay-flat) — **seal-inclusive**: equal to the slit/layflat web width, so the side seals already lie *inside* `W` | `openWidthMm` |
| `H`  | Finished face **usable** height (the fillable cavity), seal-exclusive — the sealed top lip is added separately via `SA` | `openHeightMm` |
| `BG` | **Bottom** gusset FORMED depth (stand height of the base) | `bottomGussetMm` |
| `SG` | **Side** gusset FORMED depth, per side | `sideGussetMm` |
| `D`  | Box-pouch bottom-panel depth | `bottomDepthMm` *(new)* |
| `OV` | Center-seal back/fin overlap | `centerSealOverlapMm` *(new)* |
| `SA` | Seal allowance per heat-sealed edge (default **10 mm**) | `sealAllowanceMm` |

**Two-web (side-by-side) construction.** Consistent with `bag-flat-sheet.ts`,
the front and back panels are laid up **side by side**, so the blank width is
`2W`. A gusset is a folded strip embedded in that blank:

- A **bottom** gusset is film `W` wide that unfolds flat to `2·BG` long. Spread
  across a `2W`-wide blank it adds only **`BG`** to the blank *length* (not
  `2BG` — that figure belongs to the alternative fold-in-half model where the
  blank width is `W`; mixing the two double-counts the gusset).
- A **side** gusset folds inward by `SG`, so it unfolds to `2·SG` wide **per
  side**; two sides add **`4·SG`** to the blank *width*.

**Formed depth, not lay-flat addition.** `BG`/`SG` are the *formed* depths (what
you measure on the filled pouch), already converted to film via the ×2 unfold
rules above. This matches the configurator field hints and the bag engine.

**Seal-allowance rule (machine-direction vs cross-direction).** `SA` is *not*
governed by "fold vs heat-seal" — it is governed by which web axis the sealed
edge lies on, because that determines whether extra film is physically fed to
form the seal:
- **Cross-direction edges = the width (`W`) axis** — e.g. the left/right side
  seals of a 3-side-seal, stand-up, or side-gusset pouch. These are fixed by the
  **slit web width**; the seal forms *within* the `W` you already specified, so
  **no `SA` is added to the width**. (This is why `W` is defined above as the
  seal-inclusive layflat width.)
- **Machine-direction edges = the length (`H`) axis** — e.g. the top seal (after
  fill). Each crimp/cut cycle feeds **extra length** to form the seal land, so
  **add one `SA` per machine-direction seal**. (The box-pouch bottom is also a
  machine-direction seal, but its allowance is treated as **absorbed into the
  empirical bottom-depth `D`**, not a clean additive `SA` — see §4.6/§8 — because
  that junction's geometry is converter-specific and unvalidated.)
- **Folds** (3-side-seal bottom, stand-up bottom-gusset apex) consume no extra
  film and get no `SA`, on either axis.

> **Why 4-side seal (§4.3) is the exception.** Its front and back are two
> *separate die-cut plies*, not a continuous slit web — so both pairs of edges
> are cut+seal edges and `SA` is added on **both** axes. The other subtypes ride
> a continuous web whose slit width sets `W`, so only their machine-direction
> seals take `SA`. At root this is a **convention** about whether each input is
> entered seal-inclusive (width, here) or seal-exclusive (length, here); state it
> on the input form so converters enter dimensions the way the formulas expect.

---

## 4. Per-subtype flat-sheet formulas

Each returns the pouch analogue of `BagFlatSheetResult`:
`{ areaM2, blankWidthMm, blankLengthMm }`, where
`areaM2 = blankWidthMm × blankLengthMm / 1e6` (plus any separate panel term).

### 4.1 Three-Side Seal (3SS)
Single web folded in half; bottom is the fold, the two sides and the top are
sealed (top sealed after fill).
```
blankWidth  = W                       // one face wide (side seals lie within W)
blankLength = 2H + SA                  // front + back via the fold, + top seal
flatSheetArea = (blankWidth × blankLength) / 1e6
```
Film ≈ `W × 2H` (front + back) + top-seal allowance. No `SA` on the bottom
(it is a fold). Construction: 1 web, 1 fold, 3 seals (2 side + 1 top).

### 4.2 Center Seal / Pillow / Fin Seal (VFFS)
Single web wrapped into a tube; the two web edges meet at the back and are joined
with a **fin/lap seal** (overlap `OV`); top and bottom are crimp **end seals**.
```
blankWidth  = 2W + OV                  // tube circumference (front+back) + back-seal overlap
blankLength = H + 2·SA                 // top + bottom end seals
flatSheetArea = (blankWidth × blankLength) / 1e6
```
> **This corrects the configurator bug.** `pouch_configurator_v2.html` uses
> `W + overlap`, which omits a full face width and undercounts pillow-pouch film
> by ≈45–50 %. The lay-flat face width is `W`, so the tube circumference is `2W`.

### 4.3 Four-Side Seal (4SS)
Two separate webs (front + back plies) sealed on all four edges.
```
blankWidth  = W  + 2·SA                // each ply: face width + 2 side seals
blankLength = H  + 2·SA                // each ply: face height + top + bottom seals
flatSheetArea = 2 × (blankWidth × blankLength) / 1e6   // 2 plies
```
Two plies, four seals. (If finished `W`/`H` are already measured to the outer
seal edge, the `2·SA` terms can be dropped; keep them when `W`/`H` are the
internal/usable dimensions. Pick one convention and state it on the input form.)

### 4.4 Stand-Up Pouch (Doypack) — bottom gusset
Front + back + a W-shaped **bottom gusset** (formed depth `BG`); top sealed after
fill, the two sides sealed full height.
```
blankWidth  = 2W                       // front + back side-by-side (two-web)
blankLength = H + BG + SA              // face height + gusset (BG, not 2BG) + top seal
flatSheetArea = (blankWidth × blankLength) / 1e6
```
= `2W·H` (front+back) + `2W·BG` (gusset, since `W×2BG` spread across `2W`) +
top-seal. No bottom seal — the gusset apex is a fold. **Identical to the engine's
`bottom-gusset` bag formula.** This is the configurator's `2W·(H+G)` plus the
missing seal allowance.

### 4.5 Side-Gusset Pouch
Front + back + two **side gussets** (formed depth `SG`), running the full height;
top and bottom sealed.
```
blankWidth  = 2W + 4·SG                // front + back + 2 side gussets (each unfolds to 2SG)
blankLength = H  + 2·SA                // top + bottom seals
flatSheetArea = (blankWidth × blankLength) / 1e6
```
Identical to the engine's `side-gusset` / `industrial` bag formula.

### 4.6 Flat-Bottom / Box Pouch (5-panel)
Front + back + two side gussets + a folded **rectangular bottom** (depth `D`).
Modeled as a side-gusset body plus a separately-added bottom panel:
```
blankWidth  = 2W + 4·SG                // side-gusset body
blankLength = H  + SA                  // body height + top seal
bodyArea    = blankWidth × blankLength
bottomPanel = W × D                    // folded flat base (≈ W wide × D deep)
flatSheetArea = (bodyArea + bottomPanel) / 1e6
```
The bottom panel is added as `W × D` (a discrete rectangle) rather than across
the full `2W+4SG` width, because the base only spans the face width. Typically
`D ≈ 2·SG`. **This subtype most needs production-sample validation** (§7) — box-
bottom film overlap varies by converter and former geometry.

---

## 5. Worked example (stand-up pouch)

Inputs: `W=110`, `H=190`, `BG=50` mm; `SA=10` mm. Structure `totalGsm = 120`
g/m²; layer cost sums to `Σ costPerM2 = 0.18 USD/m²`.

```
blankWidth   = 2 × 110                 = 220 mm
blankLength  = 190 + 50 + 10           = 250 mm
flatSheetArea= 220 × 250 / 1e6         = 0.055 m²
weightPerPiece = 0.055 × 120           = 6.60 g
piecesPerKg  = 1000 / 6.60             = 151.5 pcs/kg
materialCostPerKg    = 0.18 × 1000 / 120        = 1.50 USD/kg
materialCostPerPiece = 0.055 × 0.18             = 0.0099 USD/pc  (≈ 9.9 USD/kpc)
```

Compare the **legacy face-area model** for the same pouch:
```
faceArea     = 110 × 190 / 1e6         = 0.0209 m²
weightPerPiece = 0.0209 × 120          = 2.51 g
piecesPerKg  = 398 pcs/kg              ← 2.6× too many → cost/piece 2.6× too low
```
A 0.0099 USD/pc pouch would be quoted at ≈0.0038 USD/pc — a **62 % undercharge**.

---

## 6. Engine integration notes

The bag path already does this correctly; the pouch path does not. Recommended
changes (to be specced before coding):

1. **Add a `pouch-flat-sheet.ts`** mirroring `bag-flat-sheet.ts`:
   `calculatePouchFlatSheetAreaM2(dimensions): { areaM2, blankWidthMm, blankLengthMm, type }`
   implementing §4. Resolve the subtype from a `pouchSubtype` field (with a
   `productSubtype` fallback), exactly like `resolveBagConfiguratorType()`.
2. **Rewrite the `case 'pouch'` branch** in `calculator.ts` to call it:
   ```
   const p = calculatePouchFlatSheetAreaM2(dimensions);
   if (p.areaM2 > 0) {
     result.piecesPerKg   = 1000 / (p.areaM2 * totalGsm);
     result.gramsPerPiece = 1000 / result.piecesPerKg;
     if (p.blankWidthMm > 0) result.linearMPerKgReel = (sqmPerKg / p.blankWidthMm) * 1000;
   } else if (openWidthMm && openHeightMm) {
     /* legacy face-area fallback (unchanged) */
   }
   ```
3. **Extend `EstimateDimensions`** with the new pouch fields:
   `pouchSubtype`, `centerSealOverlapMm`, `bottomDepthMm` (BG/SG/SA already exist).
4. **Keep the legacy face-area branch as a fallback** for estimates created
   before a subtype is assigned, so old quotes don't break.
5. **Golden fixtures**: add one fixture per subtype to `golden-fixtures.ts` and a
   `pouch-flat-sheet.test.ts` asserting blank dimensions and `piecesPerKg`.

---

## 7. Accessories — cost contributions (currently missing)

The configurator draws accessories but assigns them **no cost or weight**. For a
real quote each is a BOM line on top of the film:

| Accessory | Cost basis | Adds film/seal? | Notes |
|---|---|---|---|
| Zipper / slider | per **linear metre** (≈ pouch width) | small extra seal area | priced per metre of zip profile + slider unit |
| Spout + cap | per **unit** | local seal patch | fitment/welding labour often bundled |
| Degassing valve | per **unit** | small applied patch | one-way coffee valve |
| Tear notch | negligible (die hit) | none | tooling/die amortised |
| Euro slot / hang hole | negligible (punch) | none | cut-out film loss ignored |
| Window / patch | per **m²** of patch film | added patch area | add `PW×PH` like the bag `patch` subtype |

Recommended: model accessories as a separate `componentCost` line (per-unit and
per-metre rates) plus, where applicable, an added film-area term (window/patch)
that flows through `flatSheetArea` exactly like the bag `patchAreaM2`.

---

## 8. Production validation (before locking formulas)

For one real pouch per subtype, obtain from the converter:
- Finished `W`, `H`, and gusset depths.
- **Actual machine layflat width** (the slit web width run).
- **Actual cut length** (machine-direction cut).

Then check:
```
calculatedArea = blankWidth × blankLength   (from §4)
actualArea     = actualLayflatWidth × actualCutLength
error%         = |calculatedArea − actualArea| / actualArea × 100
```
Target agreement within **1–2 %**. If a subtype misses (most likely the box
pouch §4.6 or the center-seal overlap §4.2), adjust that subtype's geometry to
the sample rather than forcing the theoretical derivation. A future
`layflatWidthMm` / `cutLengthMm` override (as proposed for bags) would let
converters bypass geometry entirely when they know the real blank.

---

## 9. Summary table

| Subtype | blankWidth | blankLength | Extra | Construction |
|---|---|---|---|---|
| 3-Side Seal | `W` | `2H + SA` | — | 1 web, fold bottom, 3 seals |
| Center Seal | `2W + OV` | `H + 2SA` | — | 1 web tube, fin + 2 end seals |
| 4-Side Seal | `W + 2SA` | `H + 2SA` | ×2 plies | 2 webs, 4 seals |
| Stand-Up | `2W` | `H + BG + SA` | — | front+back+bottom gusset |
| Side-Gusset | `2W + 4SG` | `H + 2SA` | — | front+back+2 side gussets |
| Flat-Bottom | `2W + 4SG` | `H + SA` | `+ W·D` | 5-panel box |

**Definitions are consistent with `packages/engine/src/bag-flat-sheet.ts`:**
`W`/`H` = one finished face (`W` seal-inclusive/slit-width, `H` usable height);
gussets are formed depths; `SA` is added on **machine-direction** seals only
(the top seal; the box bottom's allowance is absorbed into `D` — see §4.6/§8),
not on slit-width side seals or folds — except 4-side seal, whose separate plies
take `SA` on both axes; default `SA = 10 mm`.

---

## 10. Sources & cross-references

- `pouch_configurator_v2.html` — the six pouch subtypes, dimension fields,
  accessory matrix, and the (to-be-corrected) `calcFlatArea()`.
- `packages/engine/src/bag-flat-sheet.ts` — the proven flat-sheet model this
  document mirrors (two-web, formed-depth, `SA` conventions).
- `packages/engine/src/calculator.ts` — `case 'pouch'` (legacy face-area) and
  `case 'bag'` (flat-sheet) branches.
- `docs/BAG_COSTING_RESEARCH.md` — sister document for carrier/shopping bags.
- Industry costing practice: IPPSTAR / FPA / PLI flexible-packaging costing
  guides (standard converter practice; formulas drafted for sample validation).

> **Status: DRAFT for converter/production validation (§8).** The geometry is
> derived from standard pouch construction and kept consistent with the engine's
> bag model. Validate the center-seal overlap (§4.2) and box-pouch bottom (§4.6)
> against real samples before wiring into live quoting.

---

## 11. Revision history

- **2026-06-27 (rev 3).** Closed a prose/formula mismatch introduced by rev 2.
  §3's machine-direction bullet and the §9 footnote both claimed the **box-pouch
  bottom seal** takes an additive `SA`, but §4.6's formula (`blankLength = H + SA`,
  plus a separate `W × D` bottom panel) never adds one. Rather than invent an
  `SA` for the box-bottom junction — which §4.6/§8 explicitly flag as
  converter-specific and unvalidated — tightened the **prose to match the
  formula**: the box-bottom allowance is treated as **absorbed into the empirical
  bottom-depth `D`** (pending §8 sample validation), unlike the top seal which is
  a genuine flat `SA` add-on across every subtype. Formulas, the §9 table, and
  all numbers unchanged.
- **2026-06-27 (rev 2).** Corrected the §3 seal-allowance rule after expert
  review. Original draft framed `SA` as **"fold vs heat-seal"** and listed the
  side seals as taking `SA` — which contradicted the §4.1 (3SS) and §4.4
  (stand-up) formulas, where the side seals correctly take **no** `SA`. Reframed
  the rule in **machine-direction vs cross-direction** terms: cross-direction
  (slit-web-width) edges take no `SA` because the seal forms within `W`;
  machine-direction (cut/crimp) edges take one `SA` each because extra length is
  fed per cycle. Made the input convention explicit — `W` is **seal-inclusive**
  (= slit/layflat web width), `H` is **seal-exclusive** (usable cavity; top lip
  added via `SA`). Documented why **4-side seal** is the exception (separate
  die-cut plies → `SA` on both axes) and updated the §9 summary footnote to
  match. No formula or numeric result changed — only the rationale and the
  input-labeling convention. **Action carried forward:** the future
  `pouch-flat-sheet.ts` input form must label width as seal-inclusive and height
  as seal-exclusive, or the `W`-no-`SA` assumption silently breaks.
- **2026-06-27 (rev 1).** Initial draft — classification of the six pouch
  subtypes, per-subtype flat-sheet formulas, worked example, engine-integration
  notes, accessory cost contributions, and production-validation protocol.
