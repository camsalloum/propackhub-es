-- Estimation Studio — Initial Drizzle migration
-- Generated 2026-06-22 from packages/server/src/db/schema.ts
-- Replaces the ad-hoc db:push + schema-patches.sql workflow.
-- This file is idempotent (IF NOT EXISTS / DO NOTHING guards throughout).
-- Run on boot via runMigrations() when NODE_ENV !== 'development'.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE user_role        AS ENUM ('user','tenant_admin','platform_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE estimate_status  AS ENUM ('draft','sent','won','lost');            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE layer_type       AS ENUM ('substrate','ink','adhesive');           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE product_type     AS ENUM ('roll','sleeve','pouch');                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tenant_type      AS ENUM ('individual','company');                 EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE printing_web_class AS ENUM ('wide_web','narrow_web');              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE material_price_source AS ENUM ('excel','manual','platform');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE material_price_source ADD VALUE IF NOT EXISTS 'platform';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE platform_reference_category AS ENUM (
    'product_type','unit','rm_type','printing_web','ink_coating','adhesive','packaging','product_subtype'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE platform_reference_category ADD VALUE IF NOT EXISTS 'product_subtype'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Platform master materials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_master_materials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key             VARCHAR(128) NOT NULL UNIQUE,
  name            VARCHAR(255) NOT NULL,
  type            layer_type  NOT NULL,
  solid_percent   INTEGER     NOT NULL,
  density         DECIMAL(10,4) NOT NULL,
  cost_per_kg_usd DECIMAL(12,4) NOT NULL,
  waste_percent   INTEGER     NOT NULL DEFAULT 0,
  is_solvent_based BOOLEAN    NOT NULL DEFAULT FALSE,
  substrate_family VARCHAR(100),
  substrate_grade  VARCHAR(255),
  hoover           VARCHAR(255),
  market_price_usd DECIMAL(12,4),
  costing_key      VARCHAR(64),
  sort_order       INTEGER    NOT NULL DEFAULT 0,
  active           BOOLEAN    NOT NULL DEFAULT TRUE,
  external_id      VARCHAR(128),
  external_source  VARCHAR(64),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_master_materials_type_idx   ON platform_master_materials(type);
CREATE INDEX IF NOT EXISTS platform_master_materials_family_idx ON platform_master_materials(substrate_family);

-- ---------------------------------------------------------------------------
-- Platform reference items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_reference_items (
  id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  category    platform_reference_category NOT NULL,
  label       VARCHAR(255) NOT NULL,
  code        VARCHAR(64),
  metadata    JSONB,
  sort_order  INTEGER    NOT NULL DEFAULT 0,
  active      BOOLEAN    NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_reference_items_category_idx      ON platform_reference_items(category);
CREATE INDEX IF NOT EXISTS platform_reference_items_category_code_idx ON platform_reference_items(category, code);
CREATE UNIQUE INDEX IF NOT EXISTS platform_reference_items_category_code_uq
  ON platform_reference_items(category, code)
  WHERE code IS NOT NULL AND active = TRUE;

-- ---------------------------------------------------------------------------
-- Platform master state (singleton)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_master_state (
  id                  SMALLINT   PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  master_data_version INTEGER    NOT NULL DEFAULT 1,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO platform_master_state (id, master_data_version) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Platform master audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_master_audit_log (
  id                  UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  master_data_version INTEGER    NOT NULL,
  entity_type         VARCHAR(64) NOT NULL,
  entity_key          VARCHAR(256) NOT NULL,
  action              VARCHAR(32) NOT NULL,
  before_json         JSONB,
  after_json          JSONB,
  actor_type          VARCHAR(32),
  actor_id            VARCHAR(128),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_master_audit_log_version_idx    ON platform_master_audit_log(master_data_version);
CREATE INDEX IF NOT EXISTS platform_master_audit_log_created_at_idx ON platform_master_audit_log(created_at);

-- ---------------------------------------------------------------------------
-- Platform service keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_service_keys (
  id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash    VARCHAR(128) NOT NULL UNIQUE,
  label       VARCHAR(255) NOT NULL,
  scopes      JSONB      NOT NULL DEFAULT '["master_data:read"]'::jsonb,
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_service_keys_label_idx ON platform_service_keys(label);

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      VARCHAR(255) NOT NULL,
  type                      tenant_type NOT NULL DEFAULT 'individual',
  display_currency          VARCHAR(3)  NOT NULL DEFAULT 'USD',
  exchange_rate_usd_to_display DECIMAL(10,6) NOT NULL DEFAULT 1.0,
  exchange_rate_updated_at  TIMESTAMPTZ DEFAULT NOW(),
  use_auto_fx               BOOLEAN     DEFAULT TRUE,
  logo                      TEXT,
  primary_color             VARCHAR(7)  DEFAULT '#0F1F3D',
  terms_and_conditions      TEXT,
  footer_text               TEXT,
  default_markup_percent    DECIMAL(5,2) DEFAULT 15.00,
  default_slab_template     VARCHAR(50)  DEFAULT 'standard',
  quotation_valid_days      INTEGER     NOT NULL DEFAULT 30,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  display_name   VARCHAR(255) NOT NULL,
  role           user_role  NOT NULL DEFAULT 'user',
  visibility_profile JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_tenant_id_email_idx ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS users_tenant_id_idx       ON users(tenant_id);

-- ---------------------------------------------------------------------------
-- Categories & subcategories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  display_order INTEGER    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS categories_tenant_idx ON categories(tenant_id);

CREATE TABLE IF NOT EXISTS subcategories (
  id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id   UUID       NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  display_order INTEGER    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subcategories_tenant_idx   ON subcategories(tenant_id);
CREATE INDEX IF NOT EXISTS subcategories_category_idx ON subcategories(category_id);

-- ---------------------------------------------------------------------------
-- Materials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  id                  UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  type                layer_type NOT NULL,
  solid_percent       INTEGER    NOT NULL,
  density             DECIMAL(10,4) NOT NULL,
  cost_per_kg_usd     DECIMAL(12,4) NOT NULL,
  waste_percent       INTEGER    NOT NULL DEFAULT 0,
  is_solvent_based    BOOLEAN    DEFAULT FALSE,
  substrate_family    VARCHAR(100),
  substrate_grade     VARCHAR(255),
  hoover              VARCHAR(255),
  market_price_usd    DECIMAL(12,4),
  subcategory_id      UUID       REFERENCES subcategories(id) ON DELETE SET NULL,
  costing_key         VARCHAR(64),
  item_class          VARCHAR(64),
  price_source        material_price_source NOT NULL DEFAULT 'platform',
  is_tenant_only      BOOLEAN    NOT NULL DEFAULT FALSE,
  platform_master_key VARCHAR(128),
  platform_synced_at  TIMESTAMPTZ,
  external_id         VARCHAR(128),
  external_source     VARCHAR(64),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS materials_tenant_id_idx          ON materials(tenant_id);
CREATE INDEX IF NOT EXISTS materials_type_idx               ON materials(type);
CREATE INDEX IF NOT EXISTS materials_substrate_family_idx   ON materials(substrate_family);
CREATE INDEX IF NOT EXISTS materials_costing_key_idx        ON materials(tenant_id, costing_key);
CREATE INDEX IF NOT EXISTS materials_item_class_idx         ON materials(tenant_id, item_class);
CREATE INDEX IF NOT EXISTS materials_platform_master_key_idx ON materials(tenant_id, platform_master_key);
CREATE UNIQUE INDEX IF NOT EXISTS materials_tenant_platform_key_uq
  ON materials(tenant_id, platform_master_key)
  WHERE platform_master_key IS NOT NULL AND is_tenant_only = FALSE;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_name  VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255),
  email         VARCHAR(255),
  phone         VARCHAR(20),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers(tenant_id);

-- ---------------------------------------------------------------------------
-- Estimates  (self-referential FK — use deferred constraint)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estimates (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id                UUID        REFERENCES customers(id) ON DELETE SET NULL,
  ref_number                 VARCHAR(20) NOT NULL,
  job_name                   VARCHAR(255) NOT NULL,
  status                     estimate_status NOT NULL DEFAULT 'draft',
  product_type               product_type NOT NULL,
  product_subtype            VARCHAR(64),
  printing_web_class         printing_web_class NOT NULL DEFAULT 'wide_web',
  dimensions                 JSONB       NOT NULL,
  markup_percent             DECIMAL(5,2) NOT NULL,
  plates_per_kg              DECIMAL(12,4) NOT NULL DEFAULT 0,
  delivery_per_kg            DECIMAL(12,4) NOT NULL DEFAULT 0,
  display_currency           VARCHAR(3)  NOT NULL,
  exchange_rate_usd_to_display DECIMAL(10,6) NOT NULL,
  solvent_cost_per_kg_usd    DECIMAL(12,4),
  solvent_ratio              DECIMAL(5,4),
  order_quantity_kg          DECIMAL(12,2),
  order_quantity_unit        VARCHAR(32) DEFAULT 'kgs',
  total_gsm                  DECIMAL(12,2),
  total_micron               DECIMAL(12,2),
  material_cost_per_kg       DECIMAL(12,4),
  sale_price_per_kg          DECIMAL(12,4),
  sent_at                    TIMESTAMPTZ,
  valid_until                TIMESTAMPTZ,
  notes                      TEXT,
  source_estimation_id       UUID        REFERENCES estimates(id) ON DELETE SET NULL,
  deleted_at                 TIMESTAMPTZ,
  master_data_version        INTEGER,
  source_template_key        VARCHAR(128),
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS estimates_tenant_id_idx   ON estimates(tenant_id);
CREATE INDEX IF NOT EXISTS estimates_customer_id_idx ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS estimates_status_idx      ON estimates(status);
CREATE INDEX IF NOT EXISTS estimates_ref_number_idx  ON estimates(ref_number);
CREATE INDEX IF NOT EXISTS estimates_deleted_at_idx  ON estimates(deleted_at);
-- BUG-11: unique ref number per tenant.
-- On existing DBs there may be duplicates from the old COUNT(*)+1 race.
-- Deduplicate first (append _DUP_n suffix to older duplicates), then create the index.
DO $$
DECLARE
  dup RECORD;
  suffix_n INTEGER;
BEGIN
  -- Find all (tenant_id, ref_number) pairs that appear more than once, ordered oldest first
  FOR dup IN
    SELECT tenant_id, ref_number
    FROM estimates
    GROUP BY tenant_id, ref_number
    HAVING COUNT(*) > 1
  LOOP
    suffix_n := 2;
    -- Rename all but the newest row for this pair
    UPDATE estimates
    SET ref_number = ref_number || '_DUP_' || suffix_n::text
    WHERE id IN (
      SELECT id FROM estimates
      WHERE tenant_id = dup.tenant_id AND ref_number = dup.ref_number
      ORDER BY created_at ASC
      LIMIT 1
    );
    suffix_n := suffix_n + 1;
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS estimates_tenant_ref_uq ON estimates(tenant_id, ref_number);

-- ---------------------------------------------------------------------------
-- Estimation costs (audit snapshot)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estimation_costs (
  id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id   UUID       NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  computed_at   TIMESTAMPTZ DEFAULT NOW(),
  breakdown_json JSONB     NOT NULL
);
DROP TABLE IF EXISTS estimation_cost_snapshots;

-- ---------------------------------------------------------------------------
-- Layers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS layers (
  id              UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id     UUID       NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  material_id     UUID       NOT NULL REFERENCES materials(id),
  position        INTEGER    NOT NULL,
  micron          DECIMAL(10,2) NOT NULL,
  gsm             DECIMAL(12,4),
  cost_per_m2     DECIMAL(12,4),
  material_name   VARCHAR(255),
  material_name_snapshot     VARCHAR(255),
  unit_cost_snapshot_usd     DECIMAL(12,4),
  platform_master_key_snapshot VARCHAR(128),
  costing_key_snapshot       VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS layers_estimate_id_idx ON layers(estimate_id);
CREATE INDEX IF NOT EXISTS layers_material_id_idx ON layers(material_id);

-- ---------------------------------------------------------------------------
-- Processes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processes (
  id              UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id     UUID       NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  cost_per_hour   DECIMAL(12,4) NOT NULL,
  speed_basis     VARCHAR(20) NOT NULL,
  speed_value     DECIMAL(12,2) NOT NULL,
  setup_hours     DECIMAL(10,2) NOT NULL DEFAULT 0,
  enabled         BOOLEAN    NOT NULL DEFAULT TRUE,
  run_hours       DECIMAL(10,2),
  total_cost      DECIMAL(12,4),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS processes_estimate_id_idx ON processes(estimate_id);

-- ---------------------------------------------------------------------------
-- Slabs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slabs (
  id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id   UUID       NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  quantity_kg   DECIMAL(12,2) NOT NULL,
  price_per_kg  DECIMAL(12,4) NOT NULL,
  sort_order    INTEGER    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS slabs_estimate_id_idx ON slabs(estimate_id);

-- ---------------------------------------------------------------------------
-- Slab templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slab_templates (
  id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_key  VARCHAR(50) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  quantities    JSONB      NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS slab_templates_tenant_idx ON slab_templates(tenant_id);

-- ---------------------------------------------------------------------------
-- Proposals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals (
  id            UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  estimate_id   UUID       NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  pdf_path      VARCHAR(512),
  valid_until   TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS proposals_tenant_idx   ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS proposals_estimate_idx ON proposals(estimate_id);

-- ---------------------------------------------------------------------------
-- Activity logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID       NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  action      VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  changes     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_logs_tenant_id_idx ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx   ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);

-- ---------------------------------------------------------------------------
-- Price history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_history (
  id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID       NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  old_price   DECIMAL(12,4) NOT NULL,
  new_price   DECIMAL(12,4) NOT NULL,
  source      VARCHAR(100) NOT NULL,
  scraped_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS price_history_material_id_idx ON price_history(material_id);
CREATE INDEX IF NOT EXISTS price_history_scraped_at_idx  ON price_history(scraped_at);

-- ---------------------------------------------------------------------------
-- Structure templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS structure_templates (
  id                      UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID       NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_key            VARCHAR(128),
  external_id             VARCHAR(128),
  external_source         VARCHAR(64),
  name                    VARCHAR(255) NOT NULL,
  pebi_parent_pg          VARCHAR(255) NOT NULL,
  product_type            product_type NOT NULL,
  product_subtype         VARCHAR(64),
  material_class          VARCHAR(50),
  structure_type          VARCHAR(50),
  substrate_origin        VARCHAR(50),
  display_order           INTEGER    NOT NULL DEFAULT 0,
  is_standard             BOOLEAN    NOT NULL DEFAULT TRUE,
  default_dimensions      JSONB,
  default_layers          JSONB      NOT NULL,
  default_processes       JSONB,
  default_printing_web_class printing_web_class DEFAULT 'wide_web',
  solvent_mix_enabled     BOOLEAN    DEFAULT FALSE,
  ink_system_options      JSONB,
  substrate_options       JSONB,
  is_active               BOOLEAN    DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS structure_templates_tenant_id_idx   ON structure_templates(tenant_id);
CREATE INDEX IF NOT EXISTS structure_templates_display_order_idx ON structure_templates(display_order);
CREATE INDEX IF NOT EXISTS structure_templates_tenant_key_idx
  ON structure_templates(tenant_id, template_key)
  WHERE template_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS structure_templates_tenant_key_uq
  ON structure_templates(tenant_id, template_key)
  WHERE template_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill: mark any remaining 'excel' priced rows as 'platform'
-- (safe no-op on a fresh DB)
-- ---------------------------------------------------------------------------
UPDATE materials SET price_source = 'platform' WHERE price_source = 'excel';

-- ---------------------------------------------------------------------------
-- Sessions (Phase 2.3 — refresh token rotation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  refresh_token_hash  VARCHAR(128) NOT NULL UNIQUE,
  device_label        VARCHAR(255),
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx      ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_tenant_id_idx    ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx   ON sessions(expires_at);
