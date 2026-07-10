# LIVE STATE — Estimation Studio

**Last updated:** 2026-07-10 (Packaging costing v1 complete)  
**Session focus:** Outbound packaging PEBI↔ES — Phases 1–6 + sleeve carton 600 OD.

---

## Where we stopped (read this first next session)

### **Last completed:** Packaging costing Phases 1–6 + sleeve 600 OD carton

Plan: **`platform/docs/PACKAGING_COST.md`**. Separate block (like solvents), inside Total RM. PB **combined_avg** only — no hardcoded prices.

| Phase | Shipped |
|-------|---------|
| **1** | PEBI crosswalk + catalog + `family=PACKAGING` |
| **2** | Migrations `0019`–`0021`; packaging seeds; sync skips unpriced |
| **3** | `packaging-costing.ts` — Roll / Sleeve / Pouch\|Bag → Total RM |
| **4** | EstimateEditor packaging UI + needs-review banner; `packagingConfig` |
| **5** | Defaults: load **800** kg/pallet, **20** cartons/pallet; merge on create/UI; tests |
| **6** | Master Data Packaging tab (unit/unit-price) + PEBI review panel |
| **+** | `packaging-carton-sleeve-600` (side ≥600 mm); pouch → `packaging-carton-default` |

Owner locks: `cartonsPerPallet` **20**; sleeve carton matched to 600 OD.

### **NEXT:** User E2E test packaging

1. Restart ES (+ PEBI if needed); ensure migrations `0019`–`0021` applied.
2. Sync `family=PACKAGING` (or wait for delayed coordinator).
3. Master Data → Packaging: 8 keys + unit prices; review list if unpriced.
4. Estimate Roll / Sleeve / Pouch — packaging in Total RM; banner if needs review.

### **Solvent policy**

| Grade | Source | Editable |
|-------|--------|----------|
| Ethyl Acetate, Methoxy Propanol, Ethoxy Propanol, Methoxy Propyl Acetate, THF | PEBI liquid $/kg | Density always; price when not live PEBI |
| 1,3-Dioxolane | Same price as THF (mirror) | Density; price follows THF sync |
| Ethanol, IPA, MEK, Toluene, n-Propanol, n-Propyl Acetate | ES seed / manual | Full edit |
| Solvent Common | ES average of peers (excludes seaming mix) | Computed |
| Sleeve Seaming Mix | Formula 75% THF + 25% Dioxolane | Formula in Master Data |

### **Adhesive policy (plant sheet)**

| Key | Name | Family | Grade | Primary | Sync |
|-----|------|--------|-------|---------|------|
| `adhesive-sl-dry` | MORFREE 75-300 | Solvent Less | Dry | 75-300:C79 | PEBI blend |
| `adhesive-mono` | MORFREE L75×850 | Mono | Paper | L75×850 | PEBI single |
| `adhesive-sb-hp` | MORBOND 655 | Solvent Base | HP Liquid | 655:CT85 | PEBI blend |
| `adhesive-sb-mp` | MORBOND 675 | Solvent Base | MP Foil | 675A:675C | PEBI blend |

Retired: GP / WB / mono-component / ECOLAD. No Loctite trial. Names kept short so Master Data columns fit.

### **Ink & Coating policy**

| Grade | Source | Editable |
|-------|--------|----------|
| Common Colors SB (`ink-sb`) | PEBI liquid $/kg → dry via ES solid% | Solid%/density always; price when not live PEBI |
| Common Colors UV (`ink-uv`) | PEBI liquid $/kg → dry via ES solid% | Same |
| Special colors, primer, varnish, heat/cold seal, wax, UV variants | ES seed / manual | Full edit |

PEBI never overwrites ink solid% or density.

### **PE films in ES (aligned to PEBI HALB)**

| ES name | Key | HALB |
|---------|-----|------|
| PE Plain Film — Commercial | `pe-plain-commercial` | SFG-MONO-001 |
| PE Plain Film — Industrial | `pe-plain-industrial` | SFG-MONO-002 |
| FFS Film | `pe-ffs` | SFG-MONO-003 |
| Wide Film HDPE | `pe-wide-hdpe` | SFG-MONO-004 |
| PE Shrink Film | `pe-shrink` | SFG-3L-001 |
| PE Lamination Film | `pe-lamination` | SFG-3L-002 |
| PE Shrink PCR | `pe-shrink-pcr` | (optional) |
| PE-EVOH | `pe-evoh` | (optional) |

Legacy aliases: `ldpe-natural` → commercial, `ldpe-white` → industrial, `ldpe-shrink` → shrink.

### **Ops notes**

- Interplast still `catalog_source=platform`.
- Live adhesive catalog smoke 2026-07-10: all **4/4** active (SL ~$3.55, Mono $4.25, HP $4.17, MP $3.33 liquid).
- Script: `npx tsx scripts/ensure-pe-specialty-nonbom.ts`

### **AUDIT — SPECIALTY (priority if reviewing this session)**

| PB subgroup | Oracle SKU(s) | ES `platformMasterKey` | Recipe (Item Master) | Live $/kg |
|-------------|---------------|------------------------|----------------------|-----------|
| **75** | MAT 75×1045, MAT 75×1050, PAPRGLOS 75×1105 | `7alu-10pe-35paper-12pe` | 7Alu / 10PE / 35Paper / 12PE | 4.32 |
| **80** | PAPR GLOS **60**×1060 | `7alu-10pe-30-gp-paper` | 7Alu / 10PE / 30 GP Paper | 4.70 |
| **80** | PPR GLOS **80**×1260 | `7alu-10pe-40paper-12pe` | 7Alu / 10PE / 40Paper / 12PE | 3.20 |
| **95** | PPR GLOS **95**×1260 | `6.3alu-10pe-50paper-12pe` | **6.3Alu** / 10PE / 50Paper / 12PE | 3.11 |

