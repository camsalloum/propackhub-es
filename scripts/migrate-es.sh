#!/usr/bin/env bash
# migrate-es.sh — run pending drizzle migrations against ES Postgres.
# Host apply deferred. Locally: source packages/server/.env then run from repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f packages/server/.env ]; then
  set -a
  # shellcheck disable=SC1091
  source packages/server/.env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required (set in packages/server/.env or environment)"
  exit 1
fi

echo "Running ES migrations via npm run db:migrate --workspace=packages/server"
npm run db:migrate --workspace=packages/server

echo "Migrations complete"
