ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rfq_number varchar(128);

CREATE INDEX IF NOT EXISTS quotes_rfq_number_idx ON quotes (tenant_id, rfq_number)
  WHERE deleted_at IS NULL AND rfq_number IS NOT NULL;
