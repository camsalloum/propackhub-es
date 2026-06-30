-- Tenant-scoped reference overlay.
-- Owner ships defaults in platform_reference_items; each tenant may add its own
-- rows (rm_type, process, product_subtype, units as basis+multiplier, etc.) here.
-- The effective reference a tenant sees = platform defaults merged with these.
CREATE TABLE IF NOT EXISTS tenant_reference_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category    platform_reference_category NOT NULL,
  label       varchar(255) NOT NULL,
  code        varchar(64),
  metadata    jsonb,
  sort_order  integer NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_reference_items_tenant_category_idx
  ON tenant_reference_items (tenant_id, category);
