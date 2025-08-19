"use client";

import { useEffect, useState } from "react";

type Row = { year: number; monthIndex: number; value: number };

function ymLabel(y: number, mi: number) {
  return `${y}-${String(mi + 1).padStart(2, "0")}`;
}

function coerceRows(j: any): Row[] | null {
  // 1) klasyk: { ok:true, rows:[...] }
  if (Array.isArray(j?.rows)) return j.rows as Row[];

  // 2) alternatywy: data.rows / prices / data.prices
  if (Array.isArray(j?.data?.rows)) return j.data.rows as Row[];
  if (Array.isArray(j?.prices)) return j.prices as Row[];
  if (Array.isArray(j?.data?.prices)) return j.data.prices as Row[];

  // 3) czasem ktoś zwróci słownik { "2025-07": 284.83, ... }
  // Spróbujmy zamienić na Row[]
  if (j && typeof j === "object" && !Array.isArray(j)) {
    // Szukamy kluczy YYYY-MM -> number
    const maybe = Object.entries(j)
      .filter(([k, v]) => /^\d{4}-\d{2}$/.test(k) && typeof v === "number")
      .map(([ym, val]) => {
        const [yy, mm] = ym.split("-").map(Number);
        return { year: yy, monthIndex: (mm - 1), value: val as number } as Row;
      });
    if (maybe.length) return maybe;
  }

  return null;
}

export default function MonthlyRCEmTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRaw(null);

    // Absolutny URL eliminuje problemy z basePath/emulacją.
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/rcem`
        : "/api/rcem";

    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`/api/rcem HTTP ${res.status}`);
        const j = await res.json();
        if (!cancelled) setRaw(() => {
          try { return JSON.stringify(j); } catch { return String(j); }
        });

        // Preferuj standard: { ok:true, rows:[...] }
        let data: Row[] | null = null;
        if (j?.ok === true && Array.isArray(j?.rows)) data = j.rows as Row[];
        else data = coerceRows(j);

        if (!data) {
          throw new Error("RCEm endpoint zwrócił nieoczekiwany kształt odpowiedzi");
        }

        const norm = data
          .map((r: any) => ({
            year: Number(r?.year),
            monthIndex: Number(r?.monthIndex),
            value: Number(r?.value),
          }))
          .filter(
            (r: Row) =>
              Number.isFinite(r.year) &&
              Number.isFinite(r.monthIndex) &&
              Number.isFinite(r.value)
          )
          // najnowsze na górze
          .sort((a, b) => (b.year - a.year) || (b.monthIndex - a.monthIndex));

        if (!cancelled) setRows(norm);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pv-card p-4">
      <div className="text-xl font-semibold mb-3">RCEm – miesięczne ceny (PLN/MWh)</div>

      {loading && <div className="opacity-80 text-sm">Ładowanie…</div>}

      {error && (
        <div className="text-red-400 text-sm break-words">
          {error}
          {raw && (
            <details className="mt-2 opacity-80">
              <summary className="cursor-pointer">Pokaż surową odpowiedź API</summary>
              <pre className="text-xs whitespace-pre-wrap break-words mt-1">{raw}</pre>
            </details>
          )}
        </div>
      )}

      {!loading && !error && (
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
