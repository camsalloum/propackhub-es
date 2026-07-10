# Packaging cost — PEBI ↔ Estimation Studio (plan)

**Status:** Planning only (no implementation yet)  
**Last updated:** 2026-07-10 (pre-implementation review — PB average-cost rule + agent notes)  
**Scope:** Outbound logistics packaging — **not** laminate structure, **not** pouch hardware (zipper/spout).  
**Audience:** Any agent implementing PEBI sync, ES master data, engine, or estimate UI.

---

## 0. For agents — PB ↔ ES concept (read first)

### 0.1 What each system does

| System | Role in packaging |
|--------|-------------------|
| **PEBI (PB)** | **Price authority.** Oracle `fp_actualrmdata` (stock SKUs), `maincost` / `purchaseprice`, `mainunit` (kgs, rol, mtr, pcs). Many Oracle SKUs → few ES catalog keys via crosswalk. |
| **Estimation Studio (ES)** | **Quantity + costing engine.** Computes how much packaging the job needs (rolls, m, m², cartons, pallets) from product geometry and user inputs. Multiplies quantities × **PB unit prices** → `packagingCostPerKg` inside **Total RM**. |

**Estimation rule (owner, mandatory):** always use the **average cost from PB** and reflect it in ES. Do **not** hardcode audit snapshot prices or legacy seed placeholders in production costing.

### 0.2 Price selection policy (same as substrates / solvents)

Follow `apps/estimation-studio/docs/PEBI_ES_RM_SYNC_SPEC.md` **§L4** and existing catalog builders (`pebi-es-solvent-catalog.js`, `pebi-es-pet-catalog.js`):

```
For each ES packaging key (maps to 1..N Oracle SKUs):

1. Stock-weighted combined average (preferred when qty > 0):
     combined_price_aed =
       SUM(stock_qty × maincost) + SUM(pending_order_qty × purchaseprice)
       ─────────────────────────────────────────────────────────────────
       SUM(stock_qty) + SUM(pending_order_qty)

2. Fallback when no stock/order qty:
     market_ref_price (PEBI profile MAP) if configured
     else MAX(maincost) or MAX(purchaseprice) on mapped SKUs

3. Convert AED → USD at sync boundary (tenant FX, default 3.6725)

4. Write to ES:
     marketPriceUsd  ← MAP / reference
     costPerKgUsd    ← for kg items: combined avg (estimation uses COST)
     unitPriceUsd    ← for non-kg items (pcs, rol, mtr) — see §0.3
     pricePolicy     ← 'combined_avg' | 'market_ref' | 'needs_review'
```

**Estimation uses `cost` (combined average when stock exists), not a one-off PO line or a static seed value.**

**No numeric fallback in packaging engine (hard rule):** If a line has no synced price (`pricePolicy = needs_review` or `unitPriceUsd` / `costPerKgUsd` null or ≤ 0), `packaging-costing.ts` must **not** substitute a placeholder (contrast: `solvent-costing.ts` uses `DEFAULT_SOLVENT_PRICE = 1.54` — **do not copy that**). The line contributes **$0** to Total RM and the UI shows **“needs review”** / unpriced. Mirror solvents for **UI layout and RM rollup**, not for silent default prices.

**Estimate-level warning (not optional):** `needs_review` on any packaging line must trigger a **visible warning banner on the estimate** (e.g. top of editor or above Total RM) — not only a small badge on the line. Copy must make clear that packaging is unpriced and the quote must not be sent until resolved. Goal: prevent a $0 pallet/carton line from slipping through on a customer-facing quote.

Illustrative audit figures in §3 (e.g. ~$1.37/kg LD film) are **decision support only** — live estimates must use synced tenant rows after `family=PACKAGING` pull.

### 0.3 Unit of measure (critical — not all packaging is $/kg)

PB `mainunit` for Packing Materials is mixed:

| PB unit | ES packaging role | Engine uses |
|---------|-------------------|-------------|
| **kgs** | LD roll wrap film | `costPerKgUsd` × kg consumed |
| **mtr** | Paper core | `unitPriceUsd` ($/m) × metres |
| **rol** | Stretch wrap | `unitPriceUsd` ($/roll) × fraction of roll |
| **pcs** | Carton, pallet | `unitPriceUsd` ($/pc) × count |

**Implementation gap:** `materials` table today only has `costPerKgUsd`. Packaging Phase 2 must add **`priceUnit`** + **`unitPriceUsd`** (or equivalent jsonb on packaging materials) so the engine never treats a **$4.63/pallet** as **$4.63/kg**.

