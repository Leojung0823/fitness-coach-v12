const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

/** e.g. "(一)" for Monday, "(日)" for Sunday. */
export function weekdayLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `(${WEEKDAY_LABELS[d.getDay()]})`;
}

/** "2026/8/12 (三) 14:30" */
export function formatDateTimeWithWeekday(dateStr: string): string {
  const d = new Date(dateStr);
  const datePart = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const timePart = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${datePart} ${weekdayLabel(d)} ${timePart}`;
}

/** "2026/8/12 (三)" — no time component. */
export function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${weekdayLabel(d)}`;
}
