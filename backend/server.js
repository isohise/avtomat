// backend/server.js

const db = require('./db/db');

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// Логирование запросов
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// =======================
// In-memory demo data
// =======================

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

// =======================
// Auth helpers
// =======================

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

app.use(authOptional);

// =======================
// DB diagnostics
// =======================

app.get("/db/tables", (_req, res) => {
  db.all(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
    (err, rows) => {
      if (err) return res.status(500).json({ error: String(err) });
      res.json(rows.map(r => r.name));
    }
  );
});

// =======================
// Auth routes
// =======================

app.post("/auth/login", (req, res) => {
  const { login, password } = req.body || {};
  const u = users.find((x) => x.login === login && x.password === password);
  if (!u) return res.status(401).send("Неверный логин или пароль");

  const token = makeToken();
  sessions.set(token, { userId: u.id, role: u.role, name: u.name });
  res.json({ token, role: u.role, name: u.name, login: u.login });
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
});

app.post("/auth/logout", requireAuth, (req, res) => {
  sessions.delete(req.user.token);
  res.status(204).end();
});

// =======================
// Utils
// =======================

const { ensureInt } = require('./utils/ensureInt');

// =======================
// MOUNTAINS
// =======================

app.get("/mountains", (_req, res) => {
  const result = mountains.map((m) => ({
    ...m,
    ascentCount: groups.filter((g) => g.mountain_id === m.id).length,
  }));
  res.json(result);
});

app.post("/mountains", requireAdmin, (req, res) => {
  const { name, height_m, country, region } = req.body || {};
  const m = { id: genId(), name, height_m, country, region: region || "" };
  mountains.push(m);
  res.status(201).json(m);
});

// =======================
// START SERVER (only when run напрямую)
// =======================

const PORT = 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend API: http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
