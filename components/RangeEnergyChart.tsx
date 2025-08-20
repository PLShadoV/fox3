"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Mode = "day" | "month" | "year";
type Props = { initialDate?: string };

/* === UTC daty === */
function parseYMD(s: string) { const [y,m,d]=s.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); }
function formatYMDUTC(d: Date) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`; }
function ym(date: string){ return date.slice(0,7); }
function yyyy(date: string){ return date.slice(0,4); }
function add(date:string, type:Mode, delta:number){
  const d=parseYMD(date);
  if(type==="day") d.setUTCDate(d.getUTCDate()+delta);
  if(type==="month") d.setUTCMonth(d.getUTCMonth()+delta);
  if(type==="year") d.setUTCFullYear(d.getUTCFullYear()+delta);
  return formatYMDUTC(d);
}

/* szerokość kontenera */
function useMeasuredWidth(){
  const ref = useRef<HTMLDivElement|null>(null);
  const [width,setWidth] = useState(0);
  useEffect(()=>{ const el=ref.current; if(!el) return;
    const ro=new ResizeObserver(e=>setWidth(Math.floor(e[0].contentRect.width)));
    ro.observe(el); setWidth(el.clientWidth||0); return ()=>ro.disconnect();
  },[]); return {ref,width};
}

async function getJSON(path:string){
  const r=await fetch(path,{cache:"no-store"});
  if(!r.ok) throw new Error(`HTTP ${r.status} ${path}`);
  return r.json();
}

export default function RangeEnergyChart({ initialDate }: Props){
  const [mode,setMode] = useState<Mode>("month");
  const [date,setDate] = useState<string>(initialDate || formatYMDUTC(new Date()));
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState<string|null>(null);
  const [data,setData] = useState<{label:string;kwh:number}[]>([]);
  const H=320; const {ref,width}=useMeasuredWidth();

  useEffect(()=>{ if(initialDate) setDate(initialDate); },[initialDate]);

  // helpery: pilnują, by szybkie endpointy MUSIAŁY zwrócić poprawne dane, inaczej fallback
  async function loadMonthDataFastOrFallback(month: string){
    try{
      const j = await getJSON(`/api/foxess/summary/month-fast?month=${month}`);
      const ok = j?.ok === true;
      const arr = Array.isArray(j?.days) ? j.days : [];
      if (!ok || arr.length === 0) throw new Error("month-fast empty");
      return arr.map((d:any)=>({ label:String(d?.date||"").slice(-2), kwh:Number(d?.generation)||0 }));
    }catch{
      const j2 = await getJSON(`/api/foxess/summary/month?month=${month}`);
      const arr2 = Array.isArray(j2?.days) ? j2.days : [];
      return arr2.map((d:any)=>({ label:String(d?.date||"").slice(-2), kwh:Number(d?.generation)||0 }));
    }
  }
  async function loadYearDataFastOrFallback(year: string){
    try{
      const j = await getJSON(`/api/foxess/summary/year-fast?year=${year}`);
      const ok = j?.ok === true;
      const arr = Array.isArray(j?.months) ? j.months : [];
      if (!ok || arr.length === 0) throw new Error("year-fast empty");
      return arr.map((m:any)=>({ label:String(m?.month||""), kwh:Number(m?.generation)||0 }));
    }catch{
      const j2 = await getJSON(`/api/foxess/summary/year?year=${year}`);
      const arr2 = Array.isArray(j2?.months) ? j2.months : [];
      return arr2.map((m:any)=>({ label:String(m?.month||""), kwh:Number(m?.generation)||0 }));
    }
  }

  useEffect(()=>{
    let cancelled=false;
    (async ()=>{
      try{
        setLoading(true); setErr(null);
        if(mode==="day"){
          const j=await getJSON(`/api/foxess/summary/day-accurate?date=${date}`);
          const series:number[] = Array.isArray(j?.series)? j.series: [];
          const rows = series.map((v,i)=>({ label:`${String(i).padStart(2,"0")}:00`, kwh:Number(v)||0 }));
          if(!cancelled) setData(rows);
        }else if(mode==="month"){
          const rows = await loadMonthDataFastOrFallback(ym(date));
          if(!cancelled) setData(rows);
        }else{
          const rows = await loadYearDataFastOrFallback(yyyy(date));
          if(!cancelled) setData(rows);
        }
      }catch(e:any){
        if(!cancelled) setErr(e?.message||String(e));
      }finally{
        if(!cancelled) setLoading(false);
      }
    })(); return ()=>{ cancelled=true; };
  },[mode,date]);

  const subtitle = mode==="day"?date: mode==="month"?ym(date): yyyy(date);
  const totals = useMemo(()=> {
    const sum=+data.reduce((a,r)=>a+(Number(r.kwh)||0),0).toFixed(2);
    return { label: mode==="day"?"Suma dnia": mode==="month"?"Suma miesiąca":"Suma roku", value: sum };
  },[mode,data]);

  return (
    <div className="pv-card p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="text-lg font-semibold">Produkcja energii [kWh]</div>
          <div className="text-xs opacity-70">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setMode("day")}   className={`pv-chip ${mode==="day"?"pv-chip--active":""}`}>Dzień</button>
          <button onClick={()=>setMode("month")} className={`pv-chip ${mode==="month"?"pv-chip--active":""}`}>Miesiąc</button>
          <button onClick={()=>setMode("year")}  className={`pv-chip ${mode==="year"?"pv-chip--active":""}`}>Rok</button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={()=>setDate(d=>add(d,mode,-1))} className="pv-chip">◀</button>
          <button onClick={()=>setDate(d=>add(d,mode,+1))} className="pv-chip">▶</button>
        </div>
      </div>

      <div ref={ref} className="w-full" style={{ height: 320 }}>
        {loading && <div className="h-full grid place-items-center text-sm opacity-70">Ładowanie…</div>}
        {!loading && err && <div className="h-full grid place-items-center text-sm text-red-400">{err}</div>}
        {!loading && !err && width <= 0 && <div className="h-full grid place-items-center text-sm opacity-70">Oczekiwanie na rozmiar kontenera…</div>}
        {!loading && !err && width > 0 && data.length === 0 && <div className="h-full grid place-items-center text-sm opacity-70">Brak danych do wyświetlenia.</div>}
        {!loading && !err && width > 0 && data.length > 0 && (
          <BarChart width={width} height={320} data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={60} unit=" kWh" />
            <Tooltip formatter={(val:any)=>[`${Number(val).toFixed(2)} kWh`,"Energia"]}
                     labelFormatter={(label)=> mode==="day"?`Godzina: ${label}`: mode==="month"?`Dzień: ${label}`:`Miesiąc: ${label}`} />
            <Bar dataKey="kwh" fill="#10b981" />
          </BarChart>
        )}
      </div>

      {!loading && !err && data.length > 0 && (
        <div className="mt-2 text-sm opacity-80">
          {totals.label}: <span className="font-semibold">{totals.value.toFixed(2)} kWh</span>
        </div>
      )}
    </div>
  );
}
