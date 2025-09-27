-- Сброс (осторожно в проде)
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS climbers CASCADE;
DROP TABLE IF EXISTS mountains CASCADE;

-- =======================
-- Таблица: Вершины (mountains)
-- =======================
CREATE TABLE mountains (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  height_m    INTEGER NOT NULL CHECK (height_m > 0),
  country     TEXT NOT NULL,
  region      TEXT
);

-- Уникальность имени в рамках страны+региона
CREATE UNIQUE INDEX ux_mountains_country_region_name
  ON mountains (lower(country), coalesce(lower(region), ''), lower(name));

-- =======================
-- Таблица: Группы/восхождения (groups)
-- =======================
CREATE TABLE groups (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  mountain_id  INTEGER NOT NULL REFERENCES mountains(id) ON DELETE RESTRICT,
  start_date   DATE NOT NULL,
  end_date     DATE,
  CHECK (end_date IS NULL OR start_date <= end_date)
);

-- Для частых выборок по горе и хронологии
CREATE INDEX ix_groups_mountain_start ON groups (mountain_id, start_date);
-- Для периодных запросов
CREATE INDEX ix_groups_period ON groups (start_date, end_date);

-- =======================
-- Таблица: Альпинисты (climbers)
-- =======================
CREATE TABLE climbers (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  address    TEXT NOT NULL
);

-- Поисковый индекс по ФИО (опционально)
CREATE INDEX ix_climbers_full_name ON climbers (lower(full_name));

-- =======================
-- Таблица: Составы групп (group_members)
-- =======================
CREATE TABLE group_members (
  group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  climber_id  INTEGER NOT NULL REFERENCES climbers(id) ON DELETE RESTRICT,
  PRIMARY KEY (group_id, climber_id)
);

CREATE INDEX ix_group_members_climber ON group_members (climber_id);

-- =======================
-- Триггеры и функции
-- =======================

-- Запрет изменения данных о вершине, если по ней уже есть восхождения
CREATE OR REPLACE FUNCTION trg_mountains_block_update_when_has_groups()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM groups g WHERE g.mountain_id = OLD.id) THEN
    RAISE EXCEPTION 'Нельзя изменять вершину %, по ней уже есть восхождения', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mountains_block_update_when_has_groups
BEFORE UPDATE ON mountains
FOR EACH ROW
EXECUTE FUNCTION trg_mountains_block_update_when_has_groups();

-- =======================
-- Представления (для статистики)
-- =======================

-- (6) Кол-во восхождений каждого альпиниста на каждую гору
CREATE OR REPLACE VIEW v_ascents_per_climber_per_mountain AS
SELECT
  c.full_name,
  m.name AS mountain,
  COUNT(*) AS ascents_count
FROM group_members gm
JOIN groups g   ON g.id = gm.group_id
JOIN climbers c ON c.id = gm.climber_id
JOIN mountains m ON m.id = g.mountain_id
GROUP BY c.full_name, m.name;

-- (9) Сколько уникальных альпинистов побывали на каждой горе
CREATE OR REPLACE VIEW v_unique_climbers_per_mountain AS
SELECT
  m.name AS mountain,
  COUNT(DISTINCT gm.climber_id) AS unique_climbers
FROM mountains m
JOIN groups g ON g.mountain_id = m.id
JOIN group_members gm ON gm.group_id = g.id
GROUP BY m.name;
