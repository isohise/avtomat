set -euo pipefail

DB_FILE="${1:?DB file required}"
BACKUP_DIR="${2:-backups}"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "DB file not found: $DB_FILE"
  exit 1
fi

ts="$(date +%Y%m%d_%H%M%S)"
base="$(basename "$DB_FILE")"
out="$BACKUP_DIR/${base}.${ts}.bak"

sqlite3 "$DB_FILE" ".backup '$out'"

test -s "$out"

echo "BACKUP_CREATED=$out"
echo "Backup saved: $out"
