"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type DayData = { hour: string; kwh: number };
type MonthData = { day: string; kwh: number };
type YearData = { month: string; kwh: number };

type Props = {
  daily: DayData[];
  monthly: MonthData[];
  yearly: YearData[];
};

export default function RangeEnergyChart({ daily, monthly, yearly }: Props) {
  const [view, setView] = useState<"day" | "month" | "year">("day");

  let data: { label: string; kwh: number }[] = [];
  let labelTitle = "";

  if (view === "day") {
    data = daily.map((d) => ({ label: d.hour, kwh: d.kwh }));
    labelTitle = "Godzina";
  } else if (view === "month") {
    data = monthly.map((m) => ({ label: m.day, kwh: m.kwh }));
    labelTitle = "Dzień";
  } else {
    data = yearly.map((y) => ({ label: y.month, kwh: y.kwh }));
    labelTitle = "Miesiąc";
  }

  return (
    <div className="pv-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Produkcja energii [kWh]</div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("day")}
            className={`pv-chip ${view === "day" ? "pv-chip--active" : ""}`}
          >
            Dzień
          </button>
          <button
            onClick={() => setView("month")}
            className={`pv-chip ${view === "month" ? "pv-chip--active" : ""}`}
          >
            Miesiąc
          </button>
          <button
            onClick={() => setView("year")}
            className={`pv-chip ${view === "year" ? "pv-chip--active" : ""}`}
          >
            Rok
          </button>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={60} unit=" kWh" />
            <Tooltip
              formatter={(val: any) => [`${val.toFixed(2)} kWh`, "Energia"]}
              labelFormatter={(label) => `${labelTitle}: ${label}`}
            />
            <Bar dataKey="kwh" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
