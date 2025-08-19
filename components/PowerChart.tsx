"use client";
import React from "react";

/**
 * HourPoint represents energy generated in a given full hour (NOT cumulative).
 * hour: integer 0..23 (local time)
 * kwh: energy generated during that hour
 */
export type HourPoint = { hour: number; kwh: number };

type Props = {
  data: HourPoint[];
  /** currentHour (0..24). If provided and date is today, we cut/soft-fade the curve at this x */
  currentHour?: number | null;
  /** optional title shown above the chart */
  title?: string;
};

/**
 * PowerChart
 *  - smooth "wave" area chart (SVG) with glass/gradient style
 *  - expects hourly generation (kWh) points, not cumulative
 *  - draws a Catmull-Rom → bezier path for smoothness
 */
export default function PowerChart({ data, currentHour = null, title }: Props) {
  // Sort & clamp hours 0..23
  const pts = [...data]
    .filter(p => Number.isFinite(p.hour) && p.hour >= 0 && p.hour <= 23)
    .sort((a, b) => a.hour - b.hour);

  const width = 700;
  const height = 260;
  const padding = { l: 32, r: 12, t: 24, b: 28 };

  const xs = (h: number) => padding.l + (h / 23) * (width - padding.l - padding.r);
  const maxKwh = Math.max(1, ...pts.map(p => p.kwh));
  const ys = (k: number) => height - padding.b - (k / maxKwh) * (height - padding.t - padding.b);

  // Build smooth path using Catmull-Rom to cubic Bezier
  const toPath = (points: {x:number,y:number}[]) => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const points = pts.map(p => ({ x: xs(p.hour), y: ys(p.kwh) }));
  const baseY = ys(0);

  // Truncate visually at currentHour (if provided): draw a mask that ends at x(now)
  const nowX = currentHour == null ? null : xs(Math.max(0, Math.min(23, currentHour)));
  const maskId = "pc-mask-" + Math.random().toString(36).slice(2);

  return (
    <div className="rounded-3xl p-4 bg-gradient-to-b from-white/5 to-white/0 dark:from-white/10 dark:to-white/0 border border-white/10 shadow-xl backdrop-blur">
      {title && <div className="text-sm opacity-80 mb-2">{title}</div>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[260px]">
        <defs>
          <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0.04" />
          </linearGradient>
          <filter id="pc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {nowX !== null && (
            <linearGradient id="pc-fade" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          )}
          {nowX !== null && (
            <mask id={maskId}>
              <rect x="0" y="0" width={nowX} height={height} fill="white" />
              {/* soft fade for the last ~24px */}
              <rect x={Math.max(0, nowX - 24)} y="0" width="24" height={height} fill="url(#pc-fade)" />
            </mask>
          )}
        </defs>

        {/* grid */}
        {[0,6,12,18,23].map(h => (
          <g key={h}>
            <line x1={xs(h)} x2={xs(h)} y1={padding.t} y2={height - padding.b} className="stroke-white/10" />
            <text x={xs(h)} y={height - 6} textAnchor="middle" className="fill-white/60 text-[10px]">
              {String(h).padStart(2,"0")}:00
            </text>
          </g>
        ))}

        {/* axis line */}
        <line x1={padding.l} x2={width - padding.r} y1={baseY} y2={baseY} className="stroke-white/20" />

        {/* area fill */}
        {points.length >= 2 && (
          <path
            d={`${toPath(points)} L ${points.at(-1)!.x} ${baseY} L ${points[0].x} ${baseY} Z`}
            fill="url(#pc-fill)"
            mask={nowX !== null ? `url(#${maskId})` : undefined}
          />
        )}

        {/* smooth line */}
        {points.length >= 2 && (
          <path
            d={toPath(points)}
            stroke="rgb(59 130 246)"
            strokeWidth="2"
            fill="none"
            filter="url(#pc-glow)"
            mask={nowX !== null ? `url(#${maskId})` : undefined}
          />
        )}
      </svg>
    </div>
  );
}
