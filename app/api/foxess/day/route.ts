import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0,10);

  // If user provides a proxy URL to their working FoxESS endpoint, we forward
  const proxy = process.env.FOXESS_DAY_PROXY; // e.g. https://yourdomain/api/foxess/day
  if (proxy) {
    try{
      const r = await fetch(`${proxy}?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      const j = await r.json();
      return NextResponse.json(j, { status: r.status });
    }catch(e:any){
      return NextResponse.json({ ok:false, error: 'Proxy error: '+e.message }, { status: 500 });
    }
  }

  // Fallback sample so UI renders (replace with real FoxESS integration)
  const sample = {
    ok: true,
    date,
    today: {
      generation: { unit: 'kWh', series: [0,0,0,0,0,0,0.5,1.8,6.7,13.2,14.6,14.1,13.7,17.2,19,18.5,16.7,11.2,4.9,0,0,0,0,0] }
    }
  };
  return NextResponse.json(sample);
}
