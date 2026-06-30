-- Add the `accessory` material type to the layer_type enum.
-- This MUST be the only statement in the file: PostgreSQL's
-- `ALTER TYPE ... ADD VALUE` does not take effect when batched with other DDL in
-- a single transactional migration, so it is isolated here as a lone auto-commit
-- statement. Idempotent via IF NOT EXISTS.
ALTER TYPE layer_type ADD VALUE IF NOT EXISTS 'accessory';
