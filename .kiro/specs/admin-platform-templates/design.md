# Design Document

## Overview

Platform-wide template standards become a first-class concept stored in a new table `platform_standard_templates` that is not scoped to a tenant. Per-tenant `structure_templates` remains as a materialized cache so existing reads, references, and instantiation paths keep working. Platform admins manage the catalog through a small set of admin-only routes; the existing builder UI gains a single "Save as platform standard" toggle gated on `platform_admin`. The JSON seed file remains the bootstrap source for the initial catalog.

## Architecture

```
┌────────────────────────────────────┐         ┌──────────────────────────────┐
│ structure-templates-seed.json      │ boot →  │ platform_standard_templates  │
│ (ships with app, source of truth   │ upsert  │ (platform-level, no tenant)  │
│  for first-run catalog)            │   by    │ - templateKey (unique)       │
└────────────────────────────────────┘ tplKey  │ - defaultLayers (ref_keys)   │
                                               │ - isActive, updatedAt        │
                                               └──────────────┬───────────────┘
                                                              │
                                              prepareTemplatesForTenant()
                                              on every GET /templates
                                                              │
                                                              ▼
                                               ┌──────────────────────────────┐
                                               │ structure_templates          │
                                               │ (per-tenant materialized     │
                                               │  copies, resolved to local   │
                                               │  materialId per layer)       │
                                               └──────────────────────────────┘
```

### Why two tables

The codebase already treats `structure_templates` as the working set: estimates reference template rows by `id` and `sourceTemplateKey`; the builder, instantiator, and "My Templates" UI all read this table. Replacing it with a join across two tables would force changes everywhere. Instead we keep `structure_templates` exactly as it is and add a second platform table whose only job is to be the canonical definition of every standard. Sync logic that already runs on every read (`syncMissingStandardTemplates`, `pruneDuplicateStandardTemplates`) takes one extra responsibility: replicate platform-row state into each tenant.

### Why layers store `ref_material_key` on platform rows

`materialId` is tenant-scoped. A platform row that stored tenant-A's `materialId` would resolve to nothing for tenant B. The seed JSON already uses `ref_material_key` (the canonical PEBI key), and `materials.costingKey` is the column on each tenant's material row that aliases back to the same canonical key. The existing `buildTemplateMaterialLookup` + `resolveLayerMaterialId` utilities translate the canonical key to that tenant's `materialId` during sync. The new "save platform standard" path runs the same translation in reverse: for every layer that carries `materialId`, look up `materials.costingKey` and persist that string on the platform row.

## Data model

### New table: `platform_standard_templates`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | platform-row identifier |
| `template_key` | varchar(128) **unique not null** | canonical key, mirrors today's `structure_templates.template_key` |
| `name` | varchar(255) not null | display name |
| `pebi_parent_pg` | varchar(255) not null | catalog category |
| `product_type` | productTypeEnum not null | roll/sleeve/pouch |
| `product_subtype` | varchar(64) null | UI subtype |
| `material_class` | varchar(50) null | PE, Non PE |
| `structure_type` | varchar(50) null | Mono, Multilayer |
| `substrate_origin` | varchar(50) null | optional |
| `display_order` | integer not null default 0 | ordering |
| `default_dimensions` | jsonb null | includes `printMode` |
| `default_layers` | jsonb not null | array of `{ layer_order, layer_type, ref_material_key, default_micron, swappable_with? }` |
| `default_processes` | jsonb null | as today |
| `default_printing_web_class` | printingWebClassEnum default `wide_web` | |
| `solvent_mix_enabled` | boolean default false | |
| `ink_system_options` | jsonb null | |
| `substrate_options` | jsonb null | |
| `is_active` | boolean default true | soft-delete flag |
| `created_by_user_id` | uuid null | original `platform_admin` (audit) |
| `updated_by_user_id` | uuid null | last editor (audit) |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | |

Index: unique on `template_key`. Foreign keys on the two audit columns are not enforced (admin user may be deleted) — store the uuid as-is.

### No change to `structure_templates`

The tenant table keeps its current shape. Tenant copies continue to carry `isStandard=true` for platform-standard-derived rows, plus `templateKey` linking back. Layer storage on tenant copies continues to carry `materialId` (resolved at sync time).

## Sync logic

### Boot bootstrap: `bootstrapPlatformStandardCatalog()`

Runs once on server boot, after migrations.

```
for each entry in structure-templates-seed.json:
  key = deriveStandardTemplateKey(entry)
  existing = SELECT FROM platform_standard_templates WHERE template_key = key
  if not existing:
    INSERT row from entry (mapping seed fields → platform columns)
  else:
    do nothing — admin edits win over seed values
```

The seed JSON remains an "if empty, fill" source. Admin-published changes to the same `templateKey` are never overwritten by re-running boot.

### Per-tenant sync: extended `syncPlatformStandardsToTenant(tenantId)`

Replaces the JSON-driven `syncMissingStandardTemplates`. Reads `platform_standard_templates` and reconciles each platform row to a tenant copy.

