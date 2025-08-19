import { NextRequest, NextResponse } from "next/server";

/**
 * This endpoint is optional. If RCE provider is not configured,
 * it returns {ok:true, rows:[]} so UI falls back to RCEm.
 *
 * You can set RCE_PROVIDER_URL in env to a custom JSON service returning:
 *  { date: 'YYYY-MM-DD', rows: [{ hour:0, rce_pln_mwh:number }, ... 24 rows ] }
 */
export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
  const provider = process.env.RCE_PROVIDER_URL || "";
  if(!provider){
    return NextResponse.json({ ok:true, date, rows: [] }, { status:200 });
  }
  try{
    const res = await fetch(`${provider}?date=${date}`, { next: { revalidate: 300 }});
    const j = await res.json();
    const rows = Array.isArray(j?.rows) ? j.rows : [];
    return NextResponse.json({ ok:true, date, rows }, { status:200 });
  }catch(e:any){
    return NextResponse.json({ ok:false, error:e.message }, { status:200 });
  }
}
