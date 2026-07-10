-- Sleeve seaming solvent coat weight (g/m²) on estimates
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS sleeve_seaming_solvent_gsm DECIMAL(12, 4) DEFAULT 0.25;
