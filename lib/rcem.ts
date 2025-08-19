// lib/rcem.ts
// Fixed RCEm table (PLN/MWh) and helpers.

export const RCEM_TABLE: Record<string, number> = {
  "2025-07": 284.83,
  "2025-06": 136.30,
  "2025-05": 216.97,
  "2025-04": 163.19,
  "2025-03": 182.96,
  "2025-02": 442.02,
  "2025-01": 480.01,
  "2024-12": 304.63,
  "2024-11": 380.35,
  "2024-10": 311.67,
  "2024-08": 241.94,
  "2024-06": 330.47,
  "2024-05": 255.59,
  "2024-03": 249.12,
  "2024-02": 324.25,
  "2024-01": 437.02,
  "2023-12": 716.80,
  "2023-11": 703.81
};

/** Get RCEm PLN/MWh for a given YYYY-MM-DD (picks by month). */
export function rcemFor(dateISO: string): number | null {
  if (!dateISO || typeof dateISO !== "string" || dateISO.length < 7) return null;
  const ym = dateISO.slice(0, 7);
  return RCEM_TABLE[ym] ?? null;
}

/** Return the whole RCEm table (immutable copy). */
export function rcemTable(): Record<string, number> {
  return { ...RCEM_TABLE };
}

/** Compute revenue in PLN from RCEm for given kWh generated on dateISO. */
export function revenueFromRCEm(kwh: number, dateISO: string): number {
  const price = rcemFor(dateISO);
  if (price == null) return 0;
  // PLN = kWh * (PLN/MWh) / 1000
  const pln = (Number(kwh) || 0) * (Number(price) || 0) / 1000;
  return Math.round(pln * 100) / 100;
}

export default {};
