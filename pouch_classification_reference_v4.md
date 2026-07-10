# Flexible Packaging Pouches — Classification Reference

**Purpose:** Reference document for ProPackHub costing/estimation modules (VERA and related). Defines pouch families, variants, required dimensions, accessories, and the geometry logic needed to calculate flat film area for material costing.

**Revision:** v4. See §8 for what changed vs. v3 — the Family/Variant taxonomy, dimensions, flat-area formulas, `webCount`, and `separateBottomWeb` logic are **unchanged**. This revision only extends §4 (Accessories) and adds §3A (Corner Style), per the Premade Pouch Selector refinement notes.

---

## 1. Core Principle: Two Independent Axes

Pouches must be classified along **two separate axes**, not one:

1. **Family** — the forming/sealing *process*. This determines web count, machine route, and base film cost structure.
2. **Variant** — the *shape modifier* within a family (flat, gusseted, standing, zippered).

Two pouches can look visually identical (same seal pattern, same silhouette) while consuming completely different amounts of film, because they were formed by different processes — one from a single folded web, another from two separate webs. Costing logic must key off **Family**, not visual appearance alone.

A second critical field, independent of both axes: **`separateBottomWeb` (boolean)**. Several variants can take a bottom or gusset panel that is an independently specced/printed laminate, different from the front/back film. If this flag is true and the costing engine assumes one uniform structure for the whole pouch, material cost will be understated.

---

## 2. Family Overview

| Family | Forming Method | Base Web Count | Typical Machine Route | Relative Cost/Complexity |
|---|---|---|---|---|
| **Three-Side-Seal** | Two separate webs (front + back), sealed on 3 sides, top left open for fill | 2 | Premade pouch machine, twin-web feed | Moderate |
| **Center-Fold-Seal** (Quad-Seal) | One web folded in from both edges to meet at a center back seam | 1 | Premade pouch machine, single-web center-seal head | Moderate-low (film-efficient) |
| **Half-Fold-Fusion** | One web V-folded in half; the fold becomes one full side, remaining sides sealed | 1 (+ optional separate bottom web) | Premade pouch machine, fold-fusion head | Low-moderate |
| **Side-Weld** | Flat or tube film, heat-sealed and cut, no fold shaping | 1 | Side-weld seal-and-cut machine | Lowest cost, lowest complexity |
| **Oblique-Side-Weld** | Angled thermal seal-and-cut, producing trapezoid/triangle profiles | 1 | Oblique seal-and-cut machine | Low (niche shapes) |
| **Flat-Bottom Box Pouch** | Front + back + a separate flat bottom insert panel | 3+ | Specialized box-pouch line with bottom-insert station | Highest — most complex forming |

---

## 3. Family Detail: Variants, Dimensions, Formulas

Dimension convention: **W** = width, **L** = height/length (vertical), **G** = gusset depth, **D** = bottom depth (box pouch only), **S1/S2** = seal widths.

### 3.1 Three-Side-Seal

| Variant | Description | Required Dimensions | Range (mm) |
|---|---|---|---|
| Flat | Open-top, fill after forming | W, L | W: 75–600 · L: 60–500 |
| Standing | Bottom gusset, self-standing | W, L, G | W: 60–250 · L: 120–540 · G: 20–70 |

- `separateBottomWeb`: **true** on Standing variant
- Flat-area formula (Flat): `flatWidth = W`, `flatHeight = L`, `webCount = 2`
- Flat-area formula (Standing): `flatWidth = W`, `flatHeight = L`, `webCount = 2`, `extraPanelArea = W × G`

### 3.2 Center-Fold-Seal (Quad-Seal)

| Variant | Description | Required Dimensions | Range (mm) |
|---|---|---|---|
| Flat | Quad-seal appearance, no gusset, **from a single web** | W, L, S1 (bottom seal width) | W: 35–350 · L: 60–500 · S1: 5–50 |
| Side Gusset | Side-folds add to flat width, still 1 web | W, L, G, S1 | W: 55–350 · L: 60–500 · G: 10–80 |
| Standing | Bottom gusset, self-standing | W, L, G | W: 60–250 · L: 120–270 · G: 20–70 |

- Key distinction: this family produces the same *visual* seal pattern as a 2-web four-side-seal pouch, but consumes only **1 web**. Do not conflate with Three-Side-Seal or any 2-web construction.
- Flat-area formula (Flat): `flatWidth = W`, `flatHeight = L + S1`, `webCount = 1`
- Flat-area formula (Side Gusset): `flatWidth = W + 2G`, `flatHeight = L + S1`, `webCount = 1`
- Flat-area formula (Standing): `flatWidth = W`, `flatHeight = L + G/2`, `webCount = 1`

