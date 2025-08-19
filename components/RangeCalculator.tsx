'use client';
import React from 'react';

export default function RangeCalculator(){
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [mode, setMode] = React.useState<'rce'|'rcem'>('rcem');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{kwh:number,pln:number}|null>(null);
  async function compute(){
    if(!from || !to) return;
    setLoading(true);
    setResult(null);
    try{
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const r = await fetch(`${base}/api/range/compute?from=${from}&to=${to}&mode=${mode}`, { cache:'no-store' });
      const j = await r.json();
      if(j.ok) setResult({ kwh: j.totals.kwh, pln: j.totals.revenue_pln });
      else alert(j.error||'Błąd');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="glass">
      <div className="section-title">Kalkulator zakresu</div>
      <div className="row gap">
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="input"/>
        <span className="dash">—</span>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="input"/>
        <select value={mode} onChange={e=>setMode(e.target.value as any)} className="input">
          <option value="rce">RCE (godzinowe)</option>
          <option value="rcem">RCEm (miesięczne)</option>
        </select>
        <button className="btn" onClick={compute} disabled={loading || !from || !to}>
          {loading ? 'Liczenie…' : 'Oblicz'}
        </button>
      </div>
      {result && (
        <div className="row">
          <div className="pill">Energia: <b>{result.kwh.toFixed(1)} kWh</b></div>
          <div className="pill">Przychód: <b>{result.pln.toFixed(2)} PLN</b></div>
        </div>
      )}
    </div>
  );
}
