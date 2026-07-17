-- Consumables config on estimates (qty/unit overrides for mounting tape + other).
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS consumables_config jsonb;
