"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((ents) => {
      const width = Math.floor(ents[0].contentRect.width);
      setW(width > 0 ? width : 0);
    });
    ro.observe(el);
    setW(el.clientWidth > 0 ? el.clientWidth : 0);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w };
}

function ym(date: string) { return date.slice(0,7); }
function yyyy(date: string) { return date.slice(0,4); }

function add(date: string, type: View, delta: number) {
  const d = new Date(date + "T00:00:00");
  if (type === "day") d.setDate(d.getDate() + delta);
  if (type === "month") d.setMonth(d.getMonth() + delta);
  if (type === "year") d.setFullYear(d.getFullYear() + delta);
  return d.toISOString().slice(0,10);
}

async function getJSON(path: string){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.status}`);
  return res.json();
}

export default function RangeEnergyChart({ initialDate }: { initialDate: string }) {
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState<string>(initialDate);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [dayRows,   setDayRows]   = useState<DayRow[]>([]);
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [yearRows,  setYearRows]  = useState<YearRow[]>([]);
  const H = 288;
  const { ref, width } = useMeasuredWidth();

  useEffect(()=>{ setCursor(initialDate); }, [initialDate]);

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

  const chart = useMemo(()=>{
    if (view === "day")   return { data: dayRows.map(r => ({ label: r.hour,  kwh: r.kwh })), labelTitle: "Godzina" };
    if (view === "month") return { data: monthRows.map(r => ({ label: r.day,   kwh: r.kwh })), labelTitle: "Dzień" };
    return { data: yearRows.map(r => ({ label: r.month, kwh: r.kwh })), labelTitle: "Miesiąc" };
  }, [view, dayRows, monthRows, yearRows]);

  const hasAny  = chart.data.length > 0;
  const allZero = hasAny && chart.data.every(d => !d.kwh);

  const subtitle = view === "day" ? cursor : view === "month" ? ym(cursor) : yyyy(cursor);

  return (
    <div className="pv-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">Produkcja energii [kWh]</div>
          <div className="text-xs opacity-70">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("day")}   className={`pv-chip ${view==="day"   ? "pv-chip--active":""}`}>Dzień</button>
          <button onClick={() => setView("month")} className={`pv-chip ${view==="month" ? "pv-chip--active":""}`}>Miesiąc</button>
          <button onClick={() => setView("year")}  className={`pv-chip ${view==="year"  ? "pv-chip--active":""}`}>Rok</button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => setCursor(add(cursor, view, -1))} className="pv-chip">◀</button>
          <button onClick={() => setCursor(add(cursor, view,  1))} className="pv-chip">▶</button>
        </div>
      </div>

      <div ref={ref} className="w-full" style={{ height: H }}>
        {loading && <div className="h-full grid place-items-center opacity-70 text-sm">Ładowanie…</div>}
        {!loading && error && <div className="h-full grid place-items-center text-red-400 text-sm">{error}</div>}
        {!loading && !error && !hasAny && <div className="h-full grid place-items-center opacity-70 text-sm">Brak danych do wyświetlenia.</div>}
        {!loading && !error && hasAny && width <= 0 && (
          <div className="h-full grid place-items-center opacity-70 text-sm">Oczekiwanie na rozmiar kontenera…</div>
        )}
        {!loading && !error && hasAny && width > 0 && (
          <BarChart width={width} height={H} data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={60} unit=" kWh" />
            <Tooltip
              formatter={(val: any) => [`${Number(val).toFixed(2)} kWh`, "Energia"]}
              labelFormatter={(label) => `${chart.labelTitle}: ${label}`}
            />
            <Bar dataKey="kwh" fill="#10b981" />
          </BarChart>
        )}
      </div>

      {hasAny && allZero && (
        <div className="mt-2 text-xs opacity-70">
          Uwaga: wszystkie wartości wynoszą 0 kWh — wykres może wyglądać na pusty.
        </div>
      )}
    </div>
  );
}
