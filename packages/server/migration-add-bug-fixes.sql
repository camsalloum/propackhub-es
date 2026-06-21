-- Migration: Add missing fields for bug fixes
-- Date: 2026-06-15

-- Bug 5: Add is_solvent_based flag to materials
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS is_solvent_based BOOLEAN DEFAULT false;

-- Bug 4 & 6: Add solvent config and order quantity to estimates
ALTER TABLE estimates
ADD COLUMN IF NOT EXISTS solvent_cost_per_kg_usd DECIMAL(12, 4),
ADD COLUMN IF NOT EXISTS solvent_ratio DECIMAL(5, 4),
ADD COLUMN IF NOT EXISTS order_quantity_kg DECIMAL(12, 2);

-- Bug 1: Rename materialCostPerKgUsd to materialCostPerKg
ALTER TABLE estimates
RENAME COLUMN material_cost_per_kg_usd TO material_cost_per_kg;

-- Update existing SB materials to set is_solvent_based = true
UPDATE materials 
SET is_solvent_based = true 
WHERE (type = 'ink' OR type = 'adhesive') 
  AND name ILIKE '%SB%';

COMMENT ON COLUMN materials.is_solvent_based IS 'True for solvent-based ink/adhesive (replaces name pattern matching)';
COMMENT ON COLUMN estimates.solvent_cost_per_kg_usd IS 'Cost per kg of solvent in USD for SB layers (default: 2.0)';
COMMENT ON COLUMN estimates.solvent_ratio IS 'Solvent mix ratio 0-1 (default: 0.5)';
COMMENT ON COLUMN estimates.order_quantity_kg IS 'Order quantity in kg for process cost calculation';
