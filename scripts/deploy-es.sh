#!/usr/bin/env bash
# deploy-es.sh — Estimation Studio deploy for camai home server.
# Host apply is DEFERRED — use locally to validate steps; run on camai after SSH cutover.
set -euo pipefail

APP="${APP_DIR:-/home/camai/propackhub-es}"
RELEASE="${RELEASE_DIR:-$APP/current}"
API_PORT="${API_PORT:-5001}"
cd "$RELEASE"

echo "[1/8] git pull (optional — skip with SKIP_GIT_PULL=1 for tarball deploy)"
if [ "${SKIP_GIT_PULL:-0}" != "1" ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull origin main || {
    echo "WARN: git pull failed — continuing with existing tree (use SKIP_GIT_PULL=1 to silence)"
  }
fi

echo "[2/8] npm ci (root)"
npm ci

echo "[3/8] build engine + server + web"
npm run build --workspace=packages/engine
npm run build --workspace=packages/server
npm run build --workspace=packages/web

echo "[4/8] migrate (production authority — not RUN_MIGRATIONS_ON_BOOT)"
npm run db:migrate --workspace=packages/server

echo "[5/8] seed admin (idempotent)"
if npm run seed:admin --workspace=packages/server 2>/dev/null; then
  :
else
  echo "WARN: seed:admin script not present — skip or run db:provision-interplast manually"
fi

echo "[6/8] restart pm2 (es-api)"
(pm2 restart es-api 2>/dev/null || pm2 start "$APP/deploy/ecosystem.config.cjs")
sleep 2

echo "[7/8] healthcheck"
curl -fsS "http://127.0.0.1:${API_PORT}/health" || {
  echo "HEALTHCHECK FAILED"
  pm2 restart es-api || true
  exit 1
}
curl -fsS "http://127.0.0.1:${API_PORT}/health/ready" || {
  echo "READINESS CHECK FAILED"
  exit 1
}

echo "[8/8] nginx reload (if installed)"
if command -v sudo >/dev/null 2>&1; then
  sudo nginx -t && sudo nginx -s reload
else
  nginx -t && nginx -s reload
fi

echo "ES deploy OK"
