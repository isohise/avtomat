set -euo pipefail

STAGE_DB="backend/db/env/stage.db"
PROD_DB="backend/db/env/prod.db"
MIG_DIR="backend/db/migrations"

echo "== Проверяем наличие файлов =="
for f in "$STAGE_DB" "$PROD_DB"; do
  if [ ! -f "$f" ]; then
    echo "Создаю пустую БД: $f"
    mkdir -p "$(dirname "$f")"
    sqlite3 "$f" "VACUUM;"
  fi
done

echo "== Выгружаем схемы (до) =="
sqlite3 "$STAGE_DB" ".schema" > /tmp/stage_schema.sql
sqlite3 "$PROD_DB"  ".schema" > /tmp/prod_schema.sql

echo "== Предварительная сверка STAGE vs PROD =="
if diff -u /tmp/stage_schema.sql /tmp/prod_schema.sql > /tmp/stage_prod_before.diff; then
  echo "✅ STAGE и PROD уже совпадают (до миграций)."
else
  echo "⚠️  Есть различия (до миграций):"
  cat /tmp/stage_prod_before.diff
fi

echo "== Применяем миграции к PROD (чтобы догнать STAGE) =="
bash ci/apply_migrations_sqlite.sh "$PROD_DB" "$MIG_DIR"

echo "== Выгружаем схемы (после) =="
sqlite3 "$STAGE_DB" ".schema" > /tmp/stage_schema_after.sql
sqlite3 "$PROD_DB"  ".schema" > /tmp/prod_schema_after.sql

echo "== Итоговая сверка STAGE vs PROD (должны совпасть) =="
if diff -u /tmp/stage_schema_after.sql /tmp/prod_schema_after.sql > /tmp/stage_prod_after.diff; then
  echo "✅ PROD приведён к схеме STAGE."
else
  echo "❌ После миграций PROD всё ещё отличается от STAGE:"
  cat /tmp/stage_prod_after.diff
  exit 1
fi

echo "== Развёртывание приложения на PROD (имитация) =="
echo "(в реальном окружении здесь был бы рестарт/деплой сервиса)"
echo "OK"
