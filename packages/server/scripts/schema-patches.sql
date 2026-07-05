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
-- Do NOT mass-update company tenants here. That ran once as a backfill and must not
-- re-run on every db:patch (RUN-ES / startup) — it overwrote Settings → M&O choices.
-- New tenants get the method at registration (company → process_per_kg, individual → markup_over_rm).
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
-- Manufacturing & Operating method 3 (2026-07-03) — fixed CoRM per template.
-- The `fixed_per_group` enum value is added by apply-schema-patches.ts (enum
-- values must commit before use). The CoRM (USD/kg) is stored PER TEMPLATE
-- on `platform_standard_templates.corm_per_kg_usd` (and mirrored to each
-- tenant's `structure_templates.corm_per_kg_usd` by `syncPlatformStandardsToTenant`).
-- Per-template (not per product group) so the admin can tune CoRM
-- independently for each laminate stack.
-- ---------------------------------------------------------------------------
ALTER TABLE platform_standard_templates
  ADD COLUMN IF NOT EXISTS corm_per_kg_usd DECIMAL(12, 4);

ALTER TABLE structure_templates
  ADD COLUMN IF NOT EXISTS corm_per_kg_usd DECIMAL(12, 4);

-- Per-estimate CoRM snapshot (display currency per kg; legacy column name).
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS corm_per_kg_usd DECIMAL(12, 4);

-- CoRM Plain + MOQ + scale-with-waste (2026-07-04).
ALTER TABLE platform_master_state
  ADD COLUMN IF NOT EXISTS corm_scale_with_waste DECIMAL(6, 3) DEFAULT 1;
ALTER TABLE platform_standard_templates
  ADD COLUMN IF NOT EXISTS corm_per_kg_plain DECIMAL(12, 4);
ALTER TABLE platform_standard_templates
  ADD COLUMN IF NOT EXISTS moq_kg DECIMAL(12, 2);
ALTER TABLE structure_templates
  ADD COLUMN IF NOT EXISTS corm_per_kg_plain DECIMAL(12, 4);
ALTER TABLE structure_templates
  ADD COLUMN IF NOT EXISTS moq_kg DECIMAL(12, 2);
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS corm_per_kg_plain DECIMAL(12, 4);
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS moq_kg DECIMAL(12, 2);

-- Commercial Items are Bags (not Pouches). Fix legacy bag→pouch collapse.
UPDATE platform_standard_templates
SET
  product_type = 'bag',
  default_processes = REPLACE(default_processes::text, '"pouch_making"', '"bag_making"')::jsonb,
  updated_at = NOW()
WHERE product_type = 'pouch'
  AND (
    name ILIKE 'Commercial Items%'
    OR pebi_parent_pg ILIKE 'Commercial Items%'
  );

UPDATE structure_templates
SET
  product_type = 'bag',
  default_processes = REPLACE(default_processes::text, '"pouch_making"', '"bag_making"')::jsonb,
  updated_at = NOW()
WHERE product_type = 'pouch'
  AND is_standard = true
  AND (
    name ILIKE 'Commercial Items%'
    OR pebi_parent_pg ILIKE 'Commercial Items%'
  );

-- ---------------------------------------------------------------------------
-- Multi-SKU quotes (Phase 1 — commercial container)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  ref_number VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  default_brand VARCHAR(255),
  salesperson_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  display_currency VARCHAR(3) NOT NULL,
  exchange_rate_usd_to_display DECIMAL(10, 6) NOT NULL,
  valid_until TIMESTAMPTZ,
  delivery_term VARCHAR(32),
  payment_terms VARCHAR(255),
  remarks TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  default_print_color_count INTEGER,
  default_cost_per_color DECIMAL(12, 4),
  default_tooling_billing_mode VARCHAR(16),
  rfq_id UUID,
  supersedes_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  approval_status VARCHAR(32),
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  customer_po VARCHAR(128),
  expected_order_at DATE,
  opportunity_probability INTEGER,
  lost_reason TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quotes_tenant_id_idx ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS quotes_customer_id_idx ON quotes(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS quotes_tenant_ref_idx ON quotes(tenant_id, ref_number);
CREATE INDEX IF NOT EXISTS quotes_deleted_at_idx ON quotes(deleted_at);

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sku_label VARCHAR(255);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS specs_code VARCHAR(64);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS print_color_count INTEGER;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS cost_per_color DECIMAL(12, 4);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tooling_billing_mode VARCHAR(16);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tooling_scenario VARCHAR(16) DEFAULT 'new';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS billable_color_count INTEGER;
UPDATE estimates SET tooling_scenario = 'new' WHERE tooling_scenario IS NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS copied_from_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS estimates_quote_id_idx ON estimates(quote_id);

-- Idempotent backfill: one quote per orphan estimate
DO $$
DECLARE
  est RECORD;
  new_quote_id UUID;
  pkg_ref TEXT;
  yr INT;
  seq INT;
  quote_status TEXT;
BEGIN
  FOR est IN
    SELECT *
    FROM estimates
    WHERE quote_id IS NULL
      AND deleted_at IS NULL
    ORDER BY created_at ASC
  LOOP
    yr := EXTRACT(YEAR FROM COALESCE(est.created_at, NOW()))::INT;
    SELECT COUNT(*)::INT + 1 INTO seq
    FROM quotes
    WHERE tenant_id = est.tenant_id
      AND deleted_at IS NULL
      AND EXTRACT(YEAR FROM created_at) = yr;

    pkg_ref := 'PKG-' || yr::TEXT || '-' || LPAD(seq::TEXT, 5, '0');

    WHILE EXISTS (
      SELECT 1 FROM quotes
      WHERE tenant_id = est.tenant_id AND ref_number = pkg_ref
    ) LOOP
      seq := seq + 1;
      pkg_ref := 'PKG-' || yr::TEXT || '-' || LPAD(seq::TEXT, 5, '0');
    END LOOP;

    quote_status := CASE est.status::TEXT
      WHEN 'sent' THEN 'sent'
      WHEN 'won' THEN 'saved'
      WHEN 'lost' THEN 'archived'
      ELSE 'draft'
    END;

    INSERT INTO quotes (
      id, tenant_id, customer_id, name, ref_number, status,
      display_currency, exchange_rate_usd_to_display, delivery_term,
      valid_until, sent_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      est.tenant_id,
      est.customer_id,
      COALESCE(NULLIF(TRIM(est.job_name), ''), est.ref_number),
      pkg_ref,
      quote_status,
      est.display_currency,
      est.exchange_rate_usd_to_display,
      est.delivery_term,
      est.valid_until,
      est.sent_at,
      est.created_at,
      est.updated_at
    )
    RETURNING id INTO new_quote_id;

    UPDATE estimates
    SET
      quote_id = new_quote_id,
      sort_order = 0,
      sku_label = COALESCE(sku_label, job_name)
    WHERE id = est.id;
  END LOOP;
END $$;

-- Active estimates must belong to a quote (Phase 2). Soft-deleted rows may lack quote_id.
DO $$ BEGIN
  ALTER TABLE estimates
    ADD CONSTRAINT estimates_quote_id_required_when_active
    CHECK (deleted_at IS NOT NULL OR quote_id IS NOT NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Sessions (refresh-token rotation) — Phase 2.3
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(128) NOT NULL UNIQUE,
  device_label VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_tenant_id_idx ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- Price-check quotes folder (2026-07-05)
DO $$ BEGIN
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_price_check boolean NOT NULL DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

UPDATE quotes
SET is_price_check = true
WHERE customer_id IS NULL
  AND deleted_at IS NULL
  AND (name ILIKE 'price check%' OR name = 'Price check');

CREATE INDEX IF NOT EXISTS quotes_price_check_idx ON quotes (tenant_id, is_price_check)
  WHERE deleted_at IS NULL AND is_price_check = true;

-- Process table modern columns (process_key, process_quantity, cost_per_kg_usd)
ALTER TABLE processes ADD COLUMN IF NOT EXISTS process_key VARCHAR(255);
ALTER TABLE processes ADD COLUMN IF NOT EXISTS process_quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS cost_per_kg_usd DECIMAL(12, 4) NOT NULL DEFAULT 0;
UPDATE processes
SET process_key = LOWER(REPLACE(TRIM(name), ' ', '_'))
WHERE process_key IS NULL;

-- Optional customer RFQ reference on quotes (2026-07-05)
DO $$ BEGIN
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rfq_number varchar(128);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS quotes_rfq_number_idx ON quotes (tenant_id, rfq_number)
  WHERE deleted_at IS NULL AND rfq_number IS NOT NULL;

