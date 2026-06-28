# Requirements Document

## Introduction

Estimation Studio ships with a fixed set of "standard" structure templates seeded from `structure-templates-seed.json` at tenant signup. Today, the only way to add a new platform-wide standard is to edit that JSON file in source and redeploy. Admins have no UI path to publish a new standard, and there is no path to take an existing template, adjust it, and promote it to the standard catalog.

Tenant admins can already edit and soft-delete the local copy of a standard their tenant received at signup, but the change is tenant-local. Regular users and tenant admins can save personal or tenant-scoped add-on templates to "My Templates," but those are never visible to other tenants.

This feature introduces a platform-level template catalog managed at runtime by platform admins. New standards published this way SHALL appear automatically in every tenant. Existing templates SHALL be promotable to standards through a clone-and-adjust flow. The legacy JSON seed remains the bootstrap source for the initial catalog and continues to ship with the app.

Terminology used below:
- **Platform standard** — a template defined in the platform catalog, visible to every tenant.
- **Tenant copy** — the per-tenant materialized row in `structure_templates` that resolves a platform standard's `ref_material_key`s to that tenant's `materials.id`s.
- **Tenant add-on** — a non-standard template owned by a tenant admin, scoped to that tenant.
- **My Template** — a non-standard, user-private template (today's "Save as Template" flow).

## Requirements

### Requirement 1: Platform standards source of truth

**User Story:** As a platform admin, I want platform standards stored once at the platform level, so that every tenant sees the same catalog without per-tenant duplication.

#### Acceptance Criteria
1.1. THE system SHALL maintain a platform-level table that stores each platform standard exactly once, independent of any tenant.
1.2. THE system SHALL identify each platform standard by an immutable `templateKey`, unique across the platform catalog.
1.3. THE system SHALL store layer definitions on platform standards using `ref_material_key` (canonical PEBI key) and SHALL NOT store tenant-scoped material IDs on platform rows.
1.4. WHEN the server boots, THE system SHALL upsert every entry in `structure-templates-seed.json` into the platform catalog by `templateKey`, preserving any later admin edits to the same row.
1.5. THE system SHALL preserve backward compatibility: existing tenants whose `structure_templates` rows were seeded directly from the JSON SHALL continue to function without data loss.

### Requirement 2: Tenant visibility of platform standards

**User Story:** As a user in any tenant, I want every platform standard to appear in my templates list, so that I do not depend on when my tenant was created.

#### Acceptance Criteria
2.1. WHEN a tenant requests the templates list, THE system SHALL ensure the tenant has a materialized copy in `structure_templates` for every active platform standard, identified by `templateKey`.
2.2. WHEN a platform standard's content (name, layers, processes, dimensions, ordering, classification) changes upstream, THE system SHALL refresh the corresponding tenant copy on the next read, preserving the tenant row's `id` so existing references remain valid.
2.3. WHEN a platform standard is deactivated (soft delete), THE system SHALL deactivate the corresponding tenant copies (`isActive=false`) on the next read so they no longer appear in tenant catalogs.
2.4. WHEN a new platform standard is published, THE system SHALL make it visible to every tenant within one templates-list read, without requiring tenant signup or manual sync.
2.5. WHEN a tenant's library does not contain a tenant-resolvable material for a platform standard's `ref_material_key`, THE system SHALL still create the tenant copy with the unresolved layer; the existing "unresolved layers" check at instantiation time SHALL surface the problem to the user.

### Requirement 3: Admin-create a platform standard from scratch

**User Story:** As a platform admin, I want to create a new platform standard from scratch via the UI, so that I can extend the global catalog without editing JSON and redeploying.

#### Acceptance Criteria
3.1. THE Template Builder SHALL expose a "Save as platform standard" control that is visible and operable only when the authenticated user's role is `platform_admin`.
3.2. WHEN a platform admin saves a new template with "Save as platform standard" enabled, THE system SHALL persist the template in the platform catalog as a new active standard, with a derived `templateKey` unique to the catalog.
3.3. WHEN a platform admin creates a platform standard, THE system SHALL translate every layer's selected `materialId` to its canonical `costingKey` (a.k.a. `ref_material_key`) before persisting; layers without a translatable key SHALL be rejected with a validation error that names the offending layer.
3.4. WHEN a non-platform-admin attempts to create a platform standard (via API), THE system SHALL respond with 403 and SHALL NOT create the row.
3.5. WHEN a new platform standard is saved, THE system SHALL fan out the change to all tenants so the standard appears in every tenant's templates list on the next read.

### Requirement 4: Admin-clone an existing template into a new platform standard

**User Story:** As a platform admin, I want to clone an existing template (standard, tenant add-on, or my own My Template), adjust it, and save it as a new platform standard, so that I do not start from a blank builder.

#### Acceptance Criteria
4.1. THE templates page SHALL expose a "Clone to platform standard…" action on every visible template card when the authenticated user's role is `platform_admin`.
4.2. WHEN a platform admin invokes "Clone to platform standard…" on a source template, THE Template Builder SHALL open in create mode prefilled with the source template's attributes, layers, processes, and dimensions, with a name suffix indicating a clone (e.g. "(copy)").
4.3. WHEN the platform admin saves a cloned template with "Save as platform standard" enabled, THE system SHALL persist a new platform standard distinct from the source (new `templateKey`); the source SHALL remain unchanged.
4.4. WHEN the source template has unresolved layers or layers whose `materialId` cannot be translated to a `costingKey`, THE system SHALL surface the offending layer to the admin before allowing save.

### Requirement 5: Admin-edit and admin-deactivate a platform standard

**User Story:** As a platform admin, I want to edit or deactivate an existing platform standard, so that I can correct mistakes or retire obsolete entries.

#### Acceptance Criteria
5.1. WHEN a platform admin edits a template whose source is a platform standard, THE Template Builder SHALL detect the source and SHALL offer "Save changes to platform standard" alongside the existing "Save as new template" path.
5.2. WHEN a platform admin confirms an edit to a platform standard, THE system SHALL update the platform row and refresh every tenant copy on the next read (per Requirement 2.2).
5.3. WHEN a platform admin deactivates a platform standard, THE system SHALL mark the platform row `isActive=false` and propagate the deactivation to all tenant copies (per Requirement 2.3).
5.4. WHEN a tenant admin attempts to edit a platform standard, THE system SHALL accept the change only against the tenant's local copy and SHALL NOT modify the platform row (preserving today's tenant-local edit behavior for non-platform-admins).

