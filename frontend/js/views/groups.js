import { apiGroups, apiMountains } from "../api.js";
import { isAdmin } from "../state.js";

/**
 * View: список групп (восхождений)
 * Роли:
 * - admin: видит кнопки Добавить / Редактировать / Удалить
 * - user: только фильтр и просмотр + кнопка "Детали"
 */
export async function GroupsView() {
  const container = document.createElement("div");

  // Заголовок
  const title = document.createElement("h1");
  title.textContent = "Группы восхождений";
  container.appendChild(title);

  // Фильтр по датам
  const filterForm = document.createElement("form");
  filterForm.className = "form-inline";
  filterForm.setAttribute("aria-label", "Фильтр по датам");
  filterForm.innerHTML = `
    <h3 style="margin-right:.5rem;">Фильтр</h3>
    <label>С даты: <input type="date" name="from"></label>
    <label>По дату: <input type="date" name="to"></label>
    <button type="submit" class="btn">Показать</button>
    <button type="button" id="resetFilter" class="btn btn-secondary">Сбросить</button>
    ${isAdmin() ? `<button type="button" id="openCreate" class="btn" style="margin-left:.5rem;">Добавить группу</button>` : ""}
  `;
  container.appendChild(filterForm);

  // Контейнер для форм
  const formsHost = document.createElement("div");
  formsHost.id = "forms-host";
  container.appendChild(formsHost);

  // Таблица результатов (в обёртке)
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Название группы</th>
        <th>Вершина</th>
        <th>Дата начала</th>
        <th>Дата окончания</th>
        <th>Действия</th>
      </tr>
    </thead>
    <tbody><tr><td colspan="5">Загрузка…</td></tr></tbody>
  `;
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
  const tbody = table.querySelector("tbody");

  // Обработчики фильтра
  filterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await loadGroups();
  });
  filterForm.querySelector("#resetFilter").addEventListener("click", async () => {
    filterForm.from.value = "";
    filterForm.to.value = "";
    await loadGroups();
  });
  const openCreateBtn = filterForm.querySelector("#openCreate");
  if (openCreateBtn) openCreateBtn.addEventListener("click", () => openCreateForm());

  // Первая загрузка
  await loadGroups();

  return container;

  // --------- Загрузка списка ----------
  async function loadGroups() {
    closeForms();
    tbody.innerHTML = `<tr><td colspan="5">Загрузка…</td></tr>`;
    try {
      const from = filterForm.from.value || undefined;
      const to = filterForm.to.value || undefined;
      const groups = await apiGroups.list(from, to);

      if (!groups || groups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">Нет данных</td></tr>`;
        return;
      }

      tbody.innerHTML = "";
      groups.forEach((g) => {
        const tr = document.createElement("tr");

        const nameTd = document.createElement("td");
        nameTd.textContent = g.name; // НЕ ссылка — детали по кнопке
        tr.appendChild(nameTd);

        const mtd = document.createElement("td");
        mtd.textContent = g.mountain_name ?? g.mountain?.name ?? "-";
        tr.appendChild(mtd);

        const std = document.createElement("td");
        std.textContent = g.start_date;
        tr.appendChild(std);

        const etd = document.createElement("td");
        etd.textContent = g.end_date || "-";
        tr.appendChild(etd);

        const actions = document.createElement("td");
        actions.style.whiteSpace = "nowrap";

        // Детали — доступно всем
        const btnDetails = document.createElement("button");
        btnDetails.type = "button";
        btnDetails.className = "btn btn-outline btn-sm";
        btnDetails.textContent = "Детали";
        btnDetails.addEventListener("click", () => {
          window.location.hash = `#/groups/${g.id}`;
        });
        actions.appendChild(btnDetails);

        if (isAdmin()) {
          // Редактировать
          const btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className = "btn btn-sm";
          btnEdit.textContent = "Редактировать";
          btnEdit.style.marginLeft = ".5rem";
          btnEdit.addEventListener("click", () => openEditForm(g));
          actions.appendChild(btnEdit);

          // Удалить
          const btnDel = document.createElement("button");
          btnDel.type = "button";
          btnDel.className = "btn btn-danger btn-sm";
          btnDel.textContent = "Удалить";
          btnDel.style.marginLeft = ".5rem";
          btnDel.addEventListener("click", async () => {
            if (!confirm(`Удалить группу "${g.name}"?`)) return;
            try {
              await apiGroups.delete(g.id);
              await loadGroups();
            } catch (err) {
              alert("Ошибка: " + err.message);
            }
          });
          actions.appendChild(btnDel);
        }

        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5">Ошибка: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ---------- Форма создания (admin) ----------
  async function openCreateForm() {
    if (!isAdmin()) return;
    closeForms();
    const wrap = document.createElement("div");
    wrap.id = "create-group-wrap";
    Object.assign(wrap.style, panelStyle());

    const closeBtn = makeCloseButton(() => wrap.remove());

    const title = document.createElement("h3");
    title.textContent = "Новая группа";

    // Список вершин
    let mountains = [];
    try {
      mountains = await apiMountains.list();
    } catch (e) {
      // допускаем пустой список
    }

    const form = document.createElement("form");
    form.className = "panel";
    form.innerHTML = `
      <input type="text" name="name" placeholder="Название группы" required />
      <label>Вершина:
        <select name="mountain_id" required>
          <option value="" disabled selected>— выберите вершину —</option>
          ${mountains
            .map(
              (m) =>
                `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(
                  m.country
                )}${m.region ? ", " + escapeHtml(m.region) : ""})</option>`
            )
            .join("")}
        </select>
      </label>
      <label>Дата начала: <input type="date" name="start_date" required /></label>
      <label>Дата окончания: <input type="date" name="end_date" /></label>
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
        <button type="submit" class="btn">Создать группу</button>
      </div>
    `;

    form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: data.name.trim(),
        mountain_id: parseInt(data.mountain_id, 10),
        start_date: data.start_date,
        end_date: data.end_date || null,
      };
      if (!payload.name) return alert("Укажите название группы");
      if (!payload.mountain_id) return alert("Выберите вершину");
      if (!payload.start_date) return alert("Укажите дату начала");

      try {
        await apiGroups.create(payload);
        wrap.remove();
        await loadGroups();
        alert("Группа создана");
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    });

    wrap.append(closeBtn, title, form);
    formsHost.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---------- Форма редактирования (admin) ----------
  async function openEditForm(group) {
    if (!isAdmin()) return;
    closeForms();
    const wrap = document.createElement("div");
    wrap.id = "edit-group-wrap";
    Object.assign(wrap.style, panelStyle());

    const closeBtn = makeCloseButton(() => wrap.remove());

    const title = document.createElement("h3");
    title.textContent = `Редактировать группу: ${group.name}`;

    // Для смены вершины дадим селект (опционально)
    let mountains = [];
    try {
      mountains = await apiMountains.list();
    } catch {}

    const form = document.createElement("form");
    form.className = "panel";
    form.innerHTML = `
      <input type="text" name="name" placeholder="Название группы" required />
      <label>Вершина:
        <select name="mountain_id" required>
          <option value="" disabled>— выберите вершину —</option>
          ${mountains
            .map(
              (m) =>
                `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(
                  m.country
                )}${m.region ? ", " + escapeHtml(m.region) : ""})</option>`
            )
            .join("")}
        </select>
      </label>
      <label>Дата начала: <input type="date" name="start_date" required /></label>
      <label>Дата окончания: <input type="date" name="end_date" /></label>
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
        <button type="submit" class="btn">Сохранить</button>
      </div>
    `;

    // Префилл текущих значений
    form.name.value = group.name || "";
    if (group.mountain_id) form.mountain_id.value = group.mountain_id;
    form.start_date.value = group.start_date || "";
    form.end_date.value = group.end_date || "";

    form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: data.name.trim(),
        mountain_id: parseInt(data.mountain_id, 10),
        start_date: data.start_date,
        end_date: data.end_date || null,
      };
      if (!payload.name) return alert("Укажите название группы");
      if (!payload.mountain_id) return alert("Выберите вершину");
      if (!payload.start_date) return alert("Укажите дату начала");

      try {
        await apiGroups.update(group.id, payload);
        wrap.remove();
        await loadGroups();
        alert("Сохранено");
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    });

    wrap.append(closeBtn, title, form);
    formsHost.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function closeForms() {
    formsHost.innerHTML = "";
  }
}

// Простейшая экранизация пользовательского ввода
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
