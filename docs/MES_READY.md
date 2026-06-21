# MES-Ready Master Data — Implementation Plan

**Product:** ProPackHub Estimation Studio (ES)  
**Purpose:** Make platform master data traceable, versioned, and synchronizable so ES can later integrate with PEBI MES / ERP without re-keying materials, templates, or estimates.  
**Status:** Plan only — not yet implemented  
**Last updated:** 2026-06-21  

---

## 1. Executive summary

ES already has a **platform master layer** (`platform_master_materials`, `platform_reference_items`) and **semantic costing keys** (`costingKey`, `ref_material_key`) that link templates to materials. That is the right foundation.

What is **missing** for MES readiness:

1. **Hard lineage** from platform master → tenant library → estimate layers (today sync is fuzzy match by name/family/grade).
2. **Version stamps** so a quote can answer “which master revision was used?”
3. **Stable keys** on structure templates and reference data (not just display names).
4. **Closed taxonomy** driven by Master Data (RM Types, categories) — including custom types like Plate.
5. **Audit + change feed** for platform master edits and tenant sync events.
6. **External identity hooks** (`external_id`, `source_system`) for future PEBI/Oracle mapping.

This document is the full build plan. Work is split into **Phase A–D** so ES stays shippable after each phase.

---

## 2. Scope boundaries

### In scope (this plan)

- Platform and tenant **master data identity**, sync, versioning, audit.
- Estimate **layer lineage** (stable keys snapshotted at save).
- Structure template **stable keys** aligned with PEBI parent PGs.
- Reference lists (RM Types, Product Types, Units) as **code-driven** closed system.
- API surface for **read-only MES consumers** (future PEBI sync agent).

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

## 3. Current state (as of 2026-06-21)

### 3.1 What works today

| Capability | Implementation | MES value |
|------------|----------------|-----------|
| Platform material catalog | `platform_master_materials` with unique `key` | ✅ Stable platform item slug |
| Admin Master Data UI | `/platform/master-data` CRUD + auto tenant sync | ✅ Single source of truth in-app |
| Template layer refs | `default_layers[].ref_material_key` → `materials.costing_key` | ✅ Portable BOM aliases |
| Tenant sync | `syncPlatformMasterToAllTenants()` on platform save | ✅ Push to all tenants |
| Manual price protection | `materials.price_source = manual` skips overwrite | ✅ Tenant override policy |
| Tenant-only rows | `materials.is_tenant_only` exempt from prune | ✅ Custom grades |
| Reference lists | `platform_reference_items` (category + label + code) | ⚠️ Partial — codes not always enforced |
| RM Types → Library | `rmTypeOptions` drives filter tabs + Add Material | ✅ Recent closed-loop fix |
| Estimate audit (partial) | Layer name/cost snapshot on calculate; `estimation_cost_snapshots` | ⚠️ No master key/version |
| PEBI PG name on templates | `structure_templates.pebi_parent_pg` | ✅ Classification anchor |
| Activity log | `activity_logs` for estimates | ❌ Not used for master data |

### 3.2 Critical gaps

| Gap | Risk |
|-----|------|
| Tenant `materials` has **no** `platform_master_key` | Cannot trace tenant row ↔ platform item after rename or across systems |
| Sync uses **heuristic match** (`materialSyncKey`, legacy names) | Duplicate/orphan rows; MES sync ambiguous |
| No **master_data_version** on estimates | Cannot prove which catalog revision a quote used |
| Layers store **UUID only**; no `costing_key` snapshot at save | Broken lineage if material deleted/relinked |
| Structure templates keyed by **name** only | Rename breaks external references |
| Categories/subcategories **hardcoded** in `seed-categories.ts` | New RM Types (e.g. Plate) not in taxonomy |
| Reference items: no **UNIQUE(category, code)** | Duplicate codes possible |
| No master-data **audit log** or **change feed** | MES cannot subscribe to updates |
| No **external_id** fields | No mapping to Oracle / PEBI item IDs |
| `layer_type` enum fixed (`substrate\|ink\|adhesive`) | Custom RM classes need parallel `item_class` dimension |
| `material_price_source` enum still says `'excel'` | Misleading for ops/audit (source is platform DB) |

