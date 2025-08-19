'use client';
import { useState } from 'react';

export default function RangeCalculator(){
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<'rce'|'rcem'>('rcem');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<{kwh:number; revenue:number}|null>(null);
  const [err, setErr] = useState<string|null>(null);

  async function run(){
    setErr(null); setLoading(true); setOut(null);
    try{
      if(!from || !to) throw new Error('Ustaw zakres dat.');
      const r = await fetch(`/api/range/compute?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mode=${mode}`);
      const j = await r.json();
      if(!r.ok || j.ok===false) throw new Error(j.error || 'Błąd obliczeń');
      setOut({ kwh: j.kwh ?? j.totals?.kwh ?? 0, revenue: j.revenue ?? j.totals?.revenue_pln ?? 0 });
    }catch(e:any){ setErr(e.message); } finally{ setLoading(false); }
  }

  return (
    <div className="glass" style={{padding:16}}>
      <div className="section-title" style={{marginBottom:12}}>Kalkulator zakresu</div>
      <div className="hstack" style={{gap:12, flexWrap:'wrap'}}>
        <label>Od: <input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label>
        <label>Do: <input type="date" value={to} onChange={e=>setTo(e.target.value)} /></label>
        <select value={mode} onChange={e=>setMode(e.target.value as any)}>
          <option value="rce">RCE (godzinowe)</option>
          <option value="rcem">RCEm (miesięczne)</option>
        </select>
        <button className="primary" onClick={run} disabled={loading}>{loading?'Liczenie…':'Oblicz'}</button>
      </div>
      {out && (
        <div style={{marginTop:12}} className="hstack" >
          <div className="chip">Suma: <b style={{marginLeft:6}}>{out.kwh.toFixed(1)} kWh</b></div>
          <div className="chip">Przychód: <b style={{marginLeft:6}}>{out.revenue.toFixed(2)} PLN</b></div>
        </div>
      )}
      {err && <div className="error" style={{marginTop:12}}>{err}</div>}
    </div>
  );
}
