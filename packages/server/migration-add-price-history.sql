-- Migration: Add price_history table for auto-refreshed market prices

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  old_price DECIMAL(12, 4) NOT NULL,
  new_price DECIMAL(12, 4) NOT NULL,
  source VARCHAR(100) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_history_material_id_idx ON price_history (material_id);
CREATE INDEX IF NOT EXISTS price_history_scraped_at_idx ON price_history (scraped_at);