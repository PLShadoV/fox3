
"use client";
import React, { useMemo } from "react";

export type HourPoint = { hour: number; kwh: number };

type Props =
  | { points: HourPoint[]; series?: never }
  | { series: number[]; points?: never };

/**
 * PowerChart — gładka "fala" godzinowej generacji (kWh/h).
 * Przyjmuje albo `points` (zalecane), albo dla wstecznej kompatybilności `series` (24 liczby).
 * Jeśli podasz `series`, komponent sam zmapuje do points = [{hour, kwh}].
 */
export default function PowerChart(props: Props) {
  const points: HourPoint[] = useMemo(() => {
    if ("points" in props && props.points) return normalize(props.points);
    if ("series" in props && props.series) {
      const arr = (props.series || []).slice(0, 24);
      return normalize(arr.map((kwh, hour) => ({ hour, kwh })));
    }
    return [];
  }, [props]);

  const pathD = useMemo(() => buildPath(points), [points]);
  const gradientId = "pvGrad_" + Math.random().toString(36).slice(2, 8);

  // Oblicz „teraz” jako pionowy cut (jeśli wizualizujesz bieżący dzień)
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md p-4 shadow-lg">
      <svg viewBox="0 0 1000 300" className="w-full h-56 md:h-64">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.8)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
          </linearGradient>
          <clipPath id={gradientId + "_clip"}>
            {/** maska: utnij do „teraz” jeśli dotyczy (0..24h) */}
            <rect
              x="0"
              y="0"
              width={(Math.min(Math.max(nowHour, 0), 24) / 24) * 1000}
              height="300"
              rx="0"
              ry="0"
            />
          </clipPath>
        </defs>

        {/** siatka */}
        <g opacity="0.15">
          {[0, 6, 12, 18, 24].map((h) => (
            <line
              key={h}
              x1={(h / 24) * 1000}
              x2={(h / 24) * 1000}
              y1={0}
              y2={300}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
            <line
              key={i}
              x1={0}
              x2={1000}
              y1={300 - f * 280 - 10}
              y2={300 - f * 280 - 10}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </g>

        {/** obszar wypełniony (przycięty do „teraz”) */}
        <path
          d={pathD.area}
          fill={`url(#${gradientId})`}
          clipPath={`url(#${gradientId}_clip)`}
        />
        {/** linia */}
        <path d={pathD.line} fill="none" stroke="currentColor" strokeWidth="2.5" />

        {/** oś godzin (0..23) */}
        <g fontSize="10" opacity="0.7">
          {[0, 4, 8, 12, 16, 20, 24].map((h) => (
            <text key={h} x={(h / 24) * 1000} y={295} textAnchor="middle">
              {String(h).padStart(2, "0")}:00
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Normalizacja — dotnij do 0..23, usuń NaN, wartości <0 -> 0 */
function normalize(arr: HourPoint[]): HourPoint[] {
  return arr
    .filter((p) => Number.isFinite(p.hour) && p.hour >= 0 && p.hour < 24)
    .map((p) => ({ hour: Math.round(p.hour), kwh: Math.max(0, Number(p.kwh) || 0) }));
}

/** Budowa ścieżek Catmull–Rom → Bézier; mapowanie [0..24]x[0..max] → [0..1000]x[300..20] */
function buildPath(points: HourPoint[]): { line: string; area: string } {
  if (!points.length) return { line: "", area: "" };
  const max = Math.max(1, ...points.map((p) => p.kwh));
  const mapX = (h: number) => (h / 24) * 1000;
  const mapY = (k: number) => 300 - (k / max) * 280 - 10;

  // Punkty w SVG
  const P = points.map((p) => ({ x: mapX(p.hour), y: mapY(p.kwh) }));
  // Jeśli pojedynczy punkt — płaska kreska
  if (P.length === 1) {
    const x = P[0].x, y = P[0].y;
    const line = `M ${x} ${y} L ${x} ${y}`;
    const area = `M ${x} ${300} L ${x} ${y} L ${x} ${300} Z`;
    return { line, area };
    }

  // Catmull–Rom to Bezier
  const segs: string[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    if (i === 0) segs.push(`M ${p1.x} ${p1.y}`);
    segs.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`);
  }
  const line = segs.join(" ");

  // Area pod krzywą
  const first = P[0], last = P[P.length - 1];
  const area = `${line} L ${last.x} 300 L ${first.x} 300 Z`;
  return { line, area };
}
