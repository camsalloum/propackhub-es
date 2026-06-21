-- Migration: Align all tables with Drizzle schema
-- Run with: node run-migration.cjs

BEGIN;

-- ============================================================
-- 1. ENUMS — create if not exist
-- ============================================================
DO $$ BEGIN
    CREATE TYPE layer_type AS ENUM ('substrate', 'ink', 'adhesive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('roll', 'sleeve', 'pouch');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE printing_web_class AS ENUM ('wide_web', 'narrow_web');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tenant_type AS ENUM ('individual', 'company');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'tenant_admin', 'platform_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. TENANTS — drop old columns, convert type to enum
-- ============================================================
ALTER TABLE tenants DROP COLUMN IF EXISTS logo_url;
ALTER TABLE tenants DROP COLUMN IF EXISTS brand_primary_color;
ALTER TABLE tenants DROP COLUMN IF EXISTS brand_secondary_color;

UPDATE tenants SET type = 'individual' WHERE type NOT IN ('individual', 'company') OR type IS NULL;
ALTER TABLE tenants ALTER COLUMN type DROP DEFAULT;
ALTER TABLE tenants ALTER COLUMN type TYPE tenant_type USING type::tenant_type;
ALTER TABLE tenants ALTER COLUMN type SET DEFAULT 'individual'::tenant_type;
ALTER TABLE tenants ALTER COLUMN type SET NOT NULL;

-- ============================================================
-- 3. USERS — visibility_profile: varchar → jsonb, role → enum
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS visibility_profile_new jsonb;
UPDATE users SET visibility_profile_new = 
  CASE 
    WHEN visibility_profile IS NULL OR visibility_profile = '' THEN '{}'::jsonb
    WHEN visibility_profile = 'all' THEN '{"level":"all"}'::jsonb
    WHEN visibility_profile = 'limited' THEN '{"level":"limited"}'::jsonb
    WHEN visibility_profile = 'sales_rep' THEN '{"level":"sales_rep"}'::jsonb
    ELSE '{}'::jsonb
  END;
ALTER TABLE users DROP COLUMN IF EXISTS visibility_profile;
ALTER TABLE users RENAME COLUMN visibility_profile_new TO visibility_profile;

UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'tenant_admin', 'platform_admin');
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'::user_role;

-- ============================================================
-- 4. MATERIALS — material_type → type (enum), drop notes/is_active
-- ============================================================
ALTER TABLE materials ADD COLUMN IF NOT EXISTS type layer_type NOT NULL DEFAULT 'substrate';
UPDATE materials SET type = CASE 
  WHEN material_type = 'substrate' THEN 'substrate'::layer_type
  WHEN material_type = 'ink' THEN 'ink'::layer_type
  WHEN material_type = 'adhesive' THEN 'adhesive'::layer_type
  ELSE 'substrate'::layer_type
END;
ALTER TABLE materials DROP COLUMN IF EXISTS material_type;
ALTER TABLE materials DROP COLUMN IF EXISTS notes;
ALTER TABLE materials DROP COLUMN IF EXISTS is_active;

-- ============================================================
-- 5. LAYERS — cost_per_sqm_usd → cost_per_m2, add updated_at
-- ============================================================
ALTER TABLE layers ADD COLUMN IF NOT EXISTS cost_per_m2 NUMERIC(12,4);
UPDATE layers SET cost_per_m2 = cost_per_sqm_usd WHERE cost_per_m2 IS NULL AND cost_per_sqm_usd IS NOT NULL;
ALTER TABLE layers DROP COLUMN IF EXISTS cost_per_sqm_usd;
ALTER TABLE layers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- 6. PROCESSES — rename columns, add missing
-- ============================================================
ALTER TABLE processes ADD COLUMN IF NOT EXISTS name VARCHAR(255);
UPDATE processes SET name = process_name WHERE name IS NULL;
ALTER TABLE processes DROP COLUMN IF EXISTS process_name;

ALTER TABLE processes ADD COLUMN IF NOT EXISTS cost_per_hour NUMERIC(12,4);
UPDATE processes SET cost_per_hour = cost_per_hour_usd WHERE cost_per_hour IS NULL AND cost_per_hour_usd IS NOT NULL;
ALTER TABLE processes DROP COLUMN IF EXISTS cost_per_hour_usd;

ALTER TABLE processes ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12,4);
UPDATE processes SET total_cost = total_cost_usd WHERE total_cost IS NULL AND total_cost_usd IS NOT NULL;
ALTER TABLE processes DROP COLUMN IF EXISTS total_cost_usd;

ALTER TABLE processes ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE processes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- 7. SLABS — fix columns
-- ============================================================
ALTER TABLE slabs ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(12,4);
UPDATE slabs SET price_per_kg = unit_price_display WHERE price_per_kg IS NULL AND unit_price_display IS NOT NULL;
ALTER TABLE slabs DROP COLUMN IF EXISTS unit_price_display;
ALTER TABLE slabs DROP COLUMN IF EXISTS total_price_display;
ALTER TABLE slabs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- 8. ACTIVITY_LOGS — details → changes, add updated_at
-- ============================================================
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS changes jsonb;
UPDATE activity_logs SET changes = details WHERE changes IS NULL AND details IS NOT NULL;
ALTER TABLE activity_logs DROP COLUMN IF EXISTS details;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- 9. ESTIMATES — convert status, product_type, printing_web_class to enums
-- ============================================================
UPDATE estimates SET status = 'draft' WHERE status NOT IN ('draft', 'sent', 'won', 'lost');
ALTER TABLE estimates ALTER COLUMN status DROP DEFAULT;
ALTER TABLE estimates ALTER COLUMN status TYPE estimate_status USING status::estimate_status;
ALTER TABLE estimates ALTER COLUMN status SET DEFAULT 'draft'::estimate_status;

UPDATE estimates SET product_type = 'roll' WHERE product_type NOT IN ('roll', 'sleeve', 'pouch');
ALTER TABLE estimates ALTER COLUMN product_type DROP DEFAULT;
ALTER TABLE estimates ALTER COLUMN product_type TYPE product_type USING product_type::product_type;
ALTER TABLE estimates ALTER COLUMN product_type SET DEFAULT 'roll'::product_type;

UPDATE estimates SET printing_web_class = 'wide_web' WHERE printing_web_class NOT IN ('wide_web', 'narrow_web');
ALTER TABLE estimates ALTER COLUMN printing_web_class DROP DEFAULT;
ALTER TABLE estimates ALTER COLUMN printing_web_class TYPE printing_web_class USING printing_web_class::printing_web_class;
ALTER TABLE estimates ALTER COLUMN printing_web_class SET DEFAULT 'wide_web'::printing_web_class;

-- ============================================================
-- 10. Create structure_templates table (missing)
-- ============================================================
CREATE TABLE IF NOT EXISTS structure_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  pebi_parent_pg VARCHAR(255) NOT NULL,
  product_type product_type NOT NULL,
  material_class VARCHAR(50),
  structure_type VARCHAR(50),
  substrate_origin VARCHAR(50),
  display_order INTEGER NOT NULL DEFAULT 0,
  default_dimensions JSONB,
  default_layers JSONB NOT NULL,
  default_processes JSONB,
  default_printing_web_class printing_web_class DEFAULT 'wide_web',
  solvent_mix_enabled BOOLEAN DEFAULT false,
  ink_system_options JSONB,
  substrate_options JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS structure_templates_tenant_id_idx ON structure_templates(tenant_id);
CREATE INDEX IF NOT EXISTS structure_templates_display_order_idx ON structure_templates(display_order);

COMMIT;