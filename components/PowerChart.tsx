'use client';
import { useMemo } from 'react';

export type HourPoint = { hour:number; t:string; kwh:number };
type Props = { data: HourPoint[]; title?: string };

function toPath(points: {x:number,y:number}[], w:number, h:number){
  // Catmull-Rom to Bezier for smoothness
  if(points.length<2) return '';
  const p = points;
  const d = ['M', p[0].x, p[0].y];
  for(let i=0;i<p.length-1;i++){
    const p0 = p[i-1] || p[i];
    const p1 = p[i];
    const p2 = p[i+1];
    const p3 = p[i+2] || p[i+1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push('C', cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  return d.join(' ');
}

export default function PowerChart({ data, title }: Props){
  const w = 1100, h = 260, pad = 22;
  const max = Math.max(1, ...data.map(d=>d.kwh));
  const pts = useMemo(()=> {
    const step = (w - pad*2) / Math.max(1, data.length-1);
    return data.map((d,i)=> ({
      x: pad + step * i,
      y: pad + (h - pad*2) * (1 - (d.kwh / max))
    }));
  }, [data, max]);

  const path = toPath(pts, w, h);
  const area = path + ` L ${pad + (w - pad*2)} ${h-pad} L ${pad} ${h-pad} Z`;

  return (
    <div className="glass" style={{padding:16}}>
      {title && <div className="section-title" style={{marginBottom:8}}>{title}</div>}
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Wykres generacji">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.05" />
          </linearGradient>
          <filter id="blurShadow" x="-5%" y="-10%" width="110%" height="130%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
            <feOffset dy="2" result="off"/>
            <feMerge><feMergeNode in="off"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* grid */}
        <g opacity="0.25">
          {Array.from({length:5}).map((_,i)=>(
            <line key={i} x1={pad} x2={w-pad} y1={pad + (h-pad*2)*i/4} y2={pad + (h-pad*2)*i/4} stroke="var(--border)" />
          ))}
        </g>

        {/* area */}
        <path d={area} fill="url(#g1)" />
        {/* line */}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" filter="url(#blurShadow)" />

        {/* x labels */}
        <g fontSize="10" fill="var(--muted)">
          {data.map((d,i)=> (
            <text key={i} x={pad + (w - pad*2) * i/Math.max(1,data.length-1)} y={h-4} textAnchor="middle">{d.t}</text>
          ))}
        </g>
      </svg>
    </div>
  );
}
