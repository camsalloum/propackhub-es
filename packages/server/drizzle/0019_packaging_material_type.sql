-- Add packaging material type (isolated — PostgreSQL enum ADD VALUE).
ALTER TYPE layer_type ADD VALUE IF NOT EXISTS 'packaging';
