-- Multi-SKU quotes: commercial container + estimate SKU/color fields + backfill

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  ref_number VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  default_brand VARCHAR(255),
  salesperson_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  display_currency VARCHAR(3) NOT NULL,
  exchange_rate_usd_to_display DECIMAL(10, 6) NOT NULL,
  valid_until TIMESTAMPTZ,
  delivery_term VARCHAR(32),
  payment_terms VARCHAR(255),
  remarks TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  default_print_color_count INTEGER,
  default_cost_per_color DECIMAL(12, 4),
  default_tooling_billing_mode VARCHAR(16),
  rfq_id UUID,
  supersedes_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  approval_status VARCHAR(32),
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  customer_po VARCHAR(128),
  expected_order_at DATE,
  opportunity_probability INTEGER,
  lost_reason TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quotes_tenant_id_idx ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS quotes_customer_id_idx ON quotes(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS quotes_tenant_ref_idx ON quotes(tenant_id, ref_number);
CREATE INDEX IF NOT EXISTS quotes_deleted_at_idx ON quotes(deleted_at);

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sku_label VARCHAR(255);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS specs_code VARCHAR(64);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS print_color_count INTEGER;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS cost_per_color DECIMAL(12, 4);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tooling_billing_mode VARCHAR(16);
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS copied_from_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS estimates_quote_id_idx ON estimates(quote_id);

-- Backfill: one quote per existing estimate that has no quote yet
DO $$
DECLARE
  est RECORD;
  new_quote_id UUID;
  pkg_ref TEXT;
  yr INT;
  seq INT;
  quote_status TEXT;
BEGIN
  FOR est IN
    SELECT *
    FROM estimates
    WHERE quote_id IS NULL
      AND deleted_at IS NULL
    ORDER BY created_at ASC
  LOOP
    yr := EXTRACT(YEAR FROM COALESCE(est.created_at, NOW()))::INT;
    SELECT COUNT(*)::INT + 1 INTO seq
    FROM quotes
    WHERE tenant_id = est.tenant_id
      AND deleted_at IS NULL
      AND EXTRACT(YEAR FROM created_at) = yr;

    pkg_ref := 'PKG-' || yr::TEXT || '-' || LPAD(seq::TEXT, 5, '0');

    -- Collision guard
    WHILE EXISTS (
      SELECT 1 FROM quotes
      WHERE tenant_id = est.tenant_id AND ref_number = pkg_ref
    ) LOOP
      seq := seq + 1;
      pkg_ref := 'PKG-' || yr::TEXT || '-' || LPAD(seq::TEXT, 5, '0');
    END LOOP;

    quote_status := CASE est.status::TEXT
      WHEN 'sent' THEN 'sent'
      WHEN 'won' THEN 'saved'
      WHEN 'lost' THEN 'archived'
      ELSE 'draft'
    END;

    INSERT INTO quotes (
      id, tenant_id, customer_id, name, ref_number, status,
      display_currency, exchange_rate_usd_to_display, delivery_term,
      valid_until, sent_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      est.tenant_id,
      est.customer_id,
      COALESCE(NULLIF(TRIM(est.job_name), ''), est.ref_number),
      pkg_ref,
      quote_status,
      est.display_currency,
      est.exchange_rate_usd_to_display,
      est.delivery_term,
      est.valid_until,
      est.sent_at,
      est.created_at,
      est.updated_at
    )
    RETURNING id INTO new_quote_id;

    UPDATE estimates
    SET
      quote_id = new_quote_id,
      sort_order = 0,
      sku_label = COALESCE(sku_label, job_name)
    WHERE id = est.id;
  END LOOP;
END $$;
