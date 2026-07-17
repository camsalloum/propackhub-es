# Pouch — App Source of Truth (Estimation Studio)

**Status:** Living doc — describes what the **code does today**, not aspirational design.  
**Last verified:** 2026-07-17 (client `productSubtype` injection fix)  
**Product:** ProPackHub Estimation Studio (`apps/estimation-studio`)  
**Product type code:** `pouch` (first-class; separate from `bag`)

If this doc disagrees with code, **code wins** — then update this file.

---

## 1. Purpose

This document is the single place to understand **how pouches work in ES**:

- Picker types and codes
- Dimension fields
- Flat-film / weight / pieces-per-kg math
- Accessories (cost + UI)
- K-seal vs Doyen
- File map and legacy behaviour

Related (design reference, not live code): [`POUCH_CLASSIFICATION_v4.md`](./POUCH_CLASSIFICATION_v4.md)  
Related (pre-v4 research, superseded): [`POUCH_COSTING_RESEARCH.md`](./POUCH_COSTING_RESEARCH.md)

---

## 2. Classification model (live)

Pouches are classified on **two axes** (Premade Pouch Selector v4):

| Axis | Meaning | Cost impact |
|------|---------|-------------|
| **Family** | Forming / sealing **process** | Sets `webCount` and flat-area formula |
| **Variant** | Shape modifier (flat, standing, side gusset, …) | Extra dims (G, S1, D, angle) |

**Do not classify by counting seals.** A “quad-seal look” can be 1-web Center-Fold-Seal or a 2-web construction — film cost differs.

**K-seal** is **not** a Family. It is a **bottom weld style** on a standing pouch (angled K vs Doyen U/round). Same W / L / G film area. Stored as `bottomSealKseal = 1` and picker code `pouch_tss_standing_kseal`.

---

## 3. Picker types (what the user selects)

Estimate editor pouch picker always uses the static catalog `POUCH_SUBTYPES` (stale Master Data pouch names are ignored).

| Picker label | DB / estimate `productSubtype` | Engine configurator type | Family |
|--------------|--------------------------------|--------------------------|--------|
| Three-Side-Seal — Flat | `pouch_tss_flat` | `three-side-seal-flat` | three-side-seal |
| Three-Side-Seal — Standing (Doyen) | `pouch_tss_standing` | `three-side-seal-standing` | three-side-seal |
| Three-Side-Seal — Standing (K-Seal) | `pouch_tss_standing_kseal` | `three-side-seal-standing` | three-side-seal |
| Center-Fold-Seal — Flat (Quad) | `pouch_cfs_flat` | `center-fold-seal-flat` | center-fold-seal |
| Center-Fold-Seal — Side Gusset | `pouch_cfs_side_gusset` | `center-fold-seal-side-gusset` | center-fold-seal |
| Center-Fold-Seal — Standing | `pouch_cfs_standing` | `center-fold-seal-standing` | center-fold-seal |
| Half-Fold-Fusion — Flat | `pouch_hff_flat` | `half-fold-fusion-flat` | half-fold-fusion |
| Half-Fold-Fusion — Standing | `pouch_hff_standing` | `half-fold-fusion-standing` | half-fold-fusion |
| Side-Weld — Flat | `pouch_sw_flat` | `side-weld-flat` | side-weld |
| Side-Weld — Side Gusset | `pouch_sw_side_gusset` | `side-weld-side-gusset` | side-weld |
| Oblique — Trapezoid | `pouch_osw_trapezoid` | `oblique-side-weld-trapezoid` | oblique-side-weld |
| Oblique — Triangle | `pouch_osw_triangle` | `oblique-side-weld-triangle` | oblique-side-weld |
| Flat-Bottom Box — Standing | `pouch_fbb_standing` | `flat-bottom-box-standing` | flat-bottom-box |

**13 picker rows → 12 engine geometry types** (Doyen and K-Seal share `three-side-seal-standing`).

Source: `packages/web/src/lib/productCatalog.ts` → `POUCH_SUBTYPES`.

---

## 4. Dimension fields (persisted on the estimate)

Stored in estimate `dimensions` JSON (numeric map). Configurator field → key:

