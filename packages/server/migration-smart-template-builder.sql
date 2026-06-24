-- Migration: Smart Template Builder — ownership + printMode
-- Task 2.1: Add createdByUserId (nullable) to structure_templates
-- Task 2.2: printMode lives in defaultDimensions jsonb (no new column)

ALTER TABLE structure_templates
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

-- Index for fast user-add-on queries (Task 3.2 visibility gate)
CREATE INDEX IF NOT EXISTS structure_templates_created_by_user_idx
  ON structure_templates (created_by_user_id)
  WHERE created_by_user_id IS NOT NULL;
