# Laravel Estimator — Deep Costing Audit (ES engine source of truth)

**Source:** `legacy-laravel/propackhub-complete-backup 2/`  
**Updated:** 2026-06-12 (deep review — materials, solvent mix, sale price chain)

---

## 1. Design philosophy (what ES must copy)

| Laravel | PEBI (do NOT copy to ES) |
|---------|---------------------------|
| One scrollable estimate form | 8-step MES wizard |
| 3 layer **types**: Substrate, Ink, Adhesive | BOM2 item codes, HALB/ROH, routing AI |
| Materials = **generic** names (All Colors, Adhesive, LDPE…) | Color-specific inks, Oracle sync |
| User-edited cost/kg per material | Machine OEE, department caps |
| Client-side calc → save snapshot | Live MES simulation |
| Optional Actual vs Estimated (Phase 2 for ES) | Full production actuals |

**ES rule:** Same **math** and **material model** as Laravel; same **simplicity**; add slabs, visualizer, re-quote, tenant library — not PEBI depth.

---

## 2. Material library model

### Structure

```
Category (type)     →  Subcategory (name)  →  Material row (one price set)
  1 Substrate            LDPE White            solid, density, cost/kg, waste
  2 Ink                  All Colors
  3 Adhesive             Adhesive
                         Solvent Base          ← special name, used in solvent math
```

- Dropdown **Type** = category id `1 | 2 | 3`.
- Dropdown **Material** = subcategory **name** (not SKU, not color).
- `GET /materials/{name}` returns `{ solid, density, costPerKg, waste }`.
- **One material row per subcategory** — name stored on material equals subcategory name.

### Generic consumables (NOT color-specific)

| Type | Materials | Notes |
|------|-----------|-------|
| Substrate | LDPE Natural/White, PET, BOPP, CPP, PVC, **Aluminium**, … | Film/resin grade — not ink color |
| Ink | **Ink SB** (30% solid), **Ink UV** (100% solid) | Two **systems** only — not Black/White/Cyan SKUs |
| Adhesive | **Adhesive SB**, **Solvent Base** | SB lamination adhesive; Solvent Base feeds solvent math |
| Global | **Solvent-Mix** (cost/kg + ink-to-solvent GSM ratio) | **Only when SB ink and/or SB adhesive in stack** — hidden for UV-only |

**ES refinement (owner, 2026-06):** Two ink **systems** with separate price rows:
- **Wide Web printing → Ink SB** (`solid_percent = 30`) — **default for all printed PGs including Labels & Sleeves**
- **Narrow Web printing → Ink UV** (`solid_percent = 100`) — user selection on estimate; no solvent for ink

Solvent-mix block when SB ink and/or SB adhesive in stack.

---

## 3. Layer table — GSM & cost/m²

Per row, on micron/cost/waste change:

### Substrate (`typeSelect = 1`)

```
gsm           = micron × density
cost_m2       = (gsm / 1000) × cost_per_kg × (1 + waste/100)
```

### Ink or Adhesive (`typeSelect = 2 | 3`)

```
gsm           = (solid × micron) / 100
cost_m2       = (micron / 1000) × cost_per_kg × (1 + waste/100)
```

Note: ink/adhesive **cost/m² uses micron**, not gsm — port exactly.

### Structure totals

```
total_gsm     = Σ row.gsm
total_micron  = Σ substrate_micron + Σ ink/adhesive_gsm  (type 1 µ + type 2/3 gsm treated as µ in total micron calc)
film_density  = total_gsm / total_micron
sqm_per_kg    = 1000 / total_gsm
total_cost_m2 = Σ row.cost_m2 + solvent_mix_cost_m2   (see §4)
mat_cost_kg   = (total_cost_m2 / total_gsm) × 1000
```

Layer share % (`lower-input`) = row.gsm / total_gsm × 100.

---

## 4. Solvent-mix block (below layer rows)

Not a visualizer layer — **global inputs** under the layer table:

| Field | Role |
|-------|------|
| `cost-per-kg-last-value` | **Solvent-mix cost / kg** (user/admin editable) |
| `total-gsm-last-value` | Denominator ratio: solvent-based ink+adhesive GSM vs mix |
| `cost-m-last-field-tableless` | Computed $/m² added to `total_cost_m2` |

### `calculateLastCostM()`

```
sum_gsm = Σ gsm where type=2 (ink) + Σ gsm where material = "Solvent Base"
cost_m2_solvent = (sum_gsm / total_gsm_last_value) × (cost_per_kg_last / 1000)
```

Then `calculateTotalCostM()`:

```
total_cost_m2 = Σ layer cost_m2 + cost_m2_solvent
```

### Estimated kg per layer (`calculateEstimatedKgReq`)

For order qty in kg:

