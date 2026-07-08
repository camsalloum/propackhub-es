# Materials catalog unification — implementation plan

**Status:** Phase 5 done (cleanup) — Phase 4 next (PEBI RM sync, blocked on workshop)  
**Created:** 2026-07-07  
**Product:** ProPackHub Estimation Studio (`apps/estimation-studio/`)  
**Audience:** Agents and developers implementing catalog / master-data UX  
**Related:** [ES_MEMORY.md](./ES_MEMORY.md) · [API_MASTER_DATA.md](./API_MASTER_DATA.md) · [AGENT.md](../AGENT.md) · PEBI integration (`apps/pph/server/routes/integration/es.js`)

---

## 0. Executive summary

Remove the tenant **Raw Materials** page (`/library`) and converge on **one materials experience** backed by a clear ownership model:

| Licensee type | Who sets RM prices | UI |
|---------------|-------------------|-----|
| **Individual ES** | Tenant (after signup seed) | Single **Materials** surface (tenant-scoped edit) |
| **Company, self-managed** | `tenant_admin` | Same |
| **Company + PEBI-linked** (e.g. IP/FP) | **PEBI** (MES master) | Same surface, **read-only** prices; sync from PEBI |
| **ProPackHub platform** | `platform_admin` | **Platform catalog** (seed + optional publish) — admin-only |

**Estimates always read the tenant `materials` table** (unchanged). We stop presenting two user-facing masters (Raw Materials vs Platform Master).

**PEBI RM price sync** is a third inbound source (alongside platform seed and tenant edit). IP/FP wiring is **next**; this plan leaves hooks and phases for it.

---

## 1. Problem today

1. **Two pages, same mental model** — `Platform Master` (`/platform/master-data`) and `Raw Materials` (`/library`) look like duplicate masters.
2. **Wrong edit surface** — `platform_admin` can change prices on Raw Materials (owner tenant only); that does **not** propagate to Interplast or other tenants.
3. **Sync is invisible to users** — Platform Master save updates tenant DBs, but other browsers keep cached `MaterialsContext` until refresh.
4. **Docs drift** — some docs still say manual tenant prices survive platform sync; code now overwrites platform-synced rows on publish.

---

## 2. Binding principles

### 2.1 One runtime catalog per tenant

- Table: `materials` (scoped by `tenant_id`).
- All costing, templates, and estimate layers resolve material IDs from this table.
- No estimate reads `platform_master_materials` directly.

### 2.2 Platform master = golden seed + optional publish

- Table: `platform_master_materials` remains **ProPackHub’s** default catalog.
- Used to: (a) seed new tenants on register, (b) optional **publish** to selected tenants, (c) version/audit (`master_data_version`).
- **Not** a shared live editor for individual licensees.

### 2.3 PEBI = RM price authority for linked companies

- Tenants with `platform_company_code` set (PEBI-linked) and **`catalog_source = pebi`** (new flag) receive substrate/RM **prices** from PEBI.
- ES stores a mirror in `materials` with `external_source = 'pebi'` (and `external_id` / item key TBD with PEBI contract).
- Users do not edit synced prices in ES; edits happen in PEBI master data.
- **IP/FP:** not wired yet — Phase 4 below.

### 2.4 Tenant-owned catalog for everyone else

- Individual and self-managed company tenants: full edit of their `materials` rows after initial seed.
- Custom rows: `is_tenant_only = true` (unchanged).

### 2.5 Single UI name

- User-facing label: **Materials** (or **Master data → Materials** for platform admin tabs).
- Remove sidebar **Raw Materials**.
- Redirect `/library` → unified materials route.

### 2.6 Do not break the engine

- No change to RM/GSM costing formulas.
- Layer `unit_cost_snapshot_usd` behavior unchanged (quote-time freeze).
- Re-quote continues to refresh from current tenant library prices.

---

## 3. Target architecture

