// app/api/rcem/route.ts
import { NextResponse } from "next/server";

// Statyczne RCEm [PLN/MWh] z PSE (aktualne do 2025-07).
// Format: { year, monthIndex (0=styczeń ... 11=grudzień), value }
const RCEM_ROWS: Array<{ year: number; monthIndex: number; value: number }> = [
  // 2022
  { year: 2022, monthIndex: 5, value: 659.29 },  // czerwiec
  { year: 2022, monthIndex: 6, value: 799.79 },  // lipiec
  { year: 2022, monthIndex: 7, value: 1023.42 }, // sierpień
  { year: 2022, monthIndex: 8, value: 711.92 },  // wrzesień
  { year: 2022, monthIndex: 9, value: 577.24 },  // październik
  { year: 2022, monthIndex: 10, value: 703.81 }, // listopad
  { year: 2022, monthIndex: 11, value: 716.80 }, // grudzień

  // 2023
  { year: 2023, monthIndex: 0, value: 596.56 },
  { year: 2023, monthIndex: 1, value: 667.59 },
  { year: 2023, monthIndex: 2, value: 509.72 },
  { year: 2023, monthIndex: 3, value: 506.60 },
  { year: 2023, monthIndex: 4, value: 381.44 },
  { year: 2023, monthIndex: 5, value: 454.62 },
  { year: 2023, monthIndex: 6, value: 440.38 },
  { year: 2023, monthIndex: 7, value: 413.37 },
  { year: 2023, monthIndex: 8, value: 405.51 },
  { year: 2023, monthIndex: 9, value: 311.67 },
  { year: 2023, monthIndex: 10, value: 380.35 },
  { year: 2023, monthIndex: 11, value: 304.63 },

  // 2024
  { year: 2024, monthIndex: 0, value: 437.02 },
  { year: 2024, monthIndex: 1, value: 324.25 },
  { year: 2024, monthIndex: 2, value: 249.12 },
  { year: 2024, monthIndex: 3, value: 253.69 },
  { year: 2024, monthIndex: 4, value: 255.59 },
  { year: 2024, monthIndex: 5, value: 330.47 },
  { year: 2024, monthIndex: 6, value: 283.59 },
  { year: 2024, monthIndex: 7, value: 241.94 },
  { year: 2024, monthIndex: 8, value: 222.62 },
  { year: 2024, monthIndex: 9, value: 289.92 },
  { year: 2024, monthIndex: 10, value: 399.04 },
  { year: 2024, monthIndex: 11, value: 470.23 },

  // 2025
  { year: 2025, monthIndex: 0, value: 480.01 },
  { year: 2025, monthIndex: 1, value: 442.02 },
  { year: 2025, monthIndex: 2, value: 182.96 },
  { year: 2025, monthIndex: 3, value: 163.19 },
  { year: 2025, monthIndex: 4, value: 216.97 },
  { year: 2025, monthIndex: 5, value: 136.30 },
  { year: 2025, monthIndex: 6, value: 284.83 },
];

export const dynamic = "force-static";      // stała odpowiedź
export const revalidate = 60 * 60 * 24;     // 24h (na wszelki wypadek)

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      updated_to: "2025-07",
      source: "https://www.pse.pl/oire/rcem-rynkowa-miesieczna-cena-energii-elektrycznej",
      rows: RCEM_ROWS,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