Legacy seeds (`packaging-pallet` @ $1.5/kg as fake substrate) are **wrong** and must be retired.

### 0.4 Data flow (end-to-end)

```
Oracle fp_actualrmdata (61 Packing Materials SKUs)
        │
        ▼
pebi-es-packaging-crosswalk.json   ← many SKUs → few ES keys
        │
        ▼
pebi-es-packaging-catalog.js       ← combined_avg per key + priceUnit
        │
        ▼
GET /api/integration/es/materials?family=PACKAGING
        │
        ▼
pebi-material-sync.ts (ES)           ← tenant materials rows
        │
        ▼
packaging-costing.ts (engine)      ← qty from geometry × synced unit price
        │
        ▼
EstimateEditor packagingCostLines   ← breakdown like solvents
        │
        ▼
materialCostPerKg (Total RM)       ← markup applies
```

### 0.5 What ES owns vs what PB owns

| ES owns | PB owns |
|---------|---------|
| Product recipes (roll / sleeve / pouch-bag lines) | SKU list + live prices |
| Geometry (OD, LF, roll weight, m² wrap) | `mainunit` per SKU |
| User inputs (`loadPerPalletKg`, `cartonsPerPallet`, layers) | Stock-weighted average cost |
| `packaging-costing.ts` formulas | `market_ref_price` when no stock |
| UI breakdown lines | Oracle item codes in crosswalk |

---

## 1. Executive summary

Packaging is a **separate costing block** — **same UX as solvents** (config bar + line breakdown). Not in the layer stack. Costs fold into **Total RM** with markup.

**Prices:** PB **`family=PACKAGING`** sync → **combined weighted average** per ES key (§0.2).

**Owner rules (locked):**

| Product | Lines |
|---------|--------|
| **Roll** | Core + LD roll wrap (dimension-based) + stretch wrap + pallet |
| **Sleeve** | Core @ 600 mm OD + carton (1 roll/carton @ 600 OD) + stretch + pallet |
| **Pouch / Bag** | Carton + stretch + pallet — no core, no LD roll wrap |

**Pallet counting:**

| Product | Driver |
|---------|--------|
| **Roll** | `loadPerPalletKg` (default 800) ÷ `totalRollWeightKg` |
| **Sleeve** | `cartonsPerPallet` (default TBD, user-editable) |
| **Pouch / Bag** | `cartonsPerPallet` (default TBD, user-editable) |

---

## 2. UI / engine pattern (mirror solvents)

| Solvent today | Packaging (target) |
|---------------|-------------------|
| `solventConfigBar` | `packagingConfigBar` |
| `solventCostLines` | `packagingCostLines` — show **qty, unit, unit price (PB avg), line $/kg** |
| `solventCostPerKg` | `packagingCostPerKg` |
| Inside `materialCostPerKg` | Same |
| (no estimate banner today) | **`needs_review` → estimate warning banner** (§0.2) — blocks silent $0 quotes |

Each line should display the **synced PB average** used (and `pricePolicy` when `needs_review`).

---

## 3. PEBI stock (summary)

**61 SKUs** — category **Packing Materials**. Audit: `apps/pph/server/scripts/audit-packaging-pb.js`.

| ES role | PB examples | PB unit | Illustrative audit avg* |
|---------|-------------|---------|-------------------------|
| LD roll wrap | `BFLRLN640010-001` | kgs | ~$1.37/kg |
| Stretch wrap | `BPSTR2050500` 50×500 m | rol | ~$7.90/roll |
| Paper core | `FXXPKCRPPR76012M` | mtr | ~$1.93/m |
| Carton | `FXXPKCTN*` / `BPK*` | pcs | varies by size |
| Pallet | `BXXWOODENPLT14` | pcs | ~$4.63/pc |

\* **Not for costing** — live `combined_avg` from sync only (§0.2).

---

## 4. Shared constants & roll weight

```ts
DEFAULT_TARGET_OD_MM = 600   // sleeve carton + sleeve core reference OD
```

```
rollWeightKg = rollSpec.totalRollWeightKg   // film + core — pallet load math
```

Reuse `@es/engine` `computeRollSpec` / `RollSpecResult` (`roll-after-slitting.ts`).

---

## 5. Product recipes

### 5.1 Roll

| # | Line | Quantity | Price from PB |
|---|------|----------|---------------|
| 1 | Core | `filmOnRollLengthM × rollsInOrder` (m) | **avg $/m** (core φ family) |
| 2 | Roll wrap | kg + m² per roll (§7) × rolls | **avg $/kg** (LD film) |
| 3 | Stretch wrap | fraction × pallets (§8) | **avg $/roll** |
| 4 | Pallet | pallets in order | **avg $/pc** |

