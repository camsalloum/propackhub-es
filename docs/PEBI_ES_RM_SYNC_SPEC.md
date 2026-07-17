# PEBI → ES raw materials sync — mapping & integration spec

**Status:** Spec — implement after [MATERIALS_CATALOG_UNIFICATION_PLAN.md](./MATERIALS_CATALOG_UNIFICATION_PLAN.md) Phase 1  
**Created:** 2026-07-07  
**Products:** PEBI (`apps/pph/`) · Estimation Studio (`apps/estimation-studio/`)  
**Audience:** Backend agents implementing IP/FP RM price sync  
**Related:** [API_MASTER_DATA.md](./API_MASTER_DATA.md) · `pebi-customer-sync.ts` · PEBI `GET /tds/live-materials`

---

## 0. Why “deep integration” is required

A naive sync (`mainitem` → `external_id`, `purchaseprice` → `costPerKgUsd`) **will fail** for flexible packaging:

| ES needs | PEBI has (multiple sources) |
|----------|----------------------------|
| `type` (substrate / ink / adhesive / …) | `mes_category_mapping.material_class` |
| `substrateFamily` (PET, BOPP, PE, …) | Oracle `category`, `itemgroup`, TDS profile |
| `substrateGrade` (e.g. **PET Transparent**) | `brand_grade`, `cat_desc`, `maindescription` |
| `hoover` (treatment: chemical, metalized, …) | TDS params, description tokens, `mes_spec_substrates` |
| `platform_master_key` (e.g. `pet-transparent`) | **No native field** — must be derived via crosswalk |
| `density`, `solidPercent` | TDS / spec tables (micron is **estimate layer**, not material row) |
| `costPerKgUsd` | `fp_actualrmdata.maincost`, `purchaseprice`, weighted avg |

**12 µm PET Transparent** in ES is one **canonical grade** (`pet-transparent`). In PEBI there may be **many Oracle item codes** (warehouse, supplier, width stock) that roll up to that grade. Sync must **classify → normalize → aggregate price → map to ES key**.

---

## 1. Design goals

1. **Stable ES identity** — `platform_master_key` + `substrateFamily` + `substrateGrade` stay consistent for templates (`ref_material_key: "pet-transparent"`).
2. **PEBI is price authority** for `catalog_source = pebi` tenants — not family/grade taxonomy (taxonomy is aligned once, then prices flow).
3. **Explicit crosswalk** — no silent fuzzy match in production; ambiguous rows go to a review queue.
4. **Idempotent sync** — re-run safe; audit what changed (price, mapping version).
5. **Micron is not synced** — thickness stays on estimate **layers**; materials are grade-level SKUs.

---

## 2. Canonical ES material model (target)

From `master-materials-seed.json` / `materials` table:

```json
{
  "key": "pet-transparent",
  "name": "PET Transparent",
  "type": "substrate",
  "substrateFamily": "PET",
  "substrateGrade": "PET Transparent",
  "hoover": "Normal Chemical Treated",
  "density": 1.4,
  "solidPercent": 100,
  "costPerKgUsd": 2.15,
  "platformMasterKey": "pet-transparent",
  "externalSource": "pebi",
  "externalId": "<pebi canonical item or grade key>"
}
```

**Matching priority for upsert (tenant `materials`):**

1. `external_source = 'pebi'` AND `external_id = <pebi_grade_key>`
2. Else `platform_master_key = <es_key>`
3. Else legacy: `substrateFamily` + `substrateGrade` + `hoover` (same as `seed-materials.ts` `substrateIdentityKey`)

---

## 3. PEBI source data (read paths)

### 3.1 Operational RM lines — `fp_actualrmdata`

Used today by `GET /tds/live-materials` (see `tds.js`).

| Column | Use in sync |
|--------|-------------|
| `mainitem` | Oracle item code (unique stock SKU) |
| `maindescription` | Parse tokens for grade/treatment |
| `category` | → `mes_category_mapping` → `material_class` |
| `catlinedesc` | Sub-family hint |
| `itemgroup` | Family hint (BOPP, PET, …) |
| `maincost` / `purchaseprice` | Price candidates (USD/kg after FX — confirm) |
| `mainunit` | Must normalize to kg |

### 3.2 TDS / spec — `mes_material_tds` + category spec tables

| Field | Use |
|-------|-----|
| `oracle_item_code` | Join to `fp_actualrmdata.mainitem` |
| `brand_grade` | Primary grade label candidate |
| `cat_desc` | Category description |
| `material_code` | Internal code |
| `mes_spec_substrates.*` | Density, treatment when present |

### 3.3 Category mapping — `mes_category_mapping`

Maps Oracle `category` → PEBI `material_class` (`substrates`, `inks`, `adhesives`, …).

