-- Estimate-scoped operating cost method override + process profit margin defaults.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS default_profit_margin_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00;

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS operating_cost_method operating_cost_method;

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS profit_margin_percent DECIMAL(5, 2);
