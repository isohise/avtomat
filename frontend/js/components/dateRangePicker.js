/**
 * Компонент выбора диапазона дат
 * @param {Object} config
 * @param {Function} config.onChange - callback({from, to})
 * @returns {HTMLElement}
 */
export function DateRangePicker({ onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "date-range-picker";
  wrap.style.display = "flex";
  wrap.style.gap = "0.5rem";
  wrap.style.flexWrap = "wrap";
  wrap.style.alignItems = "center";

  const fromInput = document.createElement("input");
  fromInput.type = "date";
  fromInput.name = "from";

  const toInput = document.createElement("input");
  toInput.type = "date";
  toInput.name = "to";

  const btnApply = document.createElement("button");
  btnApply.type = "button";
  btnApply.textContent = "Применить";

  const btnReset = document.createElement("button");
  btnReset.type = "button";
  btnReset.textContent = "Сброс";
  btnReset.className = "secondary";

  const presets = document.createElement("select");
  presets.innerHTML = `
    <option value="">Быстрый выбор</option>
    <option value="thisMonth">Текущий месяц</option>
    <option value="thisYear">Текущий год</option>
    <option value="lastYear">Прошлый год</option>
  `;

  wrap.append("С:", fromInput, "По:", toInput, btnApply, btnReset, presets);

  // Обработчики
  btnApply.addEventListener("click", () => {
    onChange({
      from: fromInput.value || null,
      to: toInput.value || null,
    });
  });

  btnReset.addEventListener("click", () => {
    fromInput.value = "";
    toInput.value = "";
    presets.value = "";
    onChange({ from: null, to: null });
  });

  presets.addEventListener("change", () => {
    const today = new Date();
    if (presets.value === "thisMonth") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      fromInput.value = formatDate(first);
      toInput.value = formatDate(last);
    } else if (presets.value === "thisYear") {
      fromInput.value = `${today.getFullYear()}-01-01`;
      toInput.value = `${today.getFullYear()}-12-31`;
    } else if (presets.value === "lastYear") {
      const y = today.getFullYear() - 1;
      fromInput.value = `${y}-01-01`;
      toInput.value = `${y}-12-31`;
    }
  });

  return wrap;
}

// Вспомогательная функция форматирования YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
