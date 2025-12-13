const db = require('./db/db');

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const sqlite3 = require("sqlite3").verbose();
const DB_PATH = process.env.DB_PATH || "./db/env/test.db";
const db = new sqlite3.Database(DB_PATH);

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const users = [
  { id: 1, login: "admin", password: "admin123", role: "admin", name: "Администратор" },
  { id: 2, login: "user",  password: "user123",  role: "user",  name: "Пользователь"  },
];

const sessions = new Map();

let mountains = [];
let groups = [];
let climbers = [];
let groupMembers = [];

let nextId = 1;
const genId = () => nextId++;

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function authOptional(req, _res, next) {
  const hdr = req.headers["authorization"] || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (token && sessions.has(token)) {
    const sess = sessions.get(token);
    const u = users.find((x) => x.id === sess.userId);
    if (u) {
      req.user = { id: u.id, role: u.role, name: u.name, login: u.login, token };
    }
  }
  next();
}

function requireAuth(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).send("Требуется авторизация");
    next();
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") return res.status(403).send("Недостаточно прав");
    next();
  });
}

// Применяем authOptional на все запросы (чтобы GET знали роль при необходимости)
app.use(authOptional);

// --------- Маршруты авторизации ---------
app.get("/db/tables", (_req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    res.json(rows.map(r => r.name));
  });
});

// Вход
app.post("/auth/login", (req, res) => {
  const { login, password } = req.body || {};
  const u = users.find((x) => x.login === login && x.password === password);
  if (!u) return res.status(401).send("Неверный логин или пароль");
  const token = makeToken();
  sessions.set(token, { userId: u.id, role: u.role, name: u.name, createdAt: Date.now() });
  res.json({ token, role: u.role, name: u.name, login: u.login });
});

// Проверка текущей сессии
app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ token: req.user.token, role: req.user.role, name: req.user.name, login: req.user.login });
});

// Выход
app.post("/auth/logout", requireAuth, (req, res) => {
  sessions.delete(req.user.token);
  res.status(204).end();
});

// =======================
// Вспомогательные валидаторы
// =======================

const { ensureInt } = require('./utils/ensureInt');


// =======================
// MOUNTAINS
// =======================

app.get("/mountains", (_req, res) => {
  const result = mountains.map((m) => {
    const ascentCount = groups.filter((g) => g.mountain_id === m.id).length;
    return { ...m, ascentCount };
  });
  res.json(result);
});

app.get("/mountains/:id", (req, res) => {
  const id = ensureInt(req.params.id);
  const mountain = mountains.find((m) => m.id === id);
  if (!mountain) return res.status(404).send("Не найдена");
  const ascentCount = groups.filter((g) => g.mountain_id === id).length;
  res.json({ ...mountain, ascentCount });
});

app.get("/mountains/:id/groups", (req, res) => {
  const id = ensureInt(req.params.id);
  const result = groups
    .filter((g) => g.mountain_id === id)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  res.json(result);
});

// Создать вершину (admin)
app.post("/mountains", requireAdmin, (req, res) => {
  const { name, height_m, country, region } = req.body || {};
  const m = { id: genId(), name, height_m, country, region: region || "" };
  mountains.push(m);
  res.status(201).json(m);
});

// Обновить вершину (admin, только если нет восхождений)
function updateMountain(req, res) {
  const id = ensureInt(req.params.id);
  const m = mountains.find((x) => x.id === id);
  if (!m) return res.status(404).send("Не найдена");
  const hasAscents = groups.some((g) => g.mountain_id === id);
  if (hasAscents) return res.status(400).send("Нельзя редактировать вершину: по ней есть восхождения");
  Object.assign(m, req.body || {});
  res.json(m);
}
app.patch("/mountains/:id", requireAdmin, updateMountain);
app.put("/mountains/:id", requireAdmin, updateMountain);

// Удалить вершину (admin, только если нет восхождений)
app.delete("/mountains/:id", requireAdmin, (req, res) => {
  const id = ensureInt(req.params.id);
  const hasAscents = groups.some((g) => g.mountain_id === id);
  if (hasAscents) return res.status(400).send("Нельзя удалить вершину: по ней есть восхождения");
  const before = mountains.length;
  mountains = mountains.filter((m) => m.id !== id);
  if (mountains.length === before) return res.status(404).send("Не найдена");
  res.status(204).end();
});

// =======================
// GROUPS
// =======================

app.get("/groups", (req, res) => {
  const { from, to } = req.query;
  let result = [...groups];
  if (from || to) {
    result = result.filter((g) => {
      const start = new Date(g.start_date);
      const end = g.end_date ? new Date(g.end_date) : null;
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      if (fromDate && end && end < fromDate) return false;
      if (toDate && start > toDate) return false;
      return true;
    });
  }
  result = result.map((g) => {
    const m = mountains.find((m) => m.id === g.mountain_id);
    return { ...g, mountain_name: m?.name };
  });
  res.json(result);
});

app.get("/groups/:id", (req, res) => {
  const id = ensureInt(req.params.id);
  const g = groups.find((x) => x.id === id);
  if (!g) return res.status(404).send("Не найдена");
  const m = mountains.find((mm) => mm.id === g.mountain_id);
  const members = groupMembers
    .filter((gm) => gm.group_id === id)
    .map((gm) => climbers.find((c) => c.id === gm.climber_id));
  res.json({ ...g, mountain_name: m?.name, members });
});

