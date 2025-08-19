// components/HourlyTable.tsx
'use client';

type Row = {
  hour: string;                // "06:00", "07:00", ...
  kwh: number;                 // wygenerowane kWh w tej godzinie (nie skumulowane)
  price?: number | null;       // PLN/MWh – opcjonalnie (RCE/RCEm)
  revenue?: number | null;     // PLN – opcjonalnie (RCE/RCEm)
};

type Props = {
  rows: Row[];
  priceLabel?: string;         // nagłówek kolumny z ceną
};

export default function HourlyTable({ rows, priceLabel = 'Cena (PLN/MWh)' }: Props) {
  const hasPrice = rows.some(r => r.price != null);
  const hasRevenue = rows.some(r => r.revenue != null);

  const totalKwh = rows.reduce((a, b) => a + (Number(b.kwh) || 0), 0);
  const totalRevenue = rows.reduce((a, b) => a + (Number(b.revenue) || 0), 0);

  return (
    <div className="glass" style={{ padding: 16 }}>
      <div className="section-title" style={{ marginBottom: 8 }}>
        Godzinowy podział
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Godzina</th>
            <th>KWh</th>
            {hasPrice && <th>{priceLabel}</th>}
            {hasRevenue && <th>Przychód (PLN)</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="kbd">{r.hour}</td>
              <td>{(Number(r.kwh) || 0).toFixed(2)}</td>
              {hasPrice && <td>{r.price != null ? Number(r.price).toFixed(2) : '—'}</td>}
              {hasRevenue && <td>{r.revenue != null ? Number(r.revenue).toFixed(2) : '—'}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>Razem</th>
            <th>{totalKwh.toFixed(2)}</th>
            {hasPrice && <th>—</th>}
            {hasRevenue && <th>{totalRevenue.toFixed(2)}</th>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