---

## 4. Target architecture — master numbers model

### 4.1 Identifier hierarchy

Every master entity should expose **three IDs**:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. platform_key     Human-stable business key (sync + MES)      │
│    e.g. ldpe-natural, ink-sb, rm_type:plate, tpl:comm-printed   │
├─────────────────────────────────────────────────────────────────┤
│ 2. uuid             Internal PK (API, FK within ES)             │
├─────────────────────────────────────────────────────────────────┤
│ 3. external_id      Optional — PEBI/Oracle/MES item ID (future) │
└─────────────────────────────────────────────────────────────────┘
```

**Rule:** Cross-system sync and template BOM resolution use **`platform_key`** (or `costingKey` where that is the BOM alias). UUIDs stay internal.

### 4.2 Entity key conventions

| Entity | Key column | Format example | Notes |
|--------|------------|----------------|-------|
| Platform material | `platform_master_materials.key` | `bopp-transparent` | Already exists; immutable after create |
| Costing / BOM alias | `costing_key` | `ink-sb`, `ldpe-shrink` | Subset of materials; template `ref_material_key` |
| RM type (reference) | `platform_reference_items.code` where category=`rm_type` | `substrate`, `ink`, `plate` | Drives Library + taxonomy |
| Product type | `code` where category=`product_type` | `roll`, `pouch` | Maps to `product_type` enum |
| Unit | `code` where category=`unit` | `kgs`, `sqm` | Display label separate |
| Structure template | `template_key` (new) | `commercial-items-printed` | Stable; name can change |
| Master catalog revision | `master_data_version` (new) | monotonic integer | Bumped on any platform master mutation |

### 4.3 Sync flow (target)

```
Master Data UI save
    → bump master_data_version
    → write platform_master_materials / platform_reference_items
    → append master_data_audit_log
    → syncPlatformMasterToAllTenants()
         → match tenant row by platform_master_key (primary)
         → fallback: legacy materialSyncKey (one migration period)
         → set platform_master_key, platform_synced_at, costing_key
    → MasterDataProvider.invalidate() (web live reload)
```

### 4.4 Estimate lineage (target)

On **create** or **layer save**:

```
layers.platform_master_key_snapshot  ← from material.platform_master_key
layers.costing_key_snapshot          ← from material.costing_key
layers.material_name_snapshot        ← already on calculate; move to save
layers.unit_cost_snapshot_usd        ← already on calculate; move to save

estimates.master_data_version        ← current platform version at instantiate
estimates.source_template_key        ← optional, if from template
```

---

## 5. Phase A — Platform ↔ tenant hard lineage

**Goal:** Every synced tenant material row points back to exactly one platform master row by key.  
**Effort:** Medium | **Risk:** Low (additive columns + sync logic) | **DoD:** Sync tests prove key-first match; backfill script for existing tenants.

### 5.1 Schema changes

**File:** `packages/server/scripts/schema-patches.sql`, `packages/server/src/db/schema.ts`

```sql
-- Tenant materials: platform lineage
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_master_key VARCHAR(128);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS materials_platform_master_key_idx
  ON materials(tenant_id, platform_master_key)
  WHERE platform_master_key IS NOT NULL;

-- Prefer unique platform key per tenant for synced rows
CREATE UNIQUE INDEX IF NOT EXISTS materials_tenant_platform_key_uq
  ON materials(tenant_id, platform_master_key)
  WHERE platform_master_key IS NOT NULL AND is_tenant_only = FALSE;
