/**
 * Универсальный компонент формы
 * @param {Object} config
 * @param {Array} config.fields - массив полей [{name, label, type, required, placeholder}]
 * @param {Function} config.onSubmit - обработчик отправки (data) => Promise|void
 * @param {String} [config.submitText="Сохранить"]
 * @returns {HTMLFormElement}
 */
export function Form({ fields, onSubmit, submitText = "Сохранить" }) {
  const form = document.createElement("form");

  fields.forEach((f) => {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.flexDirection = "column";
    label.style.marginBottom = "0.5rem";

    label.textContent = f.label + (f.required ? " *" : "");

    const input =
      f.type === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");

    input.name = f.name;
    input.type = f.type || "text";
    if (f.placeholder) input.placeholder = f.placeholder;
    if (f.required) input.required = true;

    label.appendChild(input);
    form.appendChild(label);
  });

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = submitText;
  form.appendChild(submit);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    // Простая валидация
    for (const f of fields) {
      if (f.required && !data[f.name]) {
        alert(`Поле "${f.label}" обязательно`);
        return;
      }
    }

    try {
      submit.disabled = true;
      await onSubmit(data);
      form.reset();
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      submit.disabled = false;
    }
  });

  return form;
}
