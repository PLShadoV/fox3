'use client';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function fmt(h:number){ return (h<10?'0':'')+h+':00'; }

export default function PowerChart({ hourly }:{ hourly: number[] }){
  const data = hourly.map((kwh, i)=>({ h: fmt(i), v: Number(kwh.toFixed(2)) }));
  return (
    <div className="glass chartPanel" style={{height:320}}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.8}/>
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="h" tick={{fill:'var(--muted)'}}/>
          <YAxis tick={{fill:'var(--muted)'}}/>
          <Tooltip labelStyle={{color:'var(--text)'}} contentStyle={{background:'var(--panel)', border:'1px solid var(--border)'}}/>
          <Area type="monotone" dataKey="v" stroke="var(--accent)" fill="url(#grad)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
