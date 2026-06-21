# Estimation Studio — Deep Audit & Enhancement Plan

**Document type:** Audit + forward roadmap (agent-ready, build-grade detail)
**Author:** Kiro (deep audit pass)
**Date:** 2026-06-21
**Snapshot audited:** working tree at `D:\ProPackHub\apps\estimation-studio` (uncommitted, post-MES Phases A–F)
**Method:** Direct code reading of `packages/{engine,server,web}` + live reproduction (`npm test`, `tsc --noEmit`). Self-reported "✅ all green" status files are treated as **claims**, not facts, and are re-verified below.

**Reconciles / supersedes the status portions of:**
- [LIVE_STATE.md](./LIVE_STATE.md) (claims server 36/36, "TypeScript clean")
- [ES_BUGS_AND_PRD_GAPS.md](./ES_BUGS_AND_PRD_GAPS.md) (claims all parts complete)
- [ES_AUDIT_REPORT_2026-06-20.md](./ES_AUDIT_REPORT_2026-06-20.md) (external — several findings now fixed in-tree; see §3.4)

**Canonical spec (do not drift):** [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md) · [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md)

---

## 0. How to use this document

- **For the owner:** Read §1 (executive summary) and §2 (verified state). Then §6 (errors), §7 (gaps), §8 (strategic context).
- **For an implementing agent:** Each task in §11–§15 is written to be executed standalone — it names the **files to touch**, the **exact change**, the **schema/contract**, and an **acceptance check**. Work top-down by phase. Do not start a P2 before the P0/P1 blockers in §11 are closed.
- **Ground rules:** Never drift the costing formulas (LOCKED_DECISIONS, `golden-fixtures.ts`). Keep the engine USD-only. Keep ES standalone (no PEBI runtime dependency in V1).

---

## 1. Executive summary

Estimation Studio is a **genuinely substantial, mostly-working** TypeScript monorepo. The costing engine is the strongest part (34/34 tests pass on reproduction). The full quote loop (register → template → edit stack → calculate → slabs → PDF) is wired, plus a DB-backed platform master-data layer with a tenant change-feed for future MES/PEBI consumers.

But the "production ready / all green" framing in the status docs is **not accurate today**:

| Claim in docs | Reproduced result (2026-06-21) |
|---|---|
| Engine tests pass | ✅ **True** — 34/34 |
| "TypeScript clean ✅" | ❌ **False** — web `tsc` fails (4 type errors + a **real missing-import bug**, `Trash2`); server `tsc` fails (1 implicit-any) |
| server "36/36 ✅" | ⚠️ **Unverified here** — requires Postgres; the typecheck failures mean the committed tree does not cleanly compile, so the green claim is not reproducible without a live DB and fixes |
| Frontend = "Ant Design 5" (README) | ❌ **False** — it's Tailwind + lucide-react |

**Net:** the foundation is good, the costing is trustworthy, but the repo currently **does not pass a clean typecheck**, has at least one **render-crashing bug** in the admin template editor, has a **fragile DB-migration story** (no committed Drizzle migrations; relies on `db:push` + ad-hoc patch script), and carries **mobile + PEBI-integration scope that is only partially scaffolded** (a `capacitor.config.json` with zero Capacitor dependencies installed).

The rest of this document turns that into an ordered, build-ready plan.

---

## 2. Verified current state (what is actually developed)

### 2.1 Monorepo shape

```
apps/estimation-studio/
  packages/
    engine/   — pure TS costing engine (no framework). Best-tested package.
    server/   — Fastify 4 + Drizzle ORM (node-postgres) + @fastify/jwt. 12 route modules.
    web/      — React 18 + Vite 5 + react-router v6 + Tailwind + lucide-react. Imports @es/engine for live calc.
```

### 2.2 Engine (`packages/engine/src`) — solid

- `calculator.ts` — `calculateEstimate(estimate, materials)` implements the Laravel-derived additive cost model: per-layer GSM/cost-m², totals, film density, yield conversions (pieces/kg, lm/kg web+reel), solvent mix, process costs by speed basis, additive sale price, **per-slab** recompute, and cost-breakdown percentages. Throws `MissingMaterialsError` for unknown materials.
- `types.ts` — domain types incl. `VisibilityProfile`.
- `layer-stack.ts` — `derivePrintingWebClass` (UV ⇒ narrow web), `stackNeedsSolventMix`.
- `template-classification.ts` — A/B/C substrate rules (PE Mono / Non PE Mono / Non PE Multilayer).
- `validator.ts` — estimate/dimension/layer/material validation + `hasSolventBasedLayers`.
- **Tests:** `calculator.test.ts` (15), `golden.test.ts` (6 Laravel reference rows), `layer-stack.test.ts` (4), `template-classification.test.ts` (9). **34/34 pass.**

### 2.3 Server (`packages/server/src`) — good structure, some rough edges

- `app.ts` builds the Fastify instance (testable factory), registers 12 route modules, JWT with `expiresIn: '7d'`, CORS, central error handler.
- **Routes:** `auth` (register/login/refresh/me + disabled PEBI-SSO stub), `estimates` (CRUD + calculate + requote + duplicate + proposal-pdf + proposals), `templates`, `materials`, `customers`, `settings`, `users` (visibility), `dashboard`, `categories`, `master-data`, `platform-master-data` (DB master + change-feed + service keys), `platform`.
- **DB schema (`db/schema.ts`):** ~20 tables incl. tenants, users (jsonb `visibilityProfile`), categories/subcategories, materials, customers, estimates (soft-delete + self-ref re-quote), layers (with re-quote snapshot columns), processes, slabs, slabTemplates, proposals, estimationCosts (audit snapshots), activityLogs, priceHistory, structureTemplates, and platform/MES tables (platformMasterMaterials, platformReferenceItems, platformMasterState, platformMasterAuditLog, platformServiceKeys).
- **Services:** `estimate-calculation.ts` (load → engine map → derive web class → calculate → USD→display → persist layer snapshots + aggregates + per-slab + `estimationCosts` snapshot), `materials-excel-refresh.ts`, `price-scraper.ts`, `proposal-pdf.ts`.
- **Auth/tenancy:** JWT carries `{userId, tenantId, email, role}`; row-level multi-tenancy via `tenantId` filter on every query (not Postgres RLS). Three roles. MES machine auth via hashed service keys with scopes.

### 2.4 Web (`packages/web/src`) — functional shell, live-calc wired

- `App.tsx` routing: public `/login`, `/register`; protected `dashboard`, `estimate/choose`, `templates`, `estimate/new`, `estimate/:id`, `estimates`, `customers`, `customers/:id`, `library`, `settings`, `platform/master-data`.
- **Pages:** Dashboard, EstimateEditor (core), TemplatePicker, StandardTemplates, EstimatesList, CustomersList, CustomerDetail, Library, MasterData, MasterLibrary (orphan — not routed), Settings, Login, Register.
- **Components:** Layout, BottomSheet, ClassFilterPanel, CustomerAutocomplete, JobHeaderFields, LaminateVisualizer, LayerCard (swipe-delete), Skeleton, TemplateStructureCard.
- **Lib:** `api.ts` (ApiClient singleton), `estimateCalc.ts` (live engine preview), `estimateConfigure.ts`, `templateCatalog.ts`, `materialTaxonomy.ts`, `masterDataReference.ts`, `currency.ts`.
- **Mobile:** PWA only (manifest + service worker registration). `capacitor.config.json` exists but **no `@capacitor/*` dependency is installed** — Capacitor is not actually set up.

### 2.5 Reproduced health (2026-06-21)

| Check | Command | Result |
|---|---|---|
| Engine tests | `npm test` (engine) | ✅ 34/34 |
| Web typecheck | `tsc --noEmit` (web) | ❌ exit 2 — see §6.1 |
| Server typecheck | `tsc --noEmit` (server) | ❌ exit 2 — see §6.1 |
| Server tests | `vitest run` (server) | ⚠️ needs Postgres; not run here. Compile failures make the "36/36" claim non-reproducible from a clean tree |

