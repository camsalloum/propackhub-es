-- Lamination adhesive recipes (GP/MP/HP) + per-estimate overrides
ALTER TABLE platform_master_materials
  ADD COLUMN IF NOT EXISTS lamination_recipe JSONB;

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS lamination_recipe JSONB;

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS lamination_recipe_overrides JSONB,
  ADD COLUMN IF NOT EXISTS cleaning_solvent_kg_per_job DECIMAL(12, 4) DEFAULT 20;