```
Substrate:  est_kg = order_kg × (row_gsm / total_gsm) × (1 + waste/100)
Ink/Adh:    est_kg = order_kg × (row_micron / total_gsm) × (1 + waste/100)
```

### `calculateLastEstimatedKg()` (solvent mix kg)

```
last_est_kg = (Σ est_kg for ink type 2 + Σ est_kg for Solvent Base) × total_gsm_last_value
```

---

## 5. Sale price per kg (Total Cost table)

Columns are **additive**, not margin-on-cost:

| Col | Field | Formula |
|-----|-------|---------|
| 1 Raw material | `per-kg-field` | `mat_cost_kg` from §3–4 |
| 2 Markup | `second-per-kg-value` | `per_kg × markupPercent / 100` |
| 3 Plates/cylinders | `third-per-kg-value` | Manual input |
| 4 Delivery | `fourth-per-kg` | Manual input |
| 5 Operation | `fifth-per-kg` | `total_process_cost / order_kg` (auto when processes checked) |
| **Sale price** | `six-kg` / `lastSalesPrice` | **Sum of columns 1–5** |

```
sale_price_kg = rm_kg + (rm_kg × markup% / 100) + plates_kg + delivery_kg + operation_kg
```

This is **not** `cost × (1 + margin%)`. Markup is a separate additive line (Laravel behaviour — port as-is).

`estimation-total-cost` = rm + plates + delivery + operation (excludes markup line — used for internal comparison).

---

## 6. Operation cost (admin territory in ES)

Up to **10 process rows** with checkbox, speed, setup hrs, run hrs, **process cost/hr**.

```
process_total[j] = round(process_cost_hr[j] × run_hrs[j])
total_process_cost = Σ checked process_total
operation_per_kg = total_process_cost / order_kg   → fills fifth-per-kg
```

Run hours derived from `order_meters`, speed, setup — varies by process (extrusion uses kg/hr, printing uses m/min, pouch uses pcs/min).

**ES Decision #18:** this block is **tenant_admin only**; sale price still includes operation when admin configured defaults.

---

## 7. Product types & dimensions

**Sources:** `Costing_form 25.2.25.xlsx` (Roll / Sleeve / Pouch sheets), `edit.blade.php` JS, `Interplast_FP_Costing_*.html` (lane-width for stick/sachet — **Phase 1.1**, not Laravel V1).

### 7.0 Critical distinction — reel width vs printing web width

| Concept | Laravel / Excel field | Used for |
|---------|----------------------|----------|
| **Reel width** (finished product width after slitting) | `roll-real-width` / C13 | Pieces/kg, grams/piece, roll cylinder weight, roll width display, **LM order qty → kg** (hidden field) |
| **Printing web width** (lamination/print width before slitting) | `printing-fil-width` / I35 | **Linear m/kg (press)**, order meters for printing/extrusion run hours |

```
printing_web_width_mm = (reel_width_mm × number_of_ups) + extra_printing_trim_mm
```

**Never use reel width where Laravel uses printing width** (and vice versa). Golden tests must cover both LM/kg paths.

### 7.1 Roll (`productType = roll`)

**Inputs (mm unless noted):**

| Field | Laravel | Excel Roll |
|-------|---------|------------|
| Reel width | `roll-real-width` | C13 |
| Cut-off (repeat) | `roll-cut-off` | C14 |
| Extra printing trim | `roll-extra-printing-trim` | C15 |
| Pieces per cut | `roll-pieces-per-cut` | C16 |
| Number of ups | `numberOfUpsRoll` | C17 |

**Derived (engine — match Excel I35, E35–E39):**

```
film_density_g_cm3     = total_gsm / total_micron          // when total_micron > 0
square_meter_per_kg    = 1000 / total_gsm
printing_web_width_mm  = (reel_width_mm × number_of_ups) + extra_printing_trim_mm
pieces_per_kg          = (1000 / (reel_width_mm × cut_off_mm × total_gsm × 1e-6)) × pieces_per_cut
grams_per_piece        = 1000 / pieces_per_kg
linear_m_per_kg_web    = (square_meter_per_kg / printing_web_width_mm) × 1000   // E38 — press/web
linear_m_per_kg_reel   = (square_meter_per_kg / reel_width_mm) × 1000           // E39 — hidden-field / LM orders
order_meters_web       = order_kg × linear_m_per_kg_web                         // process run hours
```

### 7.2 Sleeve (`productType = sleeve`) — Shrink Sleeves template

Same width chain as roll with sleeve field names:

```
printing_web_width_mm = (real_width_mm × number_of_ups) + extra_printing_trim_mm
pieces_per_kg         = (1000 / (real_width_mm × cut_off_mm × total_gsm × 1e-6)) × 1
linear_m_per_kg_web   = (sqm_per_kg / printing_web_width_mm) × 1000
linear_m_per_kg_reel  = (sqm_per_kg / real_width_mm) × 1000
```

