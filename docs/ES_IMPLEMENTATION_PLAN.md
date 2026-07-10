# Estimation Studio — Implementation Plan

**Created:** 2026-06-15  
**Status:** **HISTORICAL** — phases A–G were executed; do **not** treat §1–2 “current state” as today’s product.  
**Source of truth now:** [LIVE_STATE.md](./LIVE_STATE.md) · [ES_MEMORY.md](./ES_MEMORY.md)  
**Original source:** Code audit vs [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md)

> **2026-07-10 honesty note:** Sections below freeze the June 2026 audit (broken web build, unwired calculate, etc.). Those P0/P1 items were fixed in later sessions. New work: read LIVE_STATE first; only use this file for phase history and DoD checklists.

---

## 1. Executive summary *(snapshot 2026-06-15 — obsolete as live status)*

Estimation Studio has a **credible foundation** (monorepo, PostgreSQL schema, auth, costing engine with 12 passing tests, most REST routes). The **primary quote workflow is not functional end-to-end**: the web app **does not build**, the estimate editor does not save/calculate correctly, and several server paths have **confirmed runtime bugs**.

**Honest phase position (then):** early **PRD §14.1 Phase 1** (~40%) with fragments of Phases 2–4 (UI shells, partial PDF/re-quote).

**Goal of this plan:** Fix blockers first, then wire the quote loop, then close PRD gaps in priority order.

---

## 2. Current state (code-verified)

### 2.1 What works

| Area | Evidence |
|------|----------|
| Monorepo scaffold | `packages/engine`, `packages/server`, `packages/web` |
| Engine | `calculator.ts` — Laravel GSM, solvent mix, additive sale price; **12/12 tests pass** |
| Auth | Register, login, JWT, tenant isolation, material seed on signup |
| Materials CRUD | `/api/v1/materials` — tenant-scoped |
| Customers CRUD | `/api/v1/customers` — tenant-scoped |
| Estimates routes | list, create, get, patch, delete, calculate, requote, proposal-pdf |
| Settings | GET/PATCH tenant, refresh FX |
| Visibility (server) | `visibility.ts` strips fields on list + calculate |
| Master materials | 14 items in `master-materials-seed.json`, copied per tenant |
| Partial UI wiring | Dashboard, Library, Settings, EstimatesList call API |
| Server build | `npm run build --workspace=packages/server` succeeds |

### 2.2 What is broken or missing

| Severity | Issue |
|----------|-------|
| **P0** | Web build fails — duplicate `register()` in `packages/web/src/lib/api.ts` |
| **P0** | `TemplatePicker.tsx` — uses `useEffect` / `apiClient` without imports |
| **P0** | `POST /estimates/:id/calculate` — references `slabs` variable never loaded → **ReferenceError** |
| **P0** | EstimateEditor save payload incompatible with API (`materialId` UUIDs, `productType`, `dimensions` required) |
| **P1** | PATCH estimate does not update layers, slabs, or processes |
| **P1** | EstimateEditor never calls calculate; `@es/engine` not imported in web pages |
| **P1** | Library UI uses `materialType`; API returns `type` — create/filter/render broken |
| **P1** | Schema drift: `useAutoFx` in auth/settings but not in `tenants` table; settings uses `logoUrl`/`brandPrimaryColor` vs schema `logo`/`primaryColor` |
| **P1** | Customers route accepts `address` but schema has no column |
| **P1** | Calculate material map omits `isSolventBased` |
| **P2** | No template DB/API — `ES_STANDARD_TEMPLATES_SEED.json` not loaded |
| **P2** | No FX conversion in UI (engine is USD-only; display currency unused) |
| **P2** | Sales rep visibility not enforced in UI (markup tab + cost breakdown always shown) |
| **P2** | `CustomerDetail.tsx` exists but not routed; Layout Customers link is `#` |
| **P2** | Re-quote does not copy slabs; no `price_changes` response |
| **P2** | CI runs server tests but **zero test files** exist |
| **P3** | Team visibility API + Settings persistence |
| **P3** | Dashboard expiring proposals, `/dashboard/summary` |
| **P3** | PWA service worker caches wrong paths for Vite prod |

### 2.3 Module scores (audit)

| Package | Score | Notes |
|---------|-------|-------|
| `packages/engine` | 8/10 | Best-implemented; FX conversion belongs outside engine |
| `packages/server` | 5/10 | Good structure; runtime bugs + schema drift |
| `packages/web` | 3/10 | UI shell; does not build; core loop unwired |