```text
                    ┌─────────────────────────┐
                    │  platform_master_       │
                    │  materials (golden)     │
                    │  platform_admin only    │
                    └───────────┬─────────────┘
                                │ seed on register
                                │ optional publish (managed tenants)
                                ▼
┌──────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│ PEBI MES     │────►│  materials (per tenant)  │◄────│  Estimate editor │
│ RM prices    │sync │  tenant_id scoped        │     │  GET /materials  │
│ (IP/FP soon) │     └─────────────────────────┘     └──────────────────┘
└──────────────┘              ▲
                                │ tenant edit (individual / self-managed)
```

### 3.1 Catalog source flag (new on `tenants`)

| `catalog_source` | Meaning | Price edit in ES |
|------------------|---------|------------------|
| `tenant` | Default for individuals & self-managed companies | Yes (`tenant_admin` / individual owner) |
| `platform` | ProPackHub pushes golden catalog updates | No (read-only synced rows) |
| `pebi` | PEBI is RM price authority | No (read-only; sync from PEBI) |

**Interplast (IP/FP):** provision with `catalog_source = pebi` once integration is live; until then `platform` or `tenant` with manual platform publish.

**Precedence when multiple sources exist:** `pebi` price sync **wins** over platform publish for rows matched by `external_id` / `platform_master_key`. Platform seed still supplies structure (names, families, GSM defaults) where PEBI has no row.

---

## 4. What we remove

| Item | Action |
|------|--------|
| `pages/RawMaterials.tsx` | Delete after merge |
| Route `/library` | Redirect to `/materials` (or `/master-data/materials`) |
| Sidebar **Raw Materials** | Remove |
| Duplicate copy in Library about “sync from Master Data” | Remove (one page explains source) |
| Blanket `syncPlatformMasterToAllTenants` on every platform save | Restrict to tenants with `catalog_source = platform` (and explicit “Publish to all” admin action) |

---

## 5. What we keep / evolve

| Item | Role after unification |
|------|------------------------|
| `pages/MasterData.tsx` | **Platform admin:** full platform catalog + reference data (RM types, waste bands, templates, etc.) |
| New or renamed tenant **Materials** page | **All licensees:** view/edit **tenant** `materials` per `catalog_source` |
| `MaterialsContext` | Still loads `GET /api/v1/materials`; add invalidation on `master_data_version` / focus |
| `platform_master_materials` | Golden seed + audit |
| `seedMaterialsForTenant` / `syncMaterialsForTenant` | Register seed + controlled publish |
| `pebi-customer-sync.ts` pattern | Mirror for **`pebi-material-sync.ts`** (new, Phase 4) |

---

## 6. PEBI RM sync (IP/FP — near term)

**Not implemented yet.** Customer sync exists (`fp_customer_unified` → ES `customers`). RM sync will follow the same integration style.

### 6.1 Intended flow

```text
PEBI item / RM master (price, description, UoM)
    → GET /api/integration/es/materials (new PEBI route)
    → ES pebi-material-sync service
    → upsert tenant materials (external_source=pebi)
    → bump tenant materials version / invalidate web cache
```

### 6.2 Open contract items (define with PEBI before Phase 4 code)

**See [PEBI_ES_RM_SYNC_SPEC.md](./PEBI_ES_RM_SYNC_SPEC.md)** for full mapping pipeline (classify → grade normalize → crosswalk → price roll-up).

- Source table(s): `fp_actualrmdata` + `mes_material_tds` + `mes_category_mapping`
- Match key: `pebi_grade_key` → `platform_master_key` via `pebi_es_material_crosswalk` (not raw `mainitem` alone)
- Family/grade: reuse PEBI substrate profile rules; ES `substrateFamily` / `substrateGrade` / `hoover`
- Which types sync: substrates v1; inks/adhesives v2
- Currency: AED → USD for engine
- Frequency: on-demand + optional nightly job
- Conflict: `is_tenant_only` rows never touched; unmapped → review queue

### 6.3 Interplast provisioning

- `platform_company_code = interplast`
- `catalog_source = pebi` when RM API is ready; until then `platform` + manual platform publish for testing.

---

## 7. User experience by role

