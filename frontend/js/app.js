// frontend/js/app.js
// Точка входа SPA: шапка, авторизация, общий render() и запуск роутера.

import { initRouter, navigateTo } from "./router.js";
import { apiAuth } from "./api.js";
import {
  getAuth,
  setAuth,
  clearAuth,
  isLoggedIn,
  isAdmin,
  onAuthChange,
} from "./state.js";

// Корневые узлы
const headerEl = document.getElementById("site-header");
const appRoot = document.getElementById("app-root");
const footerEl = document.getElementById("site-footer");

/* =========================
   Унифицированный РЕНДЕР
   ========================= */
export async function render(View, params = []) {
  if (!appRoot) return;
  appRoot.innerHTML = `
    <div class="view-skeleton">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `;
  try {
    const node = await View(params);
    appRoot.innerHTML = "";
    if (node instanceof Node) {
      appRoot.appendChild(node);
    } else {
      appRoot.innerHTML = String(node ?? "");
    }
  } catch (e) {
    appRoot.innerHTML = `<p class="error">Ошибка: ${escapeHtml(e?.message || e)}</p>`;
  }
}

/* =========================
   ШАПКА
   ========================= */
function renderHeader() {
  if (!headerEl) return;
  headerEl.innerHTML = `
    <div class="container header-inner">
      <a class="brand" href="#/mountains" title="К списку гор">
        <img class="brand-logo" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/26f0.svg" alt="⛰️" width="22" height="22" />
        Альпклуб
      </a>
      <nav class="nav" aria-label="Основная навигация">
        <a class="nav-link" href="#/mountains">Горы</a>
        <a class="nav-link" href="#/groups">Группы</a>
        <a class="nav-link" href="#/climbers">Альпинисты</a>
        <a class="nav-link" href="#/stats">Статистика</a>
      </nav>
      <div class="auth-area">
        ${
          isLoggedIn()
            ? authBlockHtml(getAuth())
            : `<button class="btn btn-outline btn-sm" id="btn-open-login" type="button">Войти</button>`
        }
      </div>
    </div>
  `;

  // клик "Войти"
  const openBtn = headerEl.querySelector("#btn-open-login");
  if (openBtn) openBtn.addEventListener("click", openLoginModal);

  // клик "Выйти"
  const logoutBtn = headerEl.querySelector("#btn-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", onLogout);
}

function authBlockHtml(auth) {
  const roleRu = auth.role === "admin" ? "админ" : "пользователь";
  return `
    <div style="display:flex; align-items:center; gap:.5rem;">
      <span class="muted">${escapeHtml(auth.name || auth.login)} • ${roleRu}</span>
      <button class="btn btn-outline btn-sm" id="btn-logout" type="button">Выйти</button>
    </div>
  `;
}

/* =========================
   Модалка логина
   ========================= */
function openLoginModal() {
  if (document.getElementById("login-modal-root")) {
    document.getElementById("login-modal-root").classList.add("open");
    return;
  }

  const root = document.createElement("div");
  root.className = "modal-root open";
  root.id = "login-modal-root";

  root.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div class="modal-header">
        <h3 id="login-title" style="margin:0;">Вход в аккаунт</h3>
        <button class="btn-close" id="login-close" aria-label="Закрыть">✕</button>
      </div>
      <div class="modal-content">
        <form id="login-form" class="panel" style="margin:0;">
          <label>Логин
            <input type="text" name="login" placeholder="admin или user" required />
          </label>
          <label>Пароль
            <input type="password" name="password" placeholder="admin123 или user123" required />
          </label>
          <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:.25rem;">
            <button type="button" class="btn btn-outline" id="login-cancel">Отмена</button>
            <button type="submit" class="btn" id="login-submit">Войти</button>
          </div>
          <p class="helper" style="margin-top:.4rem;">Демо: <code>admin/admin123</code> или <code>user/user123</code></p>
        </form>
        <div id="login-error" class="alert alert-danger" style="display:none; margin-top:.6rem;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const close = () => root.classList.remove("open");
  root.addEventListener("click", (e) => { if (e.target === root) close(); });
  root.querySelector("#login-close").addEventListener("click", close);
  root.querySelector("#login-cancel").addEventListener("click", close);

  const form = root.querySelector("#login-form");
  const errorEl = root.querySelector("#login-error");
  const submitBtn = root.querySelector("#login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";
    submitBtn.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const me = await apiAuth.login({
        login: data.login.trim(),
        password: data.password,
      });
      setAuth(me);
      close();
    } catch (err) {
      errorEl.textContent = err.message || "Ошибка входа";
      errorEl.style.display = "block";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function onLogout() {
  try { await apiAuth.logout(); } catch {}
  clearAuth();
}

/* =========================
   ИНИЦИАЛИЗАЦИЯ
   ========================= */

// Проверяем валидность локальной сессии на старте,
// рендерим шапку и запускаем роутер.
(async () => {
  try {
    const me = await apiAuth.me(); // если токен валиден — вернёт профиль
    if (me?.token) setAuth(me);
  } catch {
    clearAuth(); // токен невалиден/нет сети — обнуляем локально
  } finally {
    renderHeader();
    initRouter(); // первый рендер страницы
  }
})();

// Перерисовывать шапку и текущую страницу при смене auth
onAuthChange(() => {
  renderHeader();
  navigateTo(location.hash || "#/mountains", { replace: true });
});

/* =========================
   Утилиты
   ========================= */
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// (footerEl можем использовать позже; сейчас он статичный)
// === Надёжный делегированный клик "Войти" + запасной prompt-вход ===
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("#btn-open-login");
  if (!btn) return;

  // Пытаемся открыть модалку (основной путь)
  try {
    openLoginModal();
    // Проверим, что модалка реально появилась
    setTimeout(() => {
      const exists = document.getElementById("login-modal-root");
      if (!exists || !exists.classList.contains("open")) {
        throw new Error("modal-not-opened");
      }
    }, 0);
  } catch {
    // Запасной путь: простой prompt-вход
    try {
      const login = window.prompt("Логин (например, admin или user):", "admin");
      if (!login) return;
      const password = window.prompt("Пароль:", login === "admin" ? "admin123" : "user123");
      if (!password) return;
      const me = await apiAuth.login({ login: login.trim(), password });
      setAuth(me);
      alert(`Вход выполнен: ${me.name || me.login} (${me.role})`);
    } catch (err) {
      alert("Ошибка входа: " + (err?.message || err));
    }
  }
});
