// frontend/js/router.js
// Простой hash-роутер. Поддерживает пути:
// #/mountains
// #/mountains/123
// #/groups
// #/groups/45
// #/climbers
// #/stats

import { render } from "./app.js";

// Вьюхи
import { MountainsView } from "./views/mountains.js";
import { MountainDetailView } from "./views/mountainDetail.js";
import { GroupsView } from "./views/groups.js";
import { GroupDetailView } from "./views/groupDetail.js";
import { ClimbersView } from "./views/climbers.js";
import { StatsView } from "./views/stats.js";

// Таблица маршрутов (по приоритету)
const routes = [
  { pattern: /^#\/?$/, view: MountainsView, params: [] }, // корень -> mountains
  { pattern: /^#\/mountains$/, view: MountainsView, params: [] },
  { pattern: /^#\/mountains\/(\d+)$/, view: MountainDetailView },
  { pattern: /^#\/groups$/, view: GroupsView, params: [] },
  { pattern: /^#\/groups\/(\d+)$/, view: GroupDetailView },
  { pattern: /^#\/climbers$/, view: ClimbersView, params: [] },
  { pattern: /^#\/stats$/, view: StatsView, params: [] },
];

// Рендерит соответствующую страницу
async function handleRoute() {
  const hash = location.hash || "#/";
  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (m) {
      const params = r.params ?? m.slice(1); // параметры из RegExp
      await render(r.view, params);
      return;
    }
  }

  // 404
  await render(async () => {
    const div = document.createElement("div");
    div.innerHTML = `<h1>Страница не найдена</h1><p>Маршрут: ${escapeHtml(hash)}</p>`;
    return div;
  });
}

// Инициализация
export function initRouter() {
  handleRoute(); // первый рендер
  window.addEventListener("hashchange", handleRoute);
}

// Программная навигация
export function navigateTo(hash, { replace = false } = {}) {
  const h = hash.startsWith("#") ? hash : "#" + hash;
  if (replace) {
    history.replaceState(null, "", h);
    handleRoute();
  } else {
    location.hash = h;
  }
}

// Утилита
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
