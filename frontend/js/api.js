// frontend/js/api.js
// Обёртки над fetch с поддержкой авторизации и единообразной обработкой ошибок.

import { withAuthHeader, clearAuth } from "./state.js";

const BASE_URL = "http://127.0.0.1:3000"; // адрес backend-сервера

/**
 * Универсальная функция запроса
 * - автоматически подставляет Authorization заголовок (если есть токен)
 * - единообразно парсит ошибку (текст из ответа)
 * - при 401 чистит сессию (токен устарел/невалиден)
 */
async function request(path, options = {}) {
  const init = {
    ...options,
    headers: withAuthHeader({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
  };

  let res;
  try {
    res = await fetch(BASE_URL + path, init);
  } catch (netErr) {
    console.error("Network error:", netErr);
    throw new Error("Не удалось выполнить запрос. Проверьте соединение с сервером.");
  }

  // Обработка не-OK статусов
  if (!res.ok) {
    // Попробуем вытащить текст ошибки
    const text = await safeText(res);
    // Если истекла авторизация — сбрасываем токен
    if (res.status === 401) {
      clearAuth();
      throw new Error("Требуется вход в систему");
    }
    if (res.status === 403) {
      throw new Error("Недостаточно прав для выполнения операции");
    }
    // Отдельно отдадим 404/400 как есть
    throw new Error(`Ошибка ${res.status}: ${text || "Неизвестная ошибка"}`);
  }

  if (res.status === 204) return null;

  // Пытаемся распарсить JSON (если есть)
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/** Хелпер для querystring */
function qs(params = {}) {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
}

// --------------------------- API методы ---------------------------

// Аутентификация
export const apiAuth = {
  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
};

// Горы
export const apiMountains = {
  list: () => request("/mountains"),
  get: (id) => request(`/mountains/${id}`),
  groups: (id) => request(`/mountains/${id}/groups?sort=start_date`),

  // защищено (admin)
  create: (data) =>
    request("/mountains", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/mountains/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/mountains/${id}`, {
      method: "DELETE",
    }),
};

// Группы
export const apiGroups = {
  list: (from, to) => request("/groups" + qs({ from, to })),
  get: (id) => request(`/groups/${id}`),

  // защищено (admin)
  create: (data) =>
    request("/groups", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/groups/${id}`, {
      method: "DELETE",
    }),
  addMember: (groupId, climberId) =>
    request(`/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ climber_id: climberId }),
    }),
};

// Альпинисты
export const apiClimbers = {
  list: (from, to) =>
    request("/climbers" + qs({ active_from: from, active_to: to })),

  // защищено (admin)
  create: (data) =>
    request("/climbers", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/climbers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/climbers/${id}`, {
      method: "DELETE",
    }),
};

// Статистика
export const apiStats = {
  ascentsPerClimberPerMountain: () =>
    request("/stats/ascents-per-climber-per-mountain"),
  uniqueClimbersPerMountain: () =>
    request("/stats/unique-climbers-per-mountain"),
};
