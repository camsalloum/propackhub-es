-- Phase 5: platform SSO handoff (single-use JTI, tenant/user mapping, SSO sessions)

CREATE TABLE IF NOT EXISTS sso_token_uses (
  jti VARCHAR(64) PRIMARY KEY,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sso_token_uses_expires ON sso_token_uses(expires_at);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS platform_account_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_platform_account_uq
  ON tenants(platform_account_id)
  WHERE platform_account_id IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_user_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_source VARCHAR(20) NOT NULL DEFAULT 'local';

CREATE UNIQUE INDEX IF NOT EXISTS users_platform_tenant_uq
  ON users(platform_user_id, tenant_id)
  WHERE platform_user_id IS NOT NULL;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_source VARCHAR(20) NOT NULL DEFAULT 'local';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS platform_account_id BIGINT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS entitlement_version BIGINT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS absolute_expires_at TIMESTAMPTZ;
