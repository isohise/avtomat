import { apiGroups, apiClimbers } from "../api.js";
import { isAdmin } from "../state.js";

/**
 * View: детальная страница группы
 * - показывает информацию о группе и её участниках
 * - admin: видит адреса, формы добавления участника (существующего/нового)
 * - user: адреса скрыты, формы добавления скрыты
 */
export async function GroupDetailView(params) {
  const groupId = params[0];
  const container = document.createElement("div");

  const title = document.createElement("h1");
  title.textContent = "Группа";
  container.appendChild(title);

  const info = document.createElement("p");
  container.appendChild(info);

  const h2 = document.createElement("h2");
  h2.textContent = "Участники";
  container.appendChild(h2);

  // Таблица участников — у user без колонки «Адрес»
  const showAddress = isAdmin();
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>ФИО</th>
        ${showAddress ? `<th>Адрес</th>` : ``}
      </tr>
    </thead>
    <tbody><tr><td ${showAddress ? `colspan="2"` : ""}>Загрузка…</td></tr></tbody>
  `;
  container.appendChild(table);
  const tbody = table.querySelector("tbody");

  // Блоки добавления участников — только admin
  let addExistingWrap = null;
  let addNewWrap = null;

  if (isAdmin()) {
    addExistingWrap = document.createElement("div");
    addExistingWrap.style.marginTop = "1rem";
    addExistingWrap.innerHTML = `<h3>Добавить существующего альпиниста</h3>`;
    const addExistingForm = document.createElement("form");
    addExistingForm.className = "panel";
    addExistingForm.innerHTML = `
      <label style="display:flex;gap:.5rem;align-items:center;">
        Альпинист:
        <select name="climber_id" required>
          <option value="" disabled selected>— выберите —</option>
        </select>
      </label>
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="submit" class="btn">Добавить в группу</button>
      </div>
    `;
    addExistingWrap.appendChild(addExistingForm);
    container.appendChild(addExistingWrap);

    addNewWrap = document.createElement("div");
    addNewWrap.style.marginTop = "1rem";
    addNewWrap.innerHTML = `<h3>Добавить нового альпиниста</h3>`;
    const addNewForm = document.createElement("form");
    addNewForm.className = "panel";
    addNewForm.innerHTML = `
      <input type="text" name="full_name" placeholder="ФИО" required />
      <input type="text" name="address" placeholder="Адрес" required />
      <div style="display:flex; gap:.5rem; justify-content:flex-end;">
        <button type="submit" class="btn">Создать и добавить</button>
      </div>
    `;
    addNewWrap.appendChild(addNewForm);
    container.appendChild(addNewWrap);

    // Обработчик: добавить существующего в группу
    addExistingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const climber_id = Number(
        addExistingForm.querySelector("select[name='climber_id']").value
      );
      if (!climber_id) return alert("Выберите альпиниста");

      try {
        await apiGroups.addMember(groupId, climber_id);
        await load();
        alert("Добавлено");
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    });

    // Обработчик: создать нового + добавить в группу
    addNewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(addNewForm).entries());
      if (!data.full_name.trim()) return alert("Укажите ФИО");
      if (!data.address.trim()) return alert("Укажите адрес");

      try {
        const created = await apiClimbers.create({
          full_name: data.full_name.trim(),
          address: data.address.trim(),
        });
        await apiGroups.addMember(groupId, created.id);
        addNewForm.reset();
        await load();
        alert("Альпинист создан и добавлен");
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    });

    // Заполнение селекта существующих альпинистов (только admin)
    fillClimbersSelect().catch(() => {
      const warn = document.createElement("p");
      warn.className = "muted";
      warn.textContent = "Не удалось загрузить список альпинистов.";
      addExistingWrap.appendChild(warn);
    });
  }

  // Первая загрузка данных
  await load();

  return container;

  // ---------------- helpers ----------------

  async function load() {
    try {
      const g = await apiGroups.get(groupId);
      title.textContent = `Группа: ${g.name}`;
      info.innerHTML = `
        <strong>Вершина:</strong> ${escapeHtml(g.mountain_name ?? "-")}<br/>
        <strong>Начало:</strong> ${g.start_date}<br/>
        <strong>Окончание:</strong> ${g.end_date || "-"}
      `;

      const members = g.members || [];
      if (!members.length) {
        tbody.innerHTML = `<tr><td ${showAddress ? `colspan="2"` : ""}>В группе пока нет участников</td></tr>`;
      } else {
        tbody.innerHTML = "";
        members.forEach((c) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${escapeHtml(c.full_name)}</td>
            ${showAddress ? `<td>${escapeHtml(c.address)}</td>` : ``}
          `;
          tbody.appendChild(tr);
        });
      }

      // Если admin — обновим селект (мог добавиться новый человек ранее)
      if (isAdmin()) {
        await fillClimbersSelect();
      }
    } catch (err) {
      container.innerHTML = `<p class="error">Ошибка: ${escapeHtml(err.message)}</p>`;
    }
  }

  async function fillClimbersSelect() {
    if (!isAdmin()) return;
    const allClimbers = await apiClimbers.list(); // бэкенд сам скроет адреса для user, но тут админ
    const select = addExistingWrap.querySelector("select[name='climber_id']");
    select.innerHTML =
      `<option value="" disabled selected>— выберите —</option>` +
      allClimbers
        .map(
          (c) =>
            `<option value="${c.id}">${escapeHtml(c.full_name)}${c.address ? " — " + escapeHtml(c.address) : ""}</option>`
        )
        .join("");
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
