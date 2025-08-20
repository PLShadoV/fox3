"use client";

import { useState } from "react";

type Mode = "rce" | "rcem";

type RangeResult = {
  total_kwh: number;
  revenue_pln: number | null;
  rcemMonth?: string | null;
  rcemPrice?: number | null; // PLN/MWh
  failedDates?: string[];
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

      if (!from || !to) throw new Error("Uzupełnij daty: Od i Do (YYYY-MM-DD).");
      if (from > to) throw new Error("Data Od nie może być po dacie Do.");

      // RCEm: użyj miesiąca z „Do”; chcesz inny – łatwo to dodać w UI
      const params = new URLSearchParams({ from, to, mode });
      if (mode === "rcem") params.set("rcemMonth", ym(to));

      const r = await getJSON(`/api/revenue/range?${params.toString()}`);
      if (!r?.ok) throw new Error(r?.error || "Błąd liczenia przychodu");

      setResult({
        total_kwh: Number(r?.total_kwh ?? 0) || 0,
        revenue_pln: r?.revenue_pln == null ? null : Number(r.revenue_pln),
        rcemMonth: r?.rcemMonth ?? null,
        rcemPrice: r?.rcemPrice == null ? null : Number(r.rcemPrice),
        failedDates: Array.isArray(r?.failedDates) ? r.failedDates : [],
      });
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
        <button onClick={onCompute} disabled={loading} className="pv-btn self-start">
          {loading ? "Liczenie…" : "Oblicz"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {err && <div className="text-red-400">{err}</div>}
        {result && (
          <>
            <div className="text-lg">
              Suma <span className="font-semibold">GENERATION:</span> {result.total_kwh.toFixed(2)} kWh
              {mode === "rcem" && (
                <>
                  , <span className="font-semibold">przychód (RCEm):</span>{" "}
                  {result.revenue_pln != null ? `${result.revenue_pln.toFixed(2)} PLN` : "—"}
                  {result.rcemPrice != null && (
                    <span className="text-xs opacity-70">
                      {" "} (cena {result.rcemMonth}: {result.rcemPrice} PLN/MWh)
                    </span>
                  )}
                </>
              )}
              {mode === "rce" && (
                <>
                  , <span className="font-semibold">przychód (RCE):</span>{" "}
                  {result.revenue_pln != null ? `${result.revenue_pln.toFixed(2)} PLN` : "—"}
                </>
              )}
            </div>
            {result.failedDates && result.failedDates.length > 0 && (
              <div className="text-xs opacity-80">
                Uwaga: nie udało się pobrać danych dla dni: {result.failedDates.slice(0, 6).join(", ")}
                {result.failedDates.length > 6 ? "…" : ""}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
