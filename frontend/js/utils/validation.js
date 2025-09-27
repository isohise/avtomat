/**
 * Набор простых валидаторов и вспомогательных функций
 */

/** Проверка: непустая строка */
export function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/** Проверка: целое положительное число */
export function isPositiveInt(v) {
  if (v === null || v === undefined || v === "") return false;
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}

/** Проверка: дата в формате YYYY-MM-DD */
export function isISODate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Проверка: start <= end (учитывая, что end может быть null) */
export function isValidDateRange(start, end) {
  if (!isISODate(start)) return false;
  if (!end) return true; // открытый интервал допустим
  if (!isISODate(end)) return false;
  return new Date(start) <= new Date(end);
}

/** Бросает ошибку, если условие ложно */
export function assert(condition, message = "Ошибка валидации") {
  if (!condition) throw new Error(message);
}

/**
 * Композитная валидация вершины
 * @param {{name:string,height_m:number,country:string,region?:string}} m
 */
export function validateMountain(m) {
  assert(isNonEmptyString(m.name), "Название вершины обязательно");
  assert(isPositiveInt(m.height_m), "Высота должна быть положительным целым");
  assert(isNonEmptyString(m.country), "Страна обязательна");
  // region может быть пустым
}

/**
 * Композитная валидация группы (восхождения)
 * @param {{name:string,mountain_id:number,start_date:string,end_date?:string|null}} g
 */
export function validateGroup(g) {
  assert(isNonEmptyString(g.name), "Название группы обязательно");
  assert(isPositiveInt(g.mountain_id), "Некорректная вершина");
  assert(isISODate(g.start_date), "Дата начала должна быть YYYY-MM-DD");
  if (g.end_date) assert(isISODate(g.end_date), "Дата окончания должна быть YYYY-MM-DD");
  assert(isValidDateRange(g.start_date, g.end_date), "Диапазон дат некорректен");
}

/**
 * Композитная валидация альпиниста
 * @param {{full_name:string,address:string}} c
 */
export function validateClimber(c) {
  assert(isNonEmptyString(c.full_name), "ФИО обязательно");
  assert(isNonEmptyString(c.address), "Адрес обязателен");
}
