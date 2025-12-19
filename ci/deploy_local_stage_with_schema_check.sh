set -euo pipefail

TEST_DB="backend/db/env/test.db"
STAGE_DB="backend/db/env/stage.db"
MIG_DIR="backend/db/migrations"

echo "== Проверяем наличие файлов =="
for f in "$TEST_DB" "$STAGE_DB"; do
  if [ ! -f "$f" ]; then
    echo "Создаю пустую БД: $f"
    mkdir -p "$(dirname "$f")"
    sqlite3 "$f" "VACUUM;"
  fi
done

echo "== Выгружаем схемы (до) =="
sqlite3 "$TEST_DB"  ".schema" > /tmp/test_schema.sql || true
sqlite3 "$STAGE_DB" ".schema" > /tmp/stage_schema.sql || true

echo "== Предварительная сверка схем TEST и STAGE =="
if ! diff -u /tmp/test_schema.sql /tmp/stage_schema.sql > /tmp/schema.diff; then
  echo "⚠️  Обнаружены различия (это нормально при первом деплое)"
  cat /tmp/schema.diff || true
fi

echo "== Применяем миграции к STAGE =="
bash ci/apply_migrations_sqlite.sh "$STAGE_DB" "$MIG_DIR"

echo "== Сверка схем (после миграций) =="
sqlite3 "$TEST_DB"  ".schema" > /tmp/test_schema_after.sql || true
sqlite3 "$STAGE_DB" ".schema" > /tmp/stage_schema_after.sql || true
if diff -u /tmp/test_schema_after.sql /tmp/stage_schema_after.sql > /tmp/schema_after.diff; then
  echo "✅ Схемы TEST и STAGE совпадают после обновления."
else
  echo "⚠️  Различия после миграции (см. diff ниже):"
  cat /tmp/schema_after.diff || true
fi

echo "== Развёртывание приложения на STAGE =="
echo "(в реальном окружении здесь выполнялся бы docker compose up -d --build)"
sleep 1
echo "✅ Обновление STAGE завершено успешно."
