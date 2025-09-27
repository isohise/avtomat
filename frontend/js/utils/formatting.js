/**
 * Утилиты форматирования
 */

/** Экранирование HTML для вывода */
export function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Форматирование даты в удобный вид (ДД.ММ.ГГГГ) */
export function formatDateRu(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Форматирование числа с пробелами-разделителями */
export function formatNumber(n) {
  if (n === null || n === undefined) return "";
  return Number(n).toLocaleString("ru-RU");
}

/** Усечение строки до maxLen с троеточием */
export function truncate(str, maxLen = 50) {
  if (typeof str !== "string") return str;
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}
