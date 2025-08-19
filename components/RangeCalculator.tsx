'use client';
import { useState } from 'react';

export default function RangeCalculator(){
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<'rce'|'rcem'>('rcem');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{kwh:number, revenue:number}|null>(null);
  const [error, setError] = useState<string|null>(null);

  async function compute(){
    setLoading(true); setError(null); setResult(null);
    try{
      const url = `/api/range/compute?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mode=${mode}`;
      const r = await fetch(url);
      const j = await r.json();
      if(!r.ok || j.ok===false) throw new Error(j.error || 'Błąd obliczeń');
      setResult({kwh:j.totals.kwh, revenue:j.totals.revenue_pln});
    }catch(e:any){
      setError(e.message);
    }finally{ setLoading(false); }
  }

  return (
    <div className="glass" style={{padding:16}}>
      <div className="section-title" style={{marginBottom:8}}>Kalkulator zakresu</div>
      <div className="hstack" style={{gap:12, flexWrap:'wrap'}}>
        <div><div className="sub">Od</div><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
        <div><div className="sub">Do</div><input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
        <select value={mode} onChange={e=>setMode(e.target.value as any)}>
          <option value="rce">RCE</option>
          <option value="rcem">RCEm</option>
        </select>
        <button className="primary" onClick={compute} disabled={loading || !from || !to}>{loading?'Liczenie...':'Oblicz'}</button>
      </div>
      {result && (
        <div style={{marginTop:12, display:'flex', gap:16}}>
          <div className="glass" style={{padding:12}}><div className="title">Suma kWh</div><div className="value">{result.kwh.toFixed(1)}</div></div>
          <div className="glass" style={{padding:12}}><div className="title">Suma przychodu</div><div className="value">{result.revenue.toFixed(2)} PLN</div></div>
        </div>
      )}
      {error && <div className="error" style={{marginTop:12}}>{error}</div>}
    </div>
  );
}