### 7.3 Pouch (`productType = bag-pouch`)

| Field | Laravel |
|-------|---------|
| Open width | `open-width` |
| Open height | `open-height` |
| Number of ups | `no_of_ups` |
| Extra printing trim | `extra-printing-trim` |
| Lay-flat (optional) | `lay-flat-value` |
| Zipper | `zipper-*` fields — Phase 1.1 if not in first ship set |

```
printing_web_width_mm = (open_width_mm × number_of_ups) + extra_printing_trim_mm
pieces_per_kg         = (1000 / (open_width_mm × open_height_mm × total_gsm × 1e-6)) × 1
linear_m_per_kg_web   = (sqm_per_kg / printing_web_width_mm) × 1000
linear_m_per_kg_reel  = (sqm_per_kg / open_height_mm) × 1000   // Laravel hidden-field uses open_height for pouch
```

### 7.4 Order quantity unit conversion → kg

Laravel `#units` → `orderQuantityInKgs`:

| Unit | Formula |
|------|---------|
| `kgs` | `order_qty` |
| `sqm` | `order_qty / square_meter_per_kg` |
| `kpcs` | `order_qty × grams_per_piece` |
| `lm` | `order_qty / linear_m_per_kg_reel` |
| `roll_500_lm` | `(order_qty / linear_m_per_kg_reel) × 500` |

Then: `order_kpcs = (order_kg × 1000) / grams_per_piece`, `order_meters = order_kg × linear_m_per_kg_web`.

**ES V1:** Slab table primary unit = **kg**. Alternate unit columns (per kpcs, sqm, lm) on sale price grid = **admin visibility** or PDF spec only.

### 7.5 Roll after slitting (Laravel “Roll After Slitting” block)

Optional spec block — **V1 include** for roll/sleeve templates (admin full; rep sees summary on PDF if enabled).

**Inputs:** core inside diameter mm, core thickness mm, roll OD with core mm (user), OR required roll weight kg (reverse OD).

```
film_on_roll_weight_kg = ((OD/2)² - (core_ID/2)²) × π × reel_width_mm × film_density / 1e6
film_on_roll_length_m  = (film_on_roll_weight_kg × 1000 / film_density) / ((total_micron/10000) × (reel_width_mm/10)) / 100
roll_width_mm          = reel_width_mm   // display mirror
pieces_per_roll        = film_on_roll_weight_kg × pieces_per_kg
```

Reverse OD from required weight (roll): see `calculateCoreInsideRoll()` in `edit.blade.php`.

### 7.6 Process run hours (uses order_meters_web or kg by process)

| Process type | Speed basis |
|--------------|-------------|
| Extrusion | kg/hr |
| Printing / lamination | m/min → uses **printing web width** path meters |
| Pouch converting | pcs/min → uses `order_kpcs` |

**ES Decision #18:** process panel admin-only; run hours still drive `operation_per_kg` in sale price.

**ES V1 product paths:** `roll` + `pouch` + `sleeve` (Shrink Sleeves); unit grid simplified — **kg slabs primary**.

---

## 7.7 Laminate stack patterns (ES owner rules)

**Default duplex (Laminates template):**

```
PET + Ink SB + Adhesive SB + LDPE
```

**User adds metallized barrier** — typically between print side and PE sealant:

```
PET + Ink SB + Adhesive SB + Adhesive SB + Aluminium + Adhesive SB + LDPE
```

- **Aluminium** = substrate layer (foil density ~2.7)
- **Adhesive SB** = solvent-based lamination adhesive (not solventless)
- All **microns variable** on canvas — seed values are hints only

**Quick-add UI (V1):** “Insert Alu barrier” inserts 3 rows before PE sealant layer.

---

## 8. Duplicate vs re-quote

**Laravel `duplicate()`:** copies all fields including **frozen** `cost-per-kg-input` values.

**ES `requote`:** copy structure + microns + dimensions + process flags; **refresh** cost/kg from tenant library today.

---

## 9. Explicitly defer to ES Phase 2

- Actual vs Estimated (`second_array`, `third_array`)
- Bar charts in PDF
- Full 10-process matrix UI (ES: template default processes, admin edits)
- All unit columns (keep kg + optional display units later)

---

## 10. Engine port checklist

1. Layer GSM rules (substrate vs ink/adhesive) — exact
2. Solvent-mix $/m² append
3. mat_cost_kg from total_cost_m2 / total_gsm
4. Additive sale price (5 columns)
5. Operation per kg from checked processes / order_kg
6. Generic materials — **Ink SB / Ink UV** (not color SKUs); **Adhesive SB** for laminates
7. Solvent-mix UI **auto** when any SB ink/adhesive; **off** for UV-only stacks
8. Golden tests from known Laravel row inputs