---

## 3. Architecture overview (current data flow)

```
                         ┌───────────────────────────────────────────┐
   platform_admin  ───▶  │ platform_master_materials / reference items │  (single source of truth)
   (Master Data UI)      │ platform_master_state.master_data_version    │
                         └───────────────┬─────────────────────────────┘
                                         │ sync on save (all tenants)        ┌───────────────┐
                                         ▼                                   │ change-feed   │──▶ future MES/PEBI
              register ───▶ seedMaterialsForTenant + seedTemplates ──▶ tenant materials/templates  (service keys)
                                         │
   user/admin ──▶ web (React) ──┬── live calc via @es/engine (USD) ──▶ instant price (0ms)
                                │
                                └── PATCH /estimates/:id + POST :id/calculate
                                                   │
                                                   ▼
                                    server calculateAndPersistEstimate
                                    (engine in USD → ×FX → display) ──▶ slabs, layer snapshots,
                                                                        estimationCosts audit row
                                                   │
                                                   ▼
                                    GET :id/proposal-pdf (puppeteer → pdfkit → html fallback)
```

**Key architectural truths to preserve:**
- Engine computes in **USD only**; FX multiply happens at the server/web boundary (`utils/currency.ts`, `lib/currency.ts`). Do not push FX into the engine.
- Tenant gets a **copy** of platform master on register; platform edits **sync** to tenants. Tenant-only rows (`isTenantOnly`) and manual price overrides (`priceSource='manual'`) must survive sync.
- Estimates **snapshot** material name/cost on calculate so historical quotes don't drift when the library changes.

---

## 4. Audit verdict by package

| Package | Score | Verdict |
|---|---|---|
| `engine` | **8.5/10** | Trustworthy. Well-tested, formulas locked + golden-tested. Minor: a few yield formulas are display-only and could use more golden rows. |
| `server` | **6.5/10** | Good structure, real multi-tenancy, defensive PDF. Held back by: no committed migrations, 1 typecheck error, inconsistent error contracts, no pagination, long-lived JWT. |
| `web` | **5.5/10** | Full page set + live calc, but **does not typecheck**, one crash bug, no UI tests, Capacitor not wired, several unused-import/dead-code smells. |

---

## 5. Errors & bugs (verified in current tree)

> Severity: **P0** = breaks build/quote/data integrity · **P1** = wrong result or blocks a stated goal · **P2** = correctness/UX risk · **P3** = hygiene.

### 5.1 P0 — Repo does not pass a clean typecheck (build-breaking)

The web build script is `tsc && vite build`, so these **block a production build**:

| File:line | Error | Fix |
|---|---|---|
| `web/src/pages/StandardTemplates.tsx:3` & `:808` | **`Trash2` used but never imported** (`TS2304: Cannot find name 'Trash2'`). The admin "edit standard template" layer editor renders `<Trash2 />` → **`ReferenceError` crashes that view at runtime.** | Add `Trash2` to the `lucide-react` import on line 3. |
| `web/src/pages/EstimateEditor.tsx:456,540,565` | 4× `TS2352` unsafe cast between `DimensionState` and `Record<string, unknown>`. Masks a genuine shape mismatch. | Give `DimensionState` an index signature **or** convert via `unknown` and centralise dimension (de)serialisation in one typed helper (`lib/dimensions.ts`). |
| `web/src/pages/EstimatesList.tsx:5` | `TS6133` unused `CustomerAutocomplete` | Remove the import or wire the intended filter. |
| `web/src/pages/StandardTemplates.tsx:3` | `TS6133` unused `Loader2`, `Layers` | Remove or use. |
| `server/src/routes/templates.ts:524` | `TS7006` implicit-any param `l` | Type the callback param. |

**Acceptance:** `tsc --noEmit` exits 0 in both `web` and `server`; `npm run build` (web) succeeds.

### 5.2 P1 — DB setup / migration story is fragile

- **No committed Drizzle migrations** (`drizzle/` dir absent). Schema is materialised via `drizzle-kit push` + an ad-hoc `scripts/apply-schema-patches.ts` (`db:patch`). `db/index.ts` runs **no** migration on boot.
- This means: "stand up a fresh DB" depends on `db:push` matching reality + the patch script being complete. There is no single source-of-truth migration history, no down-migrations, and no ordering guarantee. Two developers can diverge silently.
- The prior external audit's blanket-`*.sql`-gitignore root cause is **fixed** (`.gitignore` now scopes `*.local.sql` and whitelists `schema-patches.sql` + `setup-db.sql`), and the stray root `drizzle-orm`/`pg` deps are **gone**. Good. The remaining risk is the absence of real migrations.

**Recommendation (see §11.2):** Adopt `drizzle-kit generate` migrations as the source of truth; keep `db:push` for local dev only; run migrations on server boot in non-dev.

### 5.3 P1 — `db`/`pool` typed as `any` in `db/index.ts`

`let db: any` throws away Drizzle's inferred types across the entire server (every `db.select()` is untyped). This is why implicit-any errors like §5.1 sneak in. Type it as `NodePgDatabase<typeof schema>`.

### 5.4 P1 — Long-lived JWT, no revocation, refresh doesn't extend security posture

`expiresIn: '7d'` (improved from "never" in the old audit, but still long for a mobile client that caches tokens). `refresh` simply re-signs with the same 7d. There is **no** server-side session/revocation table, so "logout" is client-only and a leaked token is valid for up to 7 days. For the planned mobile app this matters more (tokens live in device storage/backups).

**Recommendation:** short access token (15–60 min) + refresh token with rotation + a `sessions`/revocation table. See §11.4.

### 5.5 P2 — API error contract is inconsistent / not machine-readable

Most failure paths return `{ error: 'string' }` with `500`, regardless of cause (validation vs not-found vs conflict vs auth). A mobile client cannot reliably distinguish "auth expired" from "server error" without string-matching. Delete-material when referenced returns a bare `"Failed to delete material"` 500 (Postgres `RESTRICT`), so the user can't self-diagnose.

**Recommendation:** standard envelope `{ error: { code, message, details? } }` with stable codes (`VALIDATION`, `NOT_FOUND`, `CONFLICT`, `AUTH_EXPIRED`, `FK_IN_USE`, …) and correct HTTP status. See §11.5.

### 5.6 P2 — No pagination on list endpoints

`GET /materials`, `/templates`, `/estimates`, `/customers` return full sets. Fine at current volume; a metered mobile connection pulling full lists repeatedly is not. Add `limit`/`offset` (or cursor) + total count.

### 5.7 P2 — "My Templates" material linkage is fragile

Standard templates resolve layers via a portable `ref_material_key`; user "My Templates" store a raw `materialId` UUID inside a JSONB column with **no FK**. On instantiate, an unresolved UUID is **silently skipped** (`console.warn; continue`) → the user gets an estimate **missing a layer** with no UI warning.

**Recommendation:** make My Templates use the same key-based resolution, and surface a visible "N layers could not be resolved" banner on instantiate. See §11.7.

### 5.8 P2 — Excel→DB price gaps (legacy import path)

The platform master is now DB-first (good), but the legacy Excel import (`materials-excel-refresh.ts` / seed) historically produced **$0 cost** for any row with a blank "User Price" (ink/adhesive/packaging sheets were 100% blank in the source workbook). If the Excel import path is ever used to (re)seed, confirm the fallback-to-market-price and a loud warning on $0. Verify the committed `master-materials-seed.json` has no `costPerKgUsd: 0` rows. See §11.8.

### 5.9 P3 — Doc accuracy & hygiene

- README claims **Ant Design 5**; actual stack is **Tailwind + lucide-react**.
- Status docs claim "TypeScript clean ✅" and "36/36" — contradicted by §5.1.
- `MasterLibrary.tsx` is an **orphan page** (not routed).
- Multiple overlapping status docs (`LIVE_STATE`, `IMPLEMENTATION_COMPLETE`, `README_IMPLEMENTATION`, `DATABASE_READY`, `CRITICAL_BUGS_FIXED`) — consolidate to one living status doc to stop "which claim do I trust."
- `estimates`/`layers` self-ref FK uses `@ts-expect-error` (works, but flagged).

