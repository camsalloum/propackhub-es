-- ---------------------------------------------------------------------------
-- 0007 — Platform Standard Templates (admin-platform-templates spec)
-- ---------------------------------------------------------------------------
-- Canonical, tenant-independent catalog of platform-wide standard templates.
-- Tenants get materialized copies in `structure_templates` via the per-tenant
-- sync pass (`syncPlatformStandardsToTenant`). Layer storage uses
-- `ref_material_key` only — never tenant-scoped material IDs.
--
-- Idempotent: safe to re-run.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "platform_standard_templates" (
  "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_key"                varchar(128) NOT NULL,
  "name"                        varchar(255) NOT NULL,
  "pebi_parent_pg"              varchar(255) NOT NULL,
  "product_type"                product_type NOT NULL,
  "product_subtype"             varchar(64),
  "material_class"              varchar(50),
  "structure_type"              varchar(50),
  "substrate_origin"            varchar(50),
  "display_order"               integer NOT NULL DEFAULT 0,
  "default_dimensions"          jsonb,
  "default_layers"              jsonb NOT NULL,
  "default_processes"           jsonb,
  "default_printing_web_class"  printing_web_class DEFAULT 'wide_web',
  "solvent_mix_enabled"         boolean DEFAULT false,
  "ink_system_options"          jsonb,
  "substrate_options"           jsonb,
  "is_active"                   boolean NOT NULL DEFAULT true,
  "created_by_user_id"          uuid,
  "updated_by_user_id"          uuid,
  "created_at"                  timestamptz DEFAULT now(),
  "updated_at"                  timestamptz DEFAULT now()
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_standard_templates_template_key_uq"
  ON "platform_standard_templates" ("template_key");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_standard_templates_template_key_idx"
  ON "platform_standard_templates" ("template_key");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_standard_templates_display_order_idx"
  ON "platform_standard_templates" ("display_order");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_standard_templates_is_active_idx"
  ON "platform_standard_templates" ("is_active");

--> statement-breakpoint
COMMENT ON TABLE "platform_standard_templates" IS
  'Tenant-independent catalog of platform-wide standard templates. Source of truth for the global standards visible to every tenant via materialized copies in structure_templates.';
