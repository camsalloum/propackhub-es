ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_price_check boolean NOT NULL DEFAULT false;

UPDATE quotes
SET is_price_check = true
WHERE customer_id IS NULL
  AND deleted_at IS NULL
  AND (name ILIKE 'price check%' OR name = 'Price check');

CREATE INDEX IF NOT EXISTS quotes_price_check_idx ON quotes (tenant_id, is_price_check)
  WHERE deleted_at IS NULL AND is_price_check = true;
