-- Estimation Studio — idempotent schema patches (safe to re-run)
-- Applied after drizzle-kit push on fresh installs and on existing databases.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE material_price_source AS ENUM ('excel', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'individual';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS exchange_rate_updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS use_auto_fx BOOLEAN DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#0F1F3D';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_markup_percent DECIMAL(5, 2) DEFAULT 15.00;
-- Manufacturing & Operating cost method (company → process_per_kg, individual → markup_over_rm).
DO $$ BEGIN
  CREATE TYPE operating_cost_method AS ENUM ('process_per_kg', 'markup_over_rm');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS operating_cost_method operating_cost_method NOT NULL DEFAULT 'markup_over_rm';
-- Backfill: company tenants default to per-kg process costing.
UPDATE tenants SET operating_cost_method = 'process_per_kg' WHERE type = 'company';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_slab_template VARCHAR(50) DEFAULT 'standard';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_valid_days INTEGER NOT NULL DEFAULT 30;

-- ---------------------------------------------------------------------------
-- Phase 2 tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS categories_tenant_idx ON categories(tenant_id);

CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subcategories_tenant_idx ON subcategories(tenant_id);
CREATE INDEX IF NOT EXISTS subcategories_category_idx ON subcategories(category_id);

CREATE TABLE IF NOT EXISTS slab_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_key VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantities JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS slab_templates_tenant_idx ON slab_templates(tenant_id);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  pdf_path VARCHAR(512),
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS proposals_tenant_idx ON proposals(tenant_id);
CREATE INDEX IF NOT EXISTS proposals_estimate_idx ON proposals(estimate_id);

CREATE TABLE IF NOT EXISTS estimation_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  breakdown_json JSONB NOT NULL
);

-- Dead duplicate removed (MES_READY §3.6) — canonical table is estimation_costs
DROP TABLE IF EXISTS estimation_cost_snapshots;

-- ---------------------------------------------------------------------------
-- Materials — substrate fields + taxonomy + template linking
-- ---------------------------------------------------------------------------
ALTER TABLE materials ADD COLUMN IF NOT EXISTS substrate_family VARCHAR(100);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS substrate_grade VARCHAR(255);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS hoover VARCHAR(255);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS market_price_usd DECIMAL(12, 4);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS costing_key VARCHAR(64);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_tenant_only BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
  ALTER TABLE materials ADD COLUMN price_source material_price_source NOT NULL DEFAULT 'excel';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE material_price_source ADD VALUE IF NOT EXISTS 'platform';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Note: UPDATE materials SET price_source = 'platform' WHERE price_source = 'excel'
-- runs in apply-schema-patches.ts after this file (PG requires enum commit first).

CREATE INDEX IF NOT EXISTS materials_substrate_family_idx ON materials(substrate_family);
CREATE INDEX IF NOT EXISTS materials_costing_key_idx ON materials(tenant_id, costing_key);

-- MES Phase A — platform ↔ tenant hard lineage
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_master_key VARCHAR(128);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_synced_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS materials_platform_master_key_idx
  ON materials(tenant_id, platform_master_key)
  WHERE platform_master_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS materials_tenant_platform_key_uq
  ON materials(tenant_id, platform_master_key)
  WHERE platform_master_key IS NOT NULL AND is_tenant_only = FALSE;

-- MES Phase B — master catalog version + estimate/layer lineage
CREATE TABLE IF NOT EXISTS platform_master_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  master_data_version INTEGER NOT NULL DEFAULT 1,
  waste_bands JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO platform_master_state (id, master_data_version)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;
-- Waste bands column added post-seed; idempotent for existing installs.
ALTER TABLE platform_master_state ADD COLUMN IF NOT EXISTS waste_bands JSONB;

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS master_data_version INTEGER;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS source_template_key VARCHAR(128);

ALTER TABLE layers ADD COLUMN IF NOT EXISTS platform_master_key_snapshot VARCHAR(128);
ALTER TABLE layers ADD COLUMN IF NOT EXISTS costing_key_snapshot VARCHAR(64);

-- MES Phase C — item_class + price_source platform
ALTER TABLE materials ADD COLUMN IF NOT EXISTS item_class VARCHAR(64);
CREATE INDEX IF NOT EXISTS materials_item_class_idx ON materials(tenant_id, item_class);

-- MES Phase D — structure template stable keys
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS template_key VARCHAR(128);
CREATE INDEX IF NOT EXISTS structure_templates_tenant_key_idx
  ON structure_templates(tenant_id, template_key)
  WHERE template_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS structure_templates_tenant_key_uq
  ON structure_templates(tenant_id, template_key)
  WHERE template_key IS NOT NULL;

-- MES Phase E — audit log, service keys, external identity
CREATE TABLE IF NOT EXISTS platform_master_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_data_version INTEGER NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_key VARCHAR(256) NOT NULL,
  action VARCHAR(32) NOT NULL,
  before_json JSONB,
  after_json JSONB,
  actor_type VARCHAR(32),
  actor_id VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_master_audit_log_version_idx
  ON platform_master_audit_log(master_data_version);
CREATE INDEX IF NOT EXISTS platform_master_audit_log_created_at_idx
  ON platform_master_audit_log(created_at);

CREATE TABLE IF NOT EXISTS platform_service_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(128) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["master_data:read"]'::jsonb,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_service_keys_label_idx ON platform_service_keys(label);

ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS external_source VARCHAR(64);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS external_source VARCHAR(64);
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS external_source VARCHAR(64);

-- MES Phase C — unique reference codes per category (active rows)
CREATE UNIQUE INDEX IF NOT EXISTS platform_reference_items_category_code_uq
  ON platform_reference_items(category, code)
  WHERE code IS NOT NULL AND active = TRUE;

