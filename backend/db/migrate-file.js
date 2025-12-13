const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbFile = process.argv[2];
if (!dbFile) {
  console.error("Usage: node db/migrate-file.js <path-to-sqlite>");
  process.exit(2);
}

const abs = path.isAbsolute(dbFile) ? dbFile : path.join(process.cwd(), dbFile);
const db = new Database(abs);
db.pragma("journal_mode = WAL");

// таблица учёта миграций
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`);

const migrationsDir = path.join(__dirname, "migrations");
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

for (const file of files) {
  const exists = db.prepare("SELECT 1 FROM schema_migrations WHERE id = ?").get(file);
  if (exists) continue;

  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  db.exec(sql);
  db.prepare("INSERT INTO schema_migrations(id, applied_at) VALUES(?, datetime('now'))").run(file);
  console.log("Applied:", file, "=>", abs);
}

db.close();