---

## 3. PRD phase mapping

| PRD §14 phase | Target | Actual |
|---------------|--------|--------|
| Pre-build (docs, seed, wireframes) | Done | Done |
| Scaffold (Step 3) | After audit | **Done** (owner started early) |
| **Phase 1 — Foundation** | Auth, library seed, engine web+server, visibility, tests | **~40%** |
| **Phase 2 — Visualizer + Estimate** | Visualizer, mobile cards, calculate, slabs | **~25%** |
| **Phase 3 — History + Re-quote** | Customer detail, requote, delta banner | **~35%** |
| **Phase 4 — Proposals** | Branded PDF | **~20%** |
| Phase 5 — Platform | SSO, master library admin | ✅ Done (SSO stub + master library UI) |
| Phase 6 — Polish | PWA QA, Laravel golden parity | ✅ Done |

---

## 4. Implementation phases

Work in order. Each phase has a **definition of done** before moving on.

---

### Phase A — Unblock build & runtime (P0)

**Goal:** Web compiles; calculate endpoint does not crash; one estimate can be created via API with valid payload.

| # | Task | Files / notes | Status |
|---|------|---------------|--------|
| A1 | Fix duplicate `register()` in API client | `packages/web/src/lib/api.ts` | ✅ Done |
| A2 | Fix TemplatePicker imports (`useEffect`, `apiClient`) | `packages/web/src/pages/TemplatePicker.tsx` | ✅ Done |
| A3 | Load slabs in calculate route before `orderQuantityKg` fallback | `packages/server/src/routes/estimates.ts` | ✅ Done |
| A4 | Add `isSolventBased` to material maps in calculate + PDF routes | `estimates.ts` | ✅ Done |
| A5 | Align schema with code: add `useAutoFx` to tenants OR remove from auth/settings | `schema.ts` + migration | ✅ Done - Added to schema |
| A6 | Align settings field names (`logo`/`primaryColor` vs `logoUrl`/`brandPrimaryColor`) | `schema.ts`, `settings.ts`, `Settings.tsx` | ✅ Done - Fixed settings.ts |
| A7 | Remove `address` from customer create OR add column | `customers.ts` / `schema.ts` | ✅ Done - Removed from route |

**Definition of done:**
- [x] `npm run build --workspace=packages/web` passes
- [x] `POST /api/v1/estimates/:id/calculate` returns 200 for a seeded estimate
- [x] Register + login succeed against current schema (`db:push`)

**Estimate:** 0.5–1 session

**COMPLETED:** 2026-06-16 — All Phase A tasks done (verified 2026-06-18)

---

### Phase B — Quote loop (P1 core)

**Goal:** User can register → pick template → edit stack → save → calculate → see selling price → PDF.

