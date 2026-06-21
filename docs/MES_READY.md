# MES-Ready Master Data — Implementation Plan

**Product:** ProPackHub Estimation Studio (ES)  
**Purpose:** Make platform master data traceable, versioned, and synchronizable so ES can later integrate with PEBI MES / ERP without re-keying materials, templates, or estimates.  
**Status:** Plan only — **MES Phases A–F deferred** until V1 prerequisites (§3) are complete  
**Last updated:** 2026-06-21  
**Review:** Empirically verified against live repo + PostgreSQL + running API (see §2)

---

## 1. Executive summary

ES already has a **platform master layer** (`platform_master_materials`, `platform_reference_items`) and **semantic costing keys** (`costingKey`, `ref_material_key`) that link templates to materials. That is the right foundation for future MES integration.

What is **missing** for MES readiness:

1. **Hard lineage** from platform master → tenant library → estimate layers (today sync is fuzzy match by name/family/grade).
2. **Version stamps** so a quote can answer “which master revision was used?”
3. **Stable keys** on structure templates and reference data (not just display names).
4. **Closed taxonomy** driven by Master Data (RM Types, categories) — including custom types like Plate.
5. **Audit + change feed** for platform master edits and tenant sync events.
6. **External identity hooks** (`external_id`, `source_system`) for future PEBI/Oracle mapping.

**Sequencing decision (2026-06-21 review):** Per Decision #13 (standalone V1, PEBI integration out of scope until Decision #13b), **none of the MES phases are required for V1 to ship**. Live testing found **P0 costing and setup bugs** (§3) that affect every quote today. Execute **§3 prerequisites first**, then MES Phases A–F (§8–§13).

---

## 2. Plan review — accuracy & corrections

Reviewed against live repo, PostgreSQL, running API, and real API calls (not static code reading only).

### 2.1 Verified accurate (original §3 claims)

| Claim | Verified |
|-------|----------|
| `platform_master_materials.key` has unique constraint | ✅ `platform_master_materials_key_unique` |
| `materials.price_source = manual` skips overwrite on sync | ✅ `seed-materials.ts` + live-tested |
| `materials.is_tenant_only` exempt from prune | ✅ `findOrphanSubstrateRows` |
| No `master_data_version` on estimates | ✅ column absent |
| Layers lack `platform_master_key_snapshot` / `costing_key_snapshot` | ✅ only name + unit cost snapshots exist |
| `seed-categories.ts` taxonomy hardcoded | ✅ `const TAXONOMY = [...]` |
| `material_price_source` enum default `'excel'` | ✅ live default |
| RM Types → Library closed loop | ✅ `Library.tsx` uses `rmTypeOptions` |

The plan is a **faithful snapshot** of master-data architecture — not aspirational about current gaps.

### 2.2 Corrections applied in this revision

| Issue | Fix in this doc |
|-------|-----------------|
| **Template key collisions** — same `pebi_parent_pg` can split by `materialClass` (PE / Non PE) | §10 / Appendix B: `template_key` is unique per `(pebi_parent_pg, material_class, structure_type)` or compound slug e.g. `commercial-items-printed-pe` |
| **My Templates** (`isStandard: false`) not addressed | §10.5: tenant templates get auto `template_key` from slug; excluded from PEBI PG mapping; optional MES export flag |
| **Change-feed auth** vague | §12.2: concrete auth model (service API keys, scoped role, JWT `exp` prerequisite) |
| **Success criterion #1** counted tenant-only rows | §19: metric scoped to `is_tenant_only = false` only |
| **§3.1 wrongly cited `estimation_cost_snapshots`** as used for audit | §5.1: `estimation_costs` is written; `estimation_cost_snapshots` is dead duplicate (see §3.6) |
| **MES before V1 bugs** | §4 master order: prerequisites → MES phases |

---

## 3. V1 prerequisites (before MES Phases A–F)

These were **not** in the original plan. Found via clean install + live Postgres + API. **Do these first.**

### 3.1 P0 — Slab pricing must vary by quantity

