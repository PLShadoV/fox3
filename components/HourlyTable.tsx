'use client';
export default function HourlyTable({ rows }:{ rows: {hour:number,kwh:number,price_pln_mwh?:number, price_used_pln_mwh?:number, revenue_pln?:number}[] }){
  const sumK = rows.reduce((a,b)=>a + (b.kwh||0), 0);
  const sumR = rows.reduce((a,b)=>a + (b.revenue_pln||0), 0);
  return (
    <div className="glass">
      <table className="table">
        <thead>
          <tr>
            <th>Godzina</th><th>Generacja (kWh)</th><th>Cena RCE (PLN/MWh)</th><th>Cena użyta (PLN/MWh)</th><th>Przychód (PLN)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{(r.hour<10?'0':'')+r.hour+':00'}</td>
              <td>{r.kwh.toFixed(2)}</td>
              <td>{r.price_pln_mwh?.toFixed(2) ?? '—'}</td>
              <td>{r.price_used_pln_mwh?.toFixed(2) ?? '—'}</td>
              <td>{(r.revenue_pln ?? 0).toFixed(2)}</td>
            </tr>
          ))}
          <tr className="sum"><td>Suma</td><td>{sumK.toFixed(2)}</td><td></td><td></td><td>{sumR.toFixed(2)}</td></tr>
        </tbody>
      </table>
    </div>
  )
}