```

**Drizzle:** Add `platformMasterKey`, `platformSyncedAt` to `materials` table definition.

### 5.2 Sync logic changes

**File:** `packages/server/src/db/seed-materials.ts`

1. In `mapMasterToDbRow()`: set `platformMasterKey: material.key`.
2. In `findExistingMatch()`: **first** try `row.platformMasterKey === material.key`; then existing heuristics (deprecate over time).
3. On update: always refresh `platformSyncedAt`; never clear `platformMasterKey` on matched rows.
4. On insert: set both key and timestamp.

### 5.3 Backfill migration script

**New file:** `packages/server/scripts/backfill-platform-master-keys.ts`

- For each tenant material without `platform_master_key`:
  - Match platform catalog by `costingKey` inverse map or `materialSyncKey`.
  - Set `platform_master_key` where confidence is unambiguous.
  - Log ambiguous rows for manual review.

### 5.4 API exposure

**File:** `packages/server/src/routes/materials.ts`

- Include `platformMasterKey`, `platformSyncedAt` in GET `/api/v1/materials` response (read-only for non-admin).

### 5.5 Tests

- Unit: `findExistingMatch` prefers key over name.
- Integration: platform save updates tenant row by key even after tenant renames display `name`.
- Integration: two platform rows never map to same tenant key (unique index).

---

## 6. Phase B — Master data versioning & estimate lineage

**Goal:** Every estimate records which master catalog revision and which stable material keys were used.  
**Effort:** Medium | **Risk:** Low | **DoD:** Re-open old estimate shows frozen keys + version number.

### 6.1 Schema changes

```sql
-- Global platform revision counter (single row table or tenants-agnostic)
CREATE TABLE IF NOT EXISTS platform_master_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  master_data_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS master_data_version INTEGER;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS source_template_key VARCHAR(128);

ALTER TABLE layers ADD COLUMN IF NOT EXISTS platform_master_key_snapshot VARCHAR(128);
ALTER TABLE layers ADD COLUMN IF NOT EXISTS costing_key_snapshot VARCHAR(64);
-- material_name_snapshot, unit_cost_snapshot_usd already exist
```

### 6.2 Version bump service

**File:** `packages/server/src/db/platform-master-data.ts`

- `incrementMasterDataVersion()` — call on every material/reference mutation before sync.
- `getMasterDataVersion()` — used by estimate create/instantiate.

### 6.3 Estimate write paths

**Files:**

- `packages/server/src/routes/templates.ts` — `instantiateTemplateRoute`
- `packages/server/src/routes/estimates.ts` — create/update layers

On layer insert:

```ts
const mat = materialMap.get(layer.materialId);
{
  ...
  platformMasterKeySnapshot: mat.platformMasterKey ?? null,
  costingKeySnapshot: mat.costingKey ?? null,
  materialNameSnapshot: mat.name,
  unitCostSnapshotUsd: mat.costPerKgUsd, // optional at create; required on calculate
}
```

On estimate create:

```ts
{ masterDataVersion: await getMasterDataVersion(), sourceTemplateKey: template?.templateKey }
```

### 6.4 UI (read-only)

- Admin estimate detail: show “Master catalog v{N}” badge.
- Layer tooltip: show snapshotted `costing_key` if different from current material.

### 6.5 Tests

- Instantiate template → estimate has `master_data_version` and layer snapshots.
- Platform material price change → old estimate snapshots unchanged.

---

## 7. Phase C — Closed reference system & taxonomy

**Goal:** RM Types, Product Types, Units are code-first; taxonomy (categories) follows RM Types; deletes are guarded.  
**Effort:** Medium–High | **Risk:** Medium (touches Library, seed-categories, Master Data UI) | **DoD:** Add Plate in RM Types → category exists → Library filter + taxonomy aligned.

### 7.1 Reference item integrity

**Schema:**

```sql
-- Unique active code per category
CREATE UNIQUE INDEX IF NOT EXISTS platform_reference_category_code_uq
  ON platform_reference_items(category, lower(code))
  WHERE active = TRUE AND code IS NOT NULL AND code <> '';
```

**Server:** `replacePlatformReferenceCategory()` — reject duplicate codes; require code on save for `rm_type` and `product_type`.

**Seed backfill:** Ensure existing RM Types rows have codes (`substrate`, `ink`, `adhesive`, `packaging`, `plate`, …).

### 7.2 Platform taxonomy tables (new)

Replace hardcoded `TAXONOMY` in `seed-categories.ts` with platform-driven or rm_type-driven taxonomy.

**Option A (recommended):** Derive tenant categories from `rm_type` reference on sync:

| rm_type.code | Tenant category name |
|--------------|---------------------|
| substrate | Substrates |
| ink | Inks |
| adhesive | Adhesives |
| packaging | Packaging |
| plate (custom) | Plate |
| *custom* | Label from reference |

**Schema (optional explicit table):**

```sql
CREATE TABLE IF NOT EXISTS platform_taxonomy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rm_type_code VARCHAR(64) NOT NULL,  -- links to reference item code
  label VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
