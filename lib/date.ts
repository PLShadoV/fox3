// lib/date.ts
export function fmtHour(i: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(i)));
  return `${String(h).padStart(2, "0")}:00`;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  // Accept 'YYYY-MM-DD'
  const dt = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) {
    throw new Error("Invalid ISO date string");
  }
  return dt;
}

export function isTodayISO(s: string): boolean {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return s === iso;
}

// Returns the current hour in local time (0..23)
export function currentHourLocal(): number {
  const now = new Date();
  return now.getHours();
}