### 3.3 Half-Fold-Fusion

| Variant | Description | Required Dimensions | Range (mm) |
|---|---|---|---|
| Flat + Zipper | No gusset, single web V-folded | W, L | W: 60–450 · L: 200–600 |
| Standing | Bottom gusset; can use an **independently printed bottom web** | W, L, G | W: 60–450 · L: 200–600 (effective max = 600 − G) · G: 25–100 |

- `separateBottomWeb`: **true** on Standing variant — this is a named machine capability (print alignment between bottom web and front/back), not an edge case. Flag it explicitly in costing, don't assume uniform laminate.
- Flat-area formula (Flat): `flatWidth = W × 2`, `flatHeight = L`, `webCount = 1`
- Flat-area formula (Standing): `flatWidth = W × 2`, `flatHeight = L − G`, `webCount = 1`, `extraPanelArea = W × G`

### 3.4 Side-Weld

| Variant | Description | Required Dimensions | Range (mm) |
|---|---|---|---|
| Flat | Simplest construction, heat-seal + cut | W, L | W: 70–500 · L: 100–400 |
| Side Gusset | Adds fold-in gusset | W, L, G | W: 70–500 · L: 100–400 (effective max = 400 − G) · G: 30–70 |

- Flat-area formula (Flat): `flatWidth = W`, `flatHeight = L`, `webCount = 1`
- Flat-area formula (Side Gusset): `flatWidth = W + 2G`, `flatHeight = L − G`, `webCount = 1`

### 3.5 Oblique-Side-Weld

| Variant | Description | Required Dimensions | Range (mm) |
|---|---|---|---|
| Trapezoid | Angled cut on both sides | W (top width), L, cut angle (0–20°) | W: 300–700 · L: 200–650 |
| Triangle | Extreme angle, converges to a point | W (base width), L | W: 300–700 · L: 200–650 |

- Used for produce, flowers, sandwiches — not typically food-retort grade.
- Flat-area formula (both): `flatWidth = W`, `flatHeight = L`, `webCount = 1` (angled trim is a cutting-waste factor, apply separately in scrap calc, not in base flat area)
- Corner Style (§3A) does not apply to this family — the angled trim already defines the corner geometry. The estimator surfaces this as an informational note rather than a blocked field.

### 3.6 Flat-Bottom Box Pouch

| Variant | Description | Required Dimensions | Range (mm) |
|---|---|---|---|
| Standing | Front + back + separate flat bottom panel | W, D (bottom depth), H | W: 90–194 · D: 74–114 · H: 200–600 |

- `separateBottomWeb`: **true** — always. Highest structural complexity of all families.
- Flat-area formula: `flatWidth = W + D`, `flatHeight = H`, `webCount = 3`, `extraPanelArea = W × D`

---

## 3A. Corner Style (Global Finishing Attribute)

