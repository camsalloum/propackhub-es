# Estimation Studio — go-live gates (in-repo)

**Purpose:** Everything that can be verified **without camai SSH** before wider beta.
Staging SSO E2E + host apply remain **BLOCKED on SSH** — see bottom.

**Decision #24:** SSO = identity only. Access = tenant + active module subscription (`app_subscriptions`).

---

## Local / CI gates (do these first)

| # | Gate | Command | Pass criteria |
|---|------|---------|---------------|
| 1 | Env schema | `npm run validate:go-live-env --workspace=packages/server` | JSON `ok: true` |
| 2 | Env production-like | same + `--production` (on staging host `.env`) | no placeholder secrets; `RUN_MIGRATIONS_ON_BOOT=false` |
| 3 | Ultra engine smoke | `npm run smoke:ultra-gates --workspace=packages/server` | process-fork + M&O goldens + slab ranges |
| 4 | Pack/consumables health | `npm run db:check-sync-health --workspace=packages/server -- --tenant-code interplast --fail` | no $0 PACKAGING/CONSUMABLES |
| 5 | Migrations | `npm run db:migrate --workspace=packages/server` | includes `0023_platform_sso` |
| 6 | Engine + server tests | `npm test --workspace=packages/engine` / `packages/server` | green |
| 7 | API readiness | `curl -fsS http://127.0.0.1:5001/health/ready` | `ready` |
| 8 | Backup artifact | `BACKUP_DIR=<path> ./scripts/verify-backup-es.sh` | gzip `-t` OK, size ≥ 1 KB |

### Matching SSO secrets (local)

1. Same `ES_SSO_SECRET` in `apps/pph/server/.env` and `apps/estimation-studio/packages/server/.env`
2. `ES_PUBLIC_URL` / `CORS_ORIGIN` = ES web origin (`http://localhost:5000` local)
3. From `apps/pph`:
   - `node server/scripts/ensure-es-tenant-mapping.js`
   - `node server/scripts/ensure-es-entitlement.js`
   - `node server/scripts/smoke-es-entitlement.js`
4. ES: `npm run db:provision-interplast --workspace=packages/server`
5. ES: `npm run db:link-admin-interplast --workspace=packages/server` (admin@ → Interplast, not empty demo)

### Local SSO smoke (browser)

1. Sign in on ProPackHub → product picker → Estimation Studio
2. Lands on `/dashboard#token=…&refresh=…` **without** a second password prompt
3. New quote → customer autocomplete has PEBI customers (not empty demo)
4. If SSO hits an empty PEBI-linked tenant → login shows **empty tenant** error (not a blank picker)

### Product smoke (after hard-refresh)

1. **All estimates** — default “By package”; Flat toggle works
2. Template estimate → add ink / change stack → **Confirm processes** modal; save keeps fork flags
3. Estimate with packaging → no orange unpriced banners when sync-health is healthy
4. Quote PDF download still works (`npx tsx packages/server/scripts/smoke-quotation-pdf.ts`)

---

## BLOCKED — camai SSH required

Do **not** mark beta go-live until these are done on the host:

```bash
# On camai (owner / SSH):
cd /home/camai/propackhub-es/current   # or release path from runbook

# 1) Postgres + env
docker compose -f deploy/docker-compose.es.yml up -d
# shared env: DATABASE_URL, JWT_SECRET, CORS_ORIGIN, ES_PUBLIC_URL,
#             ES_SSO_SECRET (match PPH), RUN_MIGRATIONS_ON_BOOT=false,
#             PRODUCT_LOCAL_LOGIN_ENABLED, PRODUCT_PUBLIC_REGISTRATION_ENABLED

# 2) Migrate + start
./scripts/migrate-es.sh
pm2 start deploy/ecosystem.config.cjs   # or reload

# 3) Nginx + tunnel
# install deploy/nginx-camai.conf → reload nginx
# Cloudflare ingress for es.propackhub.com

# 4) Verify
./scripts/verify-es.sh
./scripts/backup-es.sh
BACKUP_DIR=/home/camai/backups/es ./scripts/verify-backup-es.sh

# 5) Staging SSO E2E
# PPH staging → open ES → dashboard with token hash
# Confirm Interplast entitlement + non-empty customers
```

Full narrative: `docs/ES_CAMAI_DEPLOYMENT_RUNBOOK.md`  
Platform authority: `platform/docs/SAAS_NORMALIZATION_IMPLEMENTATION_PLAN_V2.md`

---

## Beta gate decision

| Ready for wider beta? | Condition |
|-----------------------|-----------|
| **No** | Any of local gates 1–8 fail, or SSH list above incomplete |
| **Yes** | Local gates green **and** camai SSO E2E + backup verify signed off |
