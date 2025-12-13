CREATE TABLE schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  login TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE mountains (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  height_m INTEGER,
  country TEXT,
  region TEXT
);
CREATE TABLE climbers (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  address TEXT
);
CREATE TABLE groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  mountain_id INTEGER,
  start_date TEXT,
  end_date TEXT,
  FOREIGN KEY (mountain_id) REFERENCES mountains(id)
);
CREATE TABLE group_members (
  group_id INTEGER,
  climber_id INTEGER,
  PRIMARY KEY (group_id, climber_id)
);
