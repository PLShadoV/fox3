"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  LineChart,
} from "recharts";
import { Button } from "@/components/ui/button";

// --- UTILS DATY (UTC, żeby nie skakało co 2 dni) ---
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
function add(date: string, type: "day"|"month"|"year", delta: number) {
  const d = parseYMD(date);
  if (type === "day")   d.setUTCDate(d.getUTCDate() + delta);
  if (type === "month") d.setUTCMonth(d.getUTCMonth() + delta);
  if (type === "year")  d.setUTCFullYear(d.getUTCFullYear() + delta);
  return formatYMDUTC(d);
}
// ---------------------------------------------------

type Mode = "day" | "month" | "year";

export default function RangeEnergyChart() {
  const [mode, setMode] = useState<Mode>("day");
  const [date, setDate] = useState(() => formatYMDUTC(new Date()));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let url = "";
    if (mode === "day") url = `/api/foxess/summary/day-accurate?date=${date}`;
    if (mode === "month") url = `/api/foxess/summary/month-accurate?month=${ym(date)}`;
    if (mode === "year") url = `/api/foxess/summary/year-accurate?year=${yyyy(date)}`;

    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (!j?.ok) return;
        if (mode === "day") {
          setData((j.series || []).map((v: number, i: number) => ({
            time: `${String(i).padStart(2,"0")}:00`,
            value: v,
          })));
        }
        if (mode === "month") {
          setData((j.days || []).map((d: any) => ({
            time: d.date.slice(-2),
            value: d.generation,
          })));
        }
        if (mode === "year") {
          setData((j.months || []).map((m: any) => ({
            time: m.date.slice(-2),
            value: m.generation,
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [mode, date]);

  const title =
    mode === "day" ? `Produkcja energii [kWh]\n${date}` :
    mode === "month" ? `Produkcja energii [kWh]\n${ym(date)}` :
    `Produkcja energii [kWh]\n${yyyy(date)}`;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold whitespace-pre-line">{title}</h2>
      <div className="flex gap-2 my-2">
        <Button variant={mode === "day" ? "default" : "outline"} onClick={() => setMode("day")}>Dzień</Button>
        <Button variant={mode === "month" ? "default" : "outline"} onClick={() => setMode("month")}>Miesiąc</Button>
        <Button variant={mode === "year" ? "default" : "outline"} onClick={() => setMode("year")}>Rok</Button>
      </div>
      <div className="flex gap-2 my-2">
        <Button onClick={() => setDate(d => add(d, mode, -1))}>◀</Button>
        <Button onClick={() => setDate(d => add(d, mode, +1))}>▶</Button>
      </div>

      <div className="h-80">
        {loading ? (
          <p>Ładowanie...</p>
        ) : mode === "day" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
