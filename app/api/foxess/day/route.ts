import { NextRequest, NextResponse } from "next/server";
import { foxHistoryDay, parseHistoryDay } from "@/lib/foxess";

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0,10);
  try{
    const raw = await foxHistoryDay(date);
    const { generation, export: ex } = parseHistoryDay(raw);
    // normalize: ensure arrays of 24 numbers
    function norm(arr?:any){ 
      const a = Array.isArray(arr?.values)?arr.values.map((x:any)=>Number(x)||0):new Array(24).fill(0);
      while(a.length<24) a.push(0);
      return a.slice(0,24);
    }
    return NextResponse.json({
      ok:true,
      date,
      today: { date, generation: { unit: generation?.unit||'kWh', series: norm(generation) }, export: { unit: ex?.unit||'kWh', series: norm(ex) } }
    }, { status:200 });
  }catch(e:any){
    return NextResponse.json({ ok:false, error: e.message }, { status:200 });
  }
}
