-- Add missing columns to match schema.ts
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'individual';
ALTER TABLE tenants ALTER COLUMN type DROP DEFAULT;
UPDATE tenants SET type = 'company' WHERE type IS NULL;