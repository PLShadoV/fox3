"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Props = {
  title: string;
  data: { x: string; kw: number }[];
  xKey: string;
  yKey: string;
  unit?: string;
};

export default function PowerCurveCard({ title, data, xKey, yKey, unit }: Props) {
  const hasAny = Array.isArray(data) && data.length > 0;
  const hasNonZero = hasAny && data.some(d => Number(d[yKey as keyof typeof d]) > 0);

  return (
    <div className="pv-card p-4">
      <div className="text-lg font-semibold mb-3">{title}</div>

      {!hasAny ? (
        <div className="h-64 grid place-items-center opacity-70 text-sm">
          Brak danych do wyświetlenia.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={50} unit={unit || ""} />
              <Tooltip
                formatter={(val: any) => [`${Number(val).toFixed(2)} ${unit || ""}`, "Moc"]}
                labelFormatter={(label) => `Godzina: ${label}`}
              />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke="#3b82f6"
                fill="url(#colorGen)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasAny && !hasNonZero && (
        <div className="mt-2 text-xs opacity-70">
          Uwaga: wszystkie wartości wynoszą 0 kW — wykres może wyglądać na pusty.
        </div>
      )}
    </div>
  );
}