**PB specs:** `seed-specialty-butter-specs.js` → `mes_non_resin_material_specs` per SKU (all 6 Specs=Yes). Retired `7ALu/10PE/50Paper/12PE` profile.

**Density:** GSM Direct hoover from `alu-pap-pe-composition.js` (same model as Coated Paper-PE: layer GSM → effective g/cm³).

**PB:** `catlinedesc=Alu/Pap`, `itemgroup=Alu Foil Paper`; subgroups seeded via `seed-specialty-subgroups.js`. `substrateMapping.js` uses **Alu Foil Paper** (not Butter Foil).

### **Phase 4 family status (purchased RM → ES)**

| # | Family | ES sync key | Interplast | Notes |
|---|--------|-------------|------------|-------|
| 1 | PET | ✓ | 11/11 | White fallback +$0.40 |
| 2 | ALU | ✓ | 4/4 | Micron subgroups 7/8/9/12 |
| 3 | BOPP | ✓ | 9/9 | IML/Speciality 4 SKUs **PB-only** |
| 4 | CPP | ✓ | 5/5 | Formula fallbacks vs transparent |
| 5 | PA | ✓ | 3/3 | HB + PA/PE platform hold |
| 6 | PAP | ✓ | 7/7 | Coated Paper-PE composition parser; 2 platform hold |
| 7 | SLEEVE | ✓ | 4/4 | PETC/PETG/PVC; PVC cast = blow + $0.80 |
| 8 | SPECIALTY | ✓ | **4/4** | Alu/Pap butter foil (this session) |
| 9 | **PE** | ✗ | — | **LAST** — in-house extrusion |
| 10 | **INK** | ✓ | — | SB+UV Common liquid |
| 11 | **ADHESIVE** | ✓ | — | 4 plant-sheet slots |
| 12 | **SOLVENT** | ✓ | — | Named PB solvents; Dioxolane=THF; seaming mix |

`PEBI_SYNC_FAMILIES` = substrates + PE + INK + ADHESIVE + SOLVENT.

### **DONE:** SPECIALTY (2026-07-09)

- Crosswalk: `apps/pph/server/fixtures/pebi-es-specialty-crosswalk.json`
- PB: `pebi-es-specialty-catalog.js`, `GET /api/integration/es/materials?family=SPECIALTY`, `seed-specialty-subgroups.js`, `ensureSpecialtyProfilesSeeded` (startup)
- Utils: `apps/pph/server/utils/alu-pap-pe-composition.js` (+ tests)
- ES: `SPECIALTY` in sync; `ensureSpecialtySubstratesFromSeed`; `SPECIALTY_PB_CROSSWALK`; `sortSpecialtySubstrateRows`; review panel on SPECIALTY tab
- Retired seed row `test`
- Interplast sync: **4/4** updated

### **DONE:** SLEEVE (2026-07-09)

- Crosswalk: `pebi-es-sleeve-crosswalk.json` — 33 Oracle SKUs (PETC/PETG/PVC)
- **PVC High Shrink Cast:** formula `pvc-shrink-normal-shrink-blown + $0.80` (removed platform hold)
- Interplast sync: **4/4** updated

### **DONE:** PAP (2026-07-09)

- Crosswalk: `pebi-es-pap-crosswalk.json` · audit: `pap-pb-audit.json`
- PB: `pebi-es-pap-catalog.js`, `family=PAP`, `seed-pap-profiles.js` (7 profiles)
- ES: `PEBI_SYNC_FAMILIES` + PAP review panel + `sortPapSubstrateRows`
- Oracle: **17** PAP SKUs; Interplast sync: **8/8** — coated PE (`coated-paper-pe`), twist wrap separate; `c2s-paper` retired

### **DONE:** PA (2026-07-09)

- Crosswalk: `pebi-es-pa-crosswalk.json` · audit: `pa-pb-audit.json`
- PB: `pebi-es-pa-catalog.js`, `family=PA`, `seed-pa-profiles.js` (3 profiles)
- ES: `PEBI_SYNC_FAMILIES` + PA review panel + `sortPaSubstrateRows`
- Oracle: **1** BOPA SKU (`FXXFLBOPA151200`); Interplast sync: **3/3** linked — transparent live PB price; HB ($6) + PA/PE ($2.50) hold platform price until PB stock

### **DONE:** CPP (2026-07-09)

- Crosswalk: `pebi-es-cpp-crosswalk.json` · workshop: `cpp-pb-review-workshop.md`
- PB: `pebi-es-cpp-catalog.js`, `family=CPP`, `seed-cpp-profiles.js` (5 profiles)
- ES: `PEBI_SYNC_FAMILIES` + CPP review panel + `sortCppSubstrateRows`
- Interplast sync: **5/5** updated (transparent + metalized live; white/retort/HSS via formula when no PB price)

### **DONE:** BOPP + PET + ALU

