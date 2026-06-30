-- Pouch accessories: per-metre / per-piece pricing + weight for zipper, spout,
-- valve, handle, window. Films/inks/adhesives keep using cost_per_kg_usd; these
-- columns are nullable and only populated for accessory rows (item_class='accessory').
-- NOTE: the `accessory` value on the layer_type enum is added separately in
-- 0009 — `ALTER TYPE ... ADD VALUE` must run as its own single statement (it does
-- not take effect when batched with other DDL in one transactional migration).

ALTER TABLE materials ADD COLUMN IF NOT EXISTS cost_per_meter_usd  DECIMAL(12,4);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cost_per_piece_usd  DECIMAL(12,4);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS weight_g_per_meter  DECIMAL(10,4);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS weight_g_per_piece  DECIMAL(10,4);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS accessory_kind      VARCHAR(32);

ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS cost_per_meter_usd  DECIMAL(12,4);
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS cost_per_piece_usd  DECIMAL(12,4);
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS weight_g_per_meter  DECIMAL(10,4);
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS weight_g_per_piece  DECIMAL(10,4);
ALTER TABLE platform_master_materials ADD COLUMN IF NOT EXISTS accessory_kind      VARCHAR(32);

CREATE INDEX IF NOT EXISTS materials_accessory_kind_idx ON materials (accessory_kind);
