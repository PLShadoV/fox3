const TABLE: Record<string, number> = {
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

export function rcemFor(dateISO: string): number | null {
  // dateISO: "YYYY-MM-DD"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;
  const month = dateISO.slice(0,7);
  return TABLE[month] ?? null;
}

export function rcemTable() {
  return Object.entries(TABLE).sort((a,b)=>a[0]<b[0]?1:-1).map(([month, price]) => ({ month, price }));
}