---

## 6. PRD gaps still open (vs ES_PRD_v3_FINAL_BUILD_SPEC)

Most of the v3.4 PRD is implemented. The genuinely-open items (beyond the bugs above):

| Ref | Gap | Notes |
|---|---|---|
| PRD §6.9.5 | **Roll-after-slitting** spec panel | Engine yield exists; the OD/weight/length roll block is display-only/absent in editor. |
| PRD §6.9.4 | **Order qty + unit selector** full coverage | `orderQuantityUnit` column exists; confirm UI offers `kgs/sqm/kpcs/lm/roll_500_lm` and engine normalises all. |
| PRD §5.6 | **Mini laminate stack** on customer estimate rows | CustomerDetail rows are text-only. |
| PRD §6.6 | **Community/marketplace templates** | Explicitly future; governance API not built (correctly deferred). |
| PRD §6.10 | **FX provider hardening** | Single provider; confirm stale-rate banner + manual override are wired end-to-end in Settings. |
| PRD §5.2 | **WCAG AA contrast** for gold selling-price text | Needs a contrast check; may require `#9A7018` or bolder weight. |
| PRD §3.2 | **Offline draft sync** | Phase 2 — not built (relevant to mobile, §9). |

These are **enhancements**, not regressions — V1 scope was largely met. They feed the roadmap in §11–§15.

---

## 7. Strategic context (owner's brief)

The owner's framing adds four cross-cutting requirements that reshape the roadmap:

1. **ES is standalone under the ProPackHub (PPH) SaaS umbrella.** Keep it self-contained: its own auth, DB, and deploy. No hard runtime dependency on PEBI or FS in V1. (Matches LOCKED_DECISIONS — no SSO, no cross-app nav.)
2. **A mobile app (iPhone + Android) is coming.** The web app must become installable/native-wrappable. `capacitor.config.json` exists but Capacitor isn't installed — this is the cheapest path (wrap the existing React PWA) and is detailed in §9.
3. **Later, ES may connect to PEBI to pull info such as raw-material cost.** Architect a **clean, optional integration boundary** now (adapter + feature flag) so it can be switched on without rewrites — without making ES depend on PEBI today. Detailed in §10.
4. **PEBI also has an estimator; ES will be the basis for developing it.** This means the ES **engine + data model should be treated as the reusable core**. Keep the engine framework-free and PEBI-agnostic, and document its public contract so PEBI's estimator can embed it. Detailed in §10.3.

---

## 8. Enhancement proposals — overview

The enhancements are grouped and then fully specified as tasks in §11–§15:

- **Backend (§12):** standardized error envelope, pagination, real migrations, typed DB, refresh-token/session model, audit-log writes, rate limiting on auth, OpenAPI spec generation, raw-cost integration adapter.
- **UI/UX (§13):** fix typecheck/crash bugs, dimension typing refactor, roll-after-slitting panel, order-qty unit selector, customer-row mini stacks, dark mode, dashboard analytics widgets, template "My Templates" tab hardening, accessibility pass, empty/error-state polish, i18n scaffolding (Arabic per PRD §5.3).
- **New options/features (§14):** PDF proposal themes + email/share link, estimate comparison view, bulk re-quote when RM prices move, margin guardrails (soft, non-blocking), material price-history charts, CSV/Excel export, customer activity timeline, webhook/notification hooks, multi-currency proposal toggle.
- **Mobile (§9 / §15):** Capacitor wrap, native build pipeline, secure token storage, offline draft queue, push notifications.
- **PEBI integration (§10):** raw-cost adapter, shared engine contract, change-feed consumer.

---

## 9. Mobile app plan (iPhone + Android)

**Decision:** Wrap the existing React PWA with **Capacitor** (not React Native). Rationale: one codebase, reuses `api.ts` + `@es/engine` live calc unchanged, inherits the responsive layouts already built (BottomSheet, LayerCard swipe, sticky price bar). A native rewrite would double the surface for no near-term benefit. This matches LOCKED_DECISIONS #8 (responsive/PWA first, native deferred) and the owner's "similar mobile app" intent.

### 9.1 Current reality

- `packages/web/capacitor.config.json` exists (`appId: com.propackhub.estimation`, `webDir: public`) but **no `@capacitor/*` packages are in `web/package.json`** — Capacitor is configured-on-paper only.
- `webDir` is `public`, which is **wrong** — Vite builds to `dist/`. Capacitor would ship the un-built `public/` folder.

### 9.2 Setup tasks (see §15 for full task list)

1. Add deps to `web`: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/app`, `@capacitor/preferences`, `@capacitor/network`, `@capacitor/push-notifications`.
2. Fix `capacitor.config.json`: `"webDir": "dist"`, add `server.androidScheme: "https"`, set `appName` correctly.
3. `npx cap add ios && npx cap add android`; add `cap:sync` npm script (`vite build && cap sync`).
4. **Token storage:** replace `localStorage` token use with `@capacitor/preferences` (secure native storage) behind a small `lib/tokenStore.ts` abstraction (localStorage on web, Preferences on native). Critical before shipping — see §5.4.
5. **API base URL:** native builds can't use relative URLs to `localhost`. Add `VITE_API_BASE_URL` env and a runtime resolver; on device it must point to the deployed API host. CORS on the server must allow the Capacitor origin (`capacitor://localhost` / `https://localhost`).
6. **Safe areas / keyboard:** verify the existing sticky price footer respects `env(safe-area-inset-*)` and `visualViewport` (PRD §5.8) on real devices.

### 9.3 Offline drafts (Phase 2 of mobile)

- Use `@capacitor/preferences` or SQLite (`@capacitor-community/sqlite`) to queue draft estimates created offline; sync on reconnect (`@capacitor/network` listener) via a `lib/syncQueue.ts`. Because `@es/engine` runs client-side, **pricing works fully offline** — only persistence needs the queue. This is a strong differentiator for reps in the field.

### 9.4 Push notifications (Phase 2)

- Proposal-expiry reminders and "RM price changed — re-quote?" nudges (ties to §14 bulk re-quote). Requires APNs/FCM setup and a server `deviceTokens` table.

### 9.5 Backend prerequisites for mobile (do first)

Mobile amplifies existing backend gaps — these are **blocking** for a good mobile client and are scheduled accordingly:
- §5.4 short-lived tokens + refresh rotation + revocation.
- §5.5 machine-readable error envelope (so the app shows the right UI for auth-expired vs offline vs server error).
- §5.6 pagination (metered data).

---

## 10. PEBI integration & ES-as-core plan

Two distinct, **optional, future** integrations. Neither may introduce a runtime dependency on PEBI in V1. Both are architected now as seams so they can be switched on later.

### 10.1 Raw-cost from PEBI (pull integration)

**Goal:** Let a tenant optionally source raw-material costs from PEBI (e.g. Oracle/MES actual purchase cost) instead of (or alongside) the platform master price.

**Design — adapter + feature flag, no coupling:**
- Introduce a `RawCostProvider` interface in `server/src/services/raw-cost/`:
  ```ts
  interface RawCostProvider {
    name: string;
    // returns USD cost/kg for a material key, or null if unknown
    getCostUsd(materialKey: string, ctx: { tenantId: string }): Promise<number | null>;
    // optional bulk
    getCostsUsd(keys: string[], ctx): Promise<Record<string, number | null>>;
  }
  ```