-- ---------------------------------------------------------------------------
-- Estimates
-- ---------------------------------------------------------------------------
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS source_estimation_id UUID REFERENCES estimates(id) ON DELETE SET NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS order_quantity_kg DECIMAL(12, 2);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS order_quantity_unit VARCHAR(32) DEFAULT 'kgs';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS solvent_cost_per_kg_usd DECIMAL(12, 4);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS solvent_ratio DECIMAL(5, 4);
CREATE INDEX IF NOT EXISTS estimates_deleted_at_idx ON estimates(deleted_at);

-- ---------------------------------------------------------------------------
-- Layers — re-quote snapshots
-- ---------------------------------------------------------------------------
ALTER TABLE layers ADD COLUMN IF NOT EXISTS material_name VARCHAR(255);
ALTER TABLE layers ADD COLUMN IF NOT EXISTS material_name_snapshot VARCHAR(255);
ALTER TABLE layers ADD COLUMN IF NOT EXISTS unit_cost_snapshot_usd DECIMAL(12, 4);

-- ---------------------------------------------------------------------------
-- Slabs
-- ---------------------------------------------------------------------------
ALTER TABLE slabs ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Structure templates
-- ---------------------------------------------------------------------------
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS is_standard BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- Platform master data (in-app source of truth — replaces Excel workbook)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE platform_reference_category AS ENUM (
    'product_type',
    'unit',
    'rm_type',
    'printing_web',
    'ink_coating',
    'adhesive',
    'packaging'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS platform_master_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type layer_type NOT NULL,
  solid_percent INTEGER NOT NULL,
  density DECIMAL(10, 4) NOT NULL,
  cost_per_kg_usd DECIMAL(12, 4) NOT NULL,
  waste_percent INTEGER NOT NULL DEFAULT 0,
  is_solvent_based BOOLEAN NOT NULL DEFAULT FALSE,
  substrate_family VARCHAR(100),
  substrate_grade VARCHAR(255),
  hoover VARCHAR(255),
  market_price_usd DECIMAL(12, 4),
  costing_key VARCHAR(64),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_master_materials_type_idx ON platform_master_materials(type);
CREATE INDEX IF NOT EXISTS platform_master_materials_family_idx ON platform_master_materials(substrate_family);

CREATE TABLE IF NOT EXISTS platform_reference_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category platform_reference_category NOT NULL,
  label VARCHAR(255) NOT NULL,
  code VARCHAR(64),
  metadata JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_reference_items_category_idx ON platform_reference_items(category);
CREATE INDEX IF NOT EXISTS platform_reference_items_category_code_idx ON platform_reference_items(category, code);

-- ---------------------------------------------------------------------------
-- Bag vs Pouch product kinds + subtypes (2026-06-21)
-- product_type stays the engine costing code (roll/sleeve/pouch); product_subtype
-- stores the UI kind + subtype, e.g. 'pouch_stand_up', 'bag_wicket'. Bag costs via
-- the pouch path (see packages/web/src/lib/productCatalog.ts).
-- ---------------------------------------------------------------------------
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS product_subtype VARCHAR(64);
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS product_subtype VARCHAR(64);

-- Allow the platform reference list to manage product subtypes from Master Data.
DO $$ BEGIN
  ALTER TYPE platform_reference_category ADD VALUE IF NOT EXISTS 'product_subtype';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Pricing model v2 (2026-06-30) — quantity-band waste + lump-sum tooling/
-- delivery (amortized over order qty) + margin (markup % OR fixed USD/kg).
-- All monetary values are USD base. Legacy estimates (pricing_method NULL) keep
-- the old additive model.
-- ---------------------------------------------------------------------------
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(20);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS margin_value_per_kg_usd DECIMAL(12, 4);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tooling_charge_usd DECIMAL(12, 2);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tooling_billed_to_customer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS delivery_term VARCHAR(32);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS delivery_charge_usd DECIMAL(12, 2);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS structure_forked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS processes_customized BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS structure_signature VARCHAR(128);

-- Product group (= template) margin over raw material, in USD/kg. Admin sets it
-- on the template; estimates default their margin/kg from it.
ALTER TABLE structure_templates ADD COLUMN IF NOT EXISTS margin_over_rm_per_kg_usd DECIMAL(12, 4);

-- Per-user pricing method, decided by the owner/group manager. Defaults to markup.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(20) NOT NULL DEFAULT 'markup';

-- Editable per-estimate waste bands (quantity ranges + waste %). Defaults are
-- seeded in the engine; this stores admin/manager edits.
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS waste_bands JSONB;

-- ---------------------------------------------------------------------------
-- Manufacturing & Operating method 3 (2026-07-03) — fixed CoRM per product group.
-- The `fixed_per_group` enum value is added by apply-schema-patches.ts (enum
-- values must commit before use). This table stores the per-product-group CoRM
-- (USD/kg) used as the Manufacturing & Operating figure for that method.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_product_group_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pebi_parent_pg VARCHAR(255) NOT NULL UNIQUE,
  corm_per_kg_usd DECIMAL(12, 4) NOT NULL DEFAULT 0,
  updated_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_product_group_settings_pg_idx
  ON platform_product_group_settings (pebi_parent_pg);

-- Seed a 0 CoRM row for every product group currently present in the catalog
-- (platform standards + tenant templates), so the admin page lists them all.
INSERT INTO platform_product_group_settings (pebi_parent_pg, corm_per_kg_usd)
SELECT DISTINCT pebi_parent_pg, 0
FROM (
  SELECT pebi_parent_pg FROM platform_standard_templates WHERE pebi_parent_pg IS NOT NULL
  UNION
  SELECT pebi_parent_pg FROM structure_templates WHERE pebi_parent_pg IS NOT NULL
) g
ON CONFLICT (pebi_parent_pg) DO NOTHING;

