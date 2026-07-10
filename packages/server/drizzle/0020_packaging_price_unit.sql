-- Packaging UOM: PB prices per kg / m / roll / pc (not always $/kg).
ALTER TABLE platform_master_materials
  ADD COLUMN IF NOT EXISTS price_unit varchar(16),
  ADD COLUMN IF NOT EXISTS unit_price_usd numeric(12, 4);

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS price_unit varchar(16),
  ADD COLUMN IF NOT EXISTS unit_price_usd numeric(12, 4);
