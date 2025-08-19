// Utility date helpers for the dashboard
// All functions operate in LOCAL time (not UTC).

/** Format hour (0-23) as "HH:00". */
export function fmtHour(h: number): string {
  const n = Math.max(0, Math.min(23, Math.floor(Number(h) || 0)));
  return `${String(n).padStart(2, "0")}:00`;
}

/** Convert Date (local) to ISO date "YYYY-MM-DD". */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" into Date at local midnight. */
export function parseISODate(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m as number) - 1, d);
}

/** Check if given ISO date is today (local). */
export function isTodayISO(iso: string): boolean {
  try {
    const today = toISODate(new Date());
    return today === iso;
  } catch {
    return false;
  }
}

/** Current local hour (0-23). */
export function currentHourLocal(): number {
  return new Date().getHours();
}