**Symptom (live-reproduced):** Estimate with setup-hour process and slabs 500 / 2,000 / 10,000 kg → **identical $/kg** on every tier. Tiered quantity pricing is ES’s core sales value — setup cost should amortize differently per run size.

**Investigation path:**

- Engine (`packages/engine/src/calculator.ts`) has a per-slab loop calling `calculateProcessCosts(..., slab.quantityKg, ...)` — verify **`calculateProcessCosts`** actually scales setup hours by quantity (likely bug is there or in server persist path).
- Server (`estimate-calculation.ts`) — confirm per-slab `pricePerKg` from engine result is **persisted** to `slabs` table, not header `salePricePerKg` only.
- Web — slab table displays persisted slab prices, not header price repeated.

**DoD:** Integration test: 500 kg slab $/kg > 10,000 kg slab $/kg when `setupHours > 0` and speed-based process enabled.

### 3.2 P0 — Fresh clone must start without manual engine build

**Symptom:** Clean clone → `npm run start:servers` fails:

```
SyntaxError: The requested module '@es/engine' does not provide an export named 'derivePrintingWebClass'
```

**Cause:** `packages/engine/dist/` is gitignored; server imports built `@es/engine`, not source. Documented setup does not build engine first.

**Fix:**

- Add `npm run build --workspace=packages/engine` to `RUN-ES.bat`, root `postinstall` or `predev`, and `LIVE_STATE.md` / `SETUP.md`.
- Optional: root script `"prepare:dev": "npm run build -w packages/engine"`.

**DoD:** Fresh clone following docs → API + web start with zero manual steps.

### 3.3 P1 — JWT expiry & refresh

**Symptom:** Issued JWT has `iat` but **no `exp`**. `fastifyJwt` registered without `expiresIn`; `jwt.sign()` calls in `auth.ts` set no expiry. Tokens valid indefinitely; no refresh/revocation.

**Risk:** Any external API (MES change feed §12) extends this gap to integration surface.

**Fix:**

- Register `@fastify/jwt` with `sign: { expiresIn: '7d' }` (or product decision).
- Add refresh endpoint or re-login flow before mobile/MES consumers.
- Document token lifetime in API contract.

**DoD:** Decoded token includes `exp`; expired token returns 401.

### 3.4 P1 — PDF paths must use per-slab pricing

**Symptom:** Two PDF systems with duplicated engine-input reconstruction:

- `utils/pdf-proposal-kit.ts` (on-demand Generate Proposal)
- `services/proposal-pdf.ts` (Sent / persisted proposal)

Both may hard-code slab PDF price to header `salePricePerKg` instead of each slab’s calculated price.

**Fix (after §3.1):**

- Consolidate or share one “build proposal pricing rows” helper.
- PDF slab table uses each slab’s `pricePerKg` from DB/engine.

**DoD:** PDF shows descending $/kg across quantity tiers when setup amortization applies.

### 3.5 P2 — Server TypeScript strictness on new master-data code

**Symptom:** ~30 `tsc --noEmit` errors in `packages/server` (mostly `TS7006` implicit `any` in `platform-master-data.ts`, `seed-templates.ts`, `seed-materials.ts`, `proposal-pdf.ts`). Build passes via `tsup` without full typecheck.

**Fix:** Type callback params and Drizzle row shapes before MES Phase A adds more surface to `platform-master-data.ts`.

**DoD:** `npx tsc --noEmit --project packages/server` exits 0.

### 3.6 P2 — Dead duplicate table `estimation_cost_snapshots`

**Symptom:** `estimation_costs` (used — write in `estimate-calculation.ts`) and `estimation_cost_snapshots` (identical schema, **zero code references**) both exist.

**Decision before MES Phase B:**

- **Option A:** Drop `estimation_cost_snapshots` (rename abandoned).
- **Option B:** Repurpose for estimate-level lineage snapshots (master version + breakdown) — align with Phase B instead of adding yet another table.

**DoD:** One canonical cost snapshot table documented; other removed or wired.

