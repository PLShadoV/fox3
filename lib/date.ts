export function fmtHour(i: number): string {
  const hh = String(i).padStart(2, '0');
  return `${hh}:00`;
}