- Workshop: `apps/pph/server/fixtures/bopp-pb-review-workshop.md` — 60/60 Oracle SKUs
- Crosswalk: `apps/pph/server/fixtures/pebi-es-bopp-crosswalk.json`
- **PB:** `pebi-es-bopp-catalog.js`, `GET /api/integration/es/materials?family=BOPP`, `seed-bopp-profiles.js`
- **ES:** BOPP in `PEBI_SYNC_FAMILIES`; Master Data → Substrates → BOPP review panel; `sortBoppSubstrateRows`
- **HS rollup:** Glossy + Low SIT → one ES price (`bopp-transparent-hs`); NHS vs NHS-HR split by Oracle SKU
- **IML/Speciality (4 SKUs):** PB-only — no ES sync v1
- **ALU/PET:** unchanged; validated earlier

---

### **DONE:** Materials catalog Phases 1–5 (this session)

| Phase | What |
|-------|------|
| **1** | `catalog_source` on tenants; `catalogAccess` on `/auth/me`; platform publish scoped; materials 403 for managed catalogs |
| **2** | Single **Master Data** (`/master-data`) for all roles; `/library` redirect |
| **3** | `GET /materials/meta`; `CatalogRefreshCoordinator` (60s + focus); publish toasts |
| **4** | *(not started)* PEBI RM sync — see spec |
| **5** | Deleted dead library pages; `POST /platform/master-data/publish`; API doc aligned |

**Also:** USD price inputs always `x.xx` (`UsdPriceInput`). User verified Phases 1–3 manually.

**Migration (if not applied):** `npm run db:patch --workspace=packages/server`

---

### **SPEC:** PEBI → ES raw materials sync (not implemented)

**Docs:** [PEBI_ES_RM_SYNC_SPEC.md](./PEBI_ES_RM_SYNC_SPEC.md) · [MATERIALS_CATALOG_UNIFICATION_PLAN.md](./MATERIALS_CATALOG_UNIFICATION_PLAN.md)

**Problem:** Naive `mainitem` → price sync fails — many Oracle SKUs map to one ES grade (`pet-transparent`).

**Pipeline:** PEBI classify (reuse `tds.js` substrate profiles) → grade rules → `pebi_es_material_crosswalk` → `platform_master_key` → price roll-up → ES upsert (`external_source=pebi`).

**Blocked on IP/FP workshop:** authoritative price field (`purchaseprice` vs `maincost`), currency, crosswalk owner.

**Build order:** Catalog unification Phases 1–3 first; then PEBI sync Phases A–F in spec.

---

### **DONE:** Customer master by licensing

| Tenant | ES customer CRUD | Source |
|--------|------------------|--------|
| Individual | Yes | Local `customers` |
| Company, no `platform_company_code` | Yes | Local `customers` |
| Company, PEBI-linked (e.g. Interplast) | **No** — search/pick only | PEBI sync (`fp_customer_unified`) |

**Prospects:** PEBI `fp_prospects` only — not synced. Convert in PEBI → sync customers.

**Verify:** Log in as Interplast → Customers page has no New/Edit/Delete; autocomplete cannot add. Individual tenant → full customer module.

**Key paths:** `services/tenant-customer-access.ts`, `routes/customers.ts`, `hooks/useCustomerAccess.ts`.

---

### **DONE:** PEBI ↔ ES customers + handoff seam

- **1280 customers** synced from `fp_customer_unified` → ES Interplast (`external_source=pebi`)
- **Re-sync:** `npm run db:sync-customers-pebi --workspace=packages/server` or `POST /api/v1/integration/pebi/sync-customers` as Camille
- **PEBI routes:** `GET /api/integration/es/customers`, `POST /api/integration/es/mes-intake` (stub)
- **ES push quote:** `POST /api/v1/integration/pebi/push-quote/:id/mes` (needs PEBI running + shared secret)
- **Env:** `PEBI_DATABASE_URL`, `PEBI_API_URL`, `PEBI_ES_INTEGRATION_SECRET` (same on both apps)

**Next:** Wire PEBI estimation request → ES estimate (`estimates.external_id`); implement real MES job-card create on mes-intake.

### **DONE:** Interplast ES tenant (IP/FP)

- **Company tenant:** `Interplast` (`platform_company_code=interplast`, AED, `process_per_kg`)
- **Tenant admin:** `camille@interplast-uae.com` / `Admin@123` (PEBI dev parity)
- **Platform owner:** `admin@propackhub.com` / `Pph654883!` (`platform_admin`, separate tenant)
- **Provision:** `npm run db:provision-interplast --workspace=packages/server` (idempotent)
- **Schema:** `tenants.platform_company_code` — future PEBI ↔ ES link key

**Verify:** Login as Camille → tenant Interplast, AED. Login as admin@ → Master Data / platform routes.

---

### **START HERE:** Templates page (`/templates`) — deck + laminate cards

1. Horizontal **TemplateDeck** — swipe/drag advances cards; trackpad horizontal wheel must not navigate browser back.
2. **Laminates · Triplex** card — 3 equal-size substrate slabs, top → bottom: gray PET transparent → metal foil → kraft natural LDPE.
3. **Duplex** — 2 films only (PET + LDPE); no ink/adhesive in preview.
4. Colors: flat fills from `lib/substrateFilmColor.ts` — transparent=gray, white=white, alu/met=metal, natural=kraft. **No** gradients, gloss, or drop-shadow on slabs.

**Key paths:** `components/TemplateDeck.tsx`, `components/LaminateStack3D.tsx`, `lib/substrateFilmColor.ts`, `components/TemplateStructureCard.tsx`, `pages/StandardTemplates.tsx`, `index.css` (`.lam3d*`, `.deck*`).