**ES `type` mapping:**

| PEBI `material_class` | ES `type` |
|----------------------|-----------|
| `substrates` | `substrate` |
| `inks` | `ink` |
| `adhesives` | `adhesive` |
| `solvents` | `solvent` |
| `packing_materials` | `packaging` via `family=PACKAGING` (UOM-aware: kgs/mtr/rol/pcs) |
| `mounting_tapes` + selected `consumables` | `family=CONSUMABLES` — two averaged groups (mounting tape + other); see `platform/docs/CONSUMABLES_COST.md` |
| `resins` | skip v1 (not in ES laminate editor) |

### 3.5 PEBI substrate taxonomy (not a spreadsheet)

| Layer | Location | Role |
|-------|----------|------|
| **Profiles (authoritative)** | `mes_material_profile_configs` — `material_class`, `cat_desc`, `appearance`, `mapped_material_keys[]` | Grades, prices, ES key mapping at runtime |
| **Oracle lines** | `fp_actualrmdata.maindescription` | Stock SKU text |
| **UI lookup** | `apps/pph/src/utils/substrateMapping.js` | Maps known `maindescription` → family + grade for Item Master filters/display |

Phase 4 family-by-family crosswalk uses **live Item Master profiles** (`cat_desc` per family), validated with IP/FP — not any external Excel file.

### 3.6 Substrate profile routing (PEBI)

`tds.js` already routes substrates to profiles (`substrates_pet`, `substrates_bopp`, …) via regex on descriptions.

**Reuse this logic** (extract to shared module `pebi-rm-classifier.js`) instead of re-inventing in ES.

---

## 4. Mapping pipeline (four layers)

```text
PEBI raw row (fp_actualrmdata + TDS join)
        │
        ▼
[L1] Classify ──► ES type + substrateFamily (PET, BOPP, …)
        │
        ▼
[L2] Normalize grade ──► ES substrateGrade string (canonical)
        │
        ▼
[L3] Resolve ES key ──► platform_master_key (crosswalk table)
        │
        ▼
[L4] Price roll-up ──► costPerKgUsd per ES key (policy)
        │
        ▼
Upsert tenant materials (external_source=pebi)
```

### L1 — Classify (family + type)

**Inputs:** `category`, `itemgroup`, `catlinedesc`, `maindescription`, TDS `brand_grade`

**Outputs:**

- `es_type`
- `es_substrate_family` — must be one of ES families: `PET`, `BOPP`, `PE`, `CPP`, `PA`, `ALU`, `PAPER`, `SPECIALTY`, `Packaging`, …
- `pebi_profile_key` — e.g. `substrates_pet` (for debugging)

**Rules:**

1. `mes_category_mapping.material_class` → ES `type` (§3.3).
2. For substrates, run PEBI profile matcher (`SUBSTRATE_PROFILE_RULES` in `tds.js`) on concatenated description.
3. Fallback: parse `itemgroup` / first token of `category`.
4. If confidence &lt; threshold → `mapping_status = needs_review`.

### L2 — Normalize grade (canonical label)

Map PEBI free text → ES `substrateGrade` (and `hoover` where applicable).

**Examples (IP/FP — to be confirmed in workshop):**

| PEBI `brand_grade` / description tokens | ES `substrateGrade` | ES `hoover` |
|-------------------------------------------|---------------------|-------------|
| `PET TR CLEAR`, `BOPET TRANSPARENT` | PET Transparent | Normal Chemical Treated |
| `PET TR HR`, `HEAT RESISTANT` | PET Transparent HR | Heat resistant Chemical Treated |
| `PET MET`, `METALIZED` | PET Metalized | — |
| `BOPP CLEAR` | BOPP Transparent | — |

**Implementation:**

- New table **`pebi_es_grade_rules`** (or JSON rules file versioned in repo for v1):
  - `pebi_pattern` (regex)
  - `es_substrate_family`
  - `es_substrate_grade`
  - `es_hoover` (nullable)
  - `priority` (specific rules first)

- Normalizer function: first matching rule wins; log rule id on match.

### L3 — Resolve `platform_master_key` (crosswalk)

Bridge normalized grade → ES catalog key (`pet-transparent`, `bopp-transparent`, …).

**New table: `pebi_es_material_crosswalk`** (PEBI DB or shared platform DB):

| Column | Purpose |
|--------|---------|
| `id` | PK |
| `company_code` | `interplast` (tenant-specific overrides allowed) |
| `es_platform_master_key` | e.g. `pet-transparent` |
| `es_substrate_family` | PET |
| `es_substrate_grade` | PET Transparent |
| `es_hoover` | optional disambiguator |
| `pebi_grade_key` | stable sync id, e.g. `PET|PET Transparent|Normal Chemical Treated` |
| `pebi_oracle_item_codes` | jsonb array — optional many-to-one |
| `mapping_status` | `active` \| `needs_review` \| `deprecated` |
| `verified_by` | user id |
| `verified_at` | timestamp |

