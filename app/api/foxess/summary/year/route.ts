import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year"); // "YYYY"
  if (!year) return NextResponse.json({ ok:false, error:"year required" }, { status:400 });

  // TODO: podłącz FoxESS API
  // przykładowe dane:
  const months = Array.from({length: 12}).map((_,i)=>({
    month: String(i+1).padStart(2,"0"),
    generation: Math.random()*1000
  }));

  return NextResponse.json({ ok:true, months });
}
