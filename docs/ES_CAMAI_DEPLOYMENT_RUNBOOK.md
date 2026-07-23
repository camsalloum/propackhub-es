# Estimation Studio — camai deployment runbook (local-first)

**Status:** scaffolding only — **no camai SSH apply** in this phase.  
**Public URL (target):** `https://es.propackhub.com`  
**Repo:** `apps/estimation-studio/` in ProPackHub monorepo

---

## Local development (now)

1. **Postgres** — use your local `estimation_studio` DB or Docker:

   ```bash
   cd apps/estimation-studio
   docker compose -f deploy/docker-compose.es.yml up -d
   # DATABASE_URL=postgresql://es_app:change_me@127.0.0.1:5434/estimation_studio
   ```

2. **Env** — copy `packages/server/.env.example` → `packages/server/.env` and set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN=http://localhost:5000`.

3. **Migrations** (explicit — not on boot by default in production-like envs):

   ```bash
   npm run db:migrate --workspace=packages/server
   ```

4. **Run API + web:**

   ```bash
   npm run dev
   # Web http://localhost:5000  API http://localhost:5001
   ```

5. **Verify:**

   ```bash
   curl -fsS http://127.0.0.1:5001/health
   curl -fsS http://127.0.0.1:5001/health/ready
   ```

---

## Scaffolding in this repo

| Path | Purpose |
|------|---------|
| `deploy/docker-compose.es.yml` | `es-postgres` on host `:5434` |
| `deploy/ecosystem.config.cjs` | pm2 `es-api` |
| `deploy/nginx-camai.conf` | `es.propackhub.com` reverse proxy stub |
| `scripts/deploy-es.sh` | Full deploy sequence (camai) |
| `scripts/migrate-es.sh` | Wrapper for `npm run db:migrate` |
| `scripts/backup-es.sh` | `pg_dump` backup |
| `scripts/restore-es.sh` | Restore from backup |
| `scripts/verify-es.sh` | Post-deploy health checks |
| `scripts/verify-backup-es.sh` | Gzip integrity of latest backup |
| `docs/ES_GO_LIVE_GATES.md` | In-repo + SSH-blocked go-live checklist |

### In-repo gates (no SSH)

```bash
npm run validate:go-live-env --workspace=packages/server
npm run smoke:ultra-gates --workspace=packages/server
npm run db:check-sync-health --workspace=packages/server -- --tenant-code interplast --fail
# From apps/pph:
node server/scripts/smoke-es-sso-gates.js
```

---

## Production migration policy

- **`RUN_MIGRATIONS_ON_BOOT`** — default `false` when `NODE_ENV` is not `development`. Set `true` only for ephemeral/dev-like hosts.
- **Authority:** `npm run db:migrate --workspace=packages/server` (or `scripts/migrate-es.sh`) before `pm2 reload`.
- Optional compiled entry: `node packages/server/dist/migrate.js` after `npm run build --workspace=packages/server` (tsup entry `src/migrate.ts`).

---

## Platform SSO (Phase 5 skeleton)

| Side | Item |
|------|------|
| PPH | `ES_SSO_SECRET`, `ES_PUBLIC_URL`, `POST /api/platform/sso/es` |
| ES | `ES_SSO_SECRET`, `GET /auth/callback` (token verify + session stub) |
| PPH frontend | `VITE_ES_URL`, `openEstimationStudio.js` |

ES catalog remains **`coming_soon`** in `propackhub_platform.apps` until owner flips status after cutover.

**Local SSO test:** platform admin bypasses `requireAppEntitlement('es')`. Other users need ES subscription + non–`coming_soon` app status (not enabled yet).

---

## Deferred — camai SSH checklist

Run only when owner approves host apply:

- [ ] Create `/home/camai/propackhub-es/{releases,shared,current}`
- [ ] `docker compose -f deploy/docker-compose.es.yml up -d` with strong `ES_POSTGRES_PASSWORD`
- [ ] Shared env file (outside release): `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `ES_PUBLIC_URL`, `ES_SSO_SECRET`, `RUN_MIGRATIONS_ON_BOOT=false`
- [ ] Upload release tarball → `current` symlink swap
- [ ] `./scripts/migrate-es.sh`
- [ ] `pm2 start deploy/ecosystem.config.cjs`
- [ ] Install `deploy/nginx-camai.conf` → reload nginx
- [ ] Cloudflare tunnel ingress for `es.propackhub.com`
- [ ] `./scripts/verify-es.sh`
- [ ] Cron: `./scripts/backup-es.sh`
- [ ] Match `ES_SSO_SECRET` on PPH `server/.env` and ES `packages/server/.env`
- [ ] Flip `apps.status` from `coming_soon` when ready (separate phase)

---

## Related docs

- `platform/docs/SAAS_NORMALIZATION_IMPLEMENTATION_PLAN_V2.md` §13–14
- `apps/formulation-studio/docs/FS_CAMAI_DEPLOYMENT_PLAN.md` (FS pattern reference)
