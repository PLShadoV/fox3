'use client';
import { useMemo } from 'react';

export type HourPoint = { hour: number; t: string; kwh: number };
type Props = { data: HourPoint[]; title?: string };

function pathFrom(points: {x:number, y:number}[]) {
  if (points.length===0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i=1;i<points.length;i++){
    const p = points[i-1], c = points[i];
    const mx = (p.x + c.x)/2;
    d += ` C ${mx} ${p.y}, ${mx} ${c.y}, ${c.x} ${c.y}`;
  }
  return d;
}

export default function PowerChart({ data, title }: Props){
  const W=1000, H=260, P=20;
  const max = useMemo(()=> Math.max(1, ...data.map(d=>d.kwh)), [data]);
  const pts = useMemo(()=> data.map((d,i)=>{
    const x = P + ( (W-2*P) * (i/(Math.max(1,data.length-1))) );
    const y = H - P - ( (H-2*P) * (d.kwh / max) );
    return {x,y};
  }), [data, max]);
  const path = useMemo(()=> pathFrom(pts), [pts]);
  const area = useMemo(()=> path ? `${path} L ${P} ${H-P} Z` : '', [path]);

  return (
    <div className="glass" style={{padding:16}}>
      {title && <div className="section-title" style={{marginBottom:8}}>{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260" role="img" aria-label="Generacja godzinowa">
        <defs>
          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.6"/>
            <stop offset="1" stopColor="var(--accent-2)" stopOpacity="0.05"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
        <path d={area} fill="url(#g1)" stroke="none"/>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3"/>
        {/* X labels */}
        {data.map((d,i)=>{
          const x = P + ( (W-2*P) * (i/(Math.max(1,data.length-1))) );
          return <text key={i} x={x} y={H-4} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.t}</text>;
        })}
        {/* Y max label */}
        <text x={W-P} y={P+10} textAnchor="end" fontSize="11" fill="var(--muted)">{max.toFixed(1)} kWh</text>
      </svg>
    </div>
  );
}
