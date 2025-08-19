'use client';

import React, { useMemo } from 'react';

export type HourPoint = { hour: number; t: string; kwh: number };

type Props = {
  data: HourPoint[]; // dokładnie: hour + t (label) + kwh
};

/**
 * Prosty, gładki wykres mocy (kWh/h) jako płynna linia + fill (glass style).
 * Dane oczekiwane: 24 punkty (0..23).
 */
export default function PowerChart({ data }: Props) {
  const width = 900;
  const height = 240;
  const paddingX = 24;
  const paddingY = 18;

  const { pathD, fillD } = useMemo(() => {
    if (!data?.length) return { pathD: '', fillD: '' };

    const maxY = Math.max(1, ...data.map(d => d.kwh));
    const stepX = (width - paddingX * 2) / Math.max(1, data.length - 1);

    const xy = (idx: number, v: number) => {
      const x = paddingX + idx * stepX;
      const y = height - paddingY - (v / maxY) * (height - paddingY * 2);
      return { x, y };
    };

    // krzywa kubiczna (Cardinal-ish) – wygładzenie pomiędzy punktami
    const toCurve = (pts: { x: number; y: number }[]) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const cx = (p0.x + p1.x) / 2;
        d += ` Q ${cx},${p0.y} ${p1.x},${p1.y}`;
      }
      return d;
    };

    const pts = data.map((d, i) => xy(i, d.kwh));
    const path = toCurve(pts);

    const fill = `${path} L ${paddingX + (data.length - 1) * stepX},${height - paddingY} L ${paddingX},${height - paddingY} Z`;

    return { pathD: path, fillD: fill };
  }, [data]);

  return (
    <div className="rounded-2xl p-4 bg-white/10 dark:bg-slate-900/30 backdrop-blur border border-white/20">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[240px]">
        {/* tło siatki */}
        <rect x="0" y="0" width={width} height={height} fill="none" />
        {/* wypełnienie (gradient) */}
        <defs>
          <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopOpacity="0.35" stopColor="currentColor" />
            <stop offset="100%" stopOpacity="0.02" stopColor="currentColor" />
          </linearGradient>
        </defs>

        {/* wypełnienie pod krzywą */}
        <path d={fillD} fill="url(#pvFill)" />

        {/* linia */}
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2.5" />

        {/* oś X: co 2 godziny */}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text
              key={`tick-${i}`}
              x={24 + i * ((width - 48) / Math.max(1, data.length - 1))}
              y={height - 2}
              fontSize="10"
              textAnchor="middle"
              className="fill-slate-700 dark:fill-slate-300"
            >
              {d.t}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