### 3.7 P3 — Repo hygiene (Excel artifacts)

Still tracked despite `.gitignore` fixes: `Costing_form ES.xlsx`, `~$Costing_form ES.xlsx`, `Master Data.backup-*.xlsx`, `Master Data.xlsx`.

**Fix:** `git rm --cached` each; keep optional copy in `archive/` if needed.

### 3.8 P3 — Excel npm scripts consolidation

Five overlapping scripts: `update-materials`, `fix-master-data-excel`, `repair-master-data-excel`, `db:sync-materials`, `db:prune-orphan-substrates`. Platform DB Master Data page is now primary (`LIVE_STATE.md`: Excel optional for legacy import).

**Fix:** Mark legacy/one-time vs routine in `package.json` comments or `docs/SETUP.md`; deprecate repair scripts in README.

---

## 4. Master execution order

| Order | Track | Items |
|-------|-------|-------|
| **1** | V1 P0 | §3.1 Slab pricing · §3.2 Engine build on clone |
| **2** | V1 P1 | §3.3 JWT expiry · §3.4 PDF per-slab (after 3.1) |
| **3** | V1 P2/P3 | §3.5 TS errors · §3.6 dead snapshot table · §3.7/3.8 hygiene |
| **4** | MES | Phases A → F (§8–§13), with §2.2 corrections |
| **5** | Integration | Phase E change feed only **after** §3.3 JWT + §12.2 auth design |

---

## 5. Scope boundaries

### In scope (MES plan)

- Platform and tenant **master data identity**, sync, versioning, audit.
- Estimate **layer lineage** (stable keys snapshotted at save).
- Structure template **stable keys** aligned with PEBI parent PGs (with material-class disambiguation).
- Reference lists (RM Types, Product Types, Units) as **code-driven** closed system.
- API surface for **read-only MES consumers** (future PEBI sync agent) — **after** auth hardening.

### Out of scope (ES V1 — unchanged)

