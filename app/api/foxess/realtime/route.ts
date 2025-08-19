import { NextResponse } from 'next/server';

export async function GET() {
  const proxy = process.env.FOXESS_REALTIME_PROXY; // forward if provided
  if (proxy) {
    try{
      const r = await fetch(proxy, { cache: 'no-store' });
      const j = await r.json();
      return NextResponse.json(j, { status: r.status });
    }catch(e:any){
      return NextResponse.json({ ok:false, error: 'Proxy error: '+e.message }, { status: 500 });
    }
  }
  // Fallback mock
  return NextResponse.json({ ok:true, pvNowW: 6234 });
}