Independent of Family and Variant. This is a die-tooling/finishing choice applied to the pouch silhouette, not a new classification axis and not an accessory (it has no material cost line — it's a tooling consideration only).

| Field | Options | Notes |
|---|---|---|
| Style | Square, Rounded | Default Square |
| Radius (R) | 0–25mm | Shown only when Style = Rounded |

- Valid on all families **except Oblique-Side-Weld** (trapezoid/triangle profiles are defined by their angled cut; rounding doesn't apply there).
- On V-folded constructions (Half-Fold-Fusion), rounding is shown applied to the full silhouette in the visual tool as a simplification — the folded edge itself remains a continuous crease regardless of this setting; only the die-cut/sealed edges are actually radiused in production.
- Affects visualization and tooling cost (corner-cut die) only. **Does not change `flatWidth`, `flatHeight`, `webCount`, `extraPanelArea`, or any Family/Variant classification.**

---

## 4. Accessories (Optional Add-Ons — Never Their Own Type)

Accessories are selections layered onto a Family + Variant, not separate pouch classes. Each has its own cost mechanism (material + process station), and each is only valid on a subset of families.

| Accessory | What it costs | Fields | Valid on Families |
|---|---|---|---|
| **Zipper / Reclosable Seal** | Zip-tape material + insertion/seal station; can shorten the max usable length on the same machine | Position from top (mm), Type (Push-Pull / Slider), Zip width (mm), Easy-open flange (optional) | Three-Side-Seal, Center-Fold-Seal, Half-Fold-Fusion |
| **Spout + Cap** | Component cost + spout-fitment station + cycle-time penalty | Neck diameter (6mm/8.6mm/10mm), Position (Left Corner / Right Corner / Center) | Center-Fold-Seal, Half-Fold-Fusion, Flat-Bottom Box |
| **Degassing Valve** | Component + die-cut + placement (mainly coffee) | Diameter (8/10/12mm) | Half-Fold-Fusion, Flat-Bottom Box |
| **Tear Notch** | Near-zero material, small tooling/process cost | Position (Left/Right) | All families |
| **Laser Score** | Requires laser-scoring station — partial-depth film cut | Offset from top (mm) | All families |
| **Easy Peel Seal** | Peelable sealant layer at the seal itself — no notch/score tooling required | Peelable seal(s) (Top seal / All seals) | All families |
| **Hanging Hole** | Die-cut step, negligible material | Shape (Euro Slot / Round Hole / Oblong / Butterfly / Custom), Offset from top (mm) | Three-Side-Seal, Center-Fold-Seal, Half-Fold-Fusion |
| **Window / Patch** | Separate small material + register-accuracy requirement (scrap risk factor) | Shape (Rectangle / Oval / Circle / Custom Shape), Width, Height (n/a for Circle — uses Width as diameter), Offset from top (mm) | Three-Side-Seal, Center-Fold-Seal, Half-Fold-Fusion, Flat-Bottom Box |

**Note on Tear Notch / Laser Score / Easy Peel:** these are three independent opening-assist mechanisms, each with its own tooling/process implication, and each may be selected on its own or in combination (e.g. a Laser Score line above a Tear Notch). Treat them as three separate accessory line items — do not collapse them back into a single "Easy Opening" field, since their cost mechanisms and machine stations differ (die-notch vs. laser station vs. sealant-layer spec).

**Note on Hanging Hole:** generalized from a single "Euro Slot" option — the underlying cost driver (die-cut step, negligible material) is the same across shapes, but the shape affects tooling and, per §5, must sit within the header/seal area regardless of which shape is chosen.

**Note on zipper interaction:** adding a zipper to a Center-Fold-Seal pouch on the same physical machine can shift the valid length range upward (e.g. a flat variant's minimum length increases once a zipper station is engaged, because the zip insertion needs clearance). Treat accessory selection as something that can *narrow* the parent dimension field's valid range, not just add a flat cost line. The estimator applies a ~15mm clearance allowance on top of the variant's stated minimum length whenever a zipper is selected, and surfaces this as an informational note.

---

## 5. Costing Logic — What Must Feed the Engine

For every pouch configuration, the costing engine needs, at minimum:

1. **`webCount`** — the single most consequential field. Determines whether film is purchased/priced as 1 web or 2+ separate webs. Two pouches with identical outer dimensions and seal pattern can have different `webCount`, and must be priced differently.
2. **`flatWidth` / `flatHeight`** — the unwound flat-sheet dimensions per web, used for GSM × area × density costing.
3. **`extraPanelArea` / `separateBottomWeb` flag** — when true, the gusset/bottom/insert panel must be priced against its own film structure (often a different, more abrasion-resistant laminate than front/back), not folded into the main film spec.
4. **Seal allowances** — not included in the base formulas above; these are process defaults (mm per seal) that should be pulled from a config table per Family+Variant, with an "Advanced" override for non-standard customer specs.
5. **Scrap/waste factor** — particularly relevant for Oblique-Side-Weld (angled trim waste) and any accessory requiring die-cutting (Hanging Hole, Window) or precise print registration (Window).
6. **Corner Style tooling flag** (§3A) — when Rounded, add a corner-cut die line item. This never feeds `flatWidth`/`flatHeight`/`webCount`.
7. A hanging hole must fall within the reinforced header/seal area (not the general body of the pouch), since it needs full film-to-film contact to bear the pack's weight — validate offset-from-top against that zone regardless of hole shape.

---

## 6. Known Pitfalls (Corrections Made During Development)

- **Seal-count is not a safe classification key.** A pouch with 4 seals can be either a 2-web Three-Side-Seal-style construction or a 1-web Center-Fold-Seal construction — same seal count, different `webCount`, different cost. Classify by Family (process), not by counting seals in the diagram.
- **Gusset direction differs by Family.** In Three-Side-Seal/Half-Fold-Fusion/Center-Fold-Seal *Standing* variants, gusset depth (G) is carved from/added to the flat **height**. In Center-Fold-Seal/Side-Weld *Side Gusset* variants, G adds to the flat **width**. A single generic "Gusset" field reused across all variants without this distinction will produce wrong film area for at least half of them.
- **Bottom/gusset laminate is frequently a separate spec.** Confirmed as an explicit machine capability (independently printed bottom web) on Half-Fold-Fusion Standing and implied on Three-Side-Seal Standing and Flat-Bottom Box. Do not assume one uniform film structure per pouch when `separateBottomWeb` is true.
- **Zipper accessory can shift the parent dimension range**, not just add cost — validate this per Family+Variant if your machine data supports it.
- **Corner Style and accessory shape options are visualization/tooling refinements, not new classification axes.** They must never be used to infer Family or Variant, and must never gate `webCount` or the flat-area formulas in §3.
- **Tear Notch / Laser Score / Easy Peel are independent accessories**, not a single "Easy Opening" toggle with sub-options — they have distinct machine stations and can coexist on the same pouch.

---

## 7. Summary Table (Quick Reference)

| # | Family | Variant | Webs | Key Dims | Separate Bottom Web |
|---|---|---|---|---|---|
| 1 | Three-Side-Seal | Flat | 2 | W, L | No |
| 2 | Three-Side-Seal | Standing | 2 | W, L, G | Yes |
| 3 | Center-Fold-Seal | Flat (Quad-Seal) | 1 | W, L, S1 | No |
| 4 | Center-Fold-Seal | Side Gusset | 1 | W, L, G, S1 | No |
| 5 | Center-Fold-Seal | Standing | 1 | W, L, G | No |
| 6 | Half-Fold-Fusion | Flat + Zipper | 1 | W, L | No |
| 7 | Half-Fold-Fusion | Standing | 1 | W, L, G | Yes |
| 8 | Side-Weld | Flat | 1 | W, L | No |
| 9 | Side-Weld | Side Gusset | 1 | W, L, G | No |
| 10 | Oblique-Side-Weld | Trapezoid | 1 | W, L, angle | No |
| 11 | Oblique-Side-Weld | Triangle | 1 | W, L | No |
| 12 | Flat-Bottom Box | Standing | 3+ | W, D, H | Yes |

*(Unchanged from v3 — Corner Style and the expanded accessory set in §4 do not add rows here, by design: they modify how a row is finished or equipped, not which row applies.)*

---

## 8. Revision Notes (v3 → v4)

Made in response to the Premade Pouch Selector refinement pass. **Family, Variant, required dimensions, flat-area formulas, `webCount`, and `separateBottomWeb` logic are unchanged** — nothing in §1–§3, §6 (classification-relevant parts), or §7 was altered in substance.

Added/changed:
- **New §3A — Corner Style**: Square/Rounded + radius, global across families (except Oblique-Side-Weld), tooling/visualization only.
- **Zipper**: added Zip width (mm) and optional Easy-open flange fields.
- **Spout + Cap**: Position generalized from Corner/Center to Left Corner / Right Corner / Center for accurate placement.
- **Tear Notch** split out from a former combined "Easy Opening" concept into three independent accessories: **Tear Notch**, **Laser Score**, **Easy Peel Seal** — each with its own machine-station implication.
- **Euro Slot** generalized to **Hanging Hole** with a Shape field (Euro Slot / Round Hole / Oblong / Butterfly / Custom).
- **Window / Patch** generalized with a Shape field (Rectangle / Oval / Circle / Custom Shape); Circle uses Width as diameter and drops the Height field.
- **§5 Costing Logic**: added the Corner Style tooling line item and the hanging-hole header-zone validation requirement.
- **§6 Known Pitfalls**: added two entries — Corner Style/shape options are not classification axes, and the three opening-assist accessories are independent, not sub-options of one toggle.
- Confirmed out of scope and *not* added, per the refinement notes: Rollstock, VFFS, HFFS, FFS, web direction, print direction, production routing, printing process, machine scheduling. Those remain the concern of other modules.

Also corrected, independent of the refinement notes, as a visual/engineering-accuracy fix in the selector tool (no change to this document's classification data): the Three-Side-Seal *Flat* diagram previously rendered its bottom edge with "solid fold, no seal" styling; since Three-Side-Seal has no folds at all (2 separate webs, 3 sealed sides per §2), it now renders as a seal, consistent with the rest of this document. Two gusset/side-gusset diagrams (Center-Fold-Seal Side Gusset, Side-Weld Side Gusset) were also missing one of their two fold-line annotations and a continuous outer silhouette stroke; both are now drawn symmetrically. These were drawing-layer omissions in the visualization tool, not errors in the classification data itself.
