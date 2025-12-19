#!/usr/bin/env bash
set -euo pipefail

DB_FILE="${1:?DB file required}"
MIG_DIR="${2:?Migrations dir required}"

# 1) гарантируем таблицу учёта миграций
sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));"

# 2) применяем миграции по порядку, только если ещё не применены
for f in $(ls -1 "$MIG_DIR"/*.sql 2>/dev/null | sort); do
  ver="$(basename "$f")"
  applied="$(sqlite3 "$DB_FILE" "SELECT COUNT(1) FROM schema_migrations WHERE version='$ver';")"
  if [ "$applied" = "0" ]; then
    echo "Apply: $ver"
    sqlite3 "$DB_FILE" < "$f"
    sqlite3 "$DB_FILE" "INSERT INTO schema_migrations(version) VALUES('$ver');"
  else
    echo "Skip:  $ver"
  fi
done
