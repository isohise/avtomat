<<<<<<< HEAD

=======
#!/usr/bin/env bash
>>>>>>> d2287e0 (Add scripts: apply SQLite migrations and deploy to STAGE with schema check)
set -euo pipefail

TEST_SSH="${TEST_SSH:?set TEST_SSH like user@test-vm}"
STAGE_SSH="${STAGE_SSH:?set STAGE_SSH like user@stage-vm}"

TEST_DB="${TEST_DB:?set TEST_DB like /opt/avtomat/backend/db/env/test.db}"
STAGE_DB="${STAGE_DB:?set STAGE_DB like /opt/avtomat/backend/db/env/stage.db}"

STAGE_APP_DIR="${STAGE_APP_DIR:?set STAGE_APP_DIR like /opt/avtomat}"
BRANCH="${BRANCH:-DEV}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

echo "== Fetch schemas (before) =="
ssh "$TEST_SSH"  "sqlite3 '$TEST_DB'  '.schema'" > "$tmpdir/test_schema.sql"
ssh "$STAGE_SSH" "sqlite3 '$STAGE_DB' '.schema'" > "$tmpdir/stage_schema.sql"

echo "== Pre-check: stage must match test BEFORE deploy =="
if ! diff -u "$tmpdir/test_schema.sql" "$tmpdir/stage_schema.sql" > "$tmpdir/schema.diff"; then
  echo "SCHEMA MISMATCH BEFORE DEPLOY. Stop."
  cat "$tmpdir/schema.diff"
  exit 1
fi

echo "== Deploy code to STAGE (DEV branch) =="
ssh "$STAGE_SSH" "cd '$STAGE_APP_DIR' && git fetch && git checkout '$BRANCH' && git pull"

echo "== Apply migrations on STAGE =="
ssh "$STAGE_SSH" "cd '$STAGE_APP_DIR' && bash ci/apply_migrations_sqlite.sh '$STAGE_DB' 'backend/db/migrations'"

echo "== Fetch schemas (after) =="
ssh "$TEST_SSH"  "sqlite3 '$TEST_DB'  '.schema'" > "$tmpdir/test_schema_after.sql"
ssh "$STAGE_SSH" "sqlite3 '$STAGE_DB' '.schema'" > "$tmpdir/stage_schema_after.sql"

echo "== Post-check: schemas must match AFTER migrations =="
diff -u "$tmpdir/test_schema_after.sql" "$tmpdir/stage_schema_after.sql"

echo "== Restart app on STAGE =="
ssh "$STAGE_SSH" "cd '$STAGE_APP_DIR' && (docker compose up -d --build || true)"

echo "OK"
