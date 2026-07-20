#!/usr/bin/env bash
# package-es-release.sh — build a local release archive for Estimation Studio.
# Host upload/extract is SSH-deferred (see SAAS_RELEASE_GOVERNANCE.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SHA="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo local)}"
OUT="dist-release/es-release-${SHA}"
rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> build workspaces"
npm run build --workspaces --if-present

echo "==> stage artifacts"
mkdir -p "$OUT/packages/server" "$OUT/packages/web" "$OUT/packages/engine" "$OUT/deploy" "$OUT/scripts"
cp -R packages/server/dist "$OUT/packages/server/" 2>/dev/null || true
cp -R packages/server/drizzle "$OUT/packages/server/" 2>/dev/null || true
cp -R packages/web/dist "$OUT/packages/web/" 2>/dev/null || true
cp -R packages/engine/dist "$OUT/packages/engine/" 2>/dev/null || true
cp -R deploy/* "$OUT/deploy/" 2>/dev/null || true
cp scripts/deploy-es.sh scripts/migrate-es.sh scripts/backup-es.sh scripts/verify-es.sh scripts/restore-es.sh "$OUT/scripts/" 2>/dev/null || true

(
  cd "$OUT"
  find . -type f | sort > MANIFEST.txt
  if command -v sha256sum >/dev/null 2>&1; then
    find . -type f ! -name 'es-release.sha256' -print0 | sort -z | xargs -0 sha256sum > es-release.sha256
  fi
)

ARCHIVE="dist-release/es-release-${SHA}.tar.gz"
tar -czf "$ARCHIVE" -C dist-release "es-release-${SHA}"
echo "Packed: $ARCHIVE"
echo "Local-only. Upload to camai is SSH-deferred."