**Follow-up (optional):** `StandardTemplates.tsx` ~697 lines — split to `features/templates/` when next touching that page.

**Prior:** Roll wound-view Archimedean spiral (`rollSpiralModel.ts`, `RollVisualizer.tsx`); printed roll CO defaults (`rollConfiguratorCatalog.ts`).

---

### Continuous web CO defaults (prior)

**Bug fixed (HAR `localhost.har`):** Slab selection saved correctly (`selectedBandKeys`) then ~7s later follow-up PATCHes **without** keys wiped the DB. Cause: band-filter effect ran before contexts loaded, cleared `selectedKeys`, and triggered immediate autosave.

**Verify on a multi-SKU quote** (e.g. `PKG-2026-28593`):
1. Open quote → **Price list** tab (`/quotes/:id/price-list`)
2. Set **Unit**, **Currency**, pick **≥1 predefined slab** (or custom quantities)
3. Network: one `PATCH /api/v1/quotes/:id` with full `priceListDisplayPrefs` including `selectedBandKeys` or `customSlabs`
4. Wait for estimate reloads to finish — **no** follow-up PATCH dropping keys
5. Hard refresh — all four dropdowns restore (unit, currency, slab source, slabs)

**DB check:** `npx tsx packages/server/scripts/check-price-list-prefs.ts` — recent quotes should show `selectedBandKeys` when slabs were picked.

**Still not persisted:** Per-estimate `PriceListPanel` inside `EstimateEditor` uses **user-level** custom slab prefs only (not quote autosave).

---

### Price-check testing (when DB clean)

**DB was wiped 2026-07-05** for price-check flow testing. If folder is empty again, use flow below. Otherwise continue commercial/price-list polish above.

**Test flow:**
1. Estimates → **Price checks** → **New price check**
2. Add first structure (template or scratch)
3. Back to explorer → same card → **Add structure** for a 2nd variant on the **same** session
4. Confirm explorer shows **one price check card** (`date · PKG ref`) with **nested structures**
5. **New check** on a structure = re-quote (new session, fresh RM) — stays price check (no RFQ panel)

Plan: [`docs/MULTI_SKU_QUOTE_EXPLORER_PLAN.md`](./MULTI_SKU_QUOTE_EXPLORER_PLAN.md).

| Phase | What | Status |
|-------|------|--------|
| 0 | Spec / plan doc (+ peer-review amendments) | ✅ Done |
| 1 | `quotes` + estimate fields, backfill, APIs, cloneEstimate, tooling FX | ✅ Done |
| 2 | Customer folders + explorer + minimal quote workspace | ✅ Done |
| 3 | Combined price list + colors/specs + solid-% / Contrib. + §0.4.1 | ✅ Done |
| 4 | Structured multi-SKU PDF + Excel + sent lock + status sync/audit | ✅ Done |

**Next implement session:** Phase 5 optional (whole-quote re-quote, RFQ **entity**, global search, versioning UI) — or continue price-check / commercial polish from user testing.

---

### 2026-07-06 session — shipped (summary)

| Area | What |
|------|------|
| **Quote price list autosave** | `quotes.price_list_display_prefs` JSONB; `useQuotePriceListPrefs` debounced PATCH for unit/currency, immediate for slab changes; hydrate on tab open; allowed on sent quotes (display-only). |
| **Price list slab wipe fix** | HAR proved save-then-wipe: band filter cleared keys before contexts loaded → PATCH without `selectedBandKeys`. Fix: `setSelectedKeysQuiet`, save only when `canPersist` (unit+currency+slab), restore keys after bands load, explicit `clearSelectedBands` for None. |
| **Price list UX** | Predefined slab labels in selected unit (Kpcs etc.); all slab qty labels rounded (`formatSlabQty`). |
| **Estimate editor layout** | Film Structure table + Layer build-up side-by-side only at **≥1280px** (`xl`). Below that: full-width table, layer build-up stacked below (tablet/desktop). Wide monitors unchanged. |
| **Infra / prevention** | P2 deferred plan MD; `no-monolith-files` Cursor rule; integration-test DB pollution purge. |

**Key files:** `useQuotePriceListPrefs.ts`, `CombinedVariantPriceList.tsx`, `QuoteWorkspace.tsx`, `quotePriceListPrefs.ts`, `quotes.ts`, `schema-patches.sql`, `priceListPricing.ts`.

### 2026-07-05 session — shipped (summary)

| Area | What |
|------|------|
| **Price check explorer** | Default group **Price check** (not flat month). Card title = `date · PKG ref`; product group in meta. Structures nested under each check. **Month** = month wrapper → nested price checks → structures. **Add structure** on card; button **New price check**. Structure action **New check** = re-quote. |
| **Delete UX** | Confirm dialog **anchors beside trash** (CustomerExplorer + Estimates list) — no jump to screen center. |
| **Re-quote type** | `POST /estimates/:id/requote` + legacy duplicate inherit parent `isPriceCheck`, RFQ, terms. Price-check re-quotes no longer become commercial (RFQ panel). |
| **RFQ UI** | `QuoteSummaryPanel` shows RFQ field **only when quote already has a number**. New commercial quotes can still set RFQ at creation. Price checks: **no RFQ**. |
| **Re-quote banner** | “Price changes vs original” hidden when all material deltas ≈ 0% (`meaningfulRequotePriceChanges`). |
| **Save / PATCH** | `validateEstimateSaveRefs` → **409** with clear message for stale `materialId` / solvent (was opaque 500). Client pre-check + API surfaces `detail` in save alerts. Re-save does not force `sent` on already-saved estimates. |
| **Create estimate** | First `POST /estimates` no longer fails Zod on `orderQuantityKg: 0`, zero slabs, bad UUIDs; client validates product group + variant name; price-check URL uses `skuLabel`. |
| **Price list** | Structure column uses substrate **grade** (not family) in `buildStructureSummary`. |
| **Micron display** | `formatMicronDisplay` truncates to 2 dp (structure table + layer build-up). |

