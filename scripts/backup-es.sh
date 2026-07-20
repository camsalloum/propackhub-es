#!/usr/bin/env bash
# backup-es.sh — pg_dump snapshot for es-postgres (camai :5434).
# Host apply deferred. Set ES_POSTGRES_PASSWORD / DATABASE_URL before running.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/camai/backups/es}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5434}"
PGUSER="${PGUSER:-es_app}"
PGDATABASE="${PGDATABASE:-estimation_studio}"

OUT="$BACKUP_DIR/es_${STAMP}.sql.gz"

echo "Backing up ${PGDATABASE}@${PGHOST}:${PGPORT} → ${OUT}"
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" | gzip -9 > "$OUT"
echo "Backup OK: $OUT"