| # | Task | Files / notes | Status |
|---|------|---------------|--------|
| B1 | Library: map API `type` ↔ UI; parse decimal strings; fix create payload | `Library.tsx` | ✅ Done |
| B2 | EstimateEditor: load tenant materials; layers use real `materialId` | `EstimateEditor.tsx` | ✅ Done |
| B3 | EstimateEditor: controlled dimensions + productType; match `EstimateCreateSchema` | `EstimateEditor.tsx` | ✅ Done |
| B4 | PATCH estimate: replace layers, slabs, processes (delete + re-insert or upsert) | `estimates.ts` | ✅ Done |
| B5 | Wire Save → Create/Update → Calculate → refresh UI state | `EstimateEditor.tsx`, `api.ts` | ✅ Done |
| B6 | Import `@es/engine` in web for instant recalc on micron edit (Decision #23) | `estimateCalc.ts`, `EstimateEditor.tsx` | ✅ Done (2026-06-18) |
| B7 | Apply display currency: multiply USD sale price by tenant FX for UI | `lib/currency.ts`, calculate + EstimateEditor | ✅ Done (2026-06-18) |
| B8 | Auto-calculate after create (server) or require explicit Calculate button in UI | product choice — prefer both | ✅ Done (auto-calculate in save) |
| B9 | TemplatePicker: pass customer + jobName + productType in URL/state | `TemplatePicker.tsx` | ✅ Done |
| B10 | Fix Dashboard/EstimatesList: join or enrich customer name; use `salePricePerKg` not `totalPrice` | server list route or client join | ✅ Done (2026-06-17) |

**Definition of done:**
- [x] New user completes one quote from template to saved draft with non-zero `salePricePerKg`
- [x] Editing micron and saving persists layers and updates price after calculate
- [x] Library CRUD works for all three layer types

**Estimate:** 2–3 sessions

**COMPLETED:** 2026-06-16 — B1–B5, B8–B9 done; B6/B7/B10 deferred to Phase C/E

---

### Phase C — Templates & structure (P2)

**Goal:** 11 parent PG templates from seed drive new estimates (PRD §9.4, Decision #17).

| # | Task | Files / notes |
|---|------|---------------|
| C1 | Add `structure_templates` table | `schema.ts` | ✅ Done |
| C2 | Seed from `docs/ES_STANDARD_TEMPLATES_SEED.json` on tenant register | `seed-templates.ts` | ✅ Done |
| C3 | `GET /api/v1/templates` | `templates.ts` | ✅ Done |
| C4 | `POST /api/v1/templates/:id/instantiate` | `templates.ts` | ✅ Done |
| C5 | TemplatePicker loads from API; maps to material IDs by name/key | `TemplatePicker.tsx` | ✅ Done |
| C6 | Printing web class toggle swaps ink layer (Ink SB ↔ Ink UV) | `EstimateEditor.tsx` | ✅ Done |
| C7 | “Add metallized barrier” inserts Adhesive SB + Aluminium + Adhesive SB (3 rows) | `EstimateEditor.tsx` | ✅ Done |

**Definition of done:**
- [x] All 11 standard templates selectable; each creates valid layer stack with tenant material IDs
- [x] Wide web default = Ink SB per Decision #19

**Estimate:** 1–2 sessions

**COMPLETED:** 2026-06-17 — All Phase C tasks done

---

### Phase D — Visibility & roles (P2, Decision #20)

**Goal:** Sales rep sees selling price only; admin sees full breakdown; API and UI agree.

| # | Task | Files / notes |
|---|------|---------------|
| D1 | Apply `stripEstimateRow` / profile on `GET /estimates/:id` | `estimates.ts` | ✅ Done |
| D2 | Strip material USD prices on materials GET for sales rep profile | `materials.ts` | ✅ Done |
| D3 | Web: read role from `useAuth`; hide markup tab, cost breakdown, $/kg columns when disallowed | `EstimateEditor.tsx` | ✅ Done |
| D4 | `GET/PATCH /api/v1/users/:id/visibility` + Settings Team tab wired | `users.ts`, `Settings.tsx` | ✅ Done (API 2026-06-17; UI wired 2026-06-18) |
| D5 | Visibility presets (3 named) per PRD §6.8 | `users.ts` (admin/sales_rep/read_only) | ✅ Done |

**Definition of done:**
- [x] PRD acceptance #5 and #10 pass for default `user` role
- [x] Admin toggle in Settings changes what rep sees in same session after refresh

**Estimate:** 1–2 sessions

**COMPLETED:** 2026-06-17 — All Phase D tasks done

---

### Phase E — Customers & re-quote (Phase 3 PRD)

| # | Task | Files / notes |
|---|------|---------------|
| E1 | Route `/customers/:id` → `CustomerDetail.tsx` | `App.tsx` | ✅ Done |
| E2 | Customers list page + nav link | `CustomersList.tsx`, `Layout.tsx` | ✅ Done |
| E3 | `GET /customers/:id/estimates` | CustomerDetail fetches client-side | ✅ Done |
| E4 | Re-quote copies slabs; extend response with `price_changes[]` | `requoteEstimateRoute` copies layers+processes+slabs | ✅ Done |
| E5 | Re-quote banner in EstimateEditor when `sourceEstimationId` set | `EstimateEditor.tsx` | ✅ Done |
| E6 | Optional: auto-calculate on requote create | server | ✅ Done (2026-06-18) |

**Definition of done:**
- [x] PRD acceptance #3 — delta shown in display currency after re-quote + calculate

**Estimate:** 1 session

**COMPLETED:** 2026-06-17 — All Phase E tasks done; E6 done 2026-06-18

---

### Phase H — Platform (PRD Phase 5)

| # | Task | Status |
|---|------|--------|
| H1 | PEBI SSO URL endpoint + login button when `PEBI_SSO_URL` set | ✅ Done (2026-06-18) |
| H2 | Platform admin master library GET/PUT + `/platform/master-library` UI | ✅ Done (2026-06-18) |

**Note:** Full SSO token exchange with PPH remains post-V1 when auth API is wired.

---

### Phase F — Proposals & branding (Phase 4 PRD)

| # | Task | Files / notes | Status |
|---|------|---------------|--------|
| F1 | Verify PDF E2E with puppeteer in dev; document optional deps | `SETUP.md` | ✅ Done (2026-06-18) |
| F2 | PDF respects visibility — no internal cost/markup for sales rep | `estimates.ts` PDF route | ✅ Done |
| F3 | Tenant branding (logo, primary color, terms, footer) from settings | PDF HTML + pdfkit fallback | ✅ Done (2026-06-18) |
| F4 | Slab table in PDF from real slab data + display currency | PDF route + calculate | ✅ Done (2026-06-18) |

**Definition of done:**
- [x] PRD acceptance #4 — PDF with structure SVG + slab table, no cost breakdown for rep profile

**COMPLETED:** 2026-06-18

---

### Phase G — Quality, CI & polish (Phase 6 PRD)

| # | Task | Files / notes | Status |
|---|------|---------------|--------|
| G1 | Add server integration tests (auth, materials, estimate create+calculate) | `app.ts` factory, `auth-estimates.integration.test.ts`, CI Postgres | ✅ Done (2026-06-18) |
| G2 | Fix CI: Node 22, don't fail on empty test suite OR add tests | `.github/workflows/ci.yml` | ✅ Done (2026-06-18) |
| G3 | Expand engine golden tests vs Laravel reference rows | `golden-fixtures.ts`, `golden.test.ts` | ✅ Done (2026-06-18) |
| G4 | Mobile QA: bottom sheets, sticky price bar, swipe delete (§5.8) | `EstimateEditor.tsx`, `LayerCard.tsx`, `BottomSheet.tsx` | ✅ Done (2026-06-18) |
| G5 | Fix PWA service worker for Vite build output | `service-worker.js` | ✅ Done (2026-06-18) |
| G6 | Dashboard `/dashboard/summary` + expiring proposals | `dashboard.ts`, `Dashboard.tsx` | ✅ Done (2026-06-18) |

**Definition of done:**
- [x] CI green on push to main (Postgres service + db:push + 5 server tests)
- [x] PRD acceptance #6, #8, #11 addressed or explicitly deferred with owner sign-off

**Estimate:** 2+ sessions

---

## 5. PRD acceptance criteria tracker

| # | Criterion | Status | Phase |
|---|-----------|--------|-------|
| 1 | Register + 11 templates + quote &lt; 15 min | ✅ Pass | B, C |
| 2 | Client-side calc &lt; 50ms | ✅ Pass (B6) | G |
| 3 | Re-quote + price delta in display currency | ✅ Pass | E |
| 4 | PDF slabs + SVG, no internal cost for rep | ✅ Pass | F |
| 5 | Sales rep: no markup/RM in UI/API | ✅ Pass | D |
| 6 | Mobile 375px layer CRUD | ✅ Pass | G |
| 7 | Visibility presets in session | ✅ Pass (3 presets) | D |
| 8 | Engine golden = Laravel reference | ✅ Pass | G |
| 9 | No approval UI | Pass | — |
| 10 | Regular user: no processes/markup UI | ✅ Pass | D |
| 11 | Dashboard expiring proposals | ✅ Pass | G |
| 12 | PEBI unchanged | Pass | — |

---

## 6. Architecture decisions (hold during build)

1. **Engine stays USD-only** — FX conversion at API boundary or shared `displayPrice()` util in web.
2. **Calculate endpoint** — keep `POST /estimates/:id/calculate` (PRD says `/pricing/calculate`; current path is fine if documented).
3. **Templates** — copy seed to tenant on register (same pattern as materials); no shared marketplace V1.
4. **Client-side engine (Decision #23)** — web imports `@es/engine`; server persists on debounced save + explicit calculate.
5. **Do not drift costing rules** — see `.cursor/rules/estimation-studio.mdc` and `COSTING_NOTES.md`.

---

## 7. Suggested session order (next 5 sessions)

| Session | Focus | Outcome |
|---------|-------|---------|
| ~~1~~ | ~~Phase A~~ | ✅ Done |
| ~~2–4~~ | ~~Phases B–E~~ | ✅ Done (verified 2026-06-18) |
| **Next** | Phase 5 platform or polish deferrals (E6, F3) | Owner sign-off |

---

## 10. Verification audit (2026-06-18)

**Method:** Re-read code after prior agent sessions; ran `web`/`server` build + engine (12) + server (2) tests.

### Confirmed correct (prior agents)
- Phases A–E core: auth, materials, customers, estimates CRUD+calculate+requote, templates API+seed, visibility server+UI guards, CustomerDetail routing, requote price_changes
- Builds pass for all three packages

### Gaps found and fixed this session
| Gap | Fix |
|-----|-----|
| Calculate did not persist display-currency slab prices | Calculate route updates slab `pricePerKg` with FX; returns display slabs |
| UI showed USD sale price with display currency label | `lib/currency.ts` + EstimateEditor `displaySalePrice` |
| Template instantiate left price at 0 | Auto-calculate on load when `salePricePerKg` is 0 |
| Settings Team tab still mock UI | Wired to `getUsers`, presets, `updateUserVisibility` |
| Library decimal strings could break `.toFixed()` | Normalize `density`/`costPerKgUsd` on fetch |
| PDF showed process costs to sales rep | Hidden when `!profile.operationCost` |
| PDF slab table used stale/zero prices | Uses calculated sale price × FX |
| CI failed (no server tests, Node 20) | Added `currency.test.ts`; CI Node 22 |

### Still open
- Full PEBI SSO token exchange (post-V1)
- Push master library updates to existing tenants

### Fixed 2026-06-18 (final plan close-out)
- E6: requote auto-calculate via `calculateAndPersistEstimate`
- F3: branded `pdf-proposal-kit.ts` fallback
- Phase H: platform master library API + UI; SSO URL stub + login button
- Mobile app polish: bottom tab nav, safe areas, 48px touch targets, mobile estimate/library/list cards, keyboard-aware bottom sheets

### Fixed 2026-06-18 (G3, G4)
- `golden-fixtures.ts` + `golden.test.ts` — 4 Laravel reference rows (Laminates duplex, UV narrow web, sleeve, operation cost); engine 18/18
- Mobile: `BottomSheet`, swipe-delete `LayerCard`, edit/add layer sheets, drag reorder, collapsible stack preview

### Fixed 2026-06-18 (G6, B6, G5)
- `GET /api/v1/dashboard/summary` — counts, recent, expiring proposals (7-day window)
- Schema: `quotation_valid_days`, `sent_at`, `valid_until`; set on mark-sent
- Dashboard wired to summary API + expiring banner
- Client-side `@es/engine` instant recalc in EstimateEditor (`estimateCalc.ts`)
- Mobile sticky price bar on estimate editor
- PWA service worker v2 — network-first HTML, cache Vite `/assets/*`
- `npm run db:patch` for idempotent schema patches (CI + local)

### Fixed 2026-06-18 (G1)
- `buildApp()` factory for testable Fastify instance (no listen)
- Integration tests: register → login → materials → create estimate → calculate → GET (5/5 server tests pass)
- CI: Postgres 15 service, `db:push`, `JWT_SECRET` + `DATABASE_URL` env
- SETUP.md: integration test + Puppeteer PDF sections (F1 done)

---

## 8. Doc hygiene (completed with this plan)

- [x] `LIVE_STATE.md` corrected — no longer claims “all critical endpoints / UI ready”
- [x] `ES_MEMORY.md` — audit session log + updated build sequence table
- [x] `SESSION_LOG.md` — audit row added
- [x] Update PRD appendix A (“Not built yet”) when next editing PRD — done 2026-06-18
- [ ] Remove or archive stale blocking items in old LIVE_STATE sections

---

## 9. Related docs

| Doc | Role |
|-----|------|
| [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md) | Full build spec |
| [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md) | Costing + visibility locks |
| [ES_STANDARD_TEMPLATES_SEED.json](./ES_STANDARD_TEMPLATES_SEED.json) | 11 PG template stacks |
| [ES_MEMORY.md](./ES_MEMORY.md) | Session decisions |
| [LIVE_STATE.md](./LIVE_STATE.md) | Current phase |

---

*This plan supersedes informal “next steps” in LIVE_STATE blocking items (2026-06-15). Execute Phase A first.*
