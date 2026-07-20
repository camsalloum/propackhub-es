#!/usr/bin/env bash
# verify-es.sh — quick health check after deploying ES (local or camai).
set -euo pipefail

API_PORT="${API_PORT:-5001}"
HOST="${HOST:-es.propackhub.com}"
PROTO="${PROTO:-https}"

echo "[1/4] pm2 status es-api"
pm2 status es-api || echo "WARN: es-api not in pm2 (local dev may skip)"

echo "[2/4] API liveness (127.0.0.1:${API_PORT}/health)"
curl -fsS -o /dev/null -w "  status=%{http_code} time=%{time_total}s\n" \
  "http://127.0.0.1:${API_PORT}/health"

echo "[3/4] API readiness (127.0.0.1:${API_PORT}/health/ready)"
curl -fsS -o /dev/null -w "  status=%{http_code} time=%{time_total}s\n" \
  "http://127.0.0.1:${API_PORT}/health/ready"

echo "[4/4] public web (${PROTO}://${HOST}/) — skipped if tunnel not wired"
curl -fsS -o /dev/null -w "  status=%{http_code} time=%{time_total}s\n" \
  "${PROTO}://${HOST}/" || echo "  (public check failed — expected until camai/nginx)"

echo "Checks complete. Logs: pm2 logs es-api --lines 200"