| UI id | Meaning | Dimension key | Used by |
|-------|---------|---------------|---------|
| W | Face / finished width | `openWidthMm` | All |
| L / H | Height / length (vertical) | `openHeightMm` | All |
| G (bottom) | Bottom gusset depth | `bottomGussetMm` | Standing variants |
| G (side) | Side gusset fold width | `sideGussetMm` | Side-gusset variants |
| S1 | Bottom seal width | `bottomSealWidthMm` | Center-Fold flat / side-gusset |
| D | Box bottom panel depth | `bottomDepthMm` | Flat-bottom box |
| A | Oblique cut angle (deg) | `cutAngleDeg` | Oblique trapezoid (scrap note only) |
| — | K-seal flag (0/1) | `bottomSealKseal` | Standing TSS (Doyen=0, K-Seal=1) |
| — | Corner rounded (0/1) | `cornerRounded` | Tooling / viz only |
| — | Corner radius mm | `cornerRadiusMm` | When rounded |
| — | Configurator type (optional) | `pouchSubtype` | Engine resolve (also from `productSubtype`) |
| — | Accessories array | `accessories` | See §7 |

Defaults and suggested ranges: `packages/web/src/lib/pouchConfiguratorCatalog.ts` → `POUCH_CONFIGURATOR_CATALOG`.

---

## 5. Film-area calculation (engine)

### 5.1 Resolve type

```
resolvePouchConfiguratorType(dimensions):
  1. dimensions.pouchSubtype if it is a known configurator key
  2. else map legacy short strings (e.g. 'stand-up' → three-side-seal-standing)
  3. else POUCH_SUBTYPE_TO_CONFIGURATOR[dimensions.productSubtype]
  4. else null → legacy face-area fallback in calculator
```

Source: `packages/engine/src/pouch-flat-sheet.ts`.

### 5.2 Geometry formulas (mm)

Inputs: `W`, `L`, `G`, `S1`, `D` (as resolved above).

| Configurator type | flatWidth | flatHeight | webCount | extraPanelArea | separateBottomWeb |
|-------------------|-----------|------------|----------|----------------|-------------------|
| `three-side-seal-flat` | W | L | 2 | 0 | false |
| `three-side-seal-standing` | W | L | 2 | W × G | **true** |
| `center-fold-seal-flat` | W | L + S1 | 1 | 0 | false |
| `center-fold-seal-side-gusset` | W + 2G | L + S1 | 1 | 0 | false |
| `center-fold-seal-standing` | W | L + G/2 | 1 | 0 | false |
| `half-fold-fusion-flat` | 2W | L | 1 | 0 | false |
| `half-fold-fusion-standing` | 2W | L − G | 1 | W × G | **true** |
| `side-weld-flat` | W | L | 1 | 0 | false |
| `side-weld-side-gusset` | W + 2G | L − G | 1 | 0 | false |
| `oblique-side-weld-trapezoid` | W | L | 1 | 0 | false |
| `oblique-side-weld-triangle` | W | L | 1 | 0 | false |
| `flat-bottom-box-standing` | W + D | L | 3 | W × D | **true** |

Notes:

- Oblique **cut angle does not** enter base area (scrap is deferred).
- `S1` default when omitted: `bottomSealWidthMm ?? sealAllowanceMm ?? 12`.
- Side-gusset types read **G from `sideGussetMm`**; standing/bottom types from **`bottomGussetMm`**.
- **W / L are finished outer dimensions** of the pouch the customer buys. Seals sit *inside* that envelope for TSS / HFF / Side-Weld / Oblique / Flat-Bottom. Do **not** add extra seal mm on top of W×L for those families (would double-count). CFS flat/side-gusset intentionally add `S1` to blank height per v4 process model.

### 5.3 Total film area

```
mainMm2  = flatWidth × flatHeight × webCount
areaMm2  = mainMm2 + extraPanelArea
areaM2   = areaMm2 / 1e6

blankWidthMm  = flatWidth   // per-web width (for LM/reel)
blankLengthMm = flatHeight
```

### 5.4 Weight and pieces per kg

In `calculator.ts` (`productType === 'pouch'`), with structure `totalGsm` and accessories:

```
gramsPerPiece = (areaM2 + accessoryFilmAreaM2) × totalGsm + accessoryHardwareGramPerPiece
piecesPerKg   = 1000 / gramsPerPiece   (if gramsPerPiece > 0)
```

Also:

```
linearMPerKgReel = (sqmPerKg / blankWidthMm) × 1000   // when blankWidthMm > 0
```

