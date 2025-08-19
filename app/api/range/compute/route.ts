import { ok, bad } from "../../../../lib/utils";

function monthKey(d: Date) {
  return d.toISOString().slice(0,7);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate()+days);
  return x;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const mode = (searchParams.get("mode")||"rce").toLowerCase(); // "rce"|"rcem"

    if (!from || !to) return bad("Invalid 'from' or 'to' date");

    const start = new Date(from);
    const end = new Date(to);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return bad("Invalid date range");
    if (end < start) return bad("'to' before 'from'");

    let sumKWh = 0;
    let sumPLN = 0;
    const byDay: any[] = [];

    for (let d = new Date(start); d <= end; d = addDays(d,1)) {
      const dayStr = d.toISOString().slice(0,10);
      const genRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL||""}/api/foxess/day?date=${dayStr}`, { cache: "no-store" });
      const gen = await genRes.json();
      const kwh = (gen.generation || []).reduce((a:number,b:number)=>a+Number(b||0),0);
      sumKWh += kwh;

      let dayPLN = 0;
      if (mode === "rce") {
        const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL||""}/api/rce/day?date=${dayStr}`, { cache: "no-store" });
        const rjson = await r.json();
        const hours = rjson.rows || [];
        for (let h=0; h<24; h++) {
          const priceMWh = Math.max(0, Number(hours[h]?.rce_pln_mwh || 0));
          const hkwh = Number(gen.generation?.[h] || 0);
          dayPLN += hkwh * (priceMWh/1000);
        }
      } else {
        const mkey = monthKey(d);
        const rcemRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL||""}/api/rcem/monthly`, { cache: "force-cache" });
        const rcem = await rcemRes.json();
        const priceMWh = Number(rcem.rows?.[mkey] || 0);
        dayPLN = kwh * (priceMWh/1000);
      }
      sumPLN += dayPLN;
      byDay.push({ date: dayStr, kwh, revenue_pln: dayPLN });
    }

    return ok({ from, to, mode, totals: { kwh: sumKWh, revenue_pln: sumPLN }, rows: byDay });
  } catch (e:any) {
    return bad(e.message);
  }
}