**Earlier same day (still valid):** price-check workspace scope (no customer/RFQ/PDF/Mark sent), combined price list, slab modes (Predefined/Custom), custom slab prefs per user, tooling scenario, solvent label renames, optional RFQ on commercial quotes, proposal PDF fix, save loop fix, duplicate estimate 500 fix.

---

### Product rules — price check vs commercial (locked this session)

| | **Price check** | **Commercial quote** |
|--|-----------------|----------------------|
| Container | `quotes.is_price_check = true`, no customer | Customer required |
| Folder | `/estimates/customers/price-check` | Per-customer explorer |
| Combine structures | **Add structure** on same quote | Add estimate on same quote |
| New session | **New price check** or **New check** (re-quote) | New quote or Re-quote |
| RFQ | Never | Optional (`rfq_number`); panel only if set |
| Explorer identity | `date · PKG ref` (not product group alone) | Quote name + PKG + RFQ if any |

---

### Prior notes (unchanged)

**2026-07-06 — Quote price list prefs:** Combined quote **Price list** tab autosaves to `quotes.price_list_display_prefs` (not per-estimate editor panel). Shape: `{ v:1, unit?, currency?, slabMode?, selectedBandKeys?, customSlabs? }`.

**2026-07-05 — Price list prefs:** Custom slab quantities persist per user (by unit). **Below MOQ** warning on custom slabs (non-blocking).

**2026-07-05 — New quote UX:** Customer-first new quote; repeat order via `?repeatOrder=1` + re-quote body.

**Phase 4 notes:** Multi-SKU PDF, Excel, sent lock, quote status sync/audit — all shipped 2026-07-04.

### Prior: Commit housekeeping if not yet committed

1. Working tree may still show deleted `localhost.har`, `stitch.zip`, and `.gitignore` update — commit when ready.
2. No history purge needed (HAR had no JWTs / empty cookies).

### Audit 4.x status (2026-07-04)

| Item | Status | What we did |
|------|--------|-------------|
| 4.1 FX `3.6725` + slab labels | ✅ Fixed | Neutral FX `1`; Default Slab Template UI removed (2026-07-04) |
| 4.2 EstimateEditor 3.4k lines | ⏸ Deferred | Large refactor — split by concern when scheduling a dedicated session |
| 4.3 Yahoo price scraper | ✅ Decision documented | Accept unofficial Yahoo + fallback resins (advisory market only) |
| 4.4 Integration tests skip silently | ✅ Fixed | `test/require-database.ts` loud banner |
| 4.5 Unstructured logging | ✅ Fixed | Routes use `request.log`; seeds/services use `log` (pino); `sendCaughtError` correlates via `reply.request.log`. CLI scripts + test banner keep `console` |
| 4.6 CORS `credentials: true` | ✅ Fixed | `credentials: false` (Bearer auth, no cookies) |
| 4.7 Dependency majors | ⏸ Deferred | No major upgrades this session (risk); puppeteer remains optionalDeps for local PDF script only |

### Earlier closed (same day)

CoRM/currency, dashboard column, startup hang/port conflict, Part B backfill, tsc clean, security §3.1–3.5, TemplateBuilder CoRM vs margin.

### Still optional (not a bug)

- Rename DB column `corm_per_kg_usd` → `corm_per_kg_display`.
- EstimateEditor split (4.2).
- Major dep upgrades (4.7) when scheduled.
- `any` cleanup, migration-script consolidation, web test coverage — opportunistic only.
- `.bat` files and `archive/legacy-laravel` kept on purpose.

### Session 2026-07-03 — Completed fixes (summary)

Port conflict, API boot hang, dashboard missing column, CoRM display-currency model, pricingMethod enum typo — all fixed. See SESSION_LOG.

---

## Earlier context (Part B — 2026-07-02)

Part B handoff: `docs/PROCESS_COSTING_AND_ESTIMATE_FLOW_HANDOFF.md`. Phases 0–4 done; Phase 5 backfill script added 2026-07-04.

<details>
<summary>Part B phase table</summary>

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — shared derivation engine | ✅ Done | `derive-processes.ts`, 7/7 golden tests |
| 1 — schema columns | ✅ Done | `structure_forked`, `processes_customized`, `structure_signature` |
| 2 — server authority | ✅ Done | Live fork recompute on read |
| 3 — web fork UX | ⚠️ Partial | No confirmation modal; no live client re-derivation before Save |
| 4 — template builder | ✅ Done | Shared `deriveProcessesFromStructure` |
| 5 — backfill + verification | ✅ Script done | `db:backfill-processes`; live recompute remains source of truth |

</details>

---

## Legacy sections below (pre-2026-07-03)

**Prior session focus (2026-07-02):** Part B audit — 3 bugs fixed; Phase 5 still open.