**Fallback (no resolvable subtype):** legacy one-face area  
`faceAreaM2 = openWidthMm × openHeightMm / 1e6` — understates film (~50% low for 2-web TSS); kept only when subtype is missing.

**Critical wiring:** `productSubtype` is stored on the **estimate row**, not in the numeric dimensions map. Both server (`estimate-engine-input.ts`) and client (`estimateCalc.ts` → `runClientCalculation`) **must inject** `productSubtype` into engine dimensions before `calculatePouchFlatSheetAreaM2`. Without injection, live preview silently uses the face-area fallback.

### 5.5 `separateBottomWeb` (important)

When `true`, v4 says the gusset/bottom panel may use a **different** film structure than front/back.

**What the app does today:**

- Includes `extraPanelArea` in total area.
- Prices that area at the **same** structure GSM / $/m² as the body.

**What it does not do yet:** attach a second laminate stack for the bottom panel. Flag is returned for future dual-structure costing.

---

## 6. K-seal vs Doyen (live behaviour)

| | Doyen | K-Seal |
|---|--------|--------|
| Picker | Three-Side-Seal — Standing (Doyen) | Three-Side-Seal — Standing (K-Seal) |
| Code | `pouch_tss_standing` | `pouch_tss_standing_kseal` |
| Engine type | `three-side-seal-standing` | same |
| Film formula | identical (W, L, G, webCount 2 + W×G) | identical |
| `bottomSealKseal` | 0 | 1 |
| Open-view drawing | Rounded / U-style gusset band | Angled K corner welds + “K-seal” label |

Industry meaning: K-seal = stronger angled bottom welds; Doyen = classic U/round bottom gusset. Film consumption for costing is the same W×L×2 + W×G model.

---

## 7. Accessories

Accessories are **never** separate pouch types. They are toggles on the configurator; stored in `dimensions.accessories[]`.

### 7.1 Kinds and rate basis

| Kind | UI label | Cost basis (engine) |
|------|----------|---------------------|
| `zipper` | Zipper | Per metre ≈ `openWidthMm` × count |
| `spout` | Spout + cap | Per piece |
| `valve` | Degassing valve | Per piece |
| `window` | Window / patch | Per m² of patch (own film if rates set) else adds `filmAreaM2` |
| `handle` | Handle | Per piece |
| `hanging_hole` | Hanging hole | Per piece (if material rate set) |
| `tear_notch` | Tear notch | Tooling; optional per-piece rate |
| `laser_score` | Laser score | Tooling; optional per-piece rate |
| `easy_peel` | Easy peel seal | Tooling; optional per-piece rate |

Rates: snapshot on the selection preferred; else Master Data accessory material.

### 7.2 Zipper UI fields (live)

- Material select  
- Type: Push-Pull / Slider (`zipType`)  
- Position from open end mm (`positionFromTopMm`) — drawing + clearance; **cost still ≈ width**  
- Zip profile width mm (`zipWidthMm`)

### 7.3 Applicability by Family

| Family | Offered accessories |
|--------|---------------------|
| three-side-seal | zipper, tear_notch, laser_score, easy_peel, hanging_hole, window |
| center-fold-seal | zipper, spout, tear_notch, laser_score, easy_peel, hanging_hole, window |
| half-fold-fusion | zipper, spout, valve, tear_notch, laser_score, easy_peel, hanging_hole, window |
| side-weld | tear_notch, laser_score, easy_peel |
| oblique-side-weld | tear_notch, laser_score, easy_peel |
| flat-bottom-box | spout, valve, tear_notch, laser_score, easy_peel, window, handle |

Source: `pouchConfiguratorCatalog.ts` → `ACCESSORY_BY_FAMILY`.

### 7.4 Corner style

- Square / Rounded (`cornerRounded`, `cornerRadiusMm`)  
- Tooling / visualization only — **does not** change flat area  
- Not shown for Oblique families

---

## 8. UI behaviour (live)

| Surface | Behaviour |
|---------|-----------|
| Product type | `Pouch` |
| Pouch type dropdown | Static v4 list (§3) |
| Dimensions | Entered in `PouchConfigurator` (not header open W×H) |
| Open view | Landscape-rotated schematic; seals/open end per type; accessories in local coords |
| Flat blank | Engine blank W×L; shows webCount; extra panel piece when `extraPanelArea` / separate bottom |
| Sales units | kg and pieces (LM/SQM hidden for pouch) |
| Packaging (logistics) | Carton + stretch + pallet (`pcsPerCarton`, `cartonsPerPallet`) — not laminate |