```
rollsInOrder      = orderQuantityKg / rollWeightKg
loadPerPalletKg   = user input (default 800)
palletsInOrder    = ceil(orderQuantityKg / loadPerPalletKg)
palletCostPerKg   = (palletsInOrder × palletUnitPriceUsd) / orderQuantityKg
```

### 5.2 Sleeve

| # | Line | Quantity | Price from PB |
|---|------|----------|---------------|
| 1 | Core | length from roll spec @ **600 mm OD** (m) | **avg $/m** |
| 2 | Carton | 1 roll per carton | **avg $/pc** |
| 3 | Stretch wrap | fraction × pallets | **avg $/roll** |
| 4 | Pallet | pallets in order | **avg $/pc** |

```ts
sleevePackRollSpec = computeRollSpec({
  driver: 'od',
  rollOutsideDiameterMm: 600,
  reelWidthMm: layFlatMm,
  cutoffMm, totalGsm, filmDensityGcm3,
  coreInsideDiameterMm, coreThicknessMm,
});
sleeveRollWeightKg = sleevePackRollSpec.totalRollWeightKg;
```

```
sleeveRollsInOrder  = ceil(orderQuantityKg / sleeveRollWeightKg)
cartonsNeeded       = sleeveRollsInOrder
cartonsPerPallet    = user input (default TBD)
palletsInOrder      = ceil(cartonsNeeded / cartonsPerPallet)
```

### 5.3 Pouch / Bag

| # | Line | Quantity | Price from PB |
|---|------|----------|---------------|
| 1 | Carton | `ceil(pieces / pcsPerCarton)` | **avg $/pc** |
| 2 | Stretch wrap | fraction × pallets | **avg $/roll** |
| 3 | Pallet | pallets in order | **avg $/pc** |

```
cartonsPerPallet  = user input (default TBD)
palletsInOrder    = ceil(cartonsNeeded / cartonsPerPallet)
```

---

## 6. Core costing (roll + sleeve)

**Roll:** live roll spec. **Sleeve:** **600 mm OD** reference spec.

```
coreCostJob     = coreLengthM × coreUnitPriceUsdPerM    // PB avg $/m
coreCostPerKg   = coreCostJob / orderQuantityKg
```

Core SKU family from reel width / LF → PB crosswalk (76 / 77 / 152 mm groups). **Price each φ family separately** — do not average 76 mm and 152 mm cores into one number.

---

## 7. LD roll wrap — roll only (dimension-based qty, PB avg price)

**Quantity** from geometry; **price** from PB combined avg $/kg.

```
circumferenceM  = π × (rollOdMm / 1000)
filmLengthM     = circumferenceM × wrapPasses
wrapAreaM2      = filmLengthM × (wrapFilmWidthMm / 1000)
wrapKgPerRoll   = (wrapAreaM2 × wrapGsm) / 1000

rollWrapCostJob = rollsInOrder × wrapKgPerRoll × ldFilmCostPerKgUsd   // PB avg
```

Expose m² and kg per roll on the line (like solvent g/m²).

---

## 8. Stretch wrap — fraction of roll (all palletized products)

**Quantity** = fraction of one roll per pallet. **Price** = PB avg **$/roll** × fraction.

```
filmLengthPerPalletM  = (2×(L+W) + L) × wrapLayers    // default L=W=1 m, layers=4
stretchFraction       = filmLengthPerPalletM / 500       // 500 m roll length
stretchCostPerPallet  = stretchFraction × stretchRollUnitPriceUsd
```

Do **not** convert stretch roll to $/kg for costing unless showing an equivalent in the UI.

---

## 9. Carton costing

**Sleeve:** `cartonsNeeded = sleeveRollsInOrder` (1 roll @ 600 OD per carton).  
**Pouch/bag:** `ceil(piecesInOrder / pcsPerCarton)`.

```
cartonCostJob = cartonsNeeded × cartonUnitPriceUsdPerPc   // PB avg for selected/default carton key
```

**v1 carton price:** stock-weighted **avg $/pc** across SKUs mapped to `packaging-carton-default` (or user-selected carton material). **v2:** size table matched to 600 OD / piece count.

---

## 10. Estimate fields (new)

