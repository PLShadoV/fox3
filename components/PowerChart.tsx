'use client';
import React from 'react';

export default function PowerChart({ series }:{ series:number[] }){
  // simple svg area chart with smooth curve
  const W = 900, H = 260, pad=30;
  const points = series.map((v,i)=>({ x: i/(series.length-1), y: v }));
  const maxY = Math.max(1, ...series);
  const pathD = points.map((p,i)=>{
    const x = pad + p.x*(W-2*pad);
    const y = H-pad - (p.y/maxY)*(H-2*pad);
    return `${i?'L':'M'}${x},${y}`;
  }).join(' ');
  const gradientId = 'grad1';
  return (
    <div className="glass chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.6)"/>
            <stop offset="100%" stopColor="rgba(59,130,246,0.05)"/>
          </linearGradient>
        </defs>
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="3" />
        <path d={pathD + ` L ${W-pad},${H-pad} L ${pad},${H-pad} Z`} fill="url(#grad1)" stroke="none" />
      </svg>
    </div>
  );
}