Components:

- `packages/web/src/components/PouchConfigurator.tsx`
- `packages/web/src/components/PouchSchematic.tsx`
- `packages/web/src/components/PouchFlatBlank.tsx`
- Wired from `EstimateEditor.tsx` when `productFamily === 'pouch'` and subtype maps to a configurator type

---

## 9. Legacy codes (still resolve; hidden from picker)

| Legacy `productSubtype` | Maps to configurator |
|-------------------------|----------------------|
| `pouch_3_side_seal`, `pouch_3_side_seal_zip`, `pouch_three_side_seal` | three-side-seal-flat |
| `pouch_stand_up`, `pouch_stand_up_zip`, `pouch_doypack` | three-side-seal-standing |
| `pouch_kseal_stand_up`, `pouch_kseal_stand_up_zip` | three-side-seal-standing (+ K-seal via alias `pouch_tss_standing_kseal`) |
| `pouch_center_seal`, `pouch_pillow`, `pouch_4_side_seal`, `pouch_four_side_seal` | center-fold-seal-flat |
| `pouch_gusset`, `pouch_side_gusset` | center-fold-seal-side-gusset |
| `pouch_flat_bottom`, `pouch_box` | flat-bottom-box-standing |

On load, `canonicalPouchSubtype()` rewrites legacy codes to v4 picker codes where listed in `LEGACY_POUCH_SUBTYPE_ALIASES`.

---

## 10. Worked example (TSS Standing)

Inputs: W=110, L=220, G=45, type = three-side-seal-standing, totalGsm = 120.

```
flatWidth=110, flatHeight=220, webCount=2, extra=110×45=4950
areaMm2 = 110×220×2 + 4950 = 53350
areaM2  = 0.05335
gramsPerPiece = 0.05335 × 120 = 6.402 g
piecesPerKg   ≈ 156.2
```

(Accessories add extra grams/cost on top.)

---

## 11. Code map

| Concern | Path |
|---------|------|
| Flat geometry + subtype map | `packages/engine/src/pouch-flat-sheet.ts` |
| Accessories cost | `packages/engine/src/pouch-accessories.ts` |
| Weight / pcs/kg | `packages/engine/src/calculator.ts` (`case 'pouch'`) |
| Dimension types | `packages/engine/src/types.ts` → `EstimateDimensions` |
| Picker subtypes | `packages/web/src/lib/productCatalog.ts` |
| Catalog / accessories UI rules | `packages/web/src/lib/pouchConfiguratorCatalog.ts` |
| Draw helpers | `packages/web/src/lib/pouchDrawDims.ts` |
| UI shell | `packages/web/src/components/PouchConfigurator.tsx` |
| Tests | `packages/engine/src/pouch-flat-sheet.test.ts`, `pouch-accessories.test.ts` |
| MD seed / repair | `packages/server/scripts/repair-product-catalog.ts` |

---

## 12. Known gaps (not implemented)

Documented so agents do not claim they exist. Acceptable for V1 estimation unless noted:

1. **Dual-structure pricing** when `separateBottomWeb` — bottom panel still uses body GSM/$ (V1 OK; FUTURE if customer often specs different bottom film)  
2. **Oblique scrap %** — angle stored; not applied as waste factor (niche; FUTURE)  
3. **Per-family seal-allowance config table** — not needed when W/L are finished dims; CFS uses S1 only  
4. **Generic pouch-family yield %** — process waste covered by existing waste bands / M&O; no separate pouch scrap factor  
5. **Zipper min-length clearance validation** (~15 mm) — not enforced in engine  
6. **Hanging-hole header-zone validation** — not enforced  
7. **Corner-cut die cost line** — viz/tooling flag only  
8. **Accessory operation surcharge** beyond material rate — use material + optional per-piece MD rate; no machine routing  

---

## 13. Ops checklist

```bash
cd apps/estimation-studio/packages/engine && npm run build
# optional: refresh platform subtype rows
cd ../server && npm run db:seed-product-catalog
```

Hard-refresh the web app after engine rebuild.

---

*End of pouch source of truth. Update this file whenever pouch types, formulas, or accessory rules change in code.*
