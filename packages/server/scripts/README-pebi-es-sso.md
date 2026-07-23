# Local PEBI ↔ ES SSO setup (Interplast)

Platform SSO handoff (`issueEsHandoffUrl` in PPH) resolves the ES tenant slug from
`account_app_instances` where `app_key = 'es'`. For local Interplast dev, seed that
mapping once on the PPH platform database.

## Prerequisites

1. PPH Phase 1 migration applied (`platform_accounts`, `account_app_instances`).
2. ES tenant provisioned: `npm run db:provision-interplast --workspace=packages/server`
3. Link local platform admin onto Interplast (so `admin@propackhub.com` sees PEBI customers):
   `npm run db:link-admin-interplast --workspace=packages/server`
4. Same `ES_SSO_SECRET` in PPH `server/.env` and ES `packages/server/.env`.
5. ES migration `0023_platform_sso` applied: `npm run db:migrate --workspace=packages/server`

## Seed PEBI account → ES tenant mapping

From `apps/pph`:

```bash
node server/scripts/ensure-es-tenant-mapping.js
```

Dry run:

```bash
node server/scripts/ensure-es-tenant-mapping.js --dry-run
```

This upserts `account_app_instances` for Interplast: `app_key=es`, `product_tenant_key=interplast`.

## Verify end-to-end (local)

1. Log in to PPH as an Interplast user with ES entitlement.
2. Open Estimation Studio from the product picker (or `POST /api/platform/sso/es`).
3. Browser lands on ES `/dashboard#token=…&refresh=…` and enters the app without re-entering password.
4. New quote autocomplete must show PEBI customers (not an empty demo tenant). Empty PEBI-linked tenants are **refused** with `sso_error=empty_tenant`.

### Script gates (no browser)

```bash
# From apps/pph
node server/scripts/ensure-es-entitlement.js
node server/scripts/ensure-es-tenant-mapping.js
node server/scripts/smoke-es-entitlement.js
node server/scripts/smoke-es-sso-gates.js

# From apps/estimation-studio
npm run validate:go-live-env --workspace=packages/server
npm run db:link-admin-interplast --workspace=packages/server
npm run db:check-sync-health --workspace=packages/server -- --tenant-code interplast --fail
```

Full checklist: `docs/ES_GO_LIVE_GATES.md`

Staging/camai apply remains SSH-only — not covered here.
