export function fmtHour(h: number): string {
  const n = Math.max(0, Math.min(23, Math.floor(Number.isFinite(h) ? h : 0)));
  return `${n.toString().padStart(2, "0")}:00`;
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(s: string): Date {
  // Accept YYYY-MM-DD only; fall back to today if invalid
  if (!/\d{4}-\d{2}-\d{2}/.test(s)) return new Date();
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  // Construct in local time to match UI expectations
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isTodayISO(iso: string): boolean {
  try {
    const d = parseISODate(iso);
    return toISODate(d) === toISODate(new Date());
  } catch {
    return false;
  }
}

export function currentHourLocal(): number {
  return new Date().getHours();
}