```

**Sync:** On `rm_type` save → upsert tenant `categories` / default `subcategories` for each tenant (or on next material sync).

### 7.3 Custom RM types vs layer_type enum

**Decision (locked for this plan):**

- **DB `layer_type`** stays `substrate | ink | adhesive` for costing engine (no migration of engine).
- **Item class** for UI/MES = `rm_type.code` stored on material as `item_class VARCHAR(64)` (new column).

```sql
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS item_class VARCHAR(64);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS item_class VARCHAR(64);
```

Mapping when creating platform material from Master Data tab:

| Master Data tab | layer_type | item_class |
|-----------------|------------|------------|
| Substrates | substrate | substrate |
| Ink & Coating | ink | ink |
| Adhesive | adhesive | adhesive |
| Packaging | substrate | packaging |
| (future Plate tab or rm_type) | substrate | plate |

Plate materials: `type=substrate`, `item_class=plate`, `substrate_family='Plate'`.

### 7.4 Delete guards

**Master Data — RM Types delete:**

Before soft-delete reference item:

1. Count platform materials with `item_class = code`.
2. Count tenant materials with matching class/family.
3. If count > 0 → block with message listing usage; offer “deactivate” only.

**Master Data — platform material delete:**

- Block if any estimate layer snapshot references `platform_master_key` (or show force-deactivate with audit).

### 7.5 Rename price_source enum value

```sql
-- Add 'platform' to enum; migrate 'excel' → 'platform' for synced rows
ALTER TYPE material_price_source ADD VALUE IF NOT EXISTS 'platform';
-- Application: treat 'excel' as alias for 'platform' during transition
```

---

## 8. Phase D — Structure template stable keys

**Goal:** Templates addressable by immutable `template_key`; aligned with seed JSON and PEBI parent PGs.  
**Effort:** Medium | **Risk:** Low | **DoD:** Instantiate by key; rename display name without breaking refs.

### 8.1 Schema

```sql
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS template_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS structure_templates_tenant_key_uq
  ON structure_templates(tenant_id, template_key)
  WHERE template_key IS NOT NULL;
```

### 8.2 Seed

**File:** `docs/ES_STANDARD_TEMPLATES_SEED.json`

Add `template_key` to each template, e.g.:

| name | template_key |
|------|--------------|
| Commercial Items Printed | `commercial-items-printed` |
| Laminates · Duplex | `laminates-duplex` |

**File:** `packages/server/src/db/seed-templates.ts` — populate on seed; backfill existing rows by slugifying name.

### 8.3 API

- `GET /api/v1/templates?key=commercial-items-printed`
- Instantiate accepts `templateKey` in body (alternative to UUID).
- Standard Templates admin: show key (read-only after create).

### 8.4 MES mapping

Document mapping table in this file appendix:

```
pebi_parent_pg: "Commercial Items Printed"
template_key:   commercial-items-printed
```

---

## 9. Phase E — Audit, change feed & external IDs

**Goal:** Platform master changes are auditable; external systems can poll for deltas; optional ERP IDs.  
**Effort:** Medium | **Risk:** Low | **DoD:** Admin can see master change history; API returns changes since version N.

### 9.1 Master data audit log

```sql
CREATE TABLE IF NOT EXISTS platform_master_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_data_version INTEGER NOT NULL,
  entity_type VARCHAR(50) NOT NULL,  -- material | reference | template
  entity_key VARCHAR(128) NOT NULL,
  action VARCHAR(20) NOT NULL,         -- create | update | deactivate
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  before_json JSONB,
  after_json JSONB
);
CREATE INDEX IF NOT EXISTS platform_master_audit_version_idx
  ON platform_master_audit_log(master_data_version);
```

Write on every platform master mutation in `platform-master-data.ts`.

### 9.2 Change feed API (MES consumer)

```
GET /api/v1/platform/master-data/changes?since_version=42
Authorization: platform_admin | mes_sync_service (future role)

