# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-29 (Multi-tenant security hardening + data-driven units + tenant reference layer + UI fixes)
**Session focus:** External audit review, platform/tenant role separation, engine unit refactor, layered tenant reference model, UX fixes.

---

## Where we stopped (read this first next session)

### Session 2026-06-29 — Full summary

External agent gave a thorough code review. We verified every claim against the actual code and implemented fixes + new features across engine, server, and web.

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
