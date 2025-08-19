'use client';
import React from 'react';

type Row = { hour:number, kwh:number, price_pln_mwh:number, price_used_pln_mwh:number, revenue_pln:number };
export default function HourlyTable({ rows }:{ rows: Row[] }){
  return (
    <div className="glass">
      <div className="table-title">Tabela godzinowa</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Godzina</th><th>kWh</th><th>RCE (PLN/MWh)</th><th>Użyta cena</th><th>Przychód (PLN)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td>{String(r.hour).padStart(2,'0')}:00</td>
                <td>{r.kwh.toFixed(2)}</td>
                <td>{r.price_pln_mwh.toFixed(2)}</td>
                <td>{r.price_used_pln_mwh.toFixed(2)}</td>
                <td>{r.revenue_pln.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