### Session 2026-07-02 — Part B Phase 1 (completed)

| Item | Status |
|------|--------|
| `estimates.structure_forked` schema column | ✅ Added |
| `estimates.processes_customized` schema column | ✅ Added |
| `estimates.structure_signature` schema column | ✅ Added |
| Idempotent SQL patch entries | ✅ Added |
| `npm run db:patch --workspace=packages/server` | ✅ Pass |
| `npm run build --workspace=packages/server` | ✅ Pass |
| `npm run typecheck --workspace=packages/server` | ❌ Pre-existing unrelated errors |

### Session 2026-07-02 — Login reliability hotfix (completed)

| Item | Status |
|------|--------|
| DB pool timeout raised (2s → 10s default via env) | ✅ |
| DB keepalive + pool env tuning | ✅ |
| Login transient DB reconnect + retry once | ✅ |
| Startup waiter switched to `/health/ready` | ✅ (probe fixed 2026-07-04: use `sql\`SELECT 1\``) |
| Startup wait window increased (90s → 240s) | ✅ |
| Server build after fix | ✅ Pass |

### Session 2026-07-02 — End status (owner sign-off pending)

| Item | Status |
|------|--------|
| Triplex Mfg & Op **1.90/kg** | **FAIL** — user sees **1.20** |
| Template processes from `default_processes` | Partial — reconcile incomplete |
| Scratch blank layers + process gate | **FAIL** — still seeds 2 layers; calc not blocked |
| React hooks crash | Fixed (useCallback before early return) |
| `kill-es-ports.bat` `$pid` error | Fixed (`$listenerPid`) |

### Session 2026-07-02 — Template process authority + scratch process gate (partial)

**Symptom:** Laminates · Triplex template defines extrusion ×1, lamination ×2, etc., but saved drafts lost quantities on reload (Mfg & Operating wrong).

**Fix:** `resolveEstimateProcesses()` reconciles template `default_processes` on GET/calculate when DB rows are empty or legacy (`process_key` null). Editor adds Processes panel; slabs/markup blocked until ≥1 process + dimensions valid. Scratch estimates start on Structure with process selection required.

**Impact:** Intended QT-2026-00007 → 1.90/kg; **user still reports 1.20** — see handoff doc §5.

### Session 2026-06-29 — Full summary

External agent gave a thorough code review. We verified every claim against the actual code and implemented fixes + new features across engine, server, and web.

### Session 2026-07-02 — Draft estimate 500 on load (hotfix)

**Symptom:** Existing drafts failed on open with `GET /api/v1/estimates/:id` → `500`.

**Cause:** `routes/estimates.ts#getEstimateRoute` attempted DB inserts for fallback processes when `processes.length === 0`. On DBs missing newer process columns, this write path crashed during read.

**Fix:** Removed write-on-read behavior. Fallback process rows are now built in-memory and returned in response, using template defaults and master-data process reference values.

**Impact:** Drafts can load again without mutating DB in GET; manufacturing/operating process data remains populated in response for legacy estimates.

### Session 2026-07-02 — Legacy DB compatibility follow-up

**Symptom:** 500 persisted for some drafts after write-on-read removal.

**Cause:** Older DB schema can still fail on `SELECT * FROM processes` due to missing new columns.

**Fix:** Added runtime compatibility fallback in estimate GET route: on `undefined_column` (42703), query only legacy process columns via raw SQL and adapt to modern response shape with defaults.

**Impact:** Draft loads are now backward compatible with pre-migration `processes` tables.

### Session 2026-07-02 — Legacy draft operating-cost correction

**Symptom:** Draft opened successfully but `Manufacturing & Operating` stayed `USD 0.00/kg`.

**Cause:** Calculation service used DB process rows only; legacy drafts had zero/missing process rows.

**Fix:** `calculateAndPersistEstimate` now applies the same legacy process fallback strategy as read path:
- handle old `processes` schema safely,
- derive fallback process rows from template + master reference when no rows exist,
- pass fallback into engine for operation-cost compute.

**Impact:** Existing legacy drafts should now produce operating/manufacturing cost on calculate, matching new-estimate behavior.

### Session 2026-07-02 — Legacy draft save 500 correction

**Symptom:** Saving the same draft failed on `PATCH /api/v1/estimates/:id` with `column "cost_per_kg_usd" of relation "processes" does not exist`.

**Cause:** Process re-insert logic in estimate save routes still targeted modern columns only.

**Fix:** Added compatibility insert helper in `routes/estimates.ts`:
- try modern insert first,
- on missing-column error, insert with legacy process column list.

**Impact:** Draft save/update is now backward-compatible with old DB schemas while preserving modern behavior where migrations are applied.

### Session 2026-07-02 — TX-aborted correction for legacy save

**Symptom:** Save still failed with `current transaction is aborted`.

**Cause:** Fallback logic triggered only after a failing insert inside the same SQL transaction (too late).

**Fix:** Detect `processes` schema mode before writes and execute only compatible insert statements during transaction.

**Impact:** Prevents transaction poisoning on legacy DBs; draft PATCH should now proceed.

### Session 2026-07-02 — Runtime scope fix

**Symptom:** PATCH failed with `processInsertMode is not defined`.

**Fix:** Declared `processInsertMode` in `updateEstimateRoute` and removed misplaced declaration from calculate route.

**Follow-up:** After user repeated the same runtime error, revalidated and re-applied declaration directly in the update route entry path to ensure deployed watcher picks the intended scope fix.

