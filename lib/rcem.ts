// RCEm helpers — simple lookups by month (PLN/MWh).
// Provide revenue calculation using monthly RCEm price.
export type RCEmTable = Record<string, number>; // "YYYY-MM" -> PLN/MWh

const TABLE: RCEmTable = {
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

/** Get RCEm price (PLN/MWh) for a given date "YYYY-MM-DD". */
export function rcemFor(dateISO: string): number | null {
  if (!dateISO) return null;
  const key = dateISO.slice(0, 7);
  return Object.prototype.hasOwnProperty.call(TABLE, key) ? TABLE[key] : null;
}

/** Shallow copy of full RCEm table (for displaying in UI). */
export function rcemTable(): RCEmTable {
  return { ...TABLE };
}

/** Compute revenue in PLN from RCEm monthly price. */
export function revenueFromRCEm(kWh: number, dateISO: string): number {
  const price = rcemFor(dateISO);
  if (price == null) return 0;
  // PLN = kWh * (PLN/MWh) / 1000
  const pln = (Number(kWh) || 0) * price / 1000;
  return Math.round(pln * 100) / 100; // 2 decimal places
}
