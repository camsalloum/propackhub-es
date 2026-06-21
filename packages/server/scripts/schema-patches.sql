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

CREATE TABLE IF NOT EXISTS estimation_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  breakdown_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS estimation_cost_snapshots_estimate_idx ON estimation_cost_snapshots(estimate_id);

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

CREATE INDEX IF NOT EXISTS materials_substrate_family_idx ON materials(substrate_family);
CREATE INDEX IF NOT EXISTS materials_costing_key_idx ON materials(tenant_id, costing_key);

-- ---------------------------------------------------------------------------
-- Estimates
-- ---------------------------------------------------------------------------
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS source_estimation_id UUID REFERENCES estimates(id) ON DELETE SET NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS order_quantity_kg DECIMAL(12, 2);
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