### Session 2026-07-02 — Legacy draft Mfg/Op zero (primary user issue)

**Symptom:** Old drafts saved/loaded but still displayed `Manufacturing & Operating USD 0.00/kg`.

**Fix:** Added UI-level legacy fallback in `EstimateEditor`:
- normalize process rows with derived per-kg cost (`costPerHour/speedValue`) for `kg_per_hour` rows when `costPerKgUsd` is missing,
- apply same fallback in Mfg/Op breakdown render path.

**Impact:** Legacy drafts now display non-zero Mfg/Operating cost even when historical process rows lack persisted `cost_per_kg_usd`.

---

## Fixes from external audit (all verified & implemented)

### 🔴 Critical: platform catalog access control

**Problem:** `requireMasterDataAdmin` in `platform-master-data.ts` allowed `tenant_admin` to write the global platform catalog + mint/revoke service keys. Registration sets `role: 'tenant_admin'`, so any self-registered tenant could mutate the shared master catalog affecting everyone.

**Fix:**
- All platform routes (materials CRUD, reference categories, costing defaults, sync, service keys, change-feed JWT path) now gate on `isPlatformAdmin()` only.
- `platform.ts` `/platform/master-materials` also tightened.
- `service-key-auth.ts` JWT path tightened.
- `/library` page repointed to tenant-scoped `RawMaterials.tsx` (new page); platform editor moved to `/platform/master-data` (gated by `PlatformAdminRoute` in router + nav).

### 🟠 High: Dashboard soft-delete leak

`dashboard.ts` queried estimates without `isNull(deletedAt)` → deleted estimates inflated counts and leaked into Recent/Expiring. Fixed with `and(eq(tenantId), isNull(deletedAt))`.

### 🟠 High: Ref-number race in template instantiate

`templates.ts` had its own inline ref-number generator (no year-filter, no soft-delete filter, no collision protection). Exported `generateRefNumber` from `estimates.ts` and replaced the inline version.

### 🟠 High: JWT secret prod hard-fail

`app.ts` now throws on startup if `NODE_ENV=production` and the JWT secret is the built-in dev default. Same string peppers service-key hashes (`platform-service-keys.ts`).

### 🟠 High: 401 refresh-and-retry interceptor

`api.ts request()` now catches 401 → single-flight `ensureRefreshed()` → retries once. On refresh failure: clears tokens, fires `onAuthFailure` → `useAuth` drops to logged-out. Long-open editors no longer fail after 30-min token expiry.

### 🟠 High: Offline draft was write-only (dead end)

`EstimateEditor.tsx` offline-save now timestamps, uses a real `flushOfflineDraft()` on `online` event + next load, honest messaging.

### MasterData.tsx Rules-of-Hooks crash

6 `useState` hooks (drag-and-drop reorder state) were declared after early `return` statements → hook-count mismatch on re-render. Hoisted above all returns. Also fixed duplicate React key `solvent` in the tab bar (excluded all standard codes from the custom-RM-type filter).

---

## New features implemented

### 1. Tenant role model (materials)

`materials.ts` CRUD now uses `canManageTenantMaterials(db, tenantId, role)`:
- `platform_admin` / `tenant_admin` → always.
- `user` → only on an **individual** tenant (`.type === 'individual'`).
- Company/group members are read-only (FORBIDDEN error with clear message).

Tenant `type` threaded through auth responses (`/me`, login, register) → frontend `AuthTenant.type`.

### 2. Tenant-scoped Raw Materials page (`/library`)

New `RawMaterials.tsx`: tenant-scoped CRUD on `/api/v1/materials`, tabbed by type, inline editing, sync-from-platform, role-gated. Replaced the platform `MasterData.tsx` (moved to `/platform/master-data`, platform_admin only).

### 3. Data-driven order-quantity unit conversion (engine)

`unit-conversion.ts` rewritten. Every unit = `{ basis, multiplier }`:
- Bases (engine-fixed): `kg`, `pieces`, `sqm`, `lm` (finished/reel width — **NOT** the press/web width).
- `lm` uses `linearMPerKgReel` (confirmed correction from old `linearMPerKgWeb`).
- `LEGACY_UNIT_MAP` keeps existing saved estimates converting unchanged.
- `UnitDef` on `EstimateInput.orderQuantityUnitDef` preferred over legacy code.
- 158 engine tests pass (18 unit-conversion tests).

### 4. Layered tenant reference model

**New table:** `tenant_reference_items` (migration `0010_tenant_reference_items.sql`).

**Architecture:** platform_reference_items = owner defaults. tenant_reference_items = tenant overlay. `buildMasterDataReferenceForTenant(tenantId)` merges both (tenant wins by code).

**Tenant-extensible categories (Class A):** rm_type, process, product_subtype, unit, packaging, ink_coating, adhesive.

**NOT tenant-extensible (engine structural):** product_type, printing_web.

**Routes:**
- `GET /api/v1/master-data/reference` → merged view for the tenant.
- `GET /api/v1/master-data/reference/custom` → tenant's own rows.
- `PUT /api/v1/master-data/reference/:category` → tenant save (role-gated).

**UI:** Tenant `RawMaterials.tsx` has a "Custom Lists" toggle → `TenantReferenceEditor` with tabs for RM Types, Units (basis + multiplier), Subtypes, Processes.

### 5. Unit metadata + admin editor