// Создать группу (admin)
app.post("/groups", requireAdmin, (req, res) => {
  const { name, mountain_id, start_date, end_date } = req.body || {};
  const g = {
    id: genId(),
    name,
    mountain_id: ensureInt(mountain_id),
    start_date,
    end_date: end_date || null,
  };
  groups.push(g);
  res.status(201).json(g);
});

// Обновить группу (admin)
function updateGroup(req, res) {
  const id = ensureInt(req.params.id);
  const g = groups.find((x) => x.id === id);
  if (!g) return res.status(404).send("Не найдена");
  const { name, mountain_id, start_date, end_date } = req.body || {};
  if (name !== undefined) g.name = name;
  if (mountain_id !== undefined) g.mountain_id = ensureInt(mountain_id);
  if (start_date !== undefined) g.start_date = start_date;
  if (end_date !== undefined) g.end_date = end_date || null;
  res.json(g);
}
app.patch("/groups/:id", requireAdmin, updateGroup);
app.put("/groups/:id", requireAdmin, updateGroup);

// Удалить группу (admin)
app.delete("/groups/:id", requireAdmin, (req, res) => {
  const id = ensureInt(req.params.id);
  const before = groups.length;
  groups = groups.filter((g) => g.id !== id);
  if (groups.length === before) return res.status(404).send("Не найдена");
  groupMembers = groupMembers.filter((gm) => gm.group_id !== id);
  res.status(204).end();
});

// Добавить участника в группу (admin)
app.post("/groups/:id/members", requireAdmin, (req, res) => {
  const group_id = ensureInt(req.params.id);
  const { climber_id } = req.body || {};
  const cid = ensureInt(climber_id);
  const exists = groupMembers.some((gm) => gm.group_id === group_id && gm.climber_id === cid);
  if (exists) return res.status(400).send("Участник уже в группе");
  groupMembers.push({ group_id, climber_id: cid });
  res.status(201).json({ group_id, climber_id: cid });
});

// =======================
// CLIMBERS
// =======================

app.get("/climbers", (req, res) => {
  const { active_from, active_to } = req.query;
  let result = [...climbers];
  if (active_from || active_to) {
    result = climbers.filter((c) => {
      const gm = groupMembers.filter((gm) => gm.climber_id === c.id);
      return gm.some((gm) => {
        const g = groups.find((x) => x.id === gm.group_id);
        if (!g) return false;
        const start = new Date(g.start_date);
        const end = g.end_date ? new Date(g.end_date) : null;
        const fromDate = active_from ? new Date(active_from) : null;
        const toDate = active_to ? new Date(active_to) : null;
        if (fromDate && end && end < fromDate) return false;
        if (toDate && start > toDate) return false;
        return true;
      });
    });
  }

  // Скрыть адреса для роли "user"
  if (!req.user || req.user.role === "user") {
    result = result.map((c) => ({ id: c.id, full_name: c.full_name, address: "скрыто" }));
  }

  res.json(result);
});

// Создать альпиниста (admin)
app.post("/climbers", requireAdmin, (req, res) => {
  const { full_name, address } = req.body || {};
  const c = { id: genId(), full_name, address };
  climbers.push(c);
  res.status(201).json(c);
});

// Обновить альпиниста (admin)
function updateClimber(req, res) {
  const id = ensureInt(req.params.id);
  const c = climbers.find((x) => x.id === id);
  if (!c) return res.status(404).send("Не найден");
  const { full_name, address } = req.body || {};
  if (full_name !== undefined) c.full_name = full_name;
  if (address !== undefined) c.address = address;
  res.json(c);
}
app.patch("/climbers/:id", requireAdmin, updateClimber);
app.put("/climbers/:id", requireAdmin, updateClimber);

// Удалить альпиниста (admin, если не состоит в группах)
app.delete("/climbers/:id", requireAdmin, (req, res) => {
  const id = ensureInt(req.params.id);
  const participates = groupMembers.some((gm) => gm.climber_id === id);
  if (participates) return res.status(400).send("Нельзя удалить: альпинист состоит в одной из групп");
  const before = climbers.length;
  climbers = climbers.filter((c) => c.id !== id);
  if (climbers.length === before) return res.status(404).send("Не найден");
  res.status(204).end();
});

// =======================
// STATS
// =======================

app.get("/stats/ascents-per-climber-per-mountain", (_req, res) => {
  const result = [];
  climbers.forEach((c) => {
    mountains.forEach((m) => {
      const count = groupMembers.filter(
        (gm) => gm.climber_id === c.id && groups.some((g) => g.id === gm.group_id && g.mountain_id === m.id)
      ).length;
      if (count > 0) result.push({ full_name: c.full_name, mountain: m.name, ascents_count: count });
    });
  });
  res.json(result);
});

app.get("/stats/unique-climbers-per-mountain", (_req, res) => {
  const result = mountains.map((m) => {
    const climberIds = new Set(
      groups
        .filter((g) => g.mountain_id === m.id)
        .flatMap((g) => groupMembers.filter((gm) => gm.group_id === g.id).map((gm) => gm.climber_id))
    );
    return { mountain: m.name, unique_climbers: climberIds.size };
  });
  res.json(result);
});

// =======================
// Диагностика (полезно при отладке)
// =======================
app.get("/__debug/routes", (_req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route?.path) {
      const methods = Object.keys(m.route.methods).map((x) => x.toUpperCase()).sort();
      routes.push({ path: m.route.path, methods });
    }
  });
  res.json(routes);
});

// =======================
// Запуск сервера
// =======================
const PORT = 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend API: http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
