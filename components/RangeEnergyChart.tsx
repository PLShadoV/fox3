"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Mode = "day" | "month" | "year";

type Props = {
  /** opcjonalna startowa data YYYY-MM-DD (np. z DashboardClient) */
  initialDate?: string;
};

/* ================== UTILS DATY – CZYSTY UTC ================== */
function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatYMDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function ym(date: string) { return date.slice(0, 7); }
function yyyy(date: string) { return date.slice(0, 4); }
function add(date: string, type: Mode, delta: number) {
  const d = parseYMD(date);
  if (type === "day")   d.setUTCDate(d.getUTCDate() + delta);
  if (type === "month") d.setUTCMonth(d.getUTCMonth() + delta);
  if (type === "year")  d.setUTCFullYear(d.getUTCFullYear() + delta);
  return formatYMDUTC(d);
}
/* ============================================================= */

/** mierzy realną szerokość diva, żeby Recharts miał co rysować */
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((ents) => {
      const w = Math.floor(ents[0].contentRect.width);
      setWidth(w > 0 ? w : 0);
    });
    ro.observe(el);
    // inicjalne
    setWidth(el.clientWidth > 0 ? el.clientWidth : 0);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

async function getJSON(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.status}`);
  return res.json();
}

export default function RangeEnergyChart({ initialDate }: Props) {
  const [mode, setMode] = useState<Mode>("month");
  const [date, setDate] = useState<string>(initialDate || formatYMDUTC(new Date()));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<{ label: string; kwh: number }[]>([]);
  const H = 320;
  const { ref, width } = useMeasuredWidth();

  // zsynchronizuj z parentem (np. RangeButtons → „Dziś”)
  useEffect(() => { if (initialDate) setDate(initialDate); }, [initialDate]);

  // ładowanie danych
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (mode === "day") {
          const j = await getJSON(`/api/foxess/summary/day-accurate?date=${date}`);
          const series: number[] = Array.isArray(j?.series) ? j.series : [];
          const rows = series.map((v, i) => ({
            label: `${String(i).padStart(2, "0")}:00`,
            kwh: Number(v) || 0,
          }));
          if (!cancelled) setData(rows);
        } else if (mode === "month") {
          const j = await getJSON(`/api/foxess/summary/month?month=${ym(date)}`);
          const rows = (j?.days || []).map((d: any) => ({
            label: String(d?.date || "").slice(-2),
            kwh: Number(d?.generation) || 0,
          }));
          if (!cancelled) setData(rows);
        } else {
          const j = await getJSON(`/api/foxess/summary/year?year=${yyyy(date)}`);
          // { months: [{ month: "01", generation: ... }] }
          const rows = (j?.months || []).map((m: any) => ({
            label: String(m?.month || ""),
            kwh: Number(m?.generation) || 0,
          }));
          if (!cancelled) setData(rows);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [mode, date]);

  const subtitle = mode === "day" ? date : mode === "month" ? ym(date) : yyyy(date);

  return (
    <div className="pv-card p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="text-lg font-semibold">Produkcja energii [kWh]</div>
          <div className="text-xs opacity-70">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMode("day")}   className={`pv-chip ${mode === "day"   ? "pv-chip--active" : ""}`}>Dzień</button>
          <button onClick={() => setMode("month")} className={`pv-chip ${mode === "month" ? "pv-chip--active" : ""}`}>Miesiąc</button>
          <button onClick={() => setMode("year")}  className={`pv-chip ${mode === "year"  ? "pv-chip--active" : ""}`}>Rok</button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => setDate(d => add(d, mode, -1))} className="pv-chip">◀</button>
          <button onClick={() => setDate(d => add(d, mode, +1))} className="pv-chip">▶</button>
        </div>
      </div>

      <div ref={ref} className="w-full" style={{ height: H }}>
        {loading && <div className="h-full grid place-items-center text-sm opacity-70">Ładowanie…</div>}
        {!loading && err && <div className="h-full grid place-items-center text-sm text-red-400">{err}</div>}
        {!loading && !err && width <= 0 && (
          <div className="h-full grid place-items-center text-sm opacity-70">Oczekiwanie na rozmiar kontenera…</div>
        )}
        {!loading && !err && width > 0 && data.length === 0 && (
          <div className="h-full grid place-items-center text-sm opacity-70">Brak danych do wyświetlenia.</div>
        )}
        {!loading && !err && width > 0 && data.length > 0 && (
          <BarChart width={width} height={H} data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={60} unit=" kWh" />
            <Tooltip
              formatter={(val: any) => [`${Number(val).toFixed(2)} kWh`, "Energia"]}
              labelFormatter={(label) => {
                if (mode === "day") return `Godzina: ${label}`;
                if (mode === "month") return `Dzień: ${label}`;
                return `Miesiąc: ${label}`;
              }}
            />
            <Bar dataKey="kwh" fill="#10b981" />
          </BarChart>
        )}
      </div>
    </div>
  );
}
