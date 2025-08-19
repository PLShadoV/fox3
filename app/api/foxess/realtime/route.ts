import { NextResponse } from "next/server";
import { foxRealtime, parseRealtime } from "@/lib/foxess";

export async function GET(){
  try{
    const raw = await foxRealtime();
    const parsed = parseRealtime(raw);
    return NextResponse.json({ ok:true, ...parsed }, { status:200 });
  }catch(e:any){
    return NextResponse.json({ ok:false, error: e.message }, { status:200 });
  }
}