```
platform = SELECT FROM platform_standard_templates ORDER BY display_order
tenantCopies = SELECT FROM structure_templates WHERE tenant_id = $1 AND is_standard = true

For each p in platform:
  copy = tenantCopies.find(t => t.templateKey === p.templateKey)
  resolvedLayers = resolveTemplateLayers(p.defaultLayers, tenantMaterialLookup, validIds)

  if not copy:
    if p.isActive: INSERT structure_templates row using resolvedLayers, fields from p
  else:
    if p.isActive == false and copy.isActive == true:
      UPDATE structure_templates SET isActive=false WHERE id=copy.id
    elif p.updatedAt > copy.updatedAt or p.isActive == true and copy.isActive == false:
      UPDATE structure_templates SET (name, productType, materialClass, …, defaultLayers=resolvedLayers, isActive=p.isActive, updatedAt=now()) WHERE id=copy.id

# Orphan handling: tenant copies whose templateKey is no longer in platform table
For each c in tenantCopies where c.templateKey not in {p.templateKey for p in platform} and c.isStandard:
  if c.isActive: UPDATE structure_templates SET isActive=false WHERE id=c.id
```

The tenant row's `id` is preserved across updates so existing estimate references (`sourceTemplateKey` lookup → tenant row id) remain valid.

### Where it plugs in

`prepareTemplatesForTenant` (`routes/templates.ts`) is updated:

```
async function prepareTemplatesForTenant(tenantId):
  await ensureTemplatesForTenant(tenantId)            // first-time seed
  await syncPlatformStandardsToTenant(tenantId)       // new — replaces syncMissingStandardTemplates
  await pruneDuplicateStandardTemplates(tenantId)
  await syncTemplateKeysForTenant(tenantId)
  await relinkTemplatesForTenant(tenantId)
```

`ensureTemplatesForTenant` and `seedTemplatesForTenant` are refactored to read from `platform_standard_templates` (with a fallback to the JSON if the platform table is empty, which only happens before the boot bootstrap has run).

## Backend API

All new routes require `request.jwtVerify()` and reject with 403 when `user.role !== 'platform_admin'`.

### `GET /api/v1/admin/platform-templates`
List all platform standards (active and inactive). Returns the raw platform rows.

### `GET /api/v1/admin/platform-templates/:id`
Read a single platform standard.

### `POST /api/v1/admin/platform-templates`
Create a new platform standard. Body:
```ts
{
  name: string;
  pebiParentPg?: string;          // defaults to name
  productType: 'roll'|'sleeve'|'pouch';
  productSubtype?: string|null;
  materialClass: 'PE'|'Non PE';
  structureTier: 'Mono'|'Duplex'|'Triplex'|'Quadriplex';
  printMode: 'Plain'|'Printed';
  defaultLayers: Array<{
    layer_order: number;
    layer_type: 'substrate'|'ink'|'adhesive';
    materialId?: string|null;     // server translates to ref_material_key
    ref_material_key?: string;    // accepted directly if provided
    default_micron: number;
  }>;
  defaultProcesses?: Array<{ process_key: string; enabled: boolean }>;
  defaultDimensions?: Record<string, unknown>;
  displayOrder?: number;
  // Optional: clone from an existing template, used by the "Clone to platform standard" UI flow
  cloneFromTemplateId?: string;
}
```
Server actions:
1. Validate role and Zod schema.
2. Validate substrate counts and ink-vs-Plain rules (reuse existing engine validation from `createTemplateFromDefinition`).
3. For each layer carrying `materialId`, look up `materials.costingKey` and store as `ref_material_key`. Reject the layer if `costingKey` is missing.
4. Compute `templateKey = deriveStandardTemplateKey({ pebiParentPg, name, materialClass, structureType })`. Reject on conflict.
5. INSERT into `platform_standard_templates`.
6. Fan out: call `syncPlatformStandardsToTenant` for each active tenant, or simply trust per-tenant lazy sync on next read. (See "Fan-out strategy" below.)

### `PATCH /api/v1/admin/platform-templates/:id`
Edit a platform standard. Same validation as POST. Updates `updatedAt`, `updatedByUserId`. Lazy sync.

### `DELETE /api/v1/admin/platform-templates/:id`
Soft delete: sets `isActive=false`, `updatedAt`, `updatedByUserId`. Lazy sync.

### Fan-out strategy

We use **lazy sync on read**, not eager fan-out on write. Reasons:
- The tenant read path already runs `prepareTemplatesForTenant`, so the cost is paid once per tenant on first access after a platform change.
- Eager fan-out would require iterating every tenant on every admin write, which scales poorly and complicates failure recovery.
- The user-facing latency for "see new standard" is one templates-list fetch, well under one second.

For environments where eager fan-out is preferred (e.g., to surface new standards in dashboards without a templates-page visit), we add an internal helper `propagatePlatformStandardToAllTenants(templateKey)` that callers may invoke. It is not exposed as a route in v1.

## Frontend

### State and role detection

`StandardTemplates.tsx`:
```ts
const isPlatformAdmin = user?.role === 'platform_admin';
const isAdmin = isTenantAdmin(user?.role) || isPlatformAdmin;
```

