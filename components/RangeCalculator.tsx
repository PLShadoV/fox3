"use client";

import { useState } from "react";

type Mode = "rce" | "rcem";

type RangeResult = {
  total_kwh: number;
  revenue_pln: number | null;
  rcemMonth?: string | null;
  rcemPrice?: number | null; // PLN/MWh
};

async function getJSON(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.status}`);
  return res.json();
}

function ym(date: string) { return date.slice(0, 7); }

export default function RangeCalculator() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<Mode>("rcem"); // domyślnie RCEm
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<RangeResult | null>(null);

  async function onCompute() {
    try {
      setLoading(true);
      setErr(null);
      setResult(null);

      if (!from || !to) {
        throw new Error("Uzupełnij obie daty: Od i Do (YYYY-MM-DD).");
      }
      if (from > to) {
        throw new Error("Data Od nie może być po dacie Do.");
      }

      // 1) Sumuj ENERGIĘ (kWh) sekwencyjnie po wszystkich dniach
      const r = await getJSON(`/api/foxess/summary/range?from=${from}&to=${to}`);
      if (!r?.ok) throw new Error(r?.error || "Błąd liczenia zakresu");
      const total_kwh: number = Number(r?.total_kwh ?? 0) || 0;

      // 2) Przychód
      if (mode === "rcem") {
        // bierzemy RCEm z miesiąca daty "Do"
        const month = ym(to);
        const rc = await getJSON(`/api/rcem`);
        const rows: any[] = Array.isArray(rc?.rows) ? rc.rows : [];
        const [y, m] = month.split("-").map(Number);
        const hit = rows.find((x) => Number(x?.year) === y && Number(x?.monthIndex) === (m - 1));
        const price = Number(hit?.value); // PLN/MWh
        if (!Number.isFinite(price)) {
          // jeżeli brak miesiąca — weź ostatni dostępny wpis
          const last = rows[rows.length - 1];
          if (last && Number.isFinite(Number(last?.value))) {
            const p = Number(last.value);
            setResult({
              total_kwh,
              revenue_pln: +(total_kwh * (p / 1000)).toFixed(2),
              rcemMonth: `${last.year}-${String((last.monthIndex ?? 0) + 1).padStart(2, "0")}`,
              rcemPrice: p,
            });
          } else {
            // nie ma RCEm — pokaż tylko kWh
            setResult({ total_kwh, revenue_pln: null, rcemMonth: null, rcemPrice: null });
          }
        } else {
          setResult({
            total_kwh,
            revenue_pln: +(total_kwh * (price / 1000)).toFixed(2),
            rcemMonth: month,
            rcemPrice: price,
          });
        }
      } else {
        // Tryb RCE (godzinowe) – jeśli chcesz, tu można podłączyć istniejący endpoint revenue/range
        // Tymczasowo pokażemy tylko sumę kWh
        setResult({ total_kwh, revenue_pln: null });
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pv-card p-4 mt-6">
      <div className="text-xl font-semibold mb-3">Kalkulator zakresu (suma GENERATION i przychodu)</div>

      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex flex-col">
          <label className="text-sm mb-1">Od</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="pv-input" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1">Do</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="pv-input" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Tryb</span>
          <button onClick={() => setMode("rce")}  className={`pv-chip ${mode === "rce" ? "pv-chip--active" : ""}`}>RCE</button>
          <button onClick={() => setMode("rcem")} className={`pv-chip ${mode === "rcem" ? "pv-chip--active" : ""}`}>RCEm</button>
        </div>
        <button onClick={onCompute} disabled={loading} className="pv-btn self-start">{loading ? "Liczenie…" : "Oblicz"}</button>
      </div>

      <div className="mt-4 space-y-2">
        {err && <div className="text-red-400">{err}</div>}
        {result && (
          <div className="text-lg">
            Suma <span className="font-semibold">GENERATION:</span> {result.total_kwh.toFixed(2)} kWh
            {mode === "rcem" && (
              <>
                , <span className="font-semibold">przychód (RCEm):</span>{" "}
                {result.revenue_pln != null ? `${result.revenue_pln.toFixed(2)} PLN` : "—"}
                {result.rcemPrice != null && (
                  <span className="text-xs opacity-70"> (cena {result.rcemMonth}: {result.rcemPrice} PLN/MWh)</span>
                )}
              </>
            )}
            {mode === "rce" && (
              <span className="text-xs opacity-70"> (przychód RCE: podłącz, jeśli masz endpoint revenue/range)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