- Implementations: `PlatformMasterProvider` (default, today's behaviour) and `PebiRawCostProvider` (HTTP client to a PEBI endpoint, behind config `PEBI_RAWCOST_URL` + service credential).
- A per-tenant setting `rawCostSource: 'platform' | 'pebi'` (new column on `tenants` or `tenant_settings`) selects the provider. When `pebi` and the call fails, **fall back to platform price + flag the layer `costSourceStale`** (never break a quote).
- The materials sync already supports `externalId`/`externalSource` columns on `materials` and `platformMasterMaterials` — these are the join keys to PEBI/Oracle item IDs. Use them.
- **Reuse the existing change-feed pattern** (`platform_master_audit_log` + service keys) in reverse: ES already *exposes* a master-data change feed to MES; the PEBI raw-cost adapter is the *consumer* side. Keep both behind `utils/service-key-auth`.

**V1 deliverable:** the `RawCostProvider` interface + `PlatformMasterProvider` + the setting plumbing (no PEBI client yet). This makes the later switch a single new class, zero refactor.

### 10.2 What NOT to do

- Do **not** add PEBI auth/SSO (LOCKED_DECISIONS — separate products).
- Do **not** make calculate depend on a network call to PEBI. RM cost is resolved at **save/calculate** time into the snapshot; if a PEBI provider is configured, it's resolved then and frozen into the layer snapshot like any other price.

### 10.3 ES engine as the basis for PEBI's estimator

PEBI has its own `/estimator`. The owner wants ES to be the **basis** for evolving it. Concretely:

- **Keep `@es/engine` framework-free and PEBI-agnostic** (it already is — no DB, no Fastify, no React imports). This is the reusable core.
- **Publish the engine contract:** add `packages/engine/README.md` documenting inputs (`Estimate`, `Material`), outputs (`CalculationResult`), the USD-only rule, and the formula provenance (link `golden-fixtures.ts`). PEBI can `import { calculateEstimate }` or vendor it.
- **Versioning:** treat the engine as a semver package. PEBI pins a version; ES bumps with golden-test coverage so PEBI inherits correctness.
- **Divergence boundary:** PEBI's estimator needs MES concepts (BOM2, routing, OEE) ES deliberately excludes. The shared layer is **only** the costing math + layer/material/dimension model. Anything MES-specific lives in PEBI, composed *on top of* the engine — never merged back into ES.
- **Action:** extract a short `docs/ENGINE_CONTRACT.md` (or engine README) so a PEBI agent can adopt the engine without reading ES server/web code.

---

## 11. Implementation roadmap (phased, agent-ready)

Each task block: **ID · Goal · Files · Change · Acceptance.** Do phases in order. A phase's exit criteria gate the next.

### Phase 0 — Stabilize the build (P0, ~0.5 day) — **do this first**

**Goal:** clean typecheck + green build in all three packages from a fresh `npm install`.

| ID | Goal | Files | Change | Acceptance |
|----|------|-------|--------|------------|
| 0.1 | Fix `Trash2` crash | `web/src/pages/StandardTemplates.tsx` | Add `Trash2` to the `lucide-react` import on line 3; remove unused `Loader2`, `Layers`. | Admin "edit standard template" layer editor renders without `ReferenceError`. |
| 0.2 | Fix dimension casts | `web/src/pages/EstimateEditor.tsx`; new `web/src/lib/dimensions.ts` | Create `DimensionState` with an index signature OR a typed `toDimensionRecord()` / `fromDimensionRecord()` pair; replace the 3 `as` casts (lines 456, 540, 565). | `tsc --noEmit` (web) reports 0 errors on those lines. |
| 0.3 | Remove dead import | `web/src/pages/EstimatesList.tsx` | Remove unused `CustomerAutocomplete` (or wire the filter). | No `TS6133`. |
| 0.4 | Type server callback | `server/src/routes/templates.ts:524` | Annotate param `l` with its real type. | `tsc --noEmit` (server) = 0 errors. |
| 0.5 | Type the DB handle | `server/src/db/index.ts` | `db: NodePgDatabase<typeof schema>` instead of `any`; `pool: Pool | null`. | Server still compiles; downstream `any` leaks reduced. |
| 0.6 | CI gate | `.github/workflows/ci.yml` | Add a `tsc --noEmit` step for web + server that **fails** the build on error (no `|| true`). | CI red if typecheck breaks. |

**Exit:** `tsc --noEmit` exits 0 in web + server; `npm run build` (web) succeeds; engine 34/34 still green.

---

### Phase 1 — Migration & data-integrity foundation (P1, ~1–2 days)

**Goal:** reproducible DB from a clean clone; no silent $0 costs; protect tenant customizations.

| ID | Goal | Files | Change | Acceptance |
|----|------|-------|--------|------------|
| 1.1 | Real migrations | `server/drizzle.config.ts`, new `server/drizzle/` | Run `drizzle-kit generate` to create the initial migration from current schema; commit it. Add `db:migrate` to boot in non-dev (`if NODE_ENV!=='development'`). Keep `db:push` for local only. | Fresh DB via `npm run db:migrate` creates all tables; no manual SQL needed. |
| 1.2 | Fold patches into migrations | `server/scripts/apply-schema-patches.ts`, `scripts/schema-patches.sql` | Verify every column the patch adds exists in the generated migration; deprecate `db:patch` once parity confirmed (keep as no-op or remove from RUN-ES.bat). | A DB built from migrations alone passes server integration tests. |
| 1.3 | No silent $0 cost | `server/src/db/master-materials-io.ts` (or excel-refresh) | When `User Price` blank, fall back to `Market Price`; if both blank, **skip with a loud warning** (don't write 0). | Importing a workbook with blank prices logs warnings and writes no `costPerKgUsd: 0`. |
| 1.4 | Verify seed | `server/src/db/master-materials-seed.json` | Audit for any `costPerKgUsd: 0`; backfill real or market values. | `grep` for `"costPerKgUsd": 0` returns nothing meaningful. |
| 1.5 | Protect tenant prices on sync | `server/src/db/platform-master-data.ts` (sync fn) | On tenant sync, **do not overwrite** `costPerKgUsd`/`marketPriceUsd` for rows where `priceSource='manual'` or `isTenantOnly=true`. | Test: tenant edits a price → platform sync → tenant price unchanged. |
| 1.6 | FK-in-use error | `server/src/routes/materials.ts` | Catch Postgres FK violation on material delete; return `409 { error:{ code:'FK_IN_USE', message, details:{ estimateCount } } }`. | Deleting a referenced material returns a clear 409 with count. |

**Exit:** clean clone → `npm install` → `npm run db:migrate` → server boots → integration tests pass; no $0-cost materials; tenant overrides survive sync.

---

### Phase 2 — API hardening for mobile + integrations (P1/P2, ~2–3 days)

**Goal:** machine-readable errors, pagination, secure auth — prerequisites for the mobile app and PEBI adapter.

| ID | Goal | Files | Change | Acceptance |
|----|------|-------|--------|------------|
| 2.1 | Error envelope | new `server/src/utils/errors.ts`; `app.ts` error handler; all routes | Define `AppError(code, status, message, details?)` + helpers. Central handler emits `{ error:{ code, message, details? } }`. Map Zod → `VALIDATION` 400, not-found → `NOT_FOUND` 404, FK → `CONFLICT`/`FK_IN_USE` 409, JWT expiry → `AUTH_EXPIRED` 401. | Every error response has a stable `code`; web `api.ts` switches on it. |
| 2.2 | Pagination | `materials.ts`, `templates.ts`, `estimates.ts`, `customers.ts`; `web/src/lib/api.ts` | Add `?limit=&offset=` (default 50/0, max 200); return `{ items, total, limit, offset }`. Keep back-compat by accepting absent params. | List endpoints page; web list pages request pages. |
| 2.3 | Short access + refresh rotation | `app.ts`, `auth.ts`; new `sessions` table | Access token `expiresIn: 30m`. Issue an opaque refresh token stored hashed in `sessions(tenantId,userId,tokenHash,expiresAt,revokedAt,deviceLabel)`. `POST /auth/refresh` rotates (revoke old, issue new). `POST /auth/logout` revokes. | Expired access token + valid refresh → new token; logout invalidates refresh. |
| 2.4 | Auth rate limit | `auth.ts`, reuse `utils/rate-limit.ts` | Throttle login/register per IP+email. | Brute-force attempts get 429. |
| 2.5 | OpenAPI | `app.ts` | Register `@fastify/swagger` + `@fastify/swagger-ui` at `/docs`; annotate routes (TypeBox already present). | `/docs` lists all endpoints; spec exportable for the mobile client + PEBI. |
| 2.6 | CORS for native | `app.ts` | Allow `capacitor://localhost` and `https://localhost` origins (env-driven list). | Native app calls API without CORS errors. |

**Exit:** all errors machine-readable; lists paginated; tokens short-lived with rotation/revocation; `/docs` live.

---

### Phase 3 — PEBI/raw-cost integration seam (P2, ~1–2 days)

**Goal:** the seam exists so PEBI raw-cost can be switched on later with one new class.

| ID | Goal | Files | Change | Acceptance |
|----|------|-------|--------|------------|
| 3.1 | Provider interface | new `server/src/services/raw-cost/index.ts` | Define `RawCostProvider` (§10.1) + `PlatformMasterProvider` (wraps current behaviour). | Calculate uses the provider; default behaviour unchanged. |
| 3.2 | Tenant setting | `schema.ts` (`tenants.rawCostSource` default `'platform'`), `settings.ts`, `Settings.tsx` | Admin can pick source (only `platform` selectable until PEBI client ships). | Setting persists; defaults to platform. |
| 3.3 | Resolve-at-snapshot | `services/estimate-calculation.ts` | Resolve RM cost through the provider at calculate time; on provider failure fall back to platform price and set a `costSourceStale` flag on the layer snapshot. | Quote never breaks if provider unreachable; staleness flagged. |
| 3.4 | Engine contract doc | new `packages/engine/README.md` or `docs/ENGINE_CONTRACT.md` | Document inputs/outputs/USD rule/formula provenance for PEBI reuse (§10.3). | A PEBI agent can adopt the engine from the doc alone. |

**Exit:** `PebiRawCostProvider` is the only missing piece to enable PEBI raw-cost; engine contract documented.

---

### Phase 4 — Capacitor mobile wrap (P1 for mobile goal, ~2–3 days)

Depends on Phase 2 (auth + errors). Full tasks in §15.

**Exit:** signed iOS + Android builds run against staging API; login, build estimate, live price, generate/share PDF all work on device; tokens in secure storage.

---

### Phase 5 — PRD completeness (P2, ~2–3 days)

| ID | Goal | Files | Change | Acceptance |
|----|------|-------|--------|------------|
| 5.1 | Roll-after-slitting panel | `EstimateEditor.tsx`, engine (optional formulas) | Collapsible "Roll spec" card gated by `rollAfterSlitting` visibility; port COSTING_NOTES §7.5 (display-only OK). | Admin sees OD/weight/length; rep does not. |
| 5.2 | Order-qty unit selector | `JobHeaderFields.tsx`, engine `normalizeOrderQuantity()` | Header qty + unit (`kgs/sqm/kpcs/lm/roll_500_lm`); engine normalises to kg for slab/process loop. | Changing unit changes computed kg correctly. |
| 5.3 | Customer-row mini stacks | `CustomerDetail.tsx`, `customers.ts` (embed layer summary) | Render small `LaminateVisualizer` per estimate row. | Rows show stack thumbnails. |
| 5.4 | My Templates hardening | `templates.ts`, `TemplatePicker.tsx` | Key-based layer resolution + visible "N layers unresolved" banner on instantiate (fixes §5.7). | Missing material surfaces a warning, never a silent drop. |
| 5.5 | FX stale + manual override | `Settings.tsx`, `settings.ts` | Verify/finish stale-rate banner + manual mode end-to-end (PRD §6.10). | Failed auto-fetch shows banner; manual rate sticks. |
| 5.6 | Accessibility pass | `tailwind.config.js`, components | WCAG AA contrast for gold price text; focus states; 44–48px touch targets. | Contrast checker passes on selling-price text. |

---

### Phase 6 — New value features (P2/P3, prioritise per owner) 

See §14 for full specs. Suggested order: PDF themes + share link → bulk re-quote on price move → estimate comparison → price-history charts → CSV/Excel export → dark mode → i18n (Arabic).

---

## 12. Backend enhancement specs (detail)

### 12.1 Standard error envelope (Phase 2.1)
```ts
// server/src/utils/errors.ts
export type ErrorCode =
  | 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'FK_IN_USE'
  | 'AUTH_REQUIRED' | 'AUTH_EXPIRED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INTERNAL';
export class AppError extends Error {
  constructor(public code: ErrorCode, public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
// response shape (always): { error: { code, message, details? } }
```
Central handler in `app.ts` maps `ZodError → VALIDATION/400`, `AppError → its status`, JWT errors → `AUTH_EXPIRED/401`, Postgres `23503 → FK_IN_USE/409`, else `INTERNAL/500`. Web `api.ts` reads `error.code` to drive UI (e.g. on `AUTH_EXPIRED` → silent refresh then retry; on offline → queue).

### 12.2 Pagination contract (Phase 2.2)
`GET /api/v1/<resource>?limit=50&offset=0&q=<search>` → `{ items: T[], total: number, limit, offset }`. Cap `limit` at 200. Sort params per resource (`sort=createdAt:desc`). Backward compatible: no params ⇒ first 50.

### 12.3 Session / refresh model (Phase 2.3)
```
sessions(
  id uuid pk, tenant_id uuid, user_id uuid,
  refresh_token_hash varchar unique, device_label varchar,
  expires_at timestamptz, revoked_at timestamptz, created_at, last_used_at
)
```
Access JWT 30m. Refresh token = random 32-byte, stored hashed (sha256). `/auth/refresh` validates hash + not revoked + not expired, **rotates** (revoke old, insert new), returns new access+refresh. `/auth/logout` sets `revoked_at`. Mobile stores refresh in secure storage (§9.2). This closes §5.4.

### 12.4 Audit-log writes
`activity_logs` table exists but is under-used. Write rows on estimate create/update/delete, material price edit, template change, visibility change. Powers the customer activity timeline (§14.6) and a future admin audit view.

### 12.5 Raw-cost provider (Phase 3) — see §10.1 for the interface and fallback rules.

### 12.6 Health/readiness
Add `/health/ready` that checks DB connectivity (the current `/health` is liveness-only). Useful for container orchestration when the API backs the mobile app.

---

## 13. UI/UX enhancement specs (detail)

| # | Enhancement | Where | Notes |
|---|-------------|-------|-------|
| 13.1 | Fix typecheck/crash | §11 Phase 0 | Blocking; do first. |
| 13.2 | Centralized dimension model | `web/src/lib/dimensions.ts` | One typed source for serialize/deserialize; removes the `as` casts and a class of future bugs. |
| 13.3 | Dashboard analytics widgets | `Dashboard.tsx`, `dashboard.ts` | Win-rate, quotes this month, open-proposal value, RM-cost trend sparkline. Respect visibility (rep sees counts, not margins). |
| 13.4 | Estimate comparison view | new `pages/EstimateCompare.tsx` | Side-by-side two estimates (e.g. original vs re-quote): structure, GSM, slab prices, deltas. |
| 13.5 | Dark mode | `tailwind.config.js` (`darkMode:'class'`), `index.css`, Layout toggle | PRD §5.2 Phase 2; tokenize colors. |
| 13.6 | i18n scaffolding (Arabic) | `react-i18next`, `locales/` | PRD §5.3 (Cairo font, RTL). Wrap strings; ship `en` + `ar` skeleton. |
| 13.7 | Empty/error/skeleton polish | per PRD §5.9 | Skeletons exist; audit each surface for retry banners + offline state (mobile). |
| 13.8 | Remove orphan page | delete or route `MasterLibrary.tsx` | Decide: route it or delete. |
| 13.9 | Template picker groups + thumbnails | `TemplatePicker.tsx` | Confirm PE Mono / Non PE Mono / Multilayer grouping + mini visualizer on cards (PRD §6.2). |

---

## 14. New options / features (specs)

| # | Feature | Value | Sketch |
|---|---------|-------|--------|
| 14.1 | **PDF proposal themes + share link** | Faster, branded sending | Add 2–3 PDF themes; `POST /proposals` returns a tokenized public view URL (`GET /p/:token`) with expiry; optional email send via provider. Persist in existing `proposals` table. |
| 14.2 | **Bulk re-quote on RM price move** | Reacts to material volatility | When platform/master price changes, list affected open estimates; one-click "re-quote all at current prices" → batch create re-quotes + delta report. Ties to push notif (§9.4). |
| 14.3 | **Margin guardrails (soft)** | Protect profitability without approval workflow (LOCKED #13 — no approvals) | Tenant sets a soft floor (e.g. effective margin ≥ X%); editor shows a non-blocking warning badge when below. Never blocks (no approval gate). |
| 14.4 | **Material price-history charts** | Trend insight | `price_history` table exists; add `GET /materials/:id/price-history` + a small chart in Library. (Aligns with deferred LOCKED #6 — ship read-only chart only.) |
| 14.5 | **CSV/Excel export** | Interop | Export estimates list, slab tables, and library to CSV; reuse `xlsx` (already a server dep). |
| 14.6 | **Customer activity timeline** | Lightweight CRM (within LOCKED #3 scope) | Render `activity_logs` for a customer: created/sent/won/lost/re-quoted, with dates. No full CRM. |
| 14.7 | **Webhook/notification hooks** | Platform extensibility | Outbound webhooks on estimate `sent`/`won` and on master price change — reuses service-key auth; feeds PPH-level automation. |
| 14.8 | **Multi-currency proposal toggle** | Global users | Show a secondary currency column in the proposal (display + one alt), frozen at FX snapshot. Engine stays USD. |

> Keep all of these **within the ES simplicity boundary** (PRD §2): no MES/routing/approval features. Anything that smells like manufacturing feasibility belongs in PEBI, not here.

---

## 15. Mobile (Capacitor) task list — detail

| ID | Task | Files |
|----|------|-------|
| M1 | Add Capacitor deps | `web/package.json` (`@capacitor/core`,`cli`,`ios`,`android`,`app`,`preferences`,`network`,`push-notifications`) |
| M2 | Fix config | `web/capacitor.config.json` → `"webDir":"dist"`, `server.androidScheme:"https"` |
| M3 | Add platforms + scripts | `npx cap add ios/android`; `"cap:sync":"vite build && cap sync"` in `web` |
| M4 | Token storage abstraction | new `web/src/lib/tokenStore.ts` (localStorage on web, `@capacitor/preferences` on native); refactor `api.ts` to use it |
| M5 | API base URL resolver | `VITE_API_BASE_URL` env + runtime detection; `api.ts` |
| M6 | CORS native origins | `server/src/app.ts` (Phase 2.6) |
| M7 | Safe-area / keyboard QA | `index.css`, `EstimateEditor.tsx` footer, `BottomSheet.tsx` |
| M8 | Offline draft queue (Phase 2) | new `web/src/lib/syncQueue.ts` + `@capacitor/network` |
| M9 | Push notifications (Phase 2) | `@capacitor/push-notifications` + server `device_tokens` table + APNs/FCM |
| M10 | App store assets | icons (reuse `public/icons`), splash, store metadata |

**Security gate before any store submission:** §5.4 (short tokens + rotation) and M4 (secure storage) must be done. Do not ship a mobile build that caches a 7-day bearer token in plain storage.

---

## 16. Doc hygiene (do alongside Phase 0/1)

1. **Consolidate status docs.** Make `LIVE_STATE.md` the single source of truth; archive `IMPLEMENTATION_COMPLETE.md`, `README_IMPLEMENTATION.md`, `DATABASE_READY.md`, `CRITICAL_BUGS_FIXED.md` under `docs/archive/` with a stale-banner. Stop the "which ✅ is real" problem.
2. **Fix README stack claim** (Tailwind + lucide-react, not Ant Design 5) and the test counts.
3. **Update LIVE_STATE** to reflect §5.1 reality until Phase 0 lands ("web/server typecheck currently failing — see Deep Audit §5.1").
4. **Add `ENGINE_CONTRACT.md`** (Phase 3.4) for PEBI reuse.
5. Keep this document as the **roadmap of record** until phases close; append progress rows to `SESSION_LOG.md`.

---

## 17. Suggested execution order (for the next agent)

1. **Phase 0** — unblock the build (half day). Nothing else is verifiable until `tsc` is clean.
2. **Phase 1** — migrations + data integrity (so any environment is reproducible and money is correct).
3. **Phase 2** — API hardening (errors, pagination, auth) — unblocks mobile + integrations.
4. **Phase 3** — PEBI/raw-cost seam + engine contract (cheap now, expensive later).
5. **Phase 4** — Capacitor mobile wrap.
6. **Phase 5** — PRD completeness.
7. **Phase 6 / §14** — value features, owner-prioritised.

Each phase has explicit exit criteria above. Verify with `tsc --noEmit` + `npm test` (engine + server) before marking a phase done, and append a row to `SESSION_LOG.md`.

---

## Appendix A — Evidence log (reproductions, 2026-06-21)

| Check | Result |
|---|---|
| `engine: npm test` | 34 passed (4 files) |
| `web: tsc --noEmit` | exit 2 — `TS2304 Trash2` (StandardTemplates:808), `TS2352`×4 (EstimateEditor 456/540/565), `TS6133`×3 |
| `server: tsc --noEmit` | exit 2 — `TS7006` implicit any (templates.ts:524) |
| `.gitignore` | now scopes `*.local.sql`, whitelists `schema-patches.sql`/`setup-db.sql` (old blanket `*.sql` fixed) |
| root `package.json` | stray `drizzle-orm`/`pg` removed; only `@types/pg` remains in devDeps |
| `server: JWT` | `expiresIn:'7d'` set + `/auth/refresh` route present (old "never expires" fixed; still long for mobile) |
| `web: capacitor` | `capacitor.config.json` present (`webDir:"public"`), **no `@capacitor/*` deps installed** |

## Appendix B — File index (where work lands)

```
packages/engine/src/calculator.ts            — engine (do not drift; golden-tested)
packages/engine/README.md                    — NEW engine contract (Phase 3.4)
packages/server/src/app.ts                   — error envelope, CORS, swagger (2.1/2.5/2.6)
packages/server/src/db/index.ts              — typed db handle (0.5)
packages/server/drizzle.config.ts + drizzle/ — real migrations (1.1)
packages/server/src/db/platform-master-data.ts — protect tenant prices on sync (1.5)
packages/server/src/db/master-materials-io.ts — $0 cost fallback (1.3)
packages/server/src/routes/*.ts              — pagination, error codes, FK errors (1.6/2.1/2.2)
packages/server/src/routes/auth.ts           — short tokens + sessions (2.3/2.4)
packages/server/src/services/raw-cost/       — NEW provider seam (3.1)
packages/server/src/services/estimate-calculation.ts — resolve-at-snapshot (3.3)
packages/web/src/lib/dimensions.ts           — NEW typed dimensions (0.2)
packages/web/src/lib/tokenStore.ts           — NEW secure token storage (M4)
packages/web/src/lib/api.ts                  — error-code handling, pagination, token store
packages/web/src/pages/StandardTemplates.tsx — Trash2 import fix (0.1)
packages/web/src/pages/EstimateEditor.tsx    — dimension typing, roll panel, order-qty (0.2/5.1/5.2)
packages/web/capacitor.config.json           — webDir dist (M2)
```

---

*End of deep audit & enhancement plan. This document is the roadmap of record; update LIVE_STATE + SESSION_LOG as phases close.*

---

## 18. Flexible-packaging domain & visual-UX catalog (the "good-to-have" layer)

> **Honest note:** §1–§17 above were weighted toward correctness, architecture, mobile, and PEBI. This section adds the **packaging-specific richness** — dynamic product imagery that reacts to dimensions, pouch/bag taxonomies, finishing options, the layers UX, and the modern look. These are mostly **UI/UX + data-model** additions; none of them touch the locked costing formulas. They are sequenced as **Phase 7 (visual/domain)** and can run in parallel with Phase 5/6.

### 18.1 Product-type taxonomy expansion (the foundation)

Today the engine knows only three `productType`s: `roll | sleeve | pouch`. That's correct for **costing math**, but the **UI and quoting experience** should expose the real catalog the rep thinks in. Introduce a **`productSubtype`** layer that maps down to one of the three engine types for calculation, while driving visuals, dimension fields, and add-on options.

**Proposed taxonomy (data, not code — seed as `platform_reference_items` category `product_subtype`):**

| Family (engine type) | Subtype | Key dimensions | Common add-ons |
|---|---|---|---|
| **Roll / film** (`roll`) | Printed roll stock, Plain roll, Shrink film, Wide film, Lamination roll, Wrap-around label roll | reel width, cutoff, OD, core ID, ups, trim | corona, treatment side |
| **Pouch** (`pouch`) | **Stand-up (Doypack)**, **3-side seal**, **4-side seal (flat)**, **Center-seal pillow**, **Flat-bottom (box/Quad)**, **Side-gusset**, **Spouted pouch**, **Retort pouch**, **Shaped pouch** | open W, open H, bottom gusset, side gusset, seal width, lay-flat | zipper, spout, valve, tear-notch, hang-hole/euro-slot, round corners, laser score |
| **Bag** (`pouch` or `roll`) | **Wicketed bag**, **Bottom-seal bag**, **Side-seal bag**, **T-shirt/vest bag**, **Courier/mailer bag**, **Garbage bag**, **Valve bag (FFS)**, **Bread bag** | W, H, gusset, lip/wicket, flap | wicket holes, adhesive lip, vent holes, handle |
| **Sleeve** (`sleeve`) | **Shrink sleeve (PET/PVC/OPS)**, **Stretch sleeve**, **Tamper band** | lay-flat width, cutoff, seam | perforation, tamper perf |
| **Label** (`roll`) | **Pressure-sensitive roll label**, **Wrap-around**, **IML**, **Booklet** | width, repeat, ups, core | varnish, lamination, die shape |

**Implementation**
- Add `productSubtype` (varchar) to `estimates` + `structure_templates`; seed the catalog above as reference items with `metadata: { engineType, dimensionSchema, allowedAddOns, defaultLayers }`.
- The editor reads the subtype's `dimensionSchema` to render the right dimension fields (so a stand-up pouch shows bottom-gusset; a wicketed bag shows lip/wicket).
- The 11 PRD parent PGs (LOCKED #17) remain the **standard-template** seed; subtypes are an **additive** layer for richer quoting, not a replacement. Keep the A/B/C grouping intact.

### 18.2 Dynamic, dimension-reactive product visuals (the headline ask)

Build a **parametric SVG component family** that re-draws as the user types dimensions — the same approach `LaminateVisualizer` already uses (pure SVG, no images to manage, infinitely scalable, exports cleanly into the PDF proposal).

**New component family — `web/src/components/product-visuals/`:**

| Component | Reacts to | Behaviour |
|---|---|---|
| `RollVisual.tsx` | reel width, OD, core ID | Draws a roll end-on + side profile; **width of the drawn roll scales with reel width**, diameter scales with OD, core hole with core ID. Annotated callouts (W, ØOD, Øcore). Wound-film thickness hint from total micron. |
| `PouchVisual.tsx` | subtype, open W/H, gussets, zipper/spout | One renderer, switches silhouette by subtype: stand-up (with bottom-gusset fold line + base ellipse), 3/4-side seal (seal borders), flat-bottom (box panels), side-gusset, spouted (spout + cap). Seal areas shaded; zipper drawn as a dashed line; spout as a cap glyph. Proportions follow real W:H. |
| `BagVisual.tsx` | subtype, W/H/gusset/lip | Wicketed (lip + wicket holes), T-shirt (handles), courier (flap + adhesive strip), valve. |
| `SleeveVisual.tsx` | lay-flat width, cutoff | Draws sleeve flat **and** an optional preview hugging a generic bottle silhouette so the rep sees coverage. |
| `LabelVisual.tsx` | width, repeat, die shape | Roll of labels with repeat marks; die-cut shape (rect/round/oval/custom). |
| `ProductVisual.tsx` | productSubtype | Dispatcher that picks the right visual + a print-coverage overlay (shows artwork area when "printed"). |

**Engineering rules**
- All parametric SVG, driven by the same dimension state as the calc — **0ms, no asset pipeline**, and the same component renders into the proposal PDF (reuse the existing SVG→PDF path).
- Proportional + clamped (min/max draw sizes) so extreme inputs still render sanely.
- Accessibility: `role="img"` + `aria-label` describing the product + dimensions (already the LaminateVisualizer pattern).
- Optional **"realistic" toggle**: a higher-fidelity shaded render (gradients, foil sheen, drop shadow) vs the clean schematic — schematic is default for speed/PDF.
- **Stretch (Phase 7b):** a lightweight **3D mockup** (CSS 3D transform or `@react-three/fiber`) for stand-up pouches in the proposal cover — nice for sales, not required.

### 18.3 Laminate / layers UI — upgrade the editor

The stack visualizer exists; the **editing experience** around it should become the signature "Figma for Packaging" surface (PRD §5, Decision #11):

- **Micron-proportional bands** (done) + **drag-to-reorder**, **color-by-type** (done), **foil metallic gradient** for ALU, **semi-transparent ink/coating** bands.
- **Per-layer chips:** print side (surface/reverse), treatment (corona/none), coating (matte/gloss), barrier tag (O₂/moisture/light).
- **Inline actions:** "Add metallized barrier" (already a server concept — surface it as a one-click stack action inserting Adhesive SB + ALU + Adhesive SB), "Duplicate layer", "Flip stack".
- **Hover/tap tooltip** per band: material, grade, micron, GSM, cost/m² (cost gated by visibility profile).
- **Live structure string**: e.g. `PET 12 / Ink / ADH / ALU 7 / ADH / LDPE 80` rendered as a copyable spec line (used on the PDF).
- **Total readouts** beside the stack: total micron, total GSM, film density, structure type (Mono/Multilayer), web class — all already computed by the engine.
- **Validation affordances:** warn when a barrier layer has no adhesive neighbour, or sealant isn't innermost (soft, non-blocking hints).

### 18.4 Finishing / converting / add-on options (new quotable line items)

Reps quote **converting features**, not just film. Add an **add-ons** model so these surface in the editor and (optionally) carry a cost/setup. Keep costs **admin-configurable**, hidden from reps per the visibility model.

**Data:** new `addOns` reference (category `add_on`) + per-estimate `estimate_add_ons(estimateId, addOnKey, qty, unitCost, setupCost, enabled)`.

| Group | Options |
|---|---|
| **Closures** | Zipper (standard/child-resistant/slider), press-to-close, velcro |
| **Dispensing** | Spout + cap (corner/top/center), pour spout, valve (degassing, for coffee) |
| **Opening** | Tear notch, laser score / easy-tear, easy-peel seal, resealable label |
| **Hanging/retail** | Euro-slot / hang hole, header card, round corners |
| **Print finishing** | Matte/gloss varnish, spot UV, soft-touch, cold/hot foil, registered matte |
| **Converting** | Lamination, slitting, pouching, sheeting, perforation, micro-perf (breathable), window patching |
| **Other** | Embossing/debossing, RFID/QR insert, tamper-evident band |

Each add-on can be **purely descriptive** (shows on spec/PDF) or **cost-bearing** (admin sets unit+setup; flows into operation/plates-style line, never breaking the locked engine — model it as additional `plates/delivery/operation`-class inputs).

### 18.5 Application-driven material intelligence (guided quoting)

A "**What are you packing?**" picker that recommends a starting structure + barrier requirements — huge for non-expert reps (still **no AI**, just rules; respects LOCKED #9):

| Application | Barrier need | Suggested starter structure |
|---|---|---|
| Coffee (whole bean) | High O₂ + aroma + degassing | PET / ALU / LDPE + valve |
| Snacks (chips) | Moisture + light | MetPET / LDPE |
| Pet food | Puncture + grease | PET / PA / LDPE |
| Liquids / retort | High barrier + heat | PET / ALU / CPP (retort) |
| Frozen | Cold-seal / toughness | PE mono |
| Fresh produce | Breathable (micro-perf) | OPP / micro-perf |

Implemented as reference data (`category: application` with `metadata.suggestedTemplateKey` + `barrierTags`) so it's admin-editable, not hard-coded.

### 18.6 Sustainability options (increasingly required in quotes)

- Tag materials/structures: **recyclable mono-material**, **PCR %**, **compostable**, **PFAS-free**.
- A **recyclability badge** on the stack ("Mono-PE — recycle-ready" vs "Multi-material — check locally").
- Optional sustainability blurb on the proposal PDF.
- Data: boolean/percent fields on `materials` + a derived structure-level badge.

### 18.7 Page-by-page UI modernization (the "whole UI")

| Page | Current | Modern target |
|---|---|---|
| **Login / Register** | Functional form | Split hero (brand visual / animated laminate stack) + form; currency picker with flags; trust copy. |
| **Onboarding (new)** | none | 3-step wizard: currency → "what do you make?" (subtype cards) → pick first template → land in editor with seeded stack (PRD §5.9 first-run). |
| **Dashboard** | Counts + recent | KPI cards (quotes MTD, win-rate, open-proposal value), RM-price trend sparkline, expiring-proposal list, "Continue draft" resume, quick-quote button. Visibility-aware (rep sees activity, not margins). |
| **Product chooser** (`estimate/choose`) | Template grid | **Illustrated subtype cards** (each shows its `ProductVisual` thumbnail) grouped Roll / Pouch / Bag / Sleeve / Label + Blank + My Templates tab. |
| **Estimate editor** | Split pane, live calc | Sticky right panel hosts **tabbed visual**: Structure (laminate) ↔ Product (parametric `ProductVisual`) ↔ Spec; sticky gold price with count-up; dimension fields driven by subtype schema; add-ons panel (admin); mobile = collapsible visual + bottom-sheet edits + sticky price bar (PRD §5.8). |
| **Estimates list** | Table | Card/table toggle, status chips, mini stack per row, filters (status/customer/date), pagination, CSV export. |
| **Customer detail** | Text rows | Header with totals + activity timeline; estimate rows with **mini `ProductVisual` + stack**; re-quote / duplicate actions. |
| **Library** | Type filter | Category→Subcategory tree, grade thumbnails, price-history sparkline, sustainability tags, search. |
| **Settings** | Tabs | Branding live-preview (logo/colors reflect into a sample proposal), currency with stale-banner, team & visibility grid + "preview as user", slab templates, add-on cost defaults. |
| **Proposal preview (new)** | PDF only | In-app proposal preview with theme switcher before send/download. |

### 18.8 Design-system upgrade (modern look)

Build on the locked palette (navy `#0F1F3D`, gold `#C8962A`, slate `#F4F5F7`) and fonts (DM Sans / Inter / JetBrains Mono):

- **Tokens** in `tailwind.config.js`: spacing scale, radius (`rounded-xl` cards), elevation (soft layered shadows), semantic color tokens (so dark mode and contrast fixes are one place).
- **Components:** consistent Card, Button (primary gold / ghost / danger), Chip/Badge, Tabs, Sheet, Tooltip, Toast, EmptyState, Skeleton (some exist — standardize).
- **Micro-interactions:** price count-up (PRD §5.5, 600ms ease-out), layer add/remove transitions, drag affordance, optimistic save with toast.
- **Accessibility:** AA contrast (fix gold-on-white price text → `#9A7018` or bolder), visible focus rings, 44–48px touch targets, `prefers-reduced-motion` guard.
- **Density:** comfortable default; compact toggle for power users.
- **Dark mode** (PRD §5.2 Phase 2) once tokenized.
- **Polish:** command palette (⌘K) for navigation/new-quote; keyboard shortcuts in the editor.

### 18.9 Phase 7 — Visual & domain UX (agent-ready task list)

Runs in parallel with Phase 5/6. **No engine/cost-formula changes.**

| ID | Task | Files | Acceptance |
|----|------|-------|------------|
| 7.1 | Product subtype taxonomy | `schema.ts` (+`productSubtype`), seed `platform_reference_items`/seed JSON, `templateCatalog.ts` | Subtypes selectable; each maps to an engine `productType`; calc unchanged. |
| 7.2 | Subtype-driven dimension schema | new `web/src/lib/dimensionSchema.ts`, `EstimateEditor.tsx` | Editor renders the right dimension fields per subtype (e.g. bottom-gusset for stand-up). |
| 7.3 | Parametric product visuals | new `web/src/components/product-visuals/*` | Visual re-draws live as dimensions change; roll width/OD scale the drawing; pouch silhouette matches subtype. |
| 7.4 | Visual in PDF | `services/proposal-pdf.ts` (+ pdf-proposal-kit) | Proposal embeds the product visual + laminate stack as SVG. |
| 7.5 | Layers UI upgrade | `LaminateVisualizer.tsx`, `LayerCard.tsx`, new `LayerStackEditor.tsx` | Drag reorder, per-layer chips, "Add metallized barrier", tooltips, copyable structure string. |
| 7.6 | Add-ons model + UI | `schema.ts` (`estimate_add_ons`), `estimates.ts`, editor add-ons panel | Add-ons attach to an estimate, show on spec/PDF; admin-only costed ones flow into price; hidden from reps. |
| 7.7 | Application picker | seed `application` reference, `TemplatePicker`/onboarding | "What are you packing?" suggests a starter structure + barrier tags. |
| 7.8 | Sustainability tags | `schema.ts` (material flags), stack badge, PDF | Mono-material/PCR/compostable badges render; optional PDF blurb. |
| 7.9 | Product chooser cards | `TemplatePicker.tsx` | Illustrated subtype cards with `ProductVisual` thumbnails, grouped by family. |
| 7.10 | Editor visual tabs + count-up | `EstimateEditor.tsx` | Structure/Product/Spec tabs in sticky panel; gold price count-up. |
| 7.11 | Dashboard widgets | `Dashboard.tsx`, `dashboard.ts` | KPI cards + sparkline + resume-draft; visibility-aware. |
| 7.12 | Design tokens + core components | `tailwind.config.js`, `index.css`, `components/ui/*` | Tokenized palette/radius/shadow; shared Card/Button/Chip/Tabs/Toast. |
| 7.13 | Accessibility pass | tokens + components | AA contrast on price text; focus rings; reduced-motion. |
| 7.14 | Onboarding wizard | new `pages/Onboarding.tsx` | First-run currency → product → template → editor. |
| 7.15 | In-app proposal preview + themes | new `pages/ProposalPreview.tsx`, pdf kit | Preview + theme switch before send/download. |
| 7.16 | Dark mode (stretch) | tokens, Layout toggle | Toggle persists; meets contrast. |
| 7.17 | 3D pouch mockup (stretch) | `product-visuals/Pouch3D.tsx` | Optional 3D hero on proposal cover. |

**Data-model additions for Phase 7 (summary):**
```
estimates.productSubtype            varchar
structure_templates.productSubtype  varchar
estimate_add_ons(id, estimateId, addOnKey, label, qty, unitCost, setupCost, enabled, costed bool)
materials: recyclable bool, pcrPercent int, compostable bool, pfasFree bool   (sustainability)
platform_reference_items categories: product_subtype, add_on, application      (admin-editable)
```

**Why this is safe:** every Phase 7 item is UI + reference-data + optional add-on cost inputs. The locked engine (`calculateEstimate`) and golden tests are untouched; add-on costs enter through the existing additive price inputs (plates/delivery/operation class), so `golden-fixtures.ts` stays valid.

---

*Section 18 added 2026-06-21 in response to the "did you cover the packaging-specific visual/domain richness?" review. It is the Phase 7 backlog; sequence after Phase 0–2 unblock the build and harden the API.*
