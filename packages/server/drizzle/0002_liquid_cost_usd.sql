-- Add liquid_cost_usd to platform_master_materials
-- Stores the user-entered liquid ink/adhesive price to avoid floating-point round-trip errors
ALTER TABLE platform_master_materials
  ADD COLUMN IF NOT EXISTS liquid_cost_usd NUMERIC(12, 2);

-- Backfill: for existing rows where solid_percent < 100, derive liquid cost from stored dry cost
UPDATE platform_master_materials
SET liquid_cost_usd = ROUND((cost_per_kg_usd * solid_percent / 100.0)::NUMERIC, 2)
WHERE solid_percent > 0 AND solid_percent < 100
  AND liquid_cost_usd IS NULL;

-- For 100% solid rows, liquid = dry
UPDATE platform_master_materials
SET liquid_cost_usd = ROUND(cost_per_kg_usd::NUMERIC, 2)
WHERE solid_percent = 100
  AND liquid_cost_usd IS NULL;