### Requirement 6: Tenant admin and user flows remain unchanged

**User Story:** As a tenant admin or regular user, I want my existing template flows to keep working, so that this feature does not regress my workflow.

#### Acceptance Criteria
6.1. WHEN a tenant admin saves a new template without "Save as platform standard" (which they cannot see), THE system SHALL persist a tenant add-on as today (`isStandard=false, createdByUserId=null`).
6.2. WHEN a regular user saves a new template, THE system SHALL persist a user-private My Template as today (`isStandard=false, createdByUserId=<userId>`).
6.3. WHEN any user opens the templates list, THE system SHALL return the same three buckets as today (platform standards, the tenant's add-ons, the caller's My Templates) with no visibility regressions.

### Requirement 7: Authorization and audit

**User Story:** As a platform owner, I want strict authorization and an audit trail on platform-standard changes, so that I can track who changed what.

#### Acceptance Criteria
7.1. THE system SHALL accept platform-standard create, edit, and delete operations only from authenticated users whose role is `platform_admin`.
7.2. THE system SHALL record on each platform standard the user id and timestamp of the last update.
7.3. THE system SHALL preserve a record of the original creator (user id and timestamp).
7.4. WHEN an unauthorized user calls a platform-standard endpoint, THE system SHALL respond with 403 and log the attempt at warn level with the user id, role, and route.
