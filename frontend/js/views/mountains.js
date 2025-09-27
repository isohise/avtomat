import { apiMountains } from "../api.js";
import { isAdmin } from "../state.js";

/**
 * View: список гор
 * Роли:
 * - admin: видит кнопки Добавить / Редактировать / Удалить
 * - user: только просмотр
 */
export async function MountainsView() {
  const container = document.createElement("div");

  const title = document.createElement("h1");
  title.textContent = "Список гор";
  container.appendChild(title);

  // Узел для форм (create/edit)
  const formsHost = document.createElement("div");
  formsHost.id = "forms-host";
  container.appendChild(formsHost);

  // Кнопка добавить вершину — только для админа
  if (isAdmin()) {
    const addBtn = document.createElement("button");
    addBtn.className = "btn";
    addBtn.textContent = "Добавить вершину";
    addBtn.addEventListener("click", () => openCreateForm());
    container.appendChild(addBtn);
  }

  // Таблица гор
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Название</th>
      <th>Высота (м)</th>
      <th>Страна</th>
      <th>Регион</th>
      <th>Восхождений</th>
      <th>Действия</th>
    </tr>`;
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  container.appendChild(table);

  await loadMountains();

  return container;

  // ---------------- helpers ----------------

  async function loadMountains() {
    closeForms();
    tbody.innerHTML = `<tr><td colspan="6">Загрузка…</td></tr>`;
    try {
      const mountains = await apiMountains.list();
      if (!mountains.length) {
        tbody.innerHTML = `<tr><td colspan="6">Нет данных</td></tr>`;
        return;
      }
      tbody.innerHTML = "";
      mountains.forEach((m) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(m.name)}</td>
          <td>${Number(m.height_m)}</td>
          <td>${escapeHtml(m.country)}</td>
          <td>${escapeHtml(m.region || "")}</td>
          <td>${Number(m.ascentCount || 0)}</td>
          <td style="white-space:nowrap;"></td>
        `;
        const actions = tr.querySelector("td:last-child");

        // Просмотр (детали вершины) — доступно всем
        const btnView = document.createElement("button");
        btnView.type = "button";
        btnView.className = "btn btn-outline btn-sm";
        btnView.textContent = "Просмотр";
        btnView.addEventListener("click", () => {
          window.location.hash = `#/mountains/${m.id}`;
        });
        actions.appendChild(btnView);

        // Остальные действия — только админ и только если нет восхождений (для edit/delete)
        if (isAdmin()) {
          if (!m.ascentCount) {
            const btnEdit = document.createElement("button");
            btnEdit.type = "button";
            btnEdit.className = "btn btn-sm";
            btnEdit.textContent = "Редактировать";
            btnEdit.style.marginLeft = ".5rem";
            btnEdit.addEventListener("click", () => openEditForm(m));
            actions.appendChild(btnEdit);

            const btnDel = document.createElement("button");
            btnDel.type = "button";
            btnDel.className = "btn btn-danger btn-sm";
            btnDel.textContent = "Удалить";
            btnDel.style.marginLeft = ".5rem";
            btnDel.addEventListener("click", async () => {
              if (!confirm(`Удалить вершину "${m.name}"?`)) return;
              try {
                await apiMountains.delete(m.id);
                await loadMountains();
              } catch (err) {
                alert("Ошибка: " + err.message);
              }
            });
            actions.appendChild(btnDel);
          }
        }

        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">Ошибка: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function openCreateForm() {
    if (!isAdmin()) return; // защита на всякий случай
    closeForms();

    const wrap = document.createElement("div");
    wrap.id = "create-mountain-wrap";
    Object.assign(wrap.style, panelStyle());

    const closeBtn = makeCloseButton(() => wrap.remove());

    const h = document.createElement("h3");
    h.textContent = "Новая вершина";

    const form = document.createElement("form");
    form.className = "panel";
    form.innerHTML = `
      <input type="text" name="name" placeholder="Название" required />
      <input type="number" name="height_m" placeholder="Высота (м)" required />
      <input type="text" name="country" placeholder="Страна" required />
      <input type="text" name="region" placeholder="Регион" />
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
        <button type="submit" class="btn">Сохранить</button>
      </div>
    `;

    form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: data.name.trim(),
        height_m: parseInt(data.height_m, 10),
        country: data.country.trim(),
        region: (data.region || "").trim(),
      };
      if (!payload.name) return alert("Укажите название");
      if (!Number.isInteger(payload.height_m) || payload.height_m <= 0)
        return alert("Высота должна быть положительным целым");
      if (!payload.country) return alert("Укажите страну");

      try {
        await apiMountains.create(payload);
        wrap.remove();
        await loadMountains();
        alert("Вершина создана");
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    });

    wrap.append(closeBtn, h, form);
    formsHost.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openEditForm(mountain) {
    if (!isAdmin()) return;
    closeForms();

    const wrap = document.createElement("div");
    wrap.id = "edit-mountain-wrap";
    Object.assign(wrap.style, panelStyle());

    const closeBtn = makeCloseButton(() => wrap.remove());

    const h = document.createElement("h3");
    h.textContent = `Редактировать: ${mountain.name}`;

    const form = document.createElement("form");
    form.className = "panel";
    form.innerHTML = `
      <input type="text" name="name" placeholder="Название" required />
      <input type="number" name="height_m" placeholder="Высота (м)" required />
      <input type="text" name="country" placeholder="Страна" required />
      <input type="text" name="region" placeholder="Регион" />
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
        <button type="submit" class="btn">Сохранить изменения</button>
      </div>
    `;

    // Префилл
    form.name.value = mountain.name || "";
    form.height_m.value = mountain.height_m || "";
    form.country.value = mountain.country || "";
    form.region.value = mountain.region || "";

    form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: data.name.trim(),
        height_m: parseInt(data.height_m, 10),
        country: data.country.trim(),
        region: (data.region || "").trim(),
      };
      if (!payload.name) return alert("Укажите название");
      if (!Number.isInteger(payload.height_m) || payload.height_m <= 0)
        return alert("Высота должна быть положительным целым");
      if (!payload.country) return alert("Укажите страну");

      try {
        await apiMountains.update(mountain.id, payload);
        wrap.remove();
        await loadMountains();
        alert("Сохранено");
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    });

    wrap.append(closeBtn, h, form);
    formsHost.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function closeForms() {
    formsHost.innerHTML = "";
  }
}

// Локальные утилиты
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function panelStyle() {
  return {
    marginTop: "1rem",
    position: "relative",
    padding: "0.75rem",
    border: "1px solid #dee2e6",
    borderRadius: "12px",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 10px 25px rgba(30,102,245,.07)",
  };
}
function makeCloseButton(onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-close";
  btn.textContent = "✕";
  btn.setAttribute("aria-label", "Закрыть форму");
  Object.assign(btn.style, {
    position: "absolute",
    top: "6px",
    right: "6px",
  });
  btn.addEventListener("click", onClick);
  return btn;
}
