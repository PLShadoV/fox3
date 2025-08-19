import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0,10);
  // No live PSE scraping here; return empty so UI can switch to RCEm.
  const rows = Array.from({length:24}, (_,i)=>({ timeISO: new Date(`${date}T${String(i).padStart(2,'0')}:00:00Z`).toISOString(), rce_pln_mwh: 0 }));
  return NextResponse.json({ ok:true, date, rows });
}
