# ProPackHub Estimation Studio — Project Memory

**Purpose:** Living context for AI and developers — session decisions, costing rules, and doc index.  
**Update this file** at the end of each ES planning/build session.  
**Folder:** `D:\ProPackHub\apps\estimation-studio\`

---

## Canonical docs (read order)

| Doc | Role |
|-----|------|
| [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md) | Strategic locks #2–#23 |
| [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md) | Build PRD |
| [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md) | **Phased build plan** (audit findings, P0–G, DoD) |
| [LIVE_STATE.md](./LIVE_STATE.md) | Current phase + what works |
| [archive/legacy-laravel/COSTING_NOTES.md](../archive/legacy-laravel/COSTING_NOTES.md) | Laravel engine source of truth |
| [ES_STANDARD_TEMPLATES_SEED.json](./ES_STANDARD_TEMPLATES_SEED.json) | 11 parent PG default stacks (v3) |
| [ES_STANDARD_TEMPLATES_SEED.md](./ES_STANDARD_TEMPLATES_SEED.md) | Human-readable seed + review checklist |
| [ES_AUDIT_HANDOFF.md](./ES_AUDIT_HANDOFF.md) | **Auditor agent entry point** |
| [ES_WIREFRAMES.md](./ES_WIREFRAMES.md) | Step 2 — screen wireframes (V1) |
| [mockup/es-estimate-editor.html](./mockup/es-estimate-editor.html) | Interactive mockup — Desktop + **Mobile editor** tab |

---

## Product identity (fixed)

- **Name:** ProPackHub Estimation Studio (ES)
- **Tagline:** Flexible Packaging Cost Estimator
- **Users:** Independent sales / consultants — **not** PEBI plant operators
- **Simplicity rule:** Same math and flow as **legacy Laravel** estimator — **not** PEBI MES depth
- **Hero UI:** Laminate Stack Visualizer + slab table + branded PDF + re-quote

---

## Costing rules (locked)

### Layer types (Laravel)

`substrate` | `ink` | `adhesive` — three types only.

### Ink systems (not color-specific)

| Selection | Ink material | Solid % | Solvent block |
|-----------|--------------|---------|---------------|
| **Wide Web printing** | Ink SB | 30 | Yes — ink-to-solvent ratio |
| **Narrow Web printing** | Ink UV | 100 | No (for ink) |

- Separate **cost/kg** rows: **Ink SB** and **Ink UV**
- **Default for all printed templates (including Labels and Shrink Sleeves): Wide Web → Ink SB**
- User toggles **Printing web class** on estimate editor; engine swaps ink layer + solvent visibility

### Adhesive

- **Adhesive SB** for lamination (duplex default + Alu insert)
- **Solvent Base** optional row for solvent math
- **Solvent-Mix:** global cost/kg + GSM ratio — when stack has SB ink and/or SB adhesive

### Microns

Always **user-variable** — template/seed µ are hints only.

### Sale price (Laravel additive)

```
sale/kg = RM + (RM × markup%) + plates + delivery + operation/kg
```

Not `cost × (1 + margin%)`.

### Dimensions (Decision #21)

**Reel width ≠ printing web width** — sources: `Costing_form 25.2.25.xlsx`, Laravel JS, Interplast HTML.

```
printing_web_width_mm = (reel_width_mm × number_of_ups) + extra_printing_trim_mm
```

| Calculation | Width used |
|-------------|------------|
| Pieces/kg, LM order → kg | Reel width |
| Linear m/kg (press), print run meters | Printing web width |

Product types: `roll` | `sleeve` | `pouch`. Roll-after-slitting block V1 for roll/sleeve.

### Currency (Decision #22)

- **Library:** admin always enters **`cost_per_kg_usd`**
- **User display:** picks currency at registration (e.g. AED); system **fetches USD→currency rate from web** by default
- **Manual override:** Settings → Currency — user can switch to fixed rate
- **Engine:** USD internally; UI/PDF/slabs = display currency
- **Quotes:** freeze `exchange_rate_usd_to_display` on each estimate

### Client-side engine (Decision #23)

- `packages/engine` imported by **web + server** — same golden tests
- Web: instant price on edit; server: debounced persist + visibility strip
- Offline **draft sync** still Phase 2; math works client-side if material snapshot loaded

### External audit (folded into PRD v3.4)

- Visibility **presets** (3 named)
- Dimensions: collapse multi-up/trim; web-width tooltip
- §5.9 empty/loading/error states
- Admin progressive disclosure; preview-as-user reflow
- Effective margin % label; dashboard expiring proposals
- Deferred V1.1: undo, inline library price edit

### Operations

Engine always applies; **UI visible only if visibility profile allows** (Decision #18 + #20).

### Cost visibility (Decision #20 — sales rep default)

**Hidden from sales rep:** markup %, RM cost/kg, cost/m², plates, delivery, operation, cost breakdown %, solvent $/kg, library prices, yield conversions, roll-after-slitting detail, alternate unit price columns.

**Visible to sales rep:** structure, microns, **product dimensions**, **printing web width (read-only)**, GSM, **selling price**, slabs (price only), PDF.

**Admin:** Settings → Team & visibility — default profile + per-user toggles.

### Mobile (Decision #8 + #20)

**One webapp / PWA** — not a separate native app. **Adaptive UI:** desktop = table + split pane; mobile = **layer cards + bottom sheets + swipe delete** (§5.8 PRD). Same visibility rules.

---

## Laminate stacks (locked)

**Default duplex:** `PET + Ink SB + Adhesive SB + LDPE`

**Add metallized barrier** (owner confirmed): insert before PE sealant:

`Adhesive SB + Aluminium + Adhesive SB`

UI quick action: **Add metallized barrier** → 3 rows above PE.

---

## Standard templates

- **11 PEBI parent PGs only** — no variants (Decision #17)
- Groups: A = PE Mono · B = Non PE Mono · C = Non PE Multilayer
- Shrink Sleeves / Labels: substrate not fixed at parent (PVC/PET or face stock per quote)

---

## Build sequence (owner: one step at a time)

| Step | Task | Status |
|------|------|--------|
| 1 | Layer stacks + material model | **Complete** |
| 2 | Wireframes + mockup | **Complete** |
| 2b | Audit handoff doc | **Complete** (external audit still open) |
| 3 | Scaffold `propackhub-es/` | **Complete** (2026-06-14) |
| 4 | Engine golden tests (Laravel) | **Partial** — 12 unit tests pass; not full Laravel reference suite |
| 5 | MVP build | **In progress** — see [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md) |

**Code scaffold exists** — monorepo with engine, server, web. Quote workflow not E2E functional (audit 2026-06-15).

---

## Session log

### 2026-06-11 — PRD + platform scope

- ES standalone SaaS; individual-first tenant
- 11 parent PG templates; operation cost UI admin-only
- Slab pricing; re-quote refreshes RM from tenant library
- PEBI migration for PG classification (PE/Mono/Multilayer)

### 2026-06-12 — Laravel deep audit

- Extracted `PPH small.zip` → `archive/legacy-laravel/`
- Documented GSM rules (substrate vs ink/adhesive), solvent-mix, additive sale price
- Rejected PEBI-style color inks and margin-on-cost formula in ES PRD §7

### 2026-06-12 — Ink SB / UV + laminate Alu

- Two ink **systems** (SB 30% solid, UV 100% solid) — not Black/White SKUs
- Laminate duplex default OK; triplex = Adhesive SB + Alu + Adhesive SB before PE
- Microns always variable

### 2026-06-12 — Printing web class (Decision #19)

- **Wide Web printing = SB** (default everywhere, including Labels and Sleeves)
- **Narrow Web printing = UV** (user selection on estimate)
- Alu laminate insert pattern confirmed
- Updated: seed v3, PRD §6.2.1 / §7, LOCKED_DECISIONS #19, this file

### 2026-06-11 — External audit → PRD v3.4

- Decision #23 client-side engine; §6.11 audit checklist
- Presets, UX states, mobile keyboard, margin labels, dashboard expiry

### 2026-06-11 — Global currency (Decision #22)

- USD-only material library; display currency per tenant
- Auto FX from web on registration + refresh; manual override in Settings
- PRD §6.10, schema + API updates

### 2026-06-11 — Dimensions audit (Decision #21)

- Deep review: `Costing_form 25.2.25.xlsx`, `Interplast_FP_Costing_*.html`, Laravel JS
- PRD v3.2 §6.9 — full dimension model; visibility toggles for admin vs sales rep
- COSTING_NOTES §7 expanded (reel vs web width, order units, roll after slitting)
- Shrink Sleeves template → `product_type: sleeve`

### 2026-06-12 — Cost visibility + mobile (Decision #20)

- Mobile = **same responsive webapp / PWA** (not separate native app)
- Sales rep default: **selling price only** — no markup, margin, RM, cost breakdown
- Settings → Team & visibility: admin configures per-user what they can see

### 2026-06-12 — Audit handoff + mobile mockup

- Mobile editor tab in HTML mockup (layer cards, bottom sheets, add/delete)
- PRD v3.1 consolidated; ES_AUDIT_HANDOFF.md for reviewer agent
- Build blocked on audit PASS + owner go build

---

**Artifacts created/updated this session:**

| Artifact | What |
|----------|------|
| `archive/legacy-laravel/COSTING_NOTES.md` | Deep Laravel audit — GSM rules, solvent-mix, additive sale price |
| `ES_STANDARD_TEMPLATES_SEED.json` v3 | 11 parent PG stacks; Ink SB/UV; Adhesive SB; Alu hint |
| `ES_PRD_v3_FINAL_BUILD_SPEC.md` | §6.2.1–6.2.2, §7 engine (Laravel not PEBI), `printing_web_class` DB field |
| `LOCKED_DECISIONS.md` | #17–#19 |
| `ES_MEMORY.md` | This file — living memory |
| `.cursor/rules/estimation-studio.mdc` | Cursor rule — costing + doc index |
| `ES_WIREFRAMES.md` | Step 2 deliverable (6 screens) |

### 2026-06-14 — Workspace memory + doc fixes

- Fixed `ES_MEMORY.md` links → `archive/legacy-laravel/COSTING_NOTES.md`
- `LIVE_STATE.md` / `AGENT.md` aligned with live `propackhub-es` repo on GitHub
- Automatic living-memory at session end (all agents): `memory-auto-update.mdc` + Cursor `stop` hook
- Parent `D:\ProPackHub\.cursor\` workspace rule routes agents to correct app memory stack

---


**Owner approved:** proceed to wireframes after memory check.

---

## Session log — 2026-06-17

### Fixes 7-10 applied

- **Fix 7:** `requoteEstimateRoute` returns `price_changes[]` array with `materialId`, `materialName`, `oldCostUsd`, `newCostUsd`, `deltaPct`
- **Fix 8:** `getEstimatesRoute` enriches estimates with `customerName` from customers table; Dashboard uses `displayCurrency` instead of hardcoded `AED`
- **Fix 9:** PDF proposal fetches real customer name; applies visibility profile to hide `markupPercent`/`materialCostPerKg` for sales rep
- **Fix 10:** `run-migration.cjs` updated to use `drizzle-kit push`; `FX_API_URL` in `.env.example` appends `/USD`

**Files changed:** 15 files (estimates.ts, Dashboard.tsx, run-migration.cjs, .env.example, etc.)

---

## Open items

- [ ] **External audit** ([ES_AUDIT_HANDOFF.md](./ES_AUDIT_HANDOFF.md))
- [ ] Owner sign-off on seed micron hints (non-blocking)
- [ ] ES domain / hosting
- [x] Scaffold (Step 3) — done 2026-06-14
- [x] **Phase A blockers** — web build, calculate crash, schema drift — done 2026-06-16
- [x] **Phase B quote loop** — save + calculate + real material IDs — done 2026-06-16
- [ ] **Phase C** Templates API + seed from `ES_STANDARD_TEMPLATES_SEED.json`
- [ ] **Phase D** Visibility in UI (Decision #20) + team settings API
- [ ] **Phase E** Customer detail page + re-quote UX
- [ ] **Phase F** PDF proposal branding + slab table
- [ ] CI green (server tests missing)

---

*Last updated: 2026-06-16 (Phase A + B complete)*
### 2026-06-14 — Implementation Scaffold Started

- **Owner requested implementation start** despite audit pending
- Created monorepo structure mirroring formulation-studio pattern
- **packages/engine**: Core costing engine with Laravel formulas ported to TypeScript
- **packages/server**: Fastify API server skeleton
- **packages/web**: React SPA with responsive layout and ES design tokens
- Basic UI pages: Dashboard, Template Picker, Estimate Editor, Library, Settings
- Type definitions for all core entities (Estimate, Layer, Material, etc.)
- Currency system (USD library + display currency) implemented
- Visibility profile structure ready for admin configuration
- Template picker with 11 parent PG groups (Decision #17)
- Printing web class toggle (Wide Web = Ink SB, Narrow Web = Ink UV)

**Artifacts created:**
- `package.json` monorepo root with workspaces
- `packages/engine/` with calculator, validator, types
- `packages/server/` with Fastify setup
- `packages/web/` with React + Tailwind + Vite
- `README_IMPLEMENTATION.md` documenting current state

**Next:** Database schema, authentication, full API endpoints, engine integration
### 2026-06-14 — Windows Startup Scripts Added

- Created multiple Windows startup scripts for easy development:
  - `START-ES.cmd`: Comprehensive batch file with error checking
  - `START-ES.ps1`: PowerShell script with color output
  - `start.bat`: Simple batch file for quick starts
  - `RUN-ES.bat`: Auto-opens browser after starting servers
- Added `QUICK-START.md` with instructions
- Updated root `package.json` with `start:servers` script
- All scripts check for dependencies and install if needed
- Double-click any `.bat` file to start both servers
### 2026-06-14 — Full Backend Implementation Complete

**MAJOR PROGRESS: From UI-only mockup to fully functional backend**

**Implemented:**
- ✅ **PostgreSQL schema** with Drizzle ORM (12 tables: tenants, users, materials, estimates, layers, processes, slabs, customers, activity_logs)
- ✅ **Authentication** (register, login, JWT tokens, tenant isolation)
- ✅ **Materials API** (CRUD for library items in USD)
- ✅ **Estimates API** (create, list, calculate with engine integration)
- ✅ **Core routes** fully wired with authorization
- ✅ **API client** for web (TypeScript)
- ✅ **Database initialization** script
- ✅ **Setup guide** with troubleshooting

**Files created:**
- `packages/server/src/db/schema.ts` — Complete Drizzle schema
- `packages/server/src/db/index.ts` — DB initialization
- `packages/server/src/routes/auth.ts` — Auth endpoints
- `packages/server/src/routes/materials.ts` — Material CRUD
- `packages/server/src/routes/estimates.ts` — Estimate logic with engine
- `packages/server/src/utils/auth.ts` — Auth utilities
- `packages/server/src/index.ts` — Main server (complete)
- `packages/server/drizzle.config.ts` — Drizzle config
- `packages/server/.env.example` — Environment template
- `packages/web/src/lib/api.ts` — API client class
- `packages/web/.env.example` — Web env template
- `SETUP.md` — Complete setup guide
- `drizzle.config.ts` — Migration config

**What now works:**
1. Users can **register** and get personal tenant
2. Materials are **tenant-isolated** in USD
3. Estimates integrate **real calculation engine**
4. JWT **tenant scoping** on all APIs
5. **Database persistence** for everything

**Next: Wire web pages to API (currently still UI mockups)**


### 2026-06-15 — Critical Bug Fixes (6 major issues)

**Context:** After reviewing codebase, discovered 6 runtime bugs that would cause silent failures.

**Bugs fixed:**
1. **materialCostPerKgUsd → materialCostPerKg** - Field name mismatch prevented material cost from saving
2. **Missing customers route** - Created complete CRUD for `/api/v1/customers/*` endpoints
3. **EstimateEditor useParams** - Added dynamic ID extraction and API fetch logic
4. **Hardcoded solvent cost** - Made `solventCostPerKgUsd` and `solventRatio` configurable per estimate
5. **String-based SB detection** - Added `isSolventBased` boolean field to materials for reliable detection
6. **Hardcoded orderQuantityKg** - Calculator now uses dynamic order quantity from estimate/slab

**Schema changes:**
- `materials` table: + `is_solvent_based` (boolean)
- `estimates` table: + `solvent_cost_per_kg_usd`, `solvent_ratio`, `order_quantity_kg`
- `estimates` table: renamed `material_cost_per_kg_usd` → `material_cost_per_kg`

**Files modified:** 9 files (engine types/calculator/validator, server schema/routes/index, web EstimateEditor)

**Artifacts:**
- `CRITICAL_BUGS_FIXED.md` - Complete bug documentation
- `packages/server/migration-add-bug-fixes.sql` - Database migration script
- `packages/server/src/routes/customers.ts` - New customers CRUD route

**Next:** Run migration, restart servers, test all endpoints


### 2026-06-15 — Missing Estimate CRUD Endpoints Added

**Issue:** Only 3 of 7 estimate endpoints were implemented. API info falsely advertised all 7.

**Added endpoints:**
- `GET /api/v1/estimates/:id` - Get single estimate with full details (layers, processes, slabs)
- `PATCH /api/v1/estimates/:id` - Update estimate fields (jobName, status, dimensions, pricing, etc.)
- `DELETE /api/v1/estimates/:id` - Delete estimate with cascade to related records
- `POST /api/v1/estimates/:id/requote` - Create new estimate from existing with fresh material prices

**Frontend integration:**
- Added API client methods: `getEstimate()`, `updateEstimate()`, `deleteEstimate()`, `requoteEstimate()`
- `EstimateEditor` now loads real data dynamically by ID instead of hardcoded mock
- All endpoints include JWT auth, tenant isolation, error handling

**Re-quote feature:**
- Copies structure from source estimate
- Generates new ref number (QT-YYYY-XXXXX)
- Links to source via `sourceEstimationId`
- Refreshes material prices on next calculate

**Status:** All 7 estimate endpoints now functional, frontend can open/edit/delete estimates


### 2026-06-15 — Master Materials Library Seeding

**Issue:** New tenants got empty material library, couldn't create estimates (PRD §3.2 requirement violated).

**Solution:** Auto-seed 14 platform master materials on tenant registration.

**Master materials added:**
- **Substrates (10):** LDPE Natural, LDPE Shrink, PET Transparent, PET Metalized, BOPP Transparent, BOPP White, BOPP Metalized, Aluminium Foil, Nylon, Paper Kraft
- **Inks (2):** Ink SB (30% solid, $12/kg), Ink UV (100% solid, $15/kg)
- **Adhesives (2):** Adhesive SB ($6.50/kg), Adhesive WB ($5.80/kg)

**Implementation:**
- Created `master-materials-seed.json` with 14 materials (all USD pricing, density, waste%, isSolventBased flag)
- Created `seed-materials.ts` utility to copy materials to tenant
- Updated `auth.ts` register route to call `seedMaterialsForTenant()` after tenant creation
- Seeding is fire-and-forget (logs error but doesn't fail registration)

**Result:** New users can immediately create estimates with ready-to-use materials

**Note:** Materials are **copied** to tenant (not shared) - each tenant owns their library and can modify prices

### 2026-06-15 — Full implementation audit (code vs PRD)

**Method:** Read all packages source; ran `engine` tests (12/12 pass), `server` build (pass), `web` build (**fail**). Did not rely on docs alone.

**Verdict:** Foundation credible; **quote workflow not functional E2E**. Prior LIVE_STATE overstated completion.

**Module scores:** engine 8/10 · server 5/10 · web 3/10

**P0 blockers (confirmed in code):**
1. `api.ts` duplicate `register()` — web does not compile
2. `TemplatePicker.tsx` missing `useEffect` / `apiClient` imports
3. `calculateEstimateRoute` references `slabs` never loaded → ReferenceError at runtime
4. EstimateEditor save payload missing `productType`, `dimensions`, layer `materialId` UUIDs

**P1 gaps:**
- PATCH estimate does not update layers/slabs/processes
- Editor never calls calculate; `@es/engine` not used in web pages
- Library `materialType` vs API `type` mismatch; decimal strings from DB
- Schema drift: `useAutoFx`, settings `logoUrl`/`brandPrimaryColor` vs schema columns
- Customers `address` in route but not in schema
- Calculate material map omits `isSolventBased`
- GET `/estimates/:id` skips visibility strip

**P2 gaps (PRD):**
- No template DB/API; seed JSON not loaded
- No FX display conversion in UI
- Sales rep visibility not enforced in UI
- CustomerDetail not routed; re-quote missing slabs + price delta
- CI fails (no server tests)

**What works:** auth, material seed, materials/customers CRUD, estimate routes (structure), visibility strip on list/calculate, engine math, partial API wiring on Dashboard/Library/Settings.

**Artifacts:**
- [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md) — phased plan A→G with DoD and PRD acceptance tracker
- [LIVE_STATE.md](./LIVE_STATE.md) — corrected status

**Next:** Execute Phase A in implementation plan, then Phase B quote loop.

### 2026-06-16 — Phase A + Phase B complete

**Phase A — Unblock build & runtime (all P0 fixed):**
- Fixed duplicate `register()` in API client
- Fixed TemplatePicker missing imports
- Fixed `slabs` ReferenceError in calculate route (loads slabs from DB)
- Added `isSolventBased` to all material maps (3 instances)
- Added `useAutoFx` field to tenants schema
- Aligned settings field names (`logo`/`primaryColor`)
- Removed `address` from customers route

**Phase B — Quote loop (all tasks complete):**
- B1: Library.tsx — API `type` ↔ UI mapping, decimal string parsing
- B2: EstimateEditor loads tenant materials from API; layers use real `materialId` UUIDs; material dropdown selector with type filtering
- B3: Controlled dimensions (`DimensionState`), productType selector (roll/sleeve/pouch), calculated values (printing web width, density, GSM)
- B4: PATCH estimate route — delete + re-insert for layers, slabs, and processes on update; GET estimate enriches layers with material details
- B5: Save → Create/Update → auto-Calculate → refresh UI with calculated salePricePerKg
- B6: (deferred) Client-side engine import in web for instant recalc
- B7: (deferred) FX display conversion
- B8: Auto-calculate integrated into save flow (B5)
- B9: TemplatePicker passes `template`, `productType`, `customer`, `jobName` via URL params to editor
- B10: (deferred) Dashboard/EstimatesList customer name join

**TypeScript fixes (17 errors → 0):**
- Added `src/vite-env.d.ts` for `import.meta.env` and CSS module types
- Fixed `useAuth.ts` — relaxed `role` and `displayCurrency` types
- Fixed `Library.tsx` — removed unused imports, added type casts
- Fixed `Settings.tsx` — added `apiClient.refreshFx()` method, displayed `lastFxUpdated` in UI
- Fixed `TemplatePicker.tsx` — typed `created` customer response
- Fixed `LaminateVisualizer.tsx` — removed unused `React` import
- Fixed `App.tsx` — removed unused `CustomerDetail` import

**Build status:**
- ✅ `npm run build --workspace=packages/web` passes (tsc + vite build)
- ✅ `npm run build --workspace=packages/server` passes (tsup)
- ✅ Engine 12/12 tests pass

**Key architectural decisions made:**
- Layers use `materialId` UUIDs (not string names) — material details enriched in GET route
- Save payload matches `EstimateCreateSchema` (jobName, customerId, productType, printingWebClass, dimensions, markupPercent, platesPerKg, deliveryPerKg, layers, slabs, processes)
- Auto-calculate after save — no separate "calculate" step needed
- TemplatePicker → editor via URL params (template, productType, customer, jobName)
- `apiClient.refreshFx()` added as public method (was private `request`)

**Next:** Phase F — Proposals & branding (PDF slab table, branding, visibility in PDF)

### 2026-06-17 — Phase D + Phase E partial + Phase B re-merge

**Context:** Another agent reverted Phase B/C work while fixing the same P0 blockers. Had to re-apply Phase B on top of their visibility additions (isAdmin guards).

**Phase D — Visibility & roles (complete):**
- D1: `stripEstimateRow` already applied on `GET /estimates/:id` and list
- D2: Added `stripMaterialRow` to materials GET route — hides `costPerKgUsd` for sales reps
- D3: `isAdmin` guards in EstimateEditor — hides slabs, markup, cost breakdown, $/kg column, solvent mix for non-admin
- D4: Users route created by other agent (`GET /users`, `PATCH /users/:id/visibility`); registered in index.ts; added API client methods
- D5: Visibility presets endpoint (`GET /visibility-presets`) — 3 named: admin, sales_rep, read_only

**Phase E — Customers & re-quote (partial):**
- E1: `CustomerDetail.tsx` routed at `/customers/:id` in App.tsx
- E5: Re-quote banner added to EstimateEditor — shows when `sourceEstimationId` is set
- E2/E3/E4: Partial — customers list page not built; client-side estimate filtering; requote copies slabs but no price_changes

**Phase B re-merge:**
- EstimateEditor fully rewritten to merge Phase B (material loading, controlled dimensions, save→calculate) with visibility additions (isAdmin guards, useAuth)
- Kept: material dropdown, LayerItem interface, DimensionState, buildSavePayload, auto-calculate on save
- Kept: isAdmin guards on slabs/markup/cost-breakdown tabs and sidebar sections

**Build status:** Web ✅ Server ✅ Engine 12/12 ✅
