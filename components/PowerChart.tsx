// components/PowerChart.tsx
'use client';

import React, { useMemo } from 'react';

export type HourPoint = {
  hour: number;        // 0..23
  t: string;           // np. "11:00"
  kwh: number;         // generacja w tej godzinie (NIE skumulowana)
};

type Props = {
  /** Wariant 1 – prosty: surowa tablica 24 liczb (kWh na godzinę) */
  series?: number[];
  /** Wariant 2 – pełny: tablica punktów godzinowych */
  data?: HourPoint[];
  /** Tytuł nad wykresem (opcjonalnie) */
  title?: string;
};

/** Ładne formatowanie godziny na etykiety osi */
function fmtHour(h: number) {
  const hh = String(h).padStart(2, '0');
  return `${hh}:00`;
}

/** Bezier smoothing helpers */
function buildSmoothPath(points: { x: number; y: number }[], tension = 0.25) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const PowerChart: React.FC<Props> = ({ series, data, title }) => {
  // Ujednolicenie danych wejściowych
  const points: HourPoint[] = useMemo(() => {
    if (Array.isArray(series)) {
      // Mapujemy 0..23 -> HourPoint
      return series.slice(0, 24).map((v, i) => ({
        hour: i,
        t: fmtHour(i),
        kwh: Number(v) || 0,
      }));
    }
    if (Array.isArray(data)) {
      return data.slice(0, 24).map((p, i) => ({
        hour: typeof p.hour === 'number' ? p.hour : i,
        t: p.t ?? fmtHour(typeof p.hour === 'number' ? p.hour : i),
        kwh: Number(p.kwh) || 0,
      }));
    }
    // Fallback: pusta doba
    return new Array(24).fill(0).map((_, i) => ({
      hour: i,
      t: fmtHour(i),
      kwh: 0,
    }));
  }, [series, data]);

  // Wymiary wykresu
  const W = 1000; // rysujemy w stałym viewBox – skalowalne
  const H = 320;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 36;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxY = Math.max(1, ...points.map(p => p.kwh));
  const minY = 0;

  // Skale
  const scaleX = (i: number) =>
    padL + (innerW * i) / (Math.max(1, points.length - 1));
  const scaleY = (v: number) =>
    padT + innerH - ((v - minY) / (maxY - minY)) * innerH;

  // Punkt start/koniec w bieżącej godzinie – delikatne “ucięcie” w dniu bieżącym.
  // Jeżeli chcesz bardziej zaawansowaną logikę, możesz przekazać w `data` punkt z ułamkiem godziny.
  const xy = points.map((p, i) => ({
    x: scaleX(i),
    y: scaleY(p.kwh),
  }));

  const linePath = buildSmoothPath(xy, 0.22);
  const areaPath =
    linePath +
    ` L ${padL + innerW},${padT + innerH} L ${padL},${padT + innerH} Z`;

  return (
    <div className="glass" style={{ padding: 16 }}>
      {title && (
        <div className="section-title" style={{ marginBottom: 8 }}>
          {title}
        </div>
      )}

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="auto"
          role="img"
          aria-label="Wykres mocy godzinowej"
        >
          {/* Tło obszaru rysunku */}
          <rect
            x={padL}
            y={padT}
            width={innerW}
            height={innerH}
            fill="transparent"
            stroke="var(--border)"
            rx="12"
          />

          {/* Siatka pozioma (4 linie) */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = padT + (innerH * i) / 4;
            const label = (maxY - (maxY * i) / 4).toFixed(0);
            return (
              <g key={i}>
                <line
                  x1={padL}
                  x2={padL + innerW}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 6"
                />
                <text
                  x={padL - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="var(--muted)"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Etykiety osi X co 3 godziny */}
          {points.map((p, i) =>
            i % 3 === 0 ? (
              <text
                key={i}
                x={scaleX(i)}
                y={padT + innerH + 22}
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted)"
              >
                {p.t}
              </text>
            ) : null
          )}

          {/* Gradient pod krzywą */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Powierzchnia */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Linia */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={3}
          />

          {/* Kropki co godzinę */}
          {xy.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="var(--accent-2)"
              stroke="white"
              strokeWidth={1}
              opacity={0.9}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default PowerChart;