| Role | Navigation | Can edit prices? |
|------|------------|------------------|
| `platform_admin` | **Platform Master** (admin route) | Yes — golden catalog |
| `tenant_admin` (individual) | **Materials** | Yes — own tenant |
| `tenant_admin` (company, `catalog_source=tenant`) | **Materials** | Yes |
| `tenant_admin` (company, `catalog_source=pebi`) | **Materials** | No — “Synced from PEBI” |
| `user` (company member) | **Materials** | Read-only (existing RBAC) |

Platform admin **does not** use tenant Raw Materials for global price changes.

---

## 8. Implementation phases

### Phase 1 — Product rules & schema (P0)

**Goal:** Encode ownership; stop accidental global/tenant confusion.

- [x] Add `tenants.catalog_source` enum: `tenant` \| `platform` \| `pebi` (default `tenant`).
- [x] Migration + backfill: Interplast → `pebi` when ready, else `platform` temporarily.
- [x] Extend `tenant-customer-access` pattern → `tenant-catalog-access.ts` (`canEditMaterials`, `priceSourceLabel`).
- [x] Document in [ES_MEMORY.md](./ES_MEMORY.md) § Materials ownership.
- [x] Change `syncPlatformMasterToAllTenants`: only tenants with `catalog_source = platform` (unless admin passes `forceAll: true`).

**DoD:** Platform save does not overwrite individual tenant prices; flags queryable from `/auth/me`.

---

### Phase 2 — Unify UI; one Master Data page for all (P0) — **revised**

**Goal:** Same Platform Master shell for everyone; scope + permissions control edit access.

- [x] `MasterData.tsx` supports `platform` vs `tenant` scope (role-based)
- [x] Route `/master-data` for all users; redirect `/library` and `/platform/master-data`
- [x] Nav: single **Master Data** link (remove Raw Materials + Platform Master duplicate)
- [x] Tenant materials via `/api/v1/materials`; catalog gating on synced rows
- [x] Tenant custom reference via `TenantReferenceEditor` on RM Types / Units / Processes tabs
- [x] Platform-only tabs (product types, waste bands, CoRM) read-only in tenant scope
- [x] Delete `RawMaterials.tsx` (Phase 5 cleanup; route already redirects)

**DoD:** Camille sees full Master Data UI; colleagues read-only; individual full tenant edit; admin platform scope.

---

### Phase 3 — Live refresh & publish UX (P1)

**Goal:** Camille sees admin/PEBI price changes without mystery.

- [x] Expose `master_data_version` (and per-tenant `materials_synced_at`) on `/auth/me` or lightweight `GET /materials/meta`.
- [x] `MaterialsContext`: poll or refetch on version bump + `window.focus` (same pattern as ES_MEMORY waste-band note).
- [x] Platform Master save: toast “Published to N tenants” vs “Seed updated (tenants unchanged)”.
- [x] Optional: `POST /api/v1/platform/master-data/publish` explicit action instead of implicit sync on every blur.

**DoD:** Two browsers — admin changes platform price → tenant user sees update after focus or ≤60s without full re-login.

---

### Phase 4 — PEBI RM sync for IP/FP (P0 for Interplast — **see dedicated spec**)

**Full mapping design:** [PEBI_ES_RM_SYNC_SPEC.md](./PEBI_ES_RM_SYNC_SPEC.md) (family, grade, hoover, crosswalk, price roll-up).

**Summary:** Naive item-code sync is insufficient. Pipeline: PEBI classify → normalize grade → `pebi_es_material_crosswalk` → `platform_master_key` → price roll-up → ES upsert.

**Goal:** RM prices for PEBI-linked tenants come from PEBI with correct mapping to ES catalog keys (e.g. `pet-transparent` for 12 µm PET Transparent layers).