| Field | Default | Used by |
|-------|---------|---------|
| `loadPerPalletKg` | 800 | Roll |
| `cartonsPerPallet` | TBD (e.g. 20) | Sleeve, pouch, bag |
| `pcsPerCarton` | template | Pouch, bag |
| `ldWrapPasses` | 2 | Roll |
| `ldWrapFilmWidthMm` | 500 | Roll |
| `stretchWrapLayers` | 4 | All palletized |
| `palletFootprintLm` / `Wm` | 1.0 / 1.0 | Stretch default |
| `packaging*MaterialId` | template defaults | Per line |

Material IDs resolve to tenant rows with **synced PB averages** (§0.2).

---

## 11. Owner decisions (locked)

| # | Decision |
|---|----------|
| C1 | Pouch/bag: carton + stretch + pallet; `cartonsPerPallet` user-editable |
| C2 | Sleeve: `cartonsPerPallet`; roll keeps `loadPerPalletKg` |
| C3 | Sleeve carton: 1 roll @ 600 mm OD; weight from `computeRollSpec` |
| C4 | LD wrap: actual dimensions → m² + kg; **PB avg $/kg** for price |
| C5 | Stretch: fraction of roll; default 1×1 m pallet logic |
| C6 | Sleeve core: 600 mm OD wound roll length |
| C7 | Inside Total RM with markup |
| C8 | Pallet load uses `totalRollWeightKg` |

---

## 12. PEBI → ES sync (implementation spec)

### 12.1 Deliverables

| Deliverable | Status |
|-------------|--------|
| `audit-packaging-pb.js` | Done |
| `pebi-es-packaging-crosswalk.json` | Planned |
| `pebi-es-packaging-catalog.js` | Planned — **`fetchInventoryPricing` pattern** from solvent catalog |
| `family=PACKAGING` on `integration/es.js` | Planned |
| `PEBI_SYNC_FAMILIES` + `pebi-material-sync.ts` | Planned |
| `priceUnit` + `unitPriceUsd` on materials (schema) | Planned — required |

### 12.2 v1 catalog keys

| ES key | PB cluster | `priceUnit` | Avg rule |
|--------|------------|-------------|----------|
| `packaging-ld-wrap-film` | `BFLRLN*` LD transparent | `kgs` | combined_avg → `costPerKgUsd` |
| `packaging-stretch-wrap-roll` | `BPSTR*` stretch | `rol` | combined_avg → `unitPriceUsd` |
| `packaging-core-76` / `77` / `152` | core SKUs by φ | `mtr` | combined_avg per family |
| `packaging-pallet-wood` | `BXXWOODEN*` / `BPK*` pallets | `pcs` | combined_avg |
| `packaging-carton-default` | mapped carton SKUs | `pcs` | combined_avg across cluster |

Catalog response must include: `priceUnit`, `unitPriceUsd`, `costPerKgUsd` (when kg), `pricePolicy`, `oracleSkus[]`, `hasStock`.

### 12.3 ES material rows

- `type: 'packaging'` (use `itemClassForMasterMaterial` → `'packaging'`).
- Retire legacy `packaging-wraping-film`, `packaging-paper-sheet`, `packaging-pallet` substrate placeholders.
- **`catalog_source=pebi` cutover:** owner sign-off only (same gate as solvents).

### 12.4 Update cross-doc

When implementing, amend `PEBI_ES_RM_SYNC_SPEC.md` §3.3 — `packing_materials` is no longer “skip v1”; it becomes `type: packaging` via `family=PACKAGING`.

---

## 13. Implementation phases

| Phase | Work |
|-------|------|
| **1** | Crosswalk + catalog + `family=PACKAGING` API (**combined_avg + priceUnit** in API payload) |
| **2** | ES schema (`priceUnit`, `unitPriceUsd`) + master seeds + sync handler — **required before Phase 3** |
| **3** | `packaging-costing.ts` — qty × synced unit price; **no numeric fallback** |
| **4** | Estimate UI — `packagingConfigBar` + `packagingCostLines` (show PB avg); **banner if `needs_review`** |
| **5** | Template defaults + integration tests |
| **6** | Optional: carton size table, `needs_review` panel in Master Data |

---

## 14. Open items (minor)

| Item | Note |
|------|------|
| Default `cartonsPerPallet` | Suggest **20** unless plant says otherwise |
| Sleeve carton SKU vs 600 OD | v2 size matching |
| LD film GSM default | ~25 g/m² if not on PB row |

---

## 15. Agent review — comments before implementation

*Written for the next agent. Resolve or escalate before Phase 1 merge.*

### 15.1 Confirmed correct in plan

