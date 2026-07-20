#!/usr/bin/env bash
# restore-es.sh — restore ES database from a pg_dump archive.
# DESTRUCTIVE — host apply deferred. Usage: ./scripts/restore-es.sh /path/to/backup.sql.gz
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql.gz>"
  exit 1
fi

ARCHIVE="$1"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5434}"
PGUSER="${PGUSER:-es_app}"
PGDATABASE="${PGDATABASE:-estimation_studio}"

echo "WARNING: This will replace ${PGDATABASE} on ${PGHOST}:${PGPORT}"
read -r -p "Type RESTORE to continue: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring from ${ARCHIVE}"
gunzip -c "$ARCHIVE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"
echo "Restore complete"