### `TemplateBuilder` — "Save as platform standard" toggle

Visible only when `isPlatformAdmin`. State: `saveAsPlatformStandard: boolean`.

```
mode === 'create':
  - default false
  - if the create was launched from "Clone to platform standard…", default true
mode === 'edit', source is platform standard:
  - toggle is implicit (PATCH platform record) — show a chip "Editing platform standard"
mode === 'edit', source is tenant copy or My Template:
  - toggle behaves as create mode — saving with it on creates a new platform standard
```

On save:
```ts
if (saveAsPlatformStandard) {
  if (mode === 'edit' && template.source === 'platform') {
    await apiClient.updatePlatformTemplate(template.id, payload);
  } else {
    await apiClient.createPlatformTemplate(payload);
  }
} else {
  // today's behavior
}
```

### Card actions

`TemplateStructureCard` already supports `onEditStructure`, `onSaveToMyTemplates`. Add:
- `onCloneToPlatformStandard?: () => void` — rendered as a kebab/menu item, only when `isPlatformAdmin`.

In `StandardTemplates.tsx`:
```ts
openCloneAsPlatformStandard(source) {
  setBuilderMode('create');
  setBuilderTemplate({
    ...source,
    id: undefined,                  // new row
    name: `${source.name} (copy)`,
    isStandard: true,
  });
  setBuilderDefaultSaveAsPlatformStandard(true);
}
```

### Saved-feedback flow

After a successful platform-standard save, the page reloads templates and switches to the "Templates" (standards) tab to show the new row.

## Validation rules

Reused from `createTemplateFromDefinition`:
- substrate count matches `TIER_SUBSTRATE_COUNT[structureTier]`
- adhesive count `>=` `TIER_ADHESIVE_COUNT[structureTier]`
- ink layers disallowed when `printMode = Plain`
- `substrateFamilyAllowed` engine check on each substrate

New validation:
- For platform-standard creates: every layer carrying `materialId` must resolve to a `materials.costingKey` (translation step). Layers with `ref_material_key` provided directly bypass this lookup.
- `templateKey` uniqueness in `platform_standard_templates`.
- Role check at route entry.

## Migration plan

### Schema migration: `0007_platform_standard_templates.sql`

Idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`). Added to `drizzle/` and the `meta/_journal.json` entry.

### Bootstrap on first deploy

1. Migration creates the empty platform table.
2. Server boots; `bootstrapPlatformStandardCatalog()` populates it from `structure-templates-seed.json`.
3. First templates-list request from any tenant runs `syncPlatformStandardsToTenant`, which finds the tenant already has matching `templateKey` rows from earlier JSON-driven seeding and only updates them when `platform.updatedAt > tenant.updatedAt`. Existing rows stay put.

### Existing tenants

No data migration needed. Existing `structure_templates` rows with `isStandard=true` already have `templateKey` set by `syncTemplateKeysForTenant`. The new sync pass reconciles by key.

## Backward compatibility

- `createTemplateFromDefinition` and `createTemplateFromEstimateHandler` keep their current behavior (My Template / tenant add-on) when called without a `saveAsPlatformStandard: true` body field. Old clients keep working.
- The platform table's existence is transparent to non-admin users; their template list, instantiation, and "My Templates" flow are unchanged.
- The legacy `syncMissingStandardTemplates` is kept as a thin wrapper that calls `syncPlatformStandardsToTenant` for any callers we missed.

## Test strategy

Unit:
- `bootstrapPlatformStandardCatalog` upserts seed entries; second run is a no-op.
- `syncPlatformStandardsToTenant` adds missing copies, refreshes stale copies, deactivates removed/inactive ones, preserves orphan-by-key edge case.
- Layer translation: `materialId → costingKey` round-trip; rejects layers without `costingKey`.
- `templateKey` collision detection on create.

Integration:
- Platform admin creates a standard via `POST /api/v1/admin/platform-templates`; second tenant's templates-list read shows the new row.
- Platform admin edits an existing standard; both tenants see the update on next read.
- Tenant admin attempts `POST /api/v1/admin/platform-templates` → 403.
- Tenant admin can still edit the tenant copy via `PATCH /api/v1/templates/:id` (today's path); platform row is untouched.
- Clone-from-template flow produces a new platform row distinct from the source.

UI (manual + Playwright/Cypress where available):
- Toggle visible only for platform_admin.
- Save with toggle on routes to admin endpoint; verify success and tab switch.
- "Clone to platform standard…" prefills the builder with the source's layers and processes.

## Open questions and follow-ups

1. **Material catalog sync** — if a platform standard references a `ref_material_key` that some tenants do not have in their materials library, those tenants' copies show unresolved layers. The existing instantiation guard surfaces this clearly; whether to also notify the platform admin at publish time is a follow-up.
2. **Audit log** — Requirement 7.4 calls for warn-level logging on unauthorized attempts. A persistent audit table is out of scope; we rely on application logs for v1.
3. **Versioning** — there is no version history on platform standards in v1. Edits overwrite. If we need rollback, a `platform_standard_template_versions` table is a clean future extension.
