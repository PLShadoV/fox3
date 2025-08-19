import { NextResponse } from 'next/server';
import { rcemFor } from '@/lib/rcem';

function parseDate(s:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s+'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

function normalizeHourly(gen: any): number[] {
  const arr = gen?.series || gen?.values || gen || [];
  if (!Array.isArray(arr)) return new Array(24).fill(0);
  const nums = arr.map((x:any)=> Number(x) || 0);
  const diffs:number[] = [];
  let prev = 0;
  for(let i=0;i<nums.length;i++){ diffs.push(Math.max(0, +(nums[i]-prev).toFixed(3))); prev = nums[i]; }
  const sumNums = nums.reduce((a,b)=>a+b,0);
  const sumDiffs = diffs.reduce((a,b)=>a+b,0);
  return (sumNums>sumDiffs*1.8) ? diffs.slice(0,24) : nums.slice(0,24);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const mode = (searchParams.get('mode') || 'rcem').toLowerCase();

  const d1 = parseDate(from);
  const d2 = parseDate(to);
  if(!d1 || !d2 || d1 > d2) return NextResponse.json({ ok:false, error: "Invalid 'from' or 'to' date" }, { status: 400 });

  const maxDays = 93;
  const days = [];
  for(let d=new Date(d1); d<=d2 && days.length<maxDays; d.setDate(d.getDate()+1)) days.push(new Date(d));

  let totalKWh = 0;
  let totalRevenue = 0;

  for(const day of days){
    const date = day.toISOString().slice(0,10);
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/foxess/day?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
    const j = await r.json();
    const hourly = normalizeHourly(j?.today?.generation || j?.generation || j?.result?.[0]);
    const kwh = hourly.reduce((a:number,b:number)=>a+b,0);
    totalKWh += kwh;
    if (mode === 'rcem'){
      const price = rcemFor(date) || 0;
      totalRevenue += kwh * Math.max(0, price) / 1000;
    } else {
      // mode rce: attempt to fetch hourly prices if your project provides them
      try {
        const rr = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/rce/day?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
        if (rr.ok){
          const rj = await rr.json();
          const rows = rj?.rows || rj?.data || [];
          for (let i=0;i<24;i++){
            const price = Number(rows[i]?.rce_pln_mwh ?? 0);
            totalRevenue += (hourly[i]||0) * Math.max(0, price) / 1000;
          }
        }
      } catch {}
    }
  }

  return NextResponse.json({ ok:true, from, to, mode, totals: { kwh: +totalKWh.toFixed(2), revenue_pln: +totalRevenue.toFixed(2) } });
}
