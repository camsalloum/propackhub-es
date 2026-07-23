#!/usr/bin/env bash
# verify-backup-es.sh — confirm latest ES pg_dump backup is non-empty and gzip-valid.
# Does NOT require SSH to camai when BACKUP_DIR points at a local/copied archive folder.
#
# Usage:
#   BACKUP_DIR=/home/camai/backups/es ./scripts/verify-backup-es.sh
#   BACKUP_DIR=./backups ./scripts/verify-backup-es.sh /path/to/es_YYYYMMDD.sql.gz
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/camai/backups/es}"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  if [ ! -d "$BACKUP_DIR" ]; then
    echo "FAIL: BACKUP_DIR does not exist: $BACKUP_DIR"
    echo "Copy a backup off-host or set BACKUP_DIR to the folder with es_*.sql.gz"
    exit 1
  fi
  TARGET="$(ls -1t "$BACKUP_DIR"/es_*.sql.gz 2>/dev/null | head -n 1 || true)"
  if [ -z "$TARGET" ]; then
    echo "FAIL: no es_*.sql.gz found in $BACKUP_DIR"
    echo "Run: ./scripts/backup-es.sh"
    exit 1
  fi
fi

if [ ! -f "$TARGET" ]; then
  echo "FAIL: file not found: $TARGET"
  exit 1
fi

BYTES="$(wc -c < "$TARGET" | tr -d ' ')"
MIN_BYTES="${MIN_BACKUP_BYTES:-1024}"
if [ "$BYTES" -lt "$MIN_BYTES" ]; then
  echo "FAIL: backup too small (${BYTES} bytes < ${MIN_BYTES}): $TARGET"
  exit 1
fi

echo "Checking gzip integrity: $TARGET (${BYTES} bytes)"
gzip -t "$TARGET"
echo "OK: backup verifies (gzip -t passed)"
echo "Restore drill (destructive, staging only):"
echo "  ./scripts/restore-es.sh \"$TARGET\""
