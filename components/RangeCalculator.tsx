'use client';
import { useState } from "react";

export default function RangeCalculator(){
  const today = new Date().toISOString().slice(0,10);
  const monthStart = today.slice(0,8) + '01';
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [mode, setMode] = useState<'rce'|'rcem'>('rce');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{kwh:number, revenue_pln:number}|null>(null);
  const [error, setError] = useState<string| null>(null);

  async function calc(){
    setLoading(true); setError(null);
    try{
      const q = new URLSearchParams({from, to, mode}).toString();
      const res = await fetch('/api/range/compute?'+q, { cache:'no-store' });
      const j = await res.json();
      if(!res.ok || !j.ok){ throw new Error(j.error || 'Błąd'); }
      setResult({kwh: j.totals.kwh, revenue_pln: j.totals.revenue_pln});
    }catch(e:any){
      setError(e.message);
    }finally{ setLoading(false); }
  }

  return (
    <div className="glass">
      <div className="title" style={{marginBottom:8}}>Kalkulator zakresu</div>
      <div className="controls">
        <div>Od</div>
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        <div>Do</div>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        <div>Tryb</div>
        <div className={"toggle "+(mode==='rce'?'active':'')} onClick={()=>setMode('rce')}>RCE</div>
        <div className={"toggle "+(mode==='rcem'?'active':'')} onClick={()=>setMode('rcem')}>RCEm</div>
        <div className="right" />
        <button className="btn" onClick={calc} disabled={loading}>{loading?'Liczenie...':'Oblicz'}</button>
      </div>
      <div className="spacer"></div>
      {error && <div className="err">{error}</div>}
      {result && <div className="ok">Suma GENERATION: {result.kwh.toFixed(2)} kWh, Suma przychodu: {result.revenue_pln.toFixed(2)} PLN</div>}
      {!result && !error && <div className="notice">Podaj zakres i kliknij „Oblicz”. Jeśli brak danych RCE godzinowych, kalkulator automatycznie użyje RCEm.</div>}
    </div>
  )
}
