// frontend/js/state.js
// Минимальное состояние приложения: сессия пользователя и роль.
// Хранит токен/роль/имя в localStorage, даёт утилиты isAdmin(), isLoggedIn().

const AUTH_KEY = "alpclub_auth_v1";

// === Внутреннее состояние ===
let auth = loadAuth();

// --- helpers ---
function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.token || !obj.role) return null;
    return obj;
  } catch {
    return null;
  }
}
function persist() {
  if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_KEY);
}

// Простая шина событий (подписка на изменение auth)
const listeners = new Set();
function notify() {
  for (const cb of listeners) {
    try { cb(auth); } catch {}
  }
}

// === Публичный API ===

/** Вернёт объект аутентификации или null */
export function getAuth() {
  return auth;
}

/** Установка аутентификации {token, role, name, login} */
export function setAuth(nextAuth) {
  auth = nextAuth ? {
    token: nextAuth.token,
    role: nextAuth.role,
    name: nextAuth.name ?? "",
    login: nextAuth.login ?? "",
  } : null;
  persist();
  notify();
}

/** Очистить сессию */
export function clearAuth() {
  auth = null;
  persist();
  notify();
}

/** Пользователь вошёл? */
export function isLoggedIn() {
  return Boolean(auth && auth.token);
}

/** Пользователь — админ? */
export function isAdmin() {
  return Boolean(auth && auth.role === "admin");
}

/**
 * Подписка на изменения auth.
 * @param {(auth: {token,role,name,login}|null)=>void} cb
 * @returns {()=>void} unsubscribe
 */
export function onAuthChange(cb) {
  if (typeof cb === "function") {
    listeners.add(cb);
    // сразу дернем текущим значением для удобства
    try { cb(auth); } catch {}
  }
  return () => listeners.delete(cb);
}

/**
 * Хелпер для API: добавить Authorization заголовок, если токен есть.
 * @param {HeadersInit|undefined} headers
 * @returns {HeadersInit}
 */
export function withAuthHeader(headers = {}) {
  const base = headers instanceof Headers ? Object.fromEntries(headers.entries()) : { ...headers };
  if (auth?.token) {
    base["Authorization"] = `Bearer ${auth.token}`;
  }
  return base;
}
