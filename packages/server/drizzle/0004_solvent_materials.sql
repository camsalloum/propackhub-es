-- Solvent catalog: new layer_type value + estimate solvent material FK
ALTER TYPE layer_type ADD VALUE IF NOT EXISTS 'solvent';

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS solvent_material_id UUID REFERENCES materials(id) ON DELETE SET NULL;