- Separate block like solvents; not layer stack; inside Total RM.
- Product-line matrix (roll / sleeve / pouch-bag) matches owner rules.
- Geometry from `computeRollSpec`; sleeve fixed at 600 mm OD for pack/carton/core reference.
- Pallet math uses `totalRollWeightKg` for roll kg-load.
- Stretch as fraction of 500 m roll with 1×1 m default footprint.

### 15.2 Must fix during implementation

| # | Issue | Action |
|---|--------|--------|
| **R1** | Plan §3 audit prices could be mistaken for costing inputs | Engine/UI **only** read tenant synced materials; document in code comments |
| **R2** | `costPerKgUsd` alone cannot price pallets/cartons/stretch rolls | Add `priceUnit` + `unitPriceUsd`; packaging engine branches on unit. **Hard blocker before Phase 3.** |
| **R3** | Legacy seeds model packaging as substrate @ fake $/kg | Delete/replace in seed; migration remap any template refs |
| **R4** | 16+ carton SKUs | v1: weighted avg $/pc on crosswalk cluster; expose `needs_review` if unpriced |
| **R5** | Core SKUs span multiple diameters | Separate ES keys per φ; map from `coreInsideDiameterMm` — never one blended core price |
| **R6** | `PEBI_ES_RM_SYNC_SPEC` still says packing_materials skip v1 | Update spec when PACKAGING ships |
| **R7** | `integration/es.js` has no PACKAGING branch yet | Mirror SOLVENT handler wiring |
| **R8** | Solvent module has `DEFAULT_SOLVENT_PRICE = 1.54` silent fallback | Packaging engine: **zero + needs_review**, never a made-up unit price |
| **R9** | Roll pallet math is kg-based; sleeve/pouch/bag is carton-based | Separate code paths — do not reuse `loadPerPalletKg` for non-roll products |
| **R10** | $0 unpriced lines easy to miss on busy quotes | **Estimate-level warning banner** when any packaging line is `needs_review` (§0.2) — not badge-only |

### 15.3 Design notes (non-blocking)

| # | Note |
|---|------|
| **N1** | Sleeve `layFlatMm` for 600 OD spec must come from sleeve dimensions on the estimate, not printing web width |
| **N2** | Show `pricePolicy: needs_review` on packaging lines when PB has no stock and no market_ref — same pattern as PET review panel |
| **N3** | `cartonsPerPallet` for sleeve is independent of `sleeveRollWeightKg`; pallet count is carton-based, not kg-based (unlike roll) |
| **N4** | Pouch/bag pallet count does not use `loadPerPalletKg`; only roll does |
| **N5** | After PACKAGING sync, add packaging family to delayed coordinator (`PEBI_ES_SYNC_DELAY_MS`) like other families |
| **N6** | Unit tests: mock material with `unitPriceUsd` + `priceUnit`, assert line $/kg — do not test with hardcoded $1.37/kg |

### 15.4 Reference implementations (copy patterns)

| Pattern | File |
|---------|------|
| Combined avg pricing | `apps/pph/server/services/pebi-es-solvent-catalog.js` → `fetchInventoryPricing` |
| ES sync write | `apps/estimation-studio/packages/server/src/services/pebi-material-sync.ts` |
| Separate costing module | `apps/estimation-studio/packages/engine/src/solvent-costing.ts` |
| Estimate UI block | `EstimateEditor.tsx` → `#solvent-costing` |
| Price policy spec | `apps/estimation-studio/docs/PEBI_ES_RM_SYNC_SPEC.md` §L4 |

### 15.5 Out of scope (do not implement in v1)

- Interleaf / separator sheets (not in owner rules)
- 2-ply carton roll stock as sleeve carton
- CRM `crm_customer_packaging_profile` integration
- Converting all packaging to $/kg “equivalents” in master data (keep native units)

---

## 16. Related files

| Area | Path |
|------|------|
| Plan (this doc) | `platform/docs/PACKAGING_COST.md` |
| PB ↔ ES price spec | `apps/estimation-studio/docs/PEBI_ES_RM_SYNC_SPEC.md` |
| PB audit | `apps/pph/server/scripts/audit-packaging-pb.js` |
| Roll spec | `packages/engine/src/roll-after-slitting.ts` |
| Solvent pattern | `solvent-costing.ts`, `EstimateEditor.tsx` |
| Legacy seeds (retire) | `master-materials-seed.json` `packaging-*` |

---

## 17. Next step

**Phase 1:** `pebi-es-packaging-crosswalk.json` + `pebi-es-packaging-catalog.js` with **combined_avg** + **priceUnit**, wire `family=PACKAGING` on PEBI integration API.
