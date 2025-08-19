'use client';
type Row = { hour: string; kwh: number; price: number | null; revenue: number | null };
type Props = { rows: Row[] };
export type { Row };
export default function HourlyTable({ rows }: Props){
  return (
    <div className="glass" style={{padding:16}}>
      <div className="section-title" style={{marginBottom:8}}>Tabela godzinowa</div>
      <table className="table">
        <thead><tr><th>Godzina</th><th>KWh</th><th>Cena (PLN/MWh)</th><th>Przychód (PLN)</th></tr></thead>
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
