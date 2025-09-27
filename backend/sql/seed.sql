-- Очистка таблиц (для локальной разработки)
TRUNCATE TABLE group_members RESTART IDENTITY CASCADE;
TRUNCATE TABLE groups RESTART IDENTITY CASCADE;
TRUNCATE TABLE climbers RESTART IDENTITY CASCADE;
TRUNCATE TABLE mountains RESTART IDENTITY CASCADE;

-- =======================
-- Вершины
-- =======================
INSERT INTO mountains (name, height_m, country, region) VALUES
  ('Эльбрус', 5642, 'Россия', 'Кабардино-Балкария'),
  ('Монблан', 4808, 'Франция', 'Альпы'),
  ('Казбек', 5033, 'Грузия', 'Большой Кавказ'),
  ('Маттерхорн', 4478, 'Швейцария', 'Пеннские Альпы'),
  ('Арарат', 5137, 'Турция', 'Агры-Даг');

-- =======================
-- Альпинисты
-- =======================
INSERT INTO climbers (full_name, address) VALUES
  ('Иванов Пётр Сергеевич', 'Москва, ул. Тверская, 10'),
  ('Сидорова Анна Алексеевна', 'Санкт-Петербург, Невский пр., 25'),
  ('Ким Алексей Викторович', 'Екатеринбург, ул. Мира, 5'),
  ('Полякова Мария Игоревна', 'Новосибирск, Красный пр., 12'),
  ('Жуков Дмитрий Олегович', 'Казань, ул. Баумана, 3'),
  ('Романов Олег Евгеньевич', 'Минск, пр. Независимости, 40'),
  ('Геворгян Арман Каренович', 'Ереван, ул. Абовяна, 14'),
  ('Ляшенко Андрей Николаевич', 'Киев, Крещатик, 8');

-- =======================
-- Группы (восхождения)
-- Примеры периодов подобраны так, чтобы покрыть разные кейсы пересечений.
-- =======================
-- Эльбрус
INSERT INTO groups (name, mountain_id, start_date, end_date) VALUES
  ('Elbrus-Alpha-2023',  (SELECT id FROM mountains WHERE name='Эльбрус'), '2023-06-10', '2023-06-15'),
  ('Elbrus-Bravo-2024',  (SELECT id FROM mountains WHERE name='Эльбрус'), '2024-07-02', '2024-07-06');

-- Монблан
INSERT INTO groups (name, mountain_id, start_date, end_date) VALUES
  ('MontBlanc-Team-1',   (SELECT id FROM mountains WHERE name='Монблан'), '2023-08-01', '2023-08-05'),
  ('MontBlanc-Team-2',   (SELECT id FROM mountains WHERE name='Монблан'), '2024-08-12', '2024-08-16');

-- Казбек
INSERT INTO groups (name, mountain_id, start_date, end_date) VALUES
  ('Kazbek-Red',         (SELECT id FROM mountains WHERE name='Казбек'), '2024-09-05', '2024-09-10'),
  ('Kazbek-Blue',        (SELECT id FROM mountains WHERE name='Казбек'), '2025-06-20', '2025-06-25');

-- Маттерхорн
INSERT INTO groups (name, mountain_id, start_date, end_date) VALUES
  ('Matterhorn-North',   (SELECT id FROM mountains WHERE name='Маттерхорн'), '2024-07-20', '2024-07-23');

-- Арарат (одна группа без даты окончания — в процессе)
INSERT INTO groups (name, mountain_id, start_date, end_date) VALUES
  ('Ararat-Open',        (SELECT id FROM mountains WHERE name='Арарат'), '2025-08-30', NULL);

-- =======================
-- Составы групп (group_members)
-- =======================

-- Elbrus-Alpha-2023
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Иванов Пётр Сергеевич','Сидорова Анна Алексеевна','Ким Алексей Викторович')
WHERE g.name='Elbrus-Alpha-2023';

-- Elbrus-Bravo-2024
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Полякова Мария Игоревна','Жуков Дмитрий Олегович','Иванов Пётр Сергеевич')
WHERE g.name='Elbrus-Bravo-2024';

-- MontBlanc-Team-1
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Сидорова Анна Алексеевна','Романов Олег Евгеньевич')
WHERE g.name='MontBlanc-Team-1';

-- MontBlanc-Team-2
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Жуков Дмитрий Олегович','Ляшенко Андрей Николаевич')
WHERE g.name='MontBlanc-Team-2';

-- Kazbek-Red
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Ким Алексей Викторович','Полякова Мария Игоревна','Романов Олег Евгеньевич')
WHERE g.name='Kazbek-Red';

-- Kazbek-Blue
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Иванов Пётр Сергеевич','Геворгян Арман Каренович','Ляшенко Андрей Николаевич')
WHERE g.name='Kazbek-Blue';

-- Matterhorn-North
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Сидорова Анна Алексеевна','Жуков Дмитрий Олегович')
WHERE g.name='Matterhorn-North';

-- Ararat-Open (пока один участник, можно добавлять через UI)
INSERT INTO group_members (group_id, climber_id)
SELECT g.id, c.id
FROM groups g
JOIN climbers c ON c.full_name IN ('Геворгян Арман Каренович')
WHERE g.name='Ararat-Open';

-- =======================
-- Проверка выборок (опционально)
-- =======================

-- 1) Группы по горе "Эльбрус" по дате
-- SELECT g.* FROM groups g JOIN mountains m ON m.id=g.mountain_id WHERE m.name='Эльбрус' ORDER BY g.start_date;

-- 4) Альпинисты с восхождениями в 2024 году
-- SELECT DISTINCT c.* FROM climbers c
-- JOIN group_members gm ON gm.climber_id=c.id
-- JOIN groups g ON g.id=gm.group_id
-- WHERE g.start_date <= '2024-12-31' AND (g.end_date IS NULL OR g.end_date >= '2024-01-01');

-- 6) Кол-во восхождений каждого альпиниста на каждую гору
-- SELECT * FROM v_ascents_per_climber_per_mountain ORDER BY full_name, mountain;

-- 9) Сколько уникальных альпинистов побывали на каждой горе
-- SELECT * FROM v_unique_climbers_per_mountain ORDER BY unique_climbers DESC, mountain;
