/**
 * Универсальный компонент таблицы
 * @param {Object} config - конфигурация
 * @param {Array} config.columns - [{key, label}]
 * @param {Array} config.data - массив объектов
 * @returns {HTMLElement} DOM-элемент <table>
 */
export function Table({ columns, data }) {
  const table = document.createElement("table");

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.dataset.key = col.key;
    th.style.cursor = "pointer";
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  let currentData = [...data];
  let sortKey = null;
  let sortAsc = true;

  function renderBody() {
    tbody.innerHTML = "";
    if (!currentData.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = columns.length;
      td.textContent = "Нет данных";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    currentData.forEach((row) => {
      const tr = document.createElement("tr");
      columns.forEach((col) => {
        const td = document.createElement("td");
        td.textContent = row[col.key] ?? "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // Сортировка по клику
  trHead.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (sortKey === key) {
        sortAsc = !sortAsc;
      } else {
        sortKey = key;
        sortAsc = true;
      }
      currentData.sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (typeof av === "number" && typeof bv === "number") {
          return sortAsc ? av - bv : bv - av;
        }
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
      renderBody();
    });
  });

  renderBody();

  return table;
}
