'use client';
import React from 'react';
import StatTile from '../components/StatTile';
import HourlyTable from '../components/HourlyTable';
import PowerChart from '../components/PowerChart';
import RangeCalculator from '../components/RangeCalculator';
import ThemeToggle from '../components/ThemeToggle';

type HourRow = { hour:number, kwh:number, price_pln_mwh:number, price_used_pln_mwh:number, revenue_pln:number };

function toHourRows(kwhSeries:number[], rceRows:{hour:number,rce_pln_mwh:number}[]): HourRow[]{
  return Array.from({length:24}, (_,h)=>{
    const kwh = Number(kwhSeries[h]||0);
    const price = Number(rceRows?.[h]?.rce_pln_mwh || 0);
    const used = Math.max(0, price);
    const revenue = kwh * (used/1000);
    return { hour:h, kwh, price_pln_mwh: price, price_used_pln_mwh: used, revenue_pln: revenue };
  });
}

export default function Page(){
  const [date, setDate] = React.useState<string>(new Date().toISOString().slice(0,10));
  const [pvNowW, setPvNowW] = React.useState<number|null>(null);
  const [series, setSeries] = React.useState<number[]>(new Array(24).fill(0));
  const [tableRows, setTableRows] = React.useState<HourRow[]>([]);
  const [sumKwh, setSumKwh] = React.useState(0);
  const [sumPln, setSumPln] = React.useState(0);

  async function loadAll(d: string){
    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    const [rt, day, rce] = await Promise.all([
      fetch(`${base}/api/foxess/realtime`, { cache: 'no-store' }).then(r=>r.json()).catch(()=>({pvNowW:null})),
      fetch(`${base}/api/foxess/day?date=${d}`, { cache: 'no-store' }).then(r=>r.json()),
      fetch(`${base}/api/rce/day?date=${d}`, { cache: 'no-store' }).then(r=>r.json())
    ]);
    if (rt?.pvNowW !== undefined) setPvNowW(rt.pvNowW);
    const genSeries = (day?.generation||[]).map((x:number)=>Number(x||0));
    setSeries(genSeries);
    const rows = toHourRows(genSeries, rce?.rows||[]);
    setTableRows(rows);
    setSumKwh(rows.reduce((a,b)=>a+b.kwh,0));
    setSumPln(rows.reduce((a,b)=>a+b.revenue_pln,0));
  }

  React.useEffect(()=>{ loadAll(date); }, [date]);

  // Realtime refresh 60s
  React.useEffect(()=>{
    const id = setInterval(async ()=>{
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      try{
        const r = await fetch(`${base}/api/foxess/realtime`, { cache:'no-store' });
        const j = await r.json();
        if (j?.pvNowW !== undefined) setPvNowW(j.pvNowW);
      }catch{}
    }, 60000);
    return ()=>clearInterval(id);
  },[]);

  return (
    <div className="container">
      <div className="topbar">
        <div className="title">⚡ FoxESS + RCE/RCEm — Dashboard</div>
        <div className="actions">
          <a className="chip" href="https://www.foxesscloud.com" target="_blank">FoxESS</a>
          <a className="chip" href="https://raporty.pse.pl/report/rce-pln" target="_blank">RCE (PSE)</a>
          <a className="chip" href="https://www.pse.pl/oire/rcem-rynkowa-miesieczna-cena-energii-elektrycznej" target="_blank">RCEm</a>
          <ThemeToggle />
        </div>
      </div>

      <div className="row gap">
        <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <div className="pill">Suma dnia: <b>{sumKwh.toFixed(1)} kWh</b> · <b>{sumPln.toFixed(2)} PLN</b></div>
      </div>

      <div className="grid3" style={{marginTop: 12}}>
        <StatTile title="Moc teraz" value={pvNowW!=null ? `${pvNowW} W` : '—'} subtitle="Realtime z inwertera (60 s)"/>
        <StatTile title="Wygenerowano (dzień)" value={`${sumKwh.toFixed(1)} kWh`} />
        <StatTile title="Przychód (dzień)" value={`${sumPln.toFixed(2)} PLN`} subtitle="RCE godz., ujemne=0"/>
      </div>

      <div style={{marginTop:12}}>
        <div className="section-title">Generacja — godzinowo</div>
        <PowerChart series={series} />
      </div>

      <div style={{marginTop:12}}>
        <HourlyTable rows={tableRows} />
      </div>

      <div style={{marginTop:12}}>
        <RangeCalculator />
      </div>
    </div>
  );
}
