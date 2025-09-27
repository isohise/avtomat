import { apiMountains, apiGroups } from "../api.js";
import { isAdmin } from "../state.js";

/**
 * View: детальная страница горы
 * - список групп по горе в хронологическом порядке
 * - кнопка "Детали" доступна всем
 * - добавление/редактирование/удаление групп — только admin
 * @param {Array} params - [id]
 */
export async function MountainDetailView(params) {
  const mountainId = params[0];
  const container = document.createElement("div");

  // Узел для форм (создание/редактирование группы)
  const formsHost = document.createElement("div");
  formsHost.id = "forms-host";

  try {
    // Данные горы
    const mountain = await apiMountains.get(mountainId);

    const title = document.createElement("h1");
    title.textContent = `Вершина: ${mountain.name}`;
    container.appendChild(title);

    const info = document.createElement("p");
    info.innerHTML = `
      <strong>Высота:</strong> ${mountain.height_m} м<br/>
      <strong>Страна:</strong> ${escapeHtml(mountain.country)}<br/>
      <strong>Регион:</strong> ${escapeHtml(mountain.region || "-")}<br/>
      <strong>Количество восхождений:</strong> ${mountain.ascentCount || 0}
    `;
    container.appendChild(info);

    // Кнопка добавить группу — только для админа
    if (isAdmin()) {
      const addBtn = document.createElement("button");
      addBtn.className = "btn";
      addBtn.textContent = "Добавить группу на эту вершину";
      addBtn.addEventListener("click", () => openCreateForm());
      container.appendChild(addBtn);
    }

    container.appendChild(formsHost);

    // Список групп по горе
    const h2 = document.createElement("h2");
    h2.style.marginTop = "1rem";
    h2.textContent = "Группы восхождений";
    container.appendChild(h2);

    // Обёртка для красивых таблиц (необязательно, но приятно)
    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap";
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Название группы</th>
          <th>Дата начала</th>
          <th>Дата окончания</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody><tr><td colspan="4">Загрузка…</td></tr></tbody>
    `;
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    const tbody = table.querySelector("tbody");
    await loadGroups();

    // ===== helpers =====
    async function loadGroups() {
      closeForms();
      tbody.innerHTML = `<tr><td colspan="4">Загрузка…</td></tr>`;
      const groups = await apiMountains.groups(mountainId);
      if (!groups.length) {
        tbody.innerHTML = `<tr><td colspan="4">Нет восхождений</td></tr>`;
        return;
      }
      tbody.innerHTML = "";
      groups.forEach((g) => {
        const tr = document.createElement("tr");

        // Название — просто текст (НЕ ссылка)
        const nameTd = document.createElement("td");
        nameTd.textContent = g.name;
        tr.appendChild(nameTd);

        const sd = document.createElement("td");
        sd.textContent = g.start_date;
        tr.appendChild(sd);

        const ed = document.createElement("td");
        ed.textContent = g.end_date || "-";
        tr.appendChild(ed);

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
          // Редактировать — только admin
          const btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className = "btn btn-sm";
          btnEdit.textContent = "Редактировать";
          btnEdit.style.marginLeft = ".5rem";
          btnEdit.addEventListener("click", () => openEditForm(g));
          actions.appendChild(btnEdit);

          // Удалить — только admin
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
    }

    function openCreateForm() {
      if (!isAdmin()) return;
      closeForms();

      const wrap = document.createElement("div");
      wrap.id = "create-group-wrap";
      Object.assign(wrap.style, panelStyle());

      const closeBtn = makeCloseButton(() => wrap.remove());

      const h = document.createElement("h3");
      h.textContent = "Новая группа на эту вершину";

      const form = document.createElement("form");
      form.className = "panel";
      form.innerHTML = `
        <input type="text" name="name" placeholder="Название группы" required />
        <label>Дата начала: <input type="date" name="start_date" required /></label>
        <label>Дата окончания: <input type="date" name="end_date" /></label>
        <div style="display:flex; gap:.5rem; justify-content:flex-end;">
          <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
          <button type="submit" class="btn">Создать</button>
        </div>
      `;

      form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const payload = {
          name: data.name.trim(),
          mountain_id: parseInt(mountainId, 10),
          start_date: data.start_date,
          end_date: data.end_date || null,
        };
        if (!payload.name) return alert("Укажите название группы");
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

      wrap.append(closeBtn, h, form);
      formsHost.appendChild(wrap);
      wrap.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function openEditForm(group) {
      if (!isAdmin()) return;
      closeForms();

      const wrap = document.createElement("div");
      wrap.id = "edit-group-wrap";
      Object.assign(wrap.style, panelStyle());

      const closeBtn = makeCloseButton(() => wrap.remove());

      const h = document.createElement("h3");
      h.textContent = `Редактировать группу: ${group.name}`;

      const form = document.createElement("form");
      form.className = "panel";
      form.innerHTML = `
        <input type="text" name="name" placeholder="Название группы" required />
        <label>Дата начала: <input type="date" name="start_date" required /></label>
        <label>Дата окончания: <input type="date" name="end_date" /></label>
        <div style="display:flex; gap:.5rem; justify-content:flex-end;">
          <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
          <button type="submit" class="btn">Сохранить</button>
        </div>
      `;

      // Префилл
      form.name.value = group.name || "";
      form.start_date.value = group.start_date || "";
      form.end_date.value = group.end_date || "";

      form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const payload = {
          name: data.name.trim(),
          start_date: data.start_date,
          end_date: data.end_date || null,
        };
        if (!payload.name) return alert("Укажите название группы");
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

      wrap.append(closeBtn, h, form);
      formsHost.appendChild(wrap);
      wrap.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function closeForms() {
      formsHost.innerHTML = "";
    }
  } catch (err) {
    container.innerHTML = `<p class="error">Ошибка: ${escapeHtml(err.message)}</p>`;
  }

  return container;
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