**Bootstrap crosswalk:**

1. Export ES `master-materials-seed.json` substrates → generate initial rows (`es_*` filled).
2. Workshop with IP/FP master-data owner: map top 30 grades used in estimates.
3. Script: suggest PEBI items per grade from `live-materials` search API.

**Many Oracle items → one ES key:** store all `mainitem` codes in `pebi_oracle_item_codes`; price roll-up at grade level (L4).

### L4 — Price selection policy

For each `pebi_grade_key` / `es_platform_master_key`:

| Field | Source |
|-------|--------|
| `marketPriceUsd` | Always PEBI `market_ref_price` (profile MAP) |
| `costPerKgUsd` | **No stock** on mapped Oracle items → `costPerKgUsd = marketPriceUsd` |
| `costPerKgUsd` | **In stock** (attached items with qty) → combined weighted avg (stock + on-order) |

**Default in platform catalog:** seed and publish with `costPerKgUsd = marketPriceUsd` until PEBI sync sees stock.

**ES-only grades:** add matching `cat_desc` profile in PEBI Item Master (same name as ES `substrateGrade`); no Oracle SKU required to start — market price drives costing until first purchase/stock.

**Currency:** PEBI costs in AED for IP/FP — convert to **USD** for ES engine using tenant FX.

**Synced from PEBI (PET live sync):**

- `marketPriceUsd` ← `market_ref_price`
- `costPerKgUsd` ← rule above
- `density`, `solidPercent` ← profile `density_g_cm3` / `solid_pct`, else item-master averages
- `price_source = 'pebi'`, `platform_synced_at`

**Not built yet (Phase 4 live sync):** ~~`GET /api/integration/es/materials`, `pebi-material-sync.ts`~~ **PET shipped 2026-07-08** — `GET /api/integration/es/materials?family=PET`, `pebi-material-sync.ts`, `POST /api/v1/integration/pebi/sync-materials`, CLI `npm run db:sync-materials-pebi`. Other families (BOPP, …) follow same pattern.

---

## 5. Integration API

### 5.1 PEBI → ES (new)

```
GET /api/integration/es/materials
Headers: X-PPH-Integration-Key, X-PPH-Company-Code
Query:  since_version? (optional)
```

**Response shape (normalized grades, not raw Oracle rows):**

```json
{
  "success": true,
  "companyCode": "interplast",
  "catalogVersion": 12,
  "materials": [
    {
      "pebiGradeKey": "PET|PET Transparent|Normal Chemical Treated",
      "esPlatformMasterKey": "pet-transparent",
      "type": "substrate",
      "substrateFamily": "PET",
      "substrateGrade": "PET Transparent",
      "hoover": "Normal Chemical Treated",
      "costPerKgUsd": 2.0,
      "pricePolicy": "purchase_price",
      "oracleItemCodes": ["12345", "12346"],
      "mappingStatus": "active",
      "mappedAt": "2026-07-07T12:00:00Z"
    }
  ],
  "unmapped": [
    { "mainitem": "99999", "reason": "no_crosswalk", "sampleDescription": "..." }
  ]
}
```

Implementation: **PEBI server** runs L1–L4; ES does not re-parse Oracle text.

### 5.3 ES auto-sync (Oracle cron aligned)

PEBI cron jobs write `company_settings.rm_last_sync` (RM, ~every 2h) and `oracle_last_sync` (sales/customers, nightly).

| PEBI event | ES action |
|------------|-----------|
| RM sync complete | push `{ source: 'rm' }` → ES schedules material sync **15 min after** `rm_last_sync.completedAt` |
| Oracle sync complete | push `{ source: 'oracle' }` → ES schedules customer sync **15 min after** `oracle_last_sync.completedAt` |

Material and customer ES syncs run **one at a time** (queued). Poll fallback uses the same delay. Env: `PEBI_ES_SYNC_DELAY_MS=900000` (default 15 min).

PEBI: `GET /api/integration/es/oracle-sync-status` — ES poll source.

```
POST /api/v1/integration/pebi/sync-materials
Auth: tenant_admin JWT or cron service key
```

Calls PEBI integration API → upserts tenant `materials` → returns `{ inserted, updated, skipped, unmappedCount }`.

Mirror: `pebi-material-sync.ts` (same structure as `pebi-customer-sync.ts`).

---

## 6. ES UI behavior (`catalog_source = pebi`)

