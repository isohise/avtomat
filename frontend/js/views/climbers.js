import { apiClimbers } from "../api.js";
import { isAdmin } from "../state.js";

/**
 * View: Альпинисты
 * - фильтр по интервалу дат
 * - admin: может создавать/редактировать/удалять и видит адреса
 * - user: без действий; колонка "Адрес" скрыта
 */
export async function ClimbersView() {
  const admin = isAdmin();
  const container = document.createElement("div");

  // Заголовок
  const title = document.createElement("h1");
  title.textContent = "Альпинисты";
  container.appendChild(title);

  // Фильтр по интервалу дат
  const filterForm = document.createElement("form");
  filterForm.className = "form-inline";
  filterForm.innerHTML = `
    <h3 style="margin-right:.5rem;">Фильтр по датам восхождений</h3>
    <label>С: <input type="date" name="from"></label>
    <label>По: <input type="date" name="to"></label>
    <button type="submit" class="btn">Показать</button>
    <button type="button" id="resetFilter" class="btn btn-secondary">Сбросить</button>
    ${admin ? `<button type="button" id="openCreate" class="btn" style="margin-left:.5rem;">Добавить альпиниста</button>` : ""}
  `;
  container.appendChild(filterForm);

  // Узел для форм
  const formsHost = document.createElement("div");
  formsHost.id = "forms-host";
  container.appendChild(formsHost);

  // Таблица списка (обёртка для красоты)
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>ФИО</th>
        ${admin ? `<th>Адрес</th>` : ``}
        ${admin ? `<th>Действия</th>` : ``}
      </tr>
    </thead>
    <tbody><tr><td ${admin ? `colspan="3"` : `colspan="1"`}>Загрузка…</td></tr></tbody>
  `;
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);
  const tbody = table.querySelector("tbody");

  // Обработчики фильтра
  filterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await loadClimbers();
  });
  filterForm.querySelector("#resetFilter").addEventListener("click", async () => {
    filterForm.from.value = "";
    filterForm.to.value = "";
    await loadClimbers();
  });
  const openCreateBtn = filterForm.querySelector("#openCreate");
  if (openCreateBtn) openCreateBtn.addEventListener("click", () => openCreateForm());

  // Первая загрузка
  await loadClimbers();

  return container;

  // ---------------- функции ------------------

  async function loadClimbers() {
    closeForms();
    tbody.innerHTML = `<tr><td ${admin ? `colspan="3"` : `colspan="1"`}>Загрузка…</td></tr>`;
    try {
      const from = filterForm.from.value || undefined;
      const to = filterForm.to.value || undefined;
      const list = await apiClimbers.list(from, to);

      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td ${admin ? `colspan="3"` : `colspan="1"`}>Нет данных</td></tr>`;
        return;
      }

      tbody.innerHTML = "";
      list.forEach((c) => {
        const tr = document.createElement("tr");

        // ФИО
        const nameTd = document.createElement("td");
        nameTd.textContent = c.full_name;
        tr.appendChild(nameTd);

        // Адрес — только админ
        if (admin) {
          const addrTd = document.createElement("td");
          addrTd.textContent = c.address ?? "";
          tr.appendChild(addrTd);
        }

        // Действия — только админ
        if (admin) {
          const actions = document.createElement("td");
          actions.style.whiteSpace = "nowrap";

          // Редактировать
          const btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className = "btn btn-sm";
          btnEdit.textContent = "Редактировать";
          btnEdit.addEventListener("click", () => openEditForm(c));
          actions.appendChild(btnEdit);

          // Удалить
          const btnDel = document.createElement("button");
          btnDel.type = "button";
          btnDel.className = "btn btn-danger btn-sm";
          btnDel.textContent = "Удалить";
          btnDel.style.marginLeft = ".5rem";
          btnDel.addEventListener("click", async () => {
            if (!confirm(`Удалить альпиниста "${c.full_name}"?`)) return;
            try {
              await apiClimbers.delete(c.id);
              await loadClimbers();
            } catch (err) {
              alert("Ошибка: " + err.message);
            }
          });
          actions.appendChild(btnDel);

          tr.appendChild(actions);
        }

        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td ${admin ? `colspan="3"` : `colspan="1"`}>Ошибка: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // --------- Создание (admin) ----------
  function openCreateForm() {
    if (!admin) return;
    closeForms();

    const wrap = document.createElement("div");
    wrap.id = "create-climber-wrap";
    Object.assign(wrap.style, panelStyle());

    const closeBtn = makeCloseButton(() => wrap.remove());

    const h = document.createElement("h3");
    h.textContent = "Новый альпинист";

    const form = document.createElement("form");
    form.className = "panel";
    form.innerHTML = `
      <input type="text" name="full_name" placeholder="ФИО" required />
      <input type="text" name="address" placeholder="Адрес" required />
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
        <button type="submit" class="btn">Добавить</button>
      </div>
    `;

    form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.full_name.trim()) return alert("Укажите ФИО");
      if (!data.address.trim()) return alert("Укажите адрес");

      try {
        await apiClimbers.create({
          full_name: data.full_name.trim(),
          address: data.address.trim(),
        });
        wrap.remove();
        await loadClimbers();
        alert("Альпинист добавлен");
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    });

    wrap.append(closeBtn, h, form);
    formsHost.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // --------- Редактирование (admin) ----------
  function openEditForm(climber) {
    if (!admin) return;
    closeForms();

    const wrap = document.createElement("div");
    wrap.id = "edit-climber-wrap";
    Object.assign(wrap.style, panelStyle());

    const closeBtn = makeCloseButton(() => wrap.remove());

    const h = document.createElement("h3");
    h.textContent = `Редактировать: ${climber.full_name}`;

    const form = document.createElement("form");
    form.className = "panel";
    form.innerHTML = `
      <input type="text" name="full_name" placeholder="ФИО" required />
      <input type="text" name="address" placeholder="Адрес" required />
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="button" class="btn btn-outline" id="cancel">Отмена</button>
        <button type="submit" class="btn">Сохранить</button>
      </div>
    `;

    // Префилл
    form.full_name.value = climber.full_name || "";
    form.address.value = climber.address || "";

    form.querySelector("#cancel").addEventListener("click", () => wrap.remove());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.full_name.trim()) return alert("Укажите ФИО");
      if (!data.address.trim()) return alert("Укажите адрес");

      try {
        await apiClimbers.update(climber.id, {
          full_name: data.full_name.trim(),
          address: data.address.trim(),
        });
        wrap.remove();
        await loadClimbers();
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

// Экранизация HTML
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Стили панели формы
function panelStyle() {
  return {
    marginTop: "1rem",
    position: "relative",
    padding: "0.75rem",
    border: "1px solid #dee2e6",
    borderRadius: "12px",
    background: "#fff",
    boxShadow:
      "0 1px 2px rgba(16,24,40,.04), 0 10px 25px rgba(30,102,245,.07)",
  };
}

// Кнопка закрытия (крестик)
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
