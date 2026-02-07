/**
 * Local-timezone date helpers.
 * Avoids the UTC pitfall of `new Date().toISOString().slice()`.
 */

/** Returns "YYYY-MM" in local timezone. */
export function localYearMonth(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Returns "YYYY-MM-DD" in local timezone. */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