`unit` reference items carry `metadata: { basis, multiplier }`. `enrichMasterDataReference` emits `unitOptions` with `basis` field. Admin "Platform Master > Units" has Basis dropdown + Multiplier input per unit row.

### 6. Product-family-aware unit filtering

Unit dropdown in estimate editor filtered by product family:
- roll/sleeve → kg, pieces, sqm, lm (+ multiplier variants).
- pouch/bag → kg, pieces only. LM/SQM hidden.
- Auto-resets to kg if switching product invalidates the current unit.
- Filtering keys on `o.basis` (carried on each option from server), with legacy fallback map.

### 7. Template instantiate → no auto-persist

**Old:** picking a template called `instantiateTemplate` which INSERT-ed immediately.
**New:** calls `preview: true` mode → resolves template layers but writes nothing. Editor opens as a genuine new (unsaved) draft, persists only on Save.

Purged 281 accumulated junk drafts via `npm run db:purge-estimates -- --all`.

### 8. Sticky top action bar + deduplicated controls

Top bar (Back · Save draft · Save · PDF · My Templates · Re-quote) is `sticky top-0 z-30` — sole action toolbar; no bottom duplicates.

### 9. Pouch/bag dimensions — header fields removed

Pouch/bag dimensions are entered only in their design-panel configurator. The inline header dimension fields (`Open width` / `Open height`) no longer show for pouch/bag (were leaking before a type was chosen or from stale template subtypes).

### 10. Window patch — any substrate, cost model A

- Window accessory picker now lists **substrate materials** (excluding Packaging family).
- Added **thickness (µ)** input.
- Cost = patch area (W×H) × (µ × density ÷ 1000 × $/kg). Patch weighed/priced by its own film, not folded into structure GSM.
- Legacy patches (no material) fall back to structure-GSM behaviour.
- 3 new engine tests.

### 11. Window patch position (X% / Y%)

Window patch position controllable via two % inputs (horizontal/vertical centre of the pouch face). Affects drawing in both open view and flat-blank view. Cosmetic only — no cost/weight impact. Default 50/50 = centre.

### 12. Pouch open view → horizontal

`PouchSchematic.tsx` silhouette rotated 90° into a landscape frame so the finished pouch reads horizontally, matching the flat-blank die-line beside it.

### 13. View-type captions

Both pouch and bag configurators now label each diagram: "{Subtype Name} — open view" / "… — flat blank".

### 14. Film stack plan-view strip removed

"Plan · 800 mm web →" strip removed from `FilmStackVisualizer`. Web width is a production/MES decision, not an estimation concern. `printWebWidth` and the `webWidthMm` prop removed.

### 15. Solvent row background gap fixed

Solvent row, detail rows, and Total/tfoot in the structure table had their trailing cell gated on `showLayerActionsCol` instead of `showLayerControlsCol` → missing `<td>` in locked mode → white gap. Fixed all three.

### 16. Raw Materials decimal display

Tenant page now formats numeric columns (density, cost, market) to 2 decimals on load, widened inputs, step=0.01.

---

## To-do / known open items

- [ ] Run `npm run db:migrate` to create `tenant_reference_items` table (migration 0010).
- [ ] Verify pouch open-view dimension labels read correctly after landscape rotation (may need label re-anchoring).
- [ ] Existing platform units in DB may lack `metadata: { basis, multiplier }` — the code falls back via `LEGACY_UNIT_METADATA`, but a one-time backfill script would make admin edits save cleanly.
- [ ] `Settings.tsx:35` still defaults `exchangeRateUsdToDisplay` to 3.6725 (AED) instead of reading from tenant. Low priority.
- [ ] Price-scraper maps paper → LDPE resin futures (misleading but not costing-critical).
- [ ] Native `alert()`/`confirm()` in EstimateEditor (≈5 spots) should use the design system overlay. Low priority.
- [ ] Server has 10 pre-existing TS errors in `templates.ts`, `proposal-pdf.ts`, 2 test files — none in files we edited.

---

## Architecture decisions (carry forward)

| Decision | Rationale |
|----------|-----------|
| Platform catalog = owner-only | Tenants edit their OWN materials + reference, never the global seed. |
| product_type / printing_web = NOT tenant-extensible | Engine structural — each has bespoke geometry/costing code. New ones need engine work. |
| Unit basis catalog is engine-fixed (4 bases) | Each basis maps to a real formula metric. Admin defines unit labels/multipliers; neither admin nor tenant can invent a new basis. |
| LM basis = linearMPerKgReel (finished/reel width) | The costing unit is the delivered product metre. Press-web LM is for MES/later. |
| Window patch = substrate film (cost model A) | patch $/piece = area × µ × density ÷ 1000 × $/kg. Separate from structure GSM. |
| Template pick = no persist | Editor opens an unsaved draft from a preview payload; DB row written only on Save. |
| Tenant type `individual` → user can edit materials/reference; `company` → only group admin | First registrant is always `tenant_admin`. |

---

## Prior session work (still valid)

| Area | Status |
|------|--------|
| Theme system (9 themes, AA contrast) | ✅ |
| Auth screen contrast fixes | ✅ |
| Bag configurator 2D (9 subtypes) | ✅ |
| Pouch configurator + flat blank | ✅ |
| Template ink controls | ✅ |
| Engine SB/UV + solvent costing | ✅ |
| Master Data Excel sync → platform DB | ✅ |
| Admin platform templates | ✅ |
| Smart Template Builder | ✅ |
