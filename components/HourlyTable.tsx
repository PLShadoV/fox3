'use client';

type Row = { hour:string; kwh:number; price:number|null; revenue:number|null };
export default function HourlyTable({ rows, date, priceLabel }:{ rows:Row[]; date:string; priceLabel:string }){
  return (
    <div className="glass" style={{padding:16}}>
      <div className="section-title" style={{marginBottom:8}}>Godzinowa tabela — {date}</div>
      <table className="table">
        <thead>
          <tr><th>Godzina</th><th>kWh</th><th>{priceLabel}</th><th>Przychód (PLN)</th></tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td className="kbd">{r.hour}</td>
              <td>{r.kwh.toFixed(2)}</td>
              <td>{r.price==null ? '—' : r.price.toFixed(2)}</td>
              <td>{r.revenue==null ? '—' : r.revenue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
