// lib/rcem.ts
// Tabela RCEm (PLN/MWh) dostarczona przez użytkownika.
// Klucze w formacie 'YYYY-MM'.
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

// Zwraca cenę RCEm (PLN/MWh) dla dowolnej daty (Date lub 'YYYY-MM-DD').
// Jeśli brak w tabeli, zwraca null.
export function rcemFor(dateLike: Date | string): number | null {
  let yearMonth: string;
  if (dateLike instanceof Date) {
    yearMonth = dateLike.toISOString().slice(0, 7);
  } else {
    // 'YYYY-MM-DD' -> 'YYYY-MM'
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(dateLike)) return null;
    yearMonth = dateLike.slice(0, 7);
  }
  return RCEM_TABLE[yearMonth] ?? null;
}

// Zwraca obiekt tabeli do łatwego użycia w UI.
export function rcemTable(): Record<string, number> {
  return RCEM_TABLE;
}

// Funkcja pomocnicza do liczenia przychodu na bazie RCEm.
// generationKWh – ilość energii (kWh) w danym dniu
// dateLike – data tego dnia
// Zwraca przychód w PLN (kWh * PLN/MWh / 1000)
export function revenueFromRCEm(generationKWh: number, dateLike: Date | string): number | null {
  const priceMWh = rcemFor(dateLike);
  if (priceMWh == null) return null;
  return (generationKWh * priceMWh) / 1000;
}