Response:
{
  "currentVersion": 45,
  "changes": [
    { "version": 43, "entityType": "material", "entityKey": "ink-sb", "action": "update", ... },
    ...
  ],
  "materials": [...],   // optional full snapshot if breaking
  "reference": {...}
}
```

### 9.3 External identity columns

```sql
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);
```

UI: optional fields on Master Data material row (admin only); never overwritten by sync.

### 9.4 Webhooks / events (optional Phase E+)

- On platform save: enqueue `master.data.updated` with `{ version, tenantIdsAffected }`.
- PEBI sync agent subscribes when Decision #13b loosens.

---

## 10. Phase F — API contract & documentation

**Goal:** Single document external integrators can rely on.  
**Effort:** Small | **DoD:** `docs/API_CONTRACTS.md` or section in platform docs.

### 10.1 Document

- Master data read endpoints (materials, reference, version).
- Key fields every consumer must store.
- Sync semantics (manual price override, tenant-only rows).
- Template instantiation keys.
- Estimate snapshot fields for replay.

### 10.2 OpenAPI / types

- Export shared types from `@es/server` or `platform/contracts` for PEBI monorepo reuse.

---

## 11. UI work summary

| Page | Changes |
|------|---------|
| **Master Data → Materials** | Show `key` (read-only after create); optional `external_id`; item_class column for custom types |
| **Master Data → RM Types** | Code required; duplicate code validation; delete guard with usage count |
| **Raw Materials** | Show platform key in row detail; “synced from platform” badge + last synced time |
| **Standard Templates** | Display `template_key`; warn on rename that key is stable identifier |
| **Estimate Editor** | (Admin) master version + layer key snapshots in debug/audit panel |
| **Settings** | (Future) MES sync status / last platform version seen |

---

## 12. Testing strategy

### 12.1 Unit tests

- `deriveRmTypeCode`, `materialSyncKey`, key-first `findExistingMatch`
- Version increment idempotency
- Reference unique code validation

### 12.2 Integration tests

- Platform material create → all tenants get row with same `platform_master_key`
- Manual price tenant → platform price update does not overwrite
- Template instantiate → estimate `master_data_version` + layer snapshots
- RM Type add/remove → Library tabs + categories update live
- Delete guard blocks RM type in use

### 12.3 Migration verification

- Script report: % tenant materials with `platform_master_key` populated
- Script report: templates with `template_key` populated
- Zero duplicate `(tenant_id, platform_master_key)` for synced rows

---

## 13. Migration & rollout

### 13.1 Order of deployment

1. Schema patches (additive columns only — safe to run live).
2. Backfill scripts (platform keys, template keys, reference codes).
3. Server sync + version logic (feature-flag key-first match if needed).
4. Web UI exposure.
5. Enable unique indexes after backfill confirms clean data.

### 13.2 Backward compatibility

- Keep legacy `findExistingMatch` heuristics for **one release** while backfill runs.
- `material_price_source = 'excel'` treated as `'platform'` in code until data migrated.
- Templates without `template_key` fall back to name match.

### 13.3 Rollback

- New columns nullable — rollback is code-only; no data loss.

---

## 14. Execution checklist (ordered)

Use this as the sprint backlog.

### Phase A — Lineage
- [ ] A1 Add `platform_master_key`, `platform_synced_at` to `materials`
- [ ] A2 Update `mapMasterToDbRow` + `findExistingMatch` (key-first)
- [ ] A3 Backfill script + run on dev/staging tenants
- [ ] A4 Unique index on `(tenant_id, platform_master_key)`
- [ ] A5 API + tests

### Phase B — Versioning
- [ ] B1 `platform_master_state` table + bump on mutation
- [ ] B2 Layer snapshot columns + write on create/update
- [ ] B3 `estimates.master_data_version` + template source key
- [ ] B4 Admin UI badge + tests

### Phase C — Reference & taxonomy
- [ ] C1 Unique `(category, code)` on reference items
- [ ] C2 Require codes on RM Types / Product Types save
- [ ] C3 `item_class` on materials (platform + tenant)
- [ ] C4 Taxonomy sync from rm_type (Plate → category)
- [ ] C5 Delete guards with usage counts
- [ ] C6 Rename `price_source` excel → platform

### Phase D — Template keys
- [ ] D1 Add `template_key` to schema + seed JSON
- [ ] D2 Backfill existing templates
- [ ] D3 API filter/instantiate by key
- [ ] D4 Standard Templates admin display

### Phase E — Audit & MES feed
- [ ] E1 `platform_master_audit_log` + write path
- [ ] E2 `GET .../master-data/changes?since_version=`
- [ ] E3 External ID columns + admin UI
- [ ] E4 (Optional) webhook/event queue

### Phase F — Docs
- [ ] F1 API contract for master data consumers
- [ ] F2 Update `ES_MEMORY.md` when each phase ships
- [ ] F3 PEBI mapping appendix (parent PG ↔ template_key ↔ costing keys)

---

## 15. Appendix A — Key material catalog (costing aliases)

These **`costing_key`** values are the BOM layer vocabulary. MES integrations should treat them as **stable**:

| costing_key | Typical platform key | Layer |
|-------------|---------------------|-------|
| ldpe-natural | ldpe-natural | substrate |
| ldpe-shrink | pe-shrink | substrate |
| bopp | bopp-transparent | substrate |
| ink-sb | ink-sb | ink |
| ink-uv | ink-uv | ink |
| adhesive-sb | adhesive-sb | adhesive |
| adhesive-wb | adhesive-wb | adhesive |
| adhesive-mono-component | adhesive-mono-component | adhesive |

Full map: `packages/server/src/db/master-materials-io.ts` → `TEMPLATE_REF_TO_MASTER_KEY`.

---

## 16. Appendix B — PEBI parent PG ↔ template_key (seed)

Populate during Phase D from `ES_STANDARD_TEMPLATES_SEED.json`:

| pebi_parent_pg | template_key (proposed) |
|----------------|---------------------------|
| Commercial Items Plain | commercial-items-plain |
| Commercial Items Printed | commercial-items-printed |
| Industrial Items Plain | industrial-items-plain |
| Industrial Items Printed | industrial-items-printed |
| Laminates · Duplex | laminates-duplex |
| Laminates · Triplex | laminates-triplex |
| Laminates · Quadriplex | laminates-quadriplex |
| Shrink Sleeves | shrink-sleeves |
| Labels | labels |

(Exact list = 11 standard templates per Decision #17.)

---

## 17. Appendix C — Files likely touched

| Area | Files |
|------|-------|
| Schema | `schema.ts`, `schema-patches.sql` |
| Platform master | `platform-master-data.ts`, `platform-master-data.ts` routes |
| Tenant sync | `seed-materials.ts`, `seed-categories.ts` |
| Templates | `seed-templates.ts`, `templates.ts`, `template-material-lookup.ts` |
| Estimates | `estimates.ts`, `estimate-calculation.ts`, `templates.ts` instantiate |
| Web | `MasterData.tsx`, `Library.tsx`, `EstimateEditor.tsx`, `StandardTemplates.tsx` |
| Types | `api.ts`, `masterDataReference.ts` |
| Tests | `auth-estimates.integration.test.ts`, new `master-data-sync.test.ts` |
| Docs | `ES_MEMORY.md`, `LIVE_STATE.md`, `SESSION_LOG.md`, this file |

---

## 18. Success criteria (MES-ready definition of done)

ES is **MES-ready** when all of the following are true:

1. **100%** of platform-synced tenant materials have non-null `platform_master_key`.
2. Every estimate created after cutover stores `master_data_version` and layer key snapshots.
3. Every standard template has a unique `template_key` per tenant.
4. RM Types / Product Types have unique codes; taxonomy includes all RM Types (including custom).
5. Platform master mutations append to audit log with version numbers.
6. External integrator can call `GET .../master-data/changes?since_version=N` and reconcile tenant catalogs.
7. Documentation maps ES keys → PEBI parent PG / future MES item IDs.

Until then, ES remains **production-ready for sales costing** but **not** certified for bi-directional MES master sync.

---

*End of plan.*
