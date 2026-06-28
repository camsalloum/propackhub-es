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

## Platform Standard Templates

The structure templates that load by default with the app are stored in two places:

1. **`structure-templates-seed.json`** (ships with the codebase) — the bootstrap source of truth for fresh installs. Twelve standards covering the PEBI catalog: Commercial Items Plain/Printed, Industrial Items, Shrink Film, Wide Film, Mono Layer Printed, Shrink Sleeves, Labels, Laminates (Duplex/Triplex/Quadriplex).

2. **`platform_standard_templates` table** (database) — the runtime source of truth. On every server boot, the seed JSON is upserted into this table by `templateKey`; entries already present are **not** overwritten, so admin edits persist across deploys.

When any tenant fetches `/api/v1/templates`, the server runs `syncPlatformStandardsToTenant()` to project the platform catalog into per-tenant `structure_templates` rows. This is how every tenant sees the same standards.

### Adding a new standard

Two paths:

- **At deploy time (developers).** Add an entry to `structure-templates-seed.json`. On the next boot, `bootstrapPlatformStandardCatalog()` inserts it into the platform table if missing.
- **At runtime (platform admins).** In the UI, click **New structure** (or **Clone to standard…** on any existing card) and toggle **Save as platform standard** in the builder header. The toggle is visible only to users with role `platform_admin`. The new standard is visible to every tenant on their next templates-list read.

### Three template tiers

| Tier | `isStandard` | `createdByUserId` | Created by | Visible to |
|---|---|---|---|---|
| Platform standard | `true` | `null` | `platform_admin` (via admin route) or seed JSON | every tenant |
| Tenant add-on | `false` | `null` | `tenant_admin` | that tenant only |
| My Template | `false` | `<userId>` | any user | that user only (plus admins) |

### Admin routes

- `GET    /api/v1/admin/platform-templates` — list all platform standards
- `GET    /api/v1/admin/platform-templates/:id` — read one
- `POST   /api/v1/admin/platform-templates` — create (or clone via `cloneFromTemplateId`)
- `PATCH  /api/v1/admin/platform-templates/:id` — edit
- `DELETE /api/v1/admin/platform-templates/:id` — soft delete (`isActive=false`)

All five require `role = platform_admin`. Writes propagate to every tenant lazily on their next templates-list read.

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
