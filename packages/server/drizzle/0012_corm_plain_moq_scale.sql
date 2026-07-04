-- CoRM Printed/Plain + MOQ per template; CoRM scales with waste (platform factor).

ALTER TABLE platform_master_state
  ADD COLUMN IF NOT EXISTS corm_scale_with_waste DECIMAL(6, 3) DEFAULT 1;

ALTER TABLE platform_standard_templates
  ADD COLUMN IF NOT EXISTS corm_per_kg_plain DECIMAL(12, 4);

ALTER TABLE platform_standard_templates
  ADD COLUMN IF NOT EXISTS moq_kg DECIMAL(12, 2);

ALTER TABLE structure_templates
  ADD COLUMN IF NOT EXISTS corm_per_kg_plain DECIMAL(12, 4);

ALTER TABLE structure_templates
  ADD COLUMN IF NOT EXISTS moq_kg DECIMAL(12, 2);

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS corm_per_kg_plain DECIMAL(12, 4);

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS moq_kg DECIMAL(12, 2);

-- Backfill Plain CoRM = 50% of Printed where Printed is set and Plain is null.
UPDATE platform_standard_templates
SET corm_per_kg_plain = ROUND((corm_per_kg_usd::numeric * 0.5), 4)
WHERE corm_per_kg_usd IS NOT NULL AND corm_per_kg_plain IS NULL;

UPDATE structure_templates
SET corm_per_kg_plain = ROUND((corm_per_kg_usd::numeric * 0.5), 4)
WHERE corm_per_kg_usd IS NOT NULL AND corm_per_kg_plain IS NULL;

UPDATE estimates
SET corm_per_kg_plain = ROUND((corm_per_kg_usd::numeric * 0.5), 4)
WHERE corm_per_kg_usd IS NOT NULL AND corm_per_kg_plain IS NULL;
