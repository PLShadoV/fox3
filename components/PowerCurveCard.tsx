"use client";

import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Props = {
  title: string;
  data: { x: string; kw: number }[];
  xKey: string;
  yKey: string;
  unit?: string;
};

export default function PowerCurveCard({ title, data, xKey, yKey, unit }: Props) {
  return (
    <Card className="p-4">
      <div className="text-lg font-semibold mb-3">{title}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={50}
              unit={unit || ""}
              allowDecimals
            />
            <Tooltip
              formatter={(val: any) => [`${val.toFixed(2)} ${unit || ""}`, "Moc"]}
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
    </Card>
  );
}
