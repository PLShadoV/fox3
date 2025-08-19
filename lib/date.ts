// lib/date.ts
// Small date helpers used across the app.

/** Format an integer hour (0..23) as HH:00 */
export function fmtHour(hour: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  return `${String(h).padStart(2, "0")}:00`;
}

/** Return YYYY-MM-DD for a given Date/string/epoch (in local time). */
export function toISODate(input?: Date | string | number): string {
  const d = input instanceof Date ? input : (input ? new Date(input) : new Date());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse 'YYYY-MM-DD' to a Date (local midnight). */
export function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split("-").map((x) => Number(x));
  // Months are 0-based in JS Date
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/** True if dateISO is the same local day as today. */
export function isToday(dateISO: string): boolean {
  return toISODate(new Date()) === dateISO;
}

/** Current local hour as integer (0..23). */
export function currentHour(): number {
  return new Date().getHours();
}

export default {};