- [ ] PEBI: extract `pebi-rm-classifier` from `tds.js` live-materials logic
- [ ] PEBI: `pebi_es_material_crosswalk` + grade rules; bootstrap from ES seed
- [ ] PEBI: `GET /api/integration/es/materials` (normalized grades, not raw Oracle rows)
- [ ] ES: `pebi-material-sync.ts` + `POST /api/v1/integration/pebi/sync-materials`
- [ ] CLI: `npm run db:sync-materials-pebi`
- [ ] Interplast `catalog_source=pebi`; ES Materials read-only for synced rows
- [ ] Tests per PEBI_ES_RM_SYNC_SPEC §8

**DoD:** Change mapped PEBI grade price → sync → Interplast ES shows correct `costPerKgUsd` on right `platform_master_key`; templates still resolve `ref_material_key`; unmapped items reported.

**Blocked until:** IP/FP workshop on §9 open questions (price field, currency, crosswalk owner).

---

### Phase 5 — Cleanup & deprecation (P2)

- [x] Delete `RawMaterials.tsx`, dead API copy, graph references.
- [x] Align [API_MASTER_DATA.md](./API_MASTER_DATA.md) § Tenant sync (remove “manual preserved” if still wrong).
- [x] Update `Library.tsx` if any references remain (file may already be unused).
- [x] Admin docs: when to use Platform Master vs PEBI vs tenant-only rows.

**DoD:** `rg Raw Materials` / `/library` only hits redirects and changelog.

---

## 9. API sketch (new / changed)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/materials/meta` | `{ masterDataVersion, catalogSource, lastSyncedAt, pebiLinked }` |
| `PATCH` | `/api/v1/materials/:id` | Existing; **403** when `catalog_source` is `pebi`/`platform` for price fields |
| `POST` | `/api/v1/integration/pebi/sync-materials` | Tenant admin / cron — pull PEBI RM prices |
| `POST` | `/api/v1/platform/master-data/publish` | Platform admin — push to `catalog_source=platform` tenants |
| PEBI | `GET /api/integration/es/materials` | Outbound from PEBI (new) |

---

## 10. Data model touchpoints

| Table / column | Change |
|----------------|--------|
| `tenants.catalog_source` | **New** enum |
| `materials.external_source` | Already exists; use `pebi` |
| `materials.platform_master_key` | Keep — link seed + PEBI match |
| `materials.price_source` | `platform` \| `pebi` \| `manual` (manual only for `is_tenant_only`) |
| `platform_master_materials` | Unchanged |

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Individual loses edit path when removing Raw Materials | Phase 2 ships tenant Materials **before** removing `/library` |
| Interplast blocked before PEBI RM API | Keep `catalog_source=platform` + platform publish until Phase 4 |
| PEBI/ES key mismatch | Agree mapping table in Phase 4 contract; log unresolved rows |
| Stale estimate layer prices | Document: library sync ≠ retroactive snapshots; re-quote refreshes |
| Platform admin edits wrong tenant | Remove tenant edit from admin’s daily path; admin uses Platform Master only |

---

## 12. Out of scope (this plan)

- MES job material issue / FIFO (PEBI operational stock).
- PEBI formulation BOM sync into ES structures.
- Real-time websocket push (polling/focus refresh is enough for v1).
- Merging `platform_master_materials` into per-tenant DB (golden seed table stays).

---

## 13. Suggested execution order

1. **Phase 1** (schema + sync policy) — 1 session  
2. **Phase 2** (UI unification) — 1–2 sessions  
3. **Phase 3** (refresh) — ½ session  
4. **Phase 4** (PEBI RM) — parallel with PEBI team; block Interplast go-live on this  
5. **Phase 5** (cleanup) — ½ session  

---

## 14. Acceptance checklist (release)

- [x] Individual licensee: register → seeded materials → edit price in **Materials** → new estimate uses new price.
- [x] Platform admin: edit **Platform Master** → publish → managed tenants updated; individuals unchanged.
- [ ] Interplast (`catalog_source=pebi`): Materials read-only; PEBI sync updates 12 PET price; Camille sees it after refresh policy.
- [x] `/library` redirects; no Raw Materials in nav.
- [x] ES_MEMORY + LIVE_STATE updated at phase completion.

---

*End of plan.*