| Field | Editable in ES? |
|-------|-----------------|
| Price | No — “Synced from PEBI” |
| Family / grade / name | No (crosswalk-owned) |
| `is_tenant_only` custom rows | Yes (local specials not in PEBI) |
| Estimate layer micron | Yes (unchanged) |

**Materials page** shows: `PEBI grade key`, last sync time, linked Oracle codes (read-only drill-down).

**Unmapped queue** (platform admin + tenant admin): list `unmapped` from last sync; link to crosswalk UI (future).

---

## 7. Implementation phases

### Phase A — Extract classifier (PEBI)

- [ ] Move substrate profile + grade token rules from `tds.js` → `server/services/pebi-rm-classifier.js`
- [ ] Unit tests with real IP/FP description samples (anonymized fixtures)
- [ ] `classifyLiveMaterialRow(row) → { family, grade, hoover, confidence }`

### Phase B — Crosswalk table + bootstrap

- [ ] Migration `pebi_es_material_crosswalk`
- [ ] Seed from ES `master-materials-seed.json` (substrates + inks + adhesives)
- [ ] Admin script: `suggest-crosswalk-from-live-materials.ts`
- [ ] Workshop: verify top 30 mappings with IP/FP

### Phase C — Grade rules engine

- [ ] `pebi_es_grade_rules` (DB or versioned JSON)
- [ ] `normalizeGrade(classifierOutput) → es_substrate_grade, es_hoover`
- [ ] Tests: PET TR CLEAR → PET Transparent

### Phase D — Price roll-up + integration API

- [ ] `buildEsMaterialCatalog(companyCode)` in PEBI
- [ ] `GET /api/integration/es/materials`
- [ ] FX to USD

### Phase E — ES ingest + tenant flags

- [ ] `pebi-material-sync.ts`
- [ ] `POST /api/v1/integration/pebi/sync-materials`
- [ ] Interplast `catalog_source = pebi`
- [ ] Materials UI read-only for synced rows

### Phase F — Operations

- [ ] Nightly sync job (optional) + manual “Sync from PEBI” button
- [ ] Audit log: price changes per `es_platform_master_key`
- [ ] Alert when `unmapped.length > 0` or mapping confidence drops

---

## 8. Test cases (acceptance)

| # | Scenario | Expected |
|---|----------|----------|
| T1 | PEBI price 2.15 → 2.00 for all items mapped to `pet-transparent` | ES Interplast `materials.costPerKgUsd = 2.00` after sync |
| T2 | New Oracle item code, same grade text | Rolls into existing ES row; no duplicate |
| T3 | Unknown description | Appears in `unmapped`; ES row unchanged |
| T4 | ES template `ref_material_key: pet-transparent` | Instantiate still resolves after sync |
| T5 | Open estimate with layer snapshot 2.15 | Unchanged until re-quote / manual layer refresh |
| T6 | `is_tenant_only` row | Never touched by PEBI sync |
| T7 | Individual tenant (`catalog_source=tenant`) | PEBI sync skipped entirely |

---

## 9. Open questions (resolve with IP/FP before Phase D)

1. **Authoritative price field** — `purchaseprice` vs weighted `maincost` vs standard cost?
2. **Currency** — AED only or multi-currency items?
3. **Inks / adhesives** — same crosswalk approach or phase 2?
4. **Width / size variants** — separate Oracle items per reel width: confirm roll-up to one ES grade is correct for **estimating**.
5. **Who owns crosswalk** — ProPackHub platform admin vs Interplast `tenant_admin`?
6. **Duplicate grades in PEBI** — e.g. legacy vs new naming: merge rules?

---

## 10. Files to create (forecast)

| App | Path |
|-----|------|
| PPH | `server/services/pebi-rm-classifier.js` |
| PPH | `server/services/pebi-es-material-catalog.js` |
| PPH | `server/routes/integration/es.js` — add `GET /materials` |
| PPH | `server/migrations/mes-master-NNN-pebi-es-crosswalk.js` |
| ES | `packages/server/src/services/pebi-material-sync.ts` |
| ES | `packages/server/src/routes/integration.ts` — add sync route |
| ES | `packages/server/src/services/pebi-material-sync.test.ts` |
| Shared fixtures | `platform/fixtures/pebi-es-rm-mapping-samples.json` |

---

## 11. Relation to catalog unification

This spec is **Phase 4** of [MATERIALS_CATALOG_UNIFICATION_PLAN.md](./MATERIALS_CATALOG_UNIFICATION_PLAN.md).

- Phases 1–3 (single Materials UI, `catalog_source`, refresh) should land **before** PEBI sync goes live.
- PEBI sync **depends on** crosswalk (§4 L3) — do not ship price-only sync without grade mapping.

---

*End of spec.*
