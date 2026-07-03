# LIVE STATE — Estimation Studio

**Last updated:** 2026-07-03 (dev startup port-conflict fix)
**Session focus:** Audited Part B (Smart Structure-Driven Process Costing) implementation across
Phases 0–5. Phases 0–2 and part of Phase 3 were already implemented in prior un-logged sessions
(no SESSION_LOG entries existed for them). Found and fixed 3 real bugs; Phase 4 (TemplateBuilder)
and Phase 5 (backfill script) were NOT done — Phase 4 fixed this session, Phase 5 still open.

---

## Where we stopped (read this first next session)

### **START HERE:** `docs/PROCESS_COSTING_AND_ESTIMATE_FLOW_HANDOFF.md` → Part B

Part B is the approved implementation plan (3-state model: template-locked / user-owned /
forked, with snap-back). See Part B §B.7 for phase status below.

### Part B phase status (verified against code 2026-07-02, not just session log)

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — shared derivation engine | ✅ Done | `derive-processes.ts`, `structure-signature.ts`, 7/7 golden tests pass |
| 1 — schema columns | ✅ Done | `structure_forked`, `processes_customized`, `structure_signature` on `estimates` |
| 2 — server authority (3-way resolve) | ✅ Done, 1 bug fixed | `resolveEstimateProcesses()` implements template-locked / derived / frozen. **Fixed 2026-07-02:** it trusted the persisted `structureForked` column on read, so pre-existing/never-resaved drafts (incl. the original QT-2026-00007) could still serve stale admin-template processes even if their layers had diverged. Now recomputes live fork status via structure-signature comparison on every read (GET/calculate), no DB write needed. |
| 3 — web fork-on-edit + confirm UX | ⚠️ Partial | Fork/customize/snap-back badges + "Lock in changes" button + `EstimateProcessesPanel` all wired and functional. **Deviates from approved plan:** no confirmation *modal* (inline panel instead — may be acceptable, flagged for owner). **Gap:** `processesState` is not live-recomputed client-side as layers change before Save — Mfg & Op only reflects the new derivation after Save + refetch, not instantly. **Bug fixed 2026-07-02:** server had a hard 409 block preventing ANY layer edit once `processesCustomized=true`, forcing users into "Snap back" (which discards their confirmed processes) as the only way forward — contradicted the approved "stale banner, not block" rule. Block removed; frozen processes already persist correctly regardless of layer edits. |
| 4 — template builder + seed alignment | ✅ Fixed 2026-07-02 | `TemplateBuilder.tsx`'s local `deriveDefaultProcesses()` still had the **exact original bug** — lamination hardcoded to qty 1 (never scaled with adhesive count) and extrusion only for Mono+PE. This meant any NEW template created via the builder would reproduce the 1.20-vs-1.90 bug. Replaced with a call into the shared `deriveProcessesFromStructure` engine function (lamination = adhesive count, extrusion default-enabled). |
| 5 — backfill script + full verification | ❌ Not done | `backfill-processes.ts` was never created. Mitigated by the Phase 2 read-path fix above (live recompute means no backfill migration is strictly required), but the planned one-shot audit/verification pass (checklist in Part B §B.5) has not been run. |

### Audit fixes applied this session (2026-07-02)

1. `estimate-processes.ts` — `resolveEstimateProcesses()` now computes fork status live from
   structure signatures instead of trusting the persisted column (fixes stale legacy drafts).
2. `estimates.ts` / `state-validation.ts` — removed the Rule 2 hard-block (409) on layer edits
   after `processesCustomized=true`; frozen processes already survive layer edits correctly via
   Phase 2, so blocking the save was both unnecessary and contradicted the approved plan.
3. `TemplateBuilder.tsx` — `deriveDefaultProcesses()` now delegates to the shared engine
   `deriveProcessesFromStructure` (lamination × adhesive count, extrusion default-enabled)
   instead of its own stale, pre-Part-B logic.

Verified: `packages/engine` build + tests (7/7) pass; `packages/server` and `packages/web`
`tsc --noEmit` clean.

### Open follow-ups (not yet done — for next session)

- Phase 5: write `backfill-processes.ts` (mostly for audit-trail/signature backfill now, not
  correctness) + run the Part B §B.5 verification checklist end-to-end against a live DB.
- Phase 3 gap: consider live client-side re-derivation of `processesState` as layers change
  (currently only refreshed after Save + refetch) — matches Decision #23 "instant price on edit".
- Confirm with owner whether the inline panel + "Lock in changes" button satisfies the
  originally-requested "confirmation modal that appears", or whether an actual modal is required.



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
| Startup waiter switched to `/health/ready` | ✅ |
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

Top bar (Back · Cancel · Save · Calculate · PDF) made `sticky top-0 z-30`. Bottom panel Save/Calculate duplicates removed (kept unique actions: Save to My Templates, Duplicate for re-quote).

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
