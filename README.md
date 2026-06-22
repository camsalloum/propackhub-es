# ProPackHub Estimation Studio

**Flexible Packaging Cost Estimator** — Standalone SaaS under the ProPackHub umbrella.

---

## Quick Start

### First Time Setup
1. **Database** (one time): `npm run db:migrate --workspace packages/server`
2. **Start**: Double-click `RUN-ES.bat` → opens http://localhost:5000

### Daily Use
- **Start:** `RUN-ES.bat`
- **Save to GitHub:** `GIT-SAVE.bat`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite 5 + **Tailwind CSS** + **lucide-react** |
| **Backend** | Fastify 4 + Drizzle ORM + PostgreSQL |
| **Costing engine** | `@es/engine` — pure TypeScript, USD-only, 34 tests |
| **Auth** | `@fastify/jwt` (30min access + refresh token rotation) |
| **Mobile** | Capacitor (iOS + Android wrap of the same React app) |

> **Not** Ant Design. The UI is Tailwind + lucide-react throughout.

---

## Monorepo Structure

```
packages/
  engine/   — pure TS costing engine (no framework) — see engine/README.md
  server/   — Fastify API + Drizzle + PostgreSQL
  web/      — React + Vite + Tailwind (+ Capacitor for native)
```

---

## Build Health

```bash
npm run typecheck --workspace packages/server   # must exit 0
npm run typecheck --workspace packages/web       # must exit 0
npm test --workspace packages/engine             # 34/34
cd packages/server && npx vitest run             # 37/37 (needs Postgres)
```

---

## Key Architecture Rules

- **Engine is USD-only.** FX is applied at the server/UI boundary, never inside the engine.
- **No Excel import.** Platform DB + committed JSON seed (`master-materials-seed.json`) is the only source of truth.
- **Product types are Master-Data-driven.** Never hardcode them — read from `platform_reference_items`.
- **ES is standalone.** No runtime dependency on PEBI or FS in V1.
- **Migrations on boot.** `runMigrations()` in `db/index.ts` runs pending SQL migrations automatically in non-dev environments.

---

## Database Migrations

```bash
# Apply pending migrations (non-dev / CI)
npm run db:migrate --workspace packages/server

# Local schema iteration (dev only)
npm run db:push --workspace packages/server
```

Migrations live in `packages/server/drizzle/`. The initial migration (`0000_initial_schema.sql`) creates the full schema from scratch.

---

## API

- **Base:** `http://localhost:5001`
- **Docs (OpenAPI):** `http://localhost:5001/docs`
- **Health:** `GET /health` (liveness) · `GET /health/ready` (DB readiness)

---

## Mobile (Capacitor)

```bash
# Build + sync to native platforms
cd packages/web && npm run cap:sync

# Open in Xcode / Android Studio
npm run cap:ios
npm run cap:android
```

Set `VITE_API_BASE_URL=https://your-api-host` in `.env.production` before building for device.

---

## Docs

| File | Purpose |
|---|---|
| `docs/ES_DEEP_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-21.md` | Roadmap of record — §25/§26 have current done/pending status |
| `docs/LOCKED_DECISIONS.md` | All strategic decisions (#1–#23) — read before changing anything |
| `packages/engine/README.md` | Engine public contract (for PEBI reuse) |
| `docs/SESSION_LOG.md` | Dated log of all changes |
