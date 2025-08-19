"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type View = "day" | "month" | "year";

type DayRow   = { hour: string; kwh: number };
type MonthRow = { day: string;  kwh: number };
type YearRow  = { month: string;kwh: number };

function ym(date: string) { return date.slice(0,7); }
function yyyy(date: string) { return date.slice(0,4); }

function addDays(d: string, delta: number) {
  const x = new Date(d + "T00:00:00");
  x.setDate(x.getDate() + delta);
  return x.toISOString().slice(0,10);
}
function addMonths(d: string, delta: number) {
  const x = new Date(d + "T00:00:00");
  x.setMonth(x.getMonth() + delta);
  return x.toISOString().slice(0,10);
}
function addYears(d: string, delta: number) {
  const x = new Date(d + "T00:00:00");
  x.setFullYear(x.getFullYear() + delta);
  return x.toISOString().slice(0,10);
}

async function getJSON(path: string){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.status}`);
  return res.json();
}

export default function RangeEnergyChart({ initialDate }: { initialDate: string }) {
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState<string>(initialDate); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [dayRows,   setDayRows]   = useState<DayRow[]>([]);
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [yearRows,  setYearRows]  = useState<YearRow[]>([]);

  // gdy zmienia się data z zewnątrz – zsynchronizuj kursor
  useEffect(()=>{ setCursor(initialDate); }, [initialDate]);

  // ładowanie danych pod aktywny widok
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        setLoading(true);
        setError(null);

        if (view === "day") {
          const j = await getJSON(`/api/foxess/summary/day-cached?date=${cursor}`);
          const series: number[] = j?.today?.generation?.series ?? [];
          const rows: DayRow[] = (Array.isArray(series) ? series : []).map((kwh, i) => ({
            hour: `${String(i).padStart(2,"0")}:00`,
            kwh: Number(kwh) || 0,
          }));
          if (!cancelled) setDayRows(rows);
        } else if (view === "month") {
          const j = await getJSON(`/api/foxess/summary/month?month=${ym(cursor)}`);
          const rows: MonthRow[] = (j?.days || []).map((d: any) => ({
            day: d?.date?.slice(-2) || "",
            kwh: Number(d?.generation) || 0,
          }));
          if (!cancelled) setMonthRows(rows);
        } else {
          const j = await getJSON(`/api/foxess/summary/year?year=${yyyy(cursor)}`);
          const rows: YearRow[] = (j?.months || []).map((m: any) => ({
            month: String(m?.month || ""),
            kwh: Number(m?.generation) || 0,
          }));
          if (!cancelled) setYearRows(rows);
        }
      } catch(e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return ()=>{ cancelled = true; };
  }, [view, cursor]);

  // dane do wykresu
  const chart = useMemo(()=>{
    if (view === "day") {
      return {
        data: dayRows.map(r => ({ label: r.hour, kwh: r.kwh })),
        labelTitle: "Godzina",
      };
    }
    if (view === "month") {
      return {
        data: monthRows.map(r => ({ label: r.day, kwh: r.kwh })),
        labelTitle: "Dzień",
      };
    }
    return {
      data: yearRows.map(r => ({ label: r.month, kwh: r.kwh })),
      labelTitle: "Miesiąc",
    };
  }, [view, dayRows, monthRows, yearRows]);

  const hasAny  = chart.data.length > 0;
  const allZero = hasAny && chart.data.every((r) => !r.kwh);

  // nawigacja
  function goPrev() {
    if (view === "day")   setCursor(addDays(cursor, -1));
    if (view === "month") setCursor(addMonths(cursor, -1));
    if (view === "year")  setCursor(addYears(cursor, -1));
  }
  function goNext() {
    if (view === "day")   setCursor(addDays(cursor, 1));
    if (view === "month") setCursor(addMonths(cursor, 1));
    if (view === "year")  setCursor(addYears(cursor, 1));
  }

  // podpis aktualnego zakresu
  const headerSubtitle =
    view === "day"   ? cursor :
    view === "month" ? ym(cursor) :
                       yyyy(cursor);

  return (
    <div className="pv-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">Produkcja energii [kWh]</div>
          <div className="text-xs opacity-70">{headerSubtitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setView("day")}   className={`pv-chip ${view==="day"   ? "pv-chip--active":""}`}>Dzień</button>
          <button onClick={() => setView("month")} className={`pv-chip ${view==="month" ? "pv-chip--active":""}`}>Miesiąc</button>
          <button onClick={() => setView("year")}  className={`pv-chip ${view==="year"  ? "pv-chip--active":""}`}>Rok</button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button onClick={goPrev} className="pv-chip">◀</button>
          <button onClick={goNext} className="pv-chip">▶</button>
        </div>
      </div>

      {loading && (
        <div className="h-72 grid place-items-center opacity-70 text-sm">Ładowanie…</div>
      )}

      {!loading && error && (
        <div className="h-72 grid place-items-center text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && !hasAny && (
        <div className="h-72 grid place-items-center opacity-70 text-sm">Brak danych do wyświetlenia.</div>
      )}

      {!loading && !error && hasAny && (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={60} unit=" kWh" />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toFixed(2)} kWh`, "Energia"]}
                  labelFormatter={(label) => `${chart.labelTitle}: ${label}`}
                />
                <Bar dataKey="kwh" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {allZero && (
            <div className="mt-2 text-xs opacity-70">
              Uwaga: wszystkie wartości wynoszą 0 kWh — wykres może wyglądać na pusty.
            </div>
          )}
        </>
      )}
    </div>
  );
}
