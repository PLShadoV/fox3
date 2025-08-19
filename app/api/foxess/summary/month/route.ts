import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  if (!month) return NextResponse.json({ ok:false, error:"month required" }, { status:400 });

  // TODO: podłącz FoxESS API
  // przykładowe dane:
  const days = Array.from({length: 30}).map((_,i)=>({
    date: `${month}-${String(i+1).padStart(2,"0")}`,
    generation: Math.random()*50
  }));

  return NextResponse.json({ ok:true, days });
}
