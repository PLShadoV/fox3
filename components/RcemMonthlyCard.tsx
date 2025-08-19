// components/RcemMonthlyCard.tsx
import React from "react";

type Row = { year: number; monthIndex: number; value: number };

function ymLabel(year: number, monthIndex: number) {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

export default async function RcemMonthlyCard() {
  let rows: Row[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/rcem`, {
      // fallback: jeśli NEXT_PUBLIC_BASE_URL nie ustawiony, użyj relatywnego:
      cache: "no-store",
    }).catch(() => fetch("/api/rcem", { cache: "no-store" }));

    if (!res || !res.ok) {
      throw new Error("Nie mogę pobrać /api/rcem");
    }
    const j = await res.json();

    const candidateArrays = [
      j?.rows,
      j?.data?.rows,
      j?.prices,
      j?.data?.prices,
    ].filter(Array.isArray) as Array<Row[]>;

    if (!candidateArrays.length) {
      throw new Error("Nieoczekiwany kształt odpowiedzi /api/rcem");
    }
    rows = candidateArrays[0]
      .map((r: any) => ({
        year: Number(r.year),
        monthIndex: Number(r.monthIndex),
        value: Number(r.value),
      }))
      .filter((r: Row) => Number.isFinite(r.year) && Number.isFinite(r.monthIndex) && Number.isFinite(r.value))
      // sortuj rosnąco po czasie
      .sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex));
  } catch (e: any) {
    error = e?.message || String(e);
  }

  return (
    <div className="pv-card p-4">
      <div className="text-xl font-semibold mb-3">RCEm – miesięczne ceny (PLN/MWh)</div>

      {error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[420px] text-sm">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="py-2 pr-4">Miesiąc</th>
                <th className="py-2">Cena [PLN/MWh]</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.year}-${r.monthIndex}`} className="border-b border-white/5">
                  <td className="py-1 pr-4 font-mono">{ymLabel(r.year, r.monthIndex)}</td>
                  <td className="py-1">{r.value.toFixed(2)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-2 opacity-70">
                    Brak danych do wyświetlenia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
