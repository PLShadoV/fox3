import { NextRequest, NextResponse } from "next/server";
import { eachDay } from "@/lib/utils";
import rcem from "@/public/rcem.json";

async function dayGen(date:string){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/foxess/day?date=${date}`, { cache: 'no-store' });
  const j = await res.json();
  if(!j?.ok) throw new Error(j?.error || 'FoxESS day failed');
  const series = j?.today?.generation?.series || [];
  const sum = series.reduce((a:number,b:number)=>a+(Number(b)||0),0);
  return { kwh: sum, hourly: series };
}

async function dayRCE(date:string){
  try{
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/rce/day?date=${date}`, { next:{ revalidate: 300 }});
    const j = await res.json();
    return Array.isArray(j?.rows)? j.rows : [];
  }catch{ return []; }
}

export async function GET(req: NextRequest){
  const u = new URL(req.url);
  const from = u.searchParams.get('from') || '';
  const to = u.searchParams.get('to') || '';
  const mode = (u.searchParams.get('mode') || 'rce').toLowerCase();
  if(!from || !to || from>to) return NextResponse.json({ ok:false, error:"Invalid 'from' or 'to' date" }, { status:200 });

  let totalKwh=0, totalRevenue=0;
  const days = eachDay(from, to);
  for(const d of days){
    const { kwh, hourly } = await dayGen(d);
    totalKwh += kwh;
    if(mode==='rcem'){
      const key = d.slice(0,7);
      const price = (rcem as any)[key];
      if(price) totalRevenue += kwh * (Math.max(0, Number(price)||0)/1000);
      continue;
    }
    // rce hourly
    const rceRows = await dayRCE(d);
    if(rceRows.length===24){
      let rev=0;
      for(let i=0;i<24;i++){
        const price = Math.max(0, Number(rceRows[i]?.rce_pln_mwh)||0);
        const k = Number(hourly[i]||0);
        rev += k * (price/1000);
      }
      totalRevenue += rev;
    }else{
      // fallback to RCEm if no hourly
      const key = d.slice(0,7);
      const price = (rcem as any)[key];
      if(price) totalRevenue += kwh * (Math.max(0, Number(price)||0)/1000);
    }
  }

  return NextResponse.json({ ok:true, from, to, mode, totals: { kwh: Number(totalKwh.toFixed(2)), revenue_pln: Number(totalRevenue.toFixed(2)) } }, { status:200 });
}
