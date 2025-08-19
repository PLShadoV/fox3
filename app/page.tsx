'use client';
import useSWR from 'swr';
import StatTile from '@/components/StatTile';
import PowerChart from '@/components/PowerChart';
import HourlyTable from '@/components/HourlyTable';
import RangeCalculator from '@/components/RangeCalculator';
import ThemeToggle from '@/components/ThemeToggle';
import { useEffect, useMemo, useState } from 'react';

const fetcher = (url:string)=>fetch(url, {cache:'no-store'}).then(r=>r.json());

function useDateState(){
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  function setToday(){ setDate(new Date().toISOString().slice(0,10)); }
  function setYesterday(){ const d=new Date(); d.setDate(d.getDate()-1); setDate(d.toISOString().slice(0,10)); }
  return { date, setDate, setToday, setYesterday };
}

export default function Page(){
  const { date, setDate, setToday, setYesterday } = useDateState();
  const [calcMode, setCalcMode] = useState<'rce'|'rcem'>('rce');

  const { data: rt } = useSWR('/api/foxess/realtime', fetcher, { refreshInterval: 60000 });
  const { data: day } = useSWR(`/api/foxess/day?date=${date}`, fetcher);
  const { data: rce } = useSWR(`/api/rce/day?date=${date}`, fetcher);

  const hourly = useMemo(()=>{
    if(!day?.ok) return new Array(24).fill(0);
    // allow both series (skumulowana) i hourly
    const series = day.today?.generation?.series || day.generation?.values || day.result?.[0]?.values || [];
    let arr = (series && series.length===24) ? series.slice() : new Array(24).fill(0);
    // jeżeli wygląda na skumulowane rosnące – zrób diff
    const isCum = arr.some((v,i)=> i>0 && v < arr[i-1]);
    if(!isCum){
      // heurystyka: jeśli koniec >> środek i części 0 na początku/końcu -> może być skumulowane jednak
      const inc = arr.reduce((a,b,i)=> a + (i>0 && b>=arr[i-1] ? 1 : 0), 0);
      if(inc>18){ // dość monotonicznie
        const diff = new Array(24).fill(0);
        for(let i=0;i<24;i++) diff[i] = Number(((i===0?arr[0]:arr[i]-arr[i-1])||0).toFixed(3));
        arr = diff;
      }
    }else{
      const diff = new Array(24).fill(0);
      for(let i=0;i<24;i++) diff[i] = Number(((i===0?arr[0]:arr[i]-arr[i-1])||0).toFixed(3));
      arr = diff;
    }
    return arr.map((x:number)=>Number((x||0).toFixed(2)));
  },[day]);

  const genTotal = hourly.reduce((a:number,b:number)=>a+b,0);
  const pvNowW = rt?.pvNowW ?? null;

  // budowa tabeli
  const tableRows = useMemo(()=>{
    const r: any[] = [];
    for(let h=0; h<24; h++){
      const kwh = hourly[h]||0;
      const price = rce?.rows?.[h]?.rce_pln_mwh ?? null;
      const used = calcMode==='rce' ? Math.max(0, price ?? 0) : null;
      const revenue = calcMode==='rce' ? (kwh * (Math.max(0, used||0))/1000) : null;
      r.push({
        hour:h, kwh,
        price_pln_mwh: price ?? undefined,
        price_used_pln_mwh: used ?? undefined,
        revenue_pln: revenue ?? 0
      });
    }
    return r;
  },[hourly, rce, calcMode]);

  const revenueTotal = tableRows.reduce((a,b)=>a+(b.revenue_pln||0),0);

  return (
    <div className="container">
      <div className="header">
        <div className="title">FoxESS × RCE</div>
        <a href="https://www.foxesscloud.com" target="_blank" className="link">FoxESS</a>
        <a href="https://raporty.pse.pl/report/rce-pln" target="_blank" className="link">RCE (PSE)</a>
        <ThemeToggle/>
        <div className="right"></div>
        <div className="toggle" onClick={setToday}>Dziś</div>
        <div className="toggle" onClick={setYesterday}>Wczoraj</div>
        <input type="date" className="toggle" value={date} onChange={(e)=>setDate(e.target.value)}/>
      </div>

      <div className="grid grid-3">
        <StatTile title="Moc teraz" value={pvNowW!=null?`${pvNowW} W`:'—'} subtitle="Realtime z inwertera (60 s)"/>
        <StatTile title="Wygenerowano (dzień)" value={`${genTotal.toFixed(1)} kWh`} />
        <StatTile title="Przychód (dzień)" value={`${(revenueTotal).toFixed(2)} PLN`} subtitle={calcMode==='rce'?'RCE godzinowe':'RCEm (średnia mies.)'} />
      </div>

      <div className="spacer"></div>

      <div className="controls">
        <div>Tryb obliczeń:</div>
        <div className={"toggle "+(calcMode==='rce'?'active':'')} onClick={()=>setCalcMode('rce')}>RCE</div>
        <div className={"toggle "+(calcMode==='rcem'?'active':'')} onClick={()=>setCalcMode('rcem')}>RCEm</div>
      </div>

      <div className="spacer"></div>
      <PowerChart hourly={hourly}/>

      <div className="spacer"></div>
      <HourlyTable rows={tableRows} />

      <div className="spacer"></div>
      <RangeCalculator/>
    </div>
  )
}
