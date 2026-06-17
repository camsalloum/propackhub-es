# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-17

## Status: Phase A–E complete — Phase F in progress

- **Phase:** PRD §14.1 Phase 1 (~75%) — Phase A/B/C/D/E complete, Phase F next
- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`
- **Git:** `https://github.com/camsalloum/propackhub-es.git` on `main`
- **Implementation plan:** [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md) ← **start here for build work**

---

## Recent Progress (2026-06-17)

### Phase B — Quote loop (COMPLETE ✅)
- ✅ B1–B5, B8–B9: All core quote loop tasks done
- EstimateEditor: material loading, controlled dimensions, save→calculate→refresh

### Phase C — Templates & structure (COMPLETE ✅)
- ✅ C1–C7: structure_templates table, seed on register, API routes, TemplatePicker API-driven

### Phase D — Visibility & roles (COMPLETE ✅)
- ✅ D1: stripEstimateRow on GET /estimates/:id
- ✅ D2: stripMaterialRow on GET /materials (hides costPerKgUsd for sales rep)
- ✅ D3: isAdmin guards in EstimateEditor (hides slabs, markup, cost breakdown, $/kg)
- ✅ D4: Users route (GET /users, PATCH /users/:id/visibility)
- ✅ D5: Visibility presets (3 named: admin, sales_rep, read_only)

### Phase E — Customers & re-quote (PARTIAL ⏳)
- ✅ E1: CustomerDetail.tsx routed at /customers/:id
- ✅ E5: Re-quote banner in EstimateEditor when sourceEstimationId set
- ⏳ E2: Customers list page — nav link is # (no list page yet)
- ⏳ E3: GET /customers/:id/estimates — client-side filtering only
- ⏳ E4: Re-quote copies layers+processes+slabs but no price_changes response

### TypeScript fixes (applied across sessions)
- vite-env.d.ts, useAuth.ts, Library.tsx, Settings.tsx, TemplatePicker.tsx, LaminateVisualizer.tsx, App.tsx

---

## What actually works (code-verified 2026-06-16)

### Engine (`packages/engine`) — strong
- Laravel-aligned calculator (GSM, solvent mix, additive sale price, dimensions)
- **12/12 unit tests pass**
- Builds successfully

### Server (`packages/server`) — good
- Auth (register, login, me), JWT, tenant isolation
- Materials, customers, estimates, settings, templates routes registered
- Material seed (14 items) + structure template seed (11 PGs) on tenant registration
- FX fetch on register + refresh endpoint
- Visibility stripping on estimate list + calculate (not on GET by id)
- PATCH estimate updates layers/slabs/processes (delete + re-insert)
- GET estimate enriches layers with material details (materialName, materialType, isSolventBased)
- **Fix 1 (2026-06-17):** `getEstimateRoute` ReferenceError fixed — replaced broken `const [user]` self-reference with `extractUserFromRequest`
- **Fix 2 (2026-06-17):** `updateEstimateRoute` now accepts `status`, `notes`, `note` — added to `EstimateCreateSchema`; added `notes` column to DB
- **Fix 3 (2026-06-17):** `activityLogs.userId` FK changed from `onDelete: 'set null'` → `onDelete: 'cascade'` (was contradictory with `notNull()`)
- **Fix 4 (2026-06-17):** Engine `tsup.config.ts` — `dts: true`, `outExtension: () => ({ js: '.mjs' })`; `package.json` types → `index.d.mts`; added `@types/bcryptjs`, `@types/pg`, `@types/pdfkit` to server devDeps
- **Fix 5 (2026-06-17):** CustomersList page created (`/customers`), route added in App.tsx, Layout nav `href: '/customers'`
- **Fix 6 (2026-06-17):** `GET /api/v1/customers/:id/estimates` server route added; `apiClient.getCustomerEstimates()` added; `CustomerDetail.tsx` uses server-scoped query instead of client-side filter
- **Fix 7 (2026-06-17):** `requoteEstimateRoute` now returns `price_changes[]` array comparing old vs new material costs
- **Fix 8 (2026-06-17):** `getEstimatesRoute` enriches estimates with `customerName`; Dashboard uses `displayCurrency` instead of hardcoded `AED`
- **Fix 9 (2026-06-17):** PDF proposal shows real customer name (fetches from customers table), applies visibility profile to hide `markupPercent`/`materialCostPerKg` for sales rep
- **Fix 10 (2026-06-17):** `run-migration.cjs` updated to use `drizzle-kit push`; `FX_API_URL` in `.env.example` appends `/USD`
- Templates: GET list, GET by id, POST instantiate (creates estimate with pre-filled layers/processes/slabs)
- **DB migration (2026-06-17):** All tables aligned with Drizzle schema (enums, column renames, structure_templates table, notes column, activity_logs FK fix)
- **Builds successfully**

### Web (`packages/web`) — good
- Login, Register, auth guard, Layout shell
- Dashboard, Library, Settings, EstimatesList API-wired
- EstimateEditor — full save/calculate loop with material loading, controlled dimensions, auto-calculate
- TemplatePicker — loads templates from API, groups by material class, instantiates via API
- **`npm run build` passes** for web, server, and engine

---

## What does NOT work yet

1. Client-side engine in web for instant recalc (Decision #23) — deferred B6
2. FX conversion in UI display (Phase B7)
3. Dashboard expiring proposals, `/dashboard/summary` (Phase G)
4. CI (server test job fails — no test files) (Phase G)

---

## PRD position

| PRD phase | Progress |
|-----------|----------|
| Pre-build (docs, wireframes) | Done |
| Scaffold | Done |
| Phase 1 Foundation | ~75% |
| Phase 2 Visualizer + Estimate | ~60% |
| Phase 3 History + Re-quote | ~50% |
| Phase 4 Proposals | ~30% |
| Phase 5–6 | Not started |

---

## Next work (Phase F — see implementation plan)

1. Phase F: PDF proposal branding — logo, primary color, terms, footer from tenant settings
2. Phase F: Slab table in PDF from real slab data
3. Phase F: PDF respects visibility — no cost/markup for sales rep
4. Phase G: CI, tests, PWA, dashboard summary

## Next work (Phase D — see implementation plan)

1. Phase D: Visibility & roles — stripEstimateRow on GET /:id, role-based UI hiding, Settings Team tab
2. Phase D: Strip material USD prices on materials GET for sales rep profile
3. Phase E: Customers & re-quote — route CustomerDetail, copy slabs on requote

---

## Setup (unchanged)

```bash
npm install
cd packages/server && cp .env.example .env  # set DATABASE_URL
cd ../web && cp .env.example .env
cd ../server && npm run db:push
npm run start:servers
# http://localhost:5000
```

See [SETUP.md](../SETUP.md) for details.

---

## Database

12 tables: `tenants`, `users`, `materials`, `customers`, `estimates`, `layers`, `processes`, `slabs`, `activity_logs` (+ enums). Missing PRD tables: `ref_standard_templates`, `structure_templates`.

---

**Do not trust prior “ALL CRITICAL ENDPOINTS IMPLEMENTED / UI mockups only” notes — superseded by audit 2026-06-15.**
