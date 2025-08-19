"use client";

import { useEffect, useState } from "react";

type Row = { year: number; monthIndex: number; value: number };

function ymLabel(year: number, monthIndex: number) {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

export default function RcemMonthlyCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/rcem", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`/api/rcem HTTP ${res.status}`);
        const j = await res.json();

        const candidate =
          (Array.isArray(j?.rows) && j.rows) ||
          (Array.isArray(j?.data?.rows) && j.data.rows) ||
          (Array.isArray(j?.prices) && j.prices) ||
          (Array.isArray(j?.data?.prices) && j.data.prices) ||
          [];

        const norm: Row[] = candidate
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
          .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);

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
