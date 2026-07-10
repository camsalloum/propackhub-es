-- Packaging config on estimates (load/pallet, cartons/pallet, material picks).
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS packaging_config jsonb;
