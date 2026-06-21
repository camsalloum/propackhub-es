-- Migration: Add substrate fields to materials table
-- Source: Substrates Master.xlsx

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS substrate_family VARCHAR(100),
  ADD COLUMN IF NOT EXISTS substrate_grade VARCHAR(255),
  ADD COLUMN IF NOT EXISTS hoover VARCHAR(255),
  ADD COLUMN IF NOT EXISTS market_price_usd DECIMAL(12, 4);

-- Index for family filtering
CREATE INDEX IF NOT EXISTS materials_substrate_family_idx ON materials (substrate_family);

-- Reset waste_percent to 0 for all existing materials (no waste % per spec)
UPDATE materials SET waste_percent = 0 WHERE waste_percent != 0;