- Factory MES routing, machine master, work orders, BOM explosion to shop floor.
- Automatic PEBI estimate / item creation (Decision #13 — standalone V1).
- Multi-level approvals, Oracle write-back, real-time shop-floor events.
- Full offline draft sync (Phase 2 per PRD).

### Relationship to PEBI MES

| ES concept | PEBI / MES analogue |
|------------|-------------------|
| `platform_master_materials.key` | Item / RM master number (platform catalog) |
| `costingKey` / `ref_material_key` | BOM component alias (template layer ref) |
| `pebiParentPg` | Parent product group (Decision #17) |
| `structure_templates.template_key` (planned) | Standard structure / PG template ID |
| `master_data_version` on estimate (planned) | Master revision at quote time |
| Tenant `materials` row | Tenant-scoped item master (licensed copy + overrides) |

ES remains a **sales/costing** product. MES readiness means **IDs and lineage are exportable**, not that ES becomes MES.

---

## 6. Current state — master data (as of 2026-06-21)

### 6.1 What works today

| Capability | Implementation | MES value |
|------------|----------------|-----------|
| Platform material catalog | `platform_master_materials` with unique `key` | ✅ Stable platform item slug |
| Admin Master Data UI | `/platform/master-data` CRUD + auto tenant sync | ✅ Single source of truth in-app |
| Template layer refs | `default_layers[].ref_material_key` → `materials.costing_key` | ✅ Portable BOM aliases |
| Tenant sync | `syncPlatformMasterToAllTenants()` on platform save | ✅ Push to all tenants |
| Manual price protection | `materials.price_source = manual` skips overwrite | ✅ Tenant override policy |
| Tenant-only rows | `materials.is_tenant_only` exempt from prune | ✅ Custom grades |
| Reference lists | `platform_reference_items` (category + label + code) | ⚠️ Partial — codes not always enforced |
| RM Types → Library | `rmTypeOptions` drives filter tabs + Add Material | ✅ Closed-loop fix (2026-06-21) |
| Estimate cost audit | `estimation_costs.breakdown_json` on calculate | ⚠️ No master key/version on layers |
| Layer snapshots (partial) | `material_name_snapshot`, `unit_cost_snapshot_usd` on calculate | ⚠️ No costing_key / platform key |
| PEBI PG name on templates | `structure_templates.pebi_parent_pg` | ✅ Classification anchor |
| Activity log | `activity_logs` for estimates | ❌ Not used for master data |

### 6.2 Critical gaps (MES track)

| Gap | Risk |
|-----|------|
| Tenant `materials` has **no** `platform_master_key` | Cannot trace tenant row ↔ platform item after rename |
| Sync uses **heuristic match** (`materialSyncKey`, legacy names) | Duplicate/orphan rows; MES sync ambiguous |
| No **master_data_version** on estimates | Cannot prove which catalog revision a quote used |
| Layers store **UUID only**; no key snapshot at save | Broken lineage if material deleted/relinked |
| Structure templates keyed by **name** only | Rename breaks external references |
| Categories **hardcoded** in `seed-categories.ts` | New RM Types (e.g. Plate) not in taxonomy |
| Reference items: no **UNIQUE(category, code)** | Duplicate codes possible |
| No master-data **audit log** or **change feed** | MES cannot subscribe to updates |
| No **external_id** fields | No mapping to Oracle / PEBI item IDs |
| `layer_type` enum fixed | Custom RM classes need `item_class` dimension |
| `material_price_source` enum says `'excel'` | Misleading (source is platform DB) |

---

## 7. Target architecture — master numbers model

### 7.1 Identifier hierarchy

Every master entity should expose **three IDs**:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. platform_key     Human-stable business key (sync + MES)      │
│    e.g. ldpe-natural, ink-sb, rm_type:plate, tpl:comm-printed-pe │
├─────────────────────────────────────────────────────────────────┤
│ 2. uuid             Internal PK (API, FK within ES)             │
├─────────────────────────────────────────────────────────────────┤
│ 3. external_id      Optional — PEBI/Oracle/MES item ID (future) │
└─────────────────────────────────────────────────────────────────┘
```

**Rule:** Cross-system sync and template BOM resolution use **`platform_key`** (or `costingKey` for BOM aliases). UUIDs stay internal.

### 7.2 Entity key conventions

| Entity | Key column | Format example | Notes |
|--------|------------|----------------|-------|
| Platform material | `platform_master_materials.key` | `bopp-transparent` | Immutable after create |
| Costing / BOM alias | `costing_key` | `ink-sb`, `ldpe-shrink` | Template `ref_material_key` |
| RM type | `platform_reference_items.code` | `substrate`, `plate` | Drives Library + taxonomy |
| Product type | `code` | `roll`, `pouch` | Maps to enum |
| Unit | `code` | `kgs`, `sqm` | Display label separate |
| Standard template | `template_key` | `commercial-items-printed-pe` | See §10.1 compound rule |
| Tenant template | `template_key` | `acme-custom-laminate-2026` | Auto-slug; not in PEBI map |
| Master revision | `master_data_version` | monotonic integer | Bumped on platform mutation |

### 7.3 Sync flow (target)

```
Master Data UI save
    → bump master_data_version
    → write platform_master_materials / platform_reference_items
    → append platform_master_audit_log
    → syncPlatformMasterToAllTenants()
         → match tenant row by platform_master_key (primary)
         → fallback: legacy materialSyncKey (one migration period)
         → set platform_master_key, platform_synced_at, costing_key
    → MasterDataProvider.invalidate() (web live reload)
```

### 7.4 Estimate lineage (target)

On **create** or **layer save**:

```
layers.platform_master_key_snapshot  ← from material.platform_master_key
layers.costing_key_snapshot          ← from material.costing_key
layers.material_name_snapshot
layers.unit_cost_snapshot_usd

estimates.master_data_version
estimates.source_template_key        ← if from template
```

---

## 8. Phase A — Platform ↔ tenant hard lineage

**Goal:** Every **platform-synced** tenant material points back to exactly one platform master row by key.  
**Prerequisite:** §3.5 (TS cleanup on `platform-master-data.ts` recommended).  
**DoD:** Sync tests prove key-first match; backfill script for existing tenants.

### 8.1 Schema

```sql
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_master_key VARCHAR(128);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS materials_platform_master_key_idx
  ON materials(tenant_id, platform_master_key)
  WHERE platform_master_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS materials_tenant_platform_key_uq
  ON materials(tenant_id, platform_master_key)
  WHERE platform_master_key IS NOT NULL AND is_tenant_only = FALSE;
```

**Note:** `is_tenant_only = true` rows **never** get `platform_master_key` — by design.

### 8.2 Sync logic (`seed-materials.ts`)

1. `mapMasterToDbRow()`: set `platformMasterKey: material.key`.
2. `findExistingMatch()`: match by `platform_master_key` first; then legacy heuristics.
3. On update: refresh `platform_synced_at`.

### 8.3 Backfill script

`packages/server/scripts/backfill-platform-master-keys.ts` — match by `costingKey` / `materialSyncKey`; log ambiguous rows.

### 8.4 Tests

- Key-first match survives tenant display name change.
- Unique index prevents duplicate synced keys per tenant.

---

## 9. Phase B — Master data versioning & estimate lineage

**Goal:** Every estimate records master catalog revision and stable material keys.  
**Prerequisite:** Resolve §3.6 (`estimation_cost_snapshots` vs `estimation_costs`) before adding another snapshot concept.

### 9.1 Schema

```sql
CREATE TABLE IF NOT EXISTS platform_master_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  master_data_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS master_data_version INTEGER;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS source_template_key VARCHAR(128);

ALTER TABLE layers ADD COLUMN IF NOT EXISTS platform_master_key_snapshot VARCHAR(128);
ALTER TABLE layers ADD COLUMN IF NOT EXISTS costing_key_snapshot VARCHAR(64);
```

### 9.2 Services & write paths

- `incrementMasterDataVersion()` / `getMasterDataVersion()` in `platform-master-data.ts`.
- Stamp on template instantiate + layer insert (`templates.ts`, `estimates.ts`).

---

## 10. Phase C — Closed reference system & taxonomy

(Unchanged intent from original plan — RM Types codes, `item_class`, taxonomy from rm_type, delete guards, `price_source` → `platform`.)

See original §7.1–7.5 in prior revision; implement after Phase A.

---

## 11. Phase D — Structure template stable keys

**Goal:** Templates addressable by immutable `template_key`.

### 11.1 Compound key rule (fixes collision gap)

`pebi_parent_pg` alone is **not** unique. Standard templates also have `material_class` (PE / Non PE) and often `structure_type` (Mono / Multilayer).

**Uniqueness rule:**

```sql
-- Unique per tenant among standard templates with non-null key
CREATE UNIQUE INDEX structure_templates_tenant_key_uq
  ON structure_templates(tenant_id, template_key)
  WHERE template_key IS NOT NULL;
```

**Key generation (seed + admin create):**

```
template_key = slug(pebi_parent_pg) + optional suffix from material_class + structure_type

Examples:
  commercial-items-printed-pe-mono
  commercial-items-printed-non-pe-mono   -- if both exist under same PG label
  laminates-duplex-pe
  labels-narrow-web                      -- when PG alone insufficient
```

Document exact slug algorithm in seed JSON; never derive key from display `name` alone after create.

### 11.2 Standard vs tenant templates

| | Standard (`isStandard: true`) | My Templates (`isStandard: false`) |
|--|-------------------------------|--------------------------------------|
| **PEBI mapping** | Yes — `pebi_parent_pg` + appendix table | No — tenant-local |
| **`template_key`** | Required; immutable after create | Auto-generated: `tenant-{slug(name)}-{shortId}` |
| **MES export** | Included in platform catalog sync | Optional; tenant-scoped only |
| **Instantiate API** | By `template_key` or UUID | UUID only (unless tenant publishes key) |

### 11.3 API

- `GET /api/v1/templates?template_key=commercial-items-printed-pe-mono`
- Instantiate body: `{ templateKey?: string, ... }`

---

## 12. Phase E — Audit, change feed & external IDs

**Prerequisites:** §3.3 JWT expiry · §12.2 auth model **before** exposing change feed externally.

### 12.1 Master data audit log

(Same schema as original §9.1 — `platform_master_audit_log` with version, entity_key, before/after JSON.)

### 12.2 Change feed API — auth model

**Endpoint:**

```
GET /api/v1/platform/master-data/changes?since_version=42
```

**Auth (concrete — not “future role” only):**

| Consumer | Auth mechanism | Scope |
|----------|----------------|-------|
| Platform admin (human) | Existing JWT (`platform_admin`) | Full read + UI |
| MES sync agent (machine) | **Service API key** header `X-ES-Service-Key` + optional `X-Tenant-Id` | Read-only change feed + master snapshot |
| Future PEBI bridge | OAuth client credentials OR mTLS (Decision #13b) | TBD — document extension point |

**Implementation steps:**

1. New table `platform_service_keys` (`key_hash`, `label`, `scopes[]`, `expires_at`, `revoked_at`).
2. Middleware `requireServiceKey(['master_data:read'])` separate from user JWT.
3. **Do not** reuse non-expiring user JWTs for machine consumers.
4. Rate limit + audit every service-key call.

**Response shape:** unchanged from original plan (`currentVersion`, `changes[]`, optional full snapshot).

### 12.3 External identity columns

`external_id` + `external_source` on platform materials, tenant materials, structure templates — admin-editable; never overwritten by sync.

---

## 13. Phase F — API contract & documentation

- Master data read endpoints, key fields, sync semantics, snapshot fields.
- Shared types for PEBI monorepo.
- Token lifetime + service key docs (depends §12.2).

---

## 14. UI work summary

| Page | Changes |
|------|---------|
| Master Data → Materials | `key` read-only; optional `external_id`; `item_class` |
| Master Data → RM Types | Code required; delete guard |
| Raw Materials | Platform key badge + `platform_synced_at` |
| Standard Templates | `template_key` display; compound key help text |
| My Templates | Show auto key; explain not in PEBI catalog |
| Estimate Editor (admin) | Master version + layer key snapshots |

---

## 15. Testing strategy

### MES-specific

- Key-first sync; manual price preserved; template instantiate snapshots; RM Type taxonomy; delete guards.

### Prerequisites (§3)

- Slab pricing integration test (500 vs 10000 kg).
- Fresh-clone CI job: install → build engine → db:patch → start → health check.
- JWT exp claim present; expired token 401.
- PDF slab rows match DB per-slab prices.

---

## 16. Migration & rollout

1. Complete §3 prerequisites.
2. MES schema patches (additive).
3. Backfill platform keys + template keys.
4. Enable unique indexes after backfill validation.
5. Enable change feed only after service-key auth.

---

## 17. Execution checklist

### V1 prerequisites (do first)

- [x] P0.1 Fix slab pricing end-to-end (engine → persist → UI → PDF)
- [x] P0.2 Engine build in setup scripts / postinstall
- [x] P1.1 JWT `expiresIn` + refresh endpoint (`POST /api/v1/auth/refresh`)
- [x] P1.2 PDF single path via `buildProposalPdfBuffer`; per-slab prices
- [x] P2.1 Server `tsc --noEmit` clean
- [x] P2.2 Resolve `estimation_cost_snapshots` (drop or repurpose)
- [x] P3.1 `git rm --cached` Excel artifacts
- [x] P3.2 Document/consolidate Excel npm scripts

### MES Phase A — Lineage

- [x] A1 `platform_master_key`, `platform_synced_at` on materials
- [x] A2 Key-first sync in `seed-materials.ts`
- [x] A3 Backfill script
- [x] A4 Unique index + tests

### MES Phase B — Versioning

- [x] B1 `platform_master_state` + bump on mutation
- [x] B2 Layer + estimate snapshots
- [x] B3 Admin UI badge (Estimate Editor)

### MES Phase C — Reference & taxonomy

- [x] C1–C6 (reference uniqueness, item_class, taxonomy, delete guards, price_source rename)

### MES Phase D — Template keys

- [x] D1 Compound `template_key` rule + seed JSON
- [x] D2 My Templates auto-key policy
- [x] D3 API by key

### MES Phase E — Audit & feed

- [x] E1 Audit log
- [x] E2 Service API key auth + change feed endpoint (+ rate limit)
- [x] E3 External ID columns (+ Master Data UI)

### MES Phase F — Docs

- [x] F1 API contract · F2 memory updates · F3 PEBI mapping appendix

---

## 18. Appendix A — Costing key catalog

| costing_key | Typical platform key | Layer |
|-------------|---------------------|-------|
| ldpe-natural | ldpe-natural | substrate |
| ldpe-shrink | pe-shrink | substrate |
| bopp | bopp-transparent | substrate |
| ink-sb | ink-sb | ink |
| ink-uv | ink-uv | ink |
| adhesive-sb | adhesive-sb | adhesive |

Full map: `packages/server/src/db/master-materials-io.ts` → `TEMPLATE_REF_TO_MASTER_KEY`.

---

## 19. Appendix B — PEBI parent PG ↔ template_key (compound)

**Rule:** One row per **standard template instance**, not per parent PG label alone.

| name (example) | pebi_parent_pg | material_class | template_key (example) |
|----------------|----------------|----------------|------------------------|
| Commercial Items Plain | Commercial Items Plain | PE | `commercial-items-plain-pe-mono` |
| Commercial Items Printed | Commercial Items Printed | PE | `commercial-items-printed-pe-mono` |
| Laminates · Duplex | Laminates · Duplex | PE | `laminates-duplex-pe` |
| Labels | Labels | Non PE | `labels-non-pe` |

Populate from `ES_STANDARD_TEMPLATES_SEED.json` during Phase D — **verify no collisions** across all 11 standard templates before applying unique index.

---

## 20. Appendix C — Files likely touched

| Area | Files |
|------|-------|
| Prerequisites | `calculator.ts`, `estimate-calculation.ts`, `proposal-pdf.ts`, `pdf-proposal-kit.ts`, `app.ts`, `auth.ts`, `RUN-ES.bat`, `package.json`, `SETUP.md` |
| MES schema | `schema.ts`, `schema-patches.sql` |
| Platform master | `platform-master-data.ts`, routes |
| Sync | `seed-materials.ts`, `seed-categories.ts` |
| Templates | `seed-templates.ts`, `templates.ts` |
| Web | `MasterData.tsx`, `Library.tsx`, `EstimateEditor.tsx`, `StandardTemplates.tsx` |

---

## 21. Success criteria (MES-ready definition of done)

ES is **MES-ready** when all of the following are true:

1. **100%** of **platform-synced** tenant materials (`is_tenant_only = false`) have non-null `platform_master_key`. Tenant-only rows excluded from metric.
2. Every estimate created after cutover stores `master_data_version` and layer key snapshots.
3. Every **standard** template has unique `template_key` per tenant (compound rule §11.1).
4. RM Types / Product Types have unique codes; taxonomy includes all RM Types.
5. Platform master mutations append to audit log with version numbers.
6. MES sync agent authenticates via **service API key** (not immortal user JWT) and can call change feed.
7. Documentation maps ES keys → PEBI parent PG / future MES item IDs.

**V1-ready (separate bar)** — must pass before claiming MES-ready:

- Slab table shows quantity-dependent pricing (§3.1).
- Fresh clone starts per docs (§3.2).
- JWTs expire (§3.3).
- PDF reflects per-slab prices (§3.4).

Until MES criteria met, ES is **production-ready for sales costing** (once §3 V1 items fixed) but **not** certified for bi-directional MES master sync.

---

*End of plan.*
