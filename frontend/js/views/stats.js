import { apiStats } from "../api.js";

/**
 * View: Статистика
 *  (6) Кол-во восхождений каждого альпиниста на каждую гору
 *  (9) Сколько уникальных альпинистов побывали на каждой горе
 */
export async function StatsView() {
  const container = document.createElement("div");

  const title = document.createElement("h1");
  title.textContent = "Статистика";
  container.appendChild(title);

  // Блок 1 — (6)
  const block1 = document.createElement("section");
  const h2_1 = document.createElement("h2");
  h2_1.textContent =
    "Количество восхождений каждого альпиниста на каждую гору";
  block1.appendChild(h2_1);

  const table1 = document.createElement("table");
  table1.innerHTML = `
    <thead>
      <tr>
        <th>Альпинист</th>
        <th>Гора</th>
        <th>Восхождений</th>
      </tr>
    </thead>
    <tbody><tr><td colspan="3">Загрузка…</td></tr></tbody>
  `;
  block1.appendChild(table1);
  container.appendChild(block1);

  // Блок 2 — (9)
  const block2 = document.createElement("section");
  const h2_2 = document.createElement("h2");
  h2_2.textContent = "Сколько уникальных альпинистов побывали на каждой горе";
  block2.appendChild(h2_2);

  const table2 = document.createElement("table");
  table2.innerHTML = `
    <thead>
      <tr>
        <th>Гора</th>
        <th>Уникальных альпинистов</th>
      </tr>
    </thead>
    <tbody><tr><td colspan="2">Загрузка…</td></tr></tbody>
  `;
  block2.appendChild(table2);
  container.appendChild(block2);

  // Загрузка данных
  await Promise.all([loadAscentsPerClimberPerMountain(), loadUniqueClimbers()]);

  return container;

  // ---------- helpers ----------

  async function loadAscentsPerClimberPerMountain() {
    const tbody = table1.querySelector("tbody");
    try {
      const rows = await apiStats.ascentsPerClimberPerMountain();
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">Нет данных</td></tr>`;
        return;
      }
      tbody.innerHTML = "";
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(r.full_name ?? r.climber ?? "-")}</td>
          <td>${escapeHtml(r.mountain ?? r.mountain_name ?? "-")}</td>
          <td>${Number(r.ascents_count ?? r.count ?? 0)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="3">Ошибка: ${err.message}</td></tr>`;
    }
  }

  async function loadUniqueClimbers() {
    const tbody = table2.querySelector("tbody");
    try {
      const rows = await apiStats.uniqueClimbersPerMountain();
      if (!rows || rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">Нет данных</td></tr>`;
        return;
      }
      tbody.innerHTML = "";
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(r.mountain ?? r.mountain_name ?? "-")}</td>
          <td>${Number(r.unique_climbers ?? r.count ?? 0)}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="2">Ошибка: ${err.message}</td></tr>`;
    }
  }
}

// Экранизация HTML
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
