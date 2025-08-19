import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  if (!month) return NextResponse.json({ ok:false, error:"month required" }, { status:400 });

  try {
    // wywołanie FoxESS API
    const fox = await fetch(`${process.env.FOXESS_BASE}/op/v1/device/energy/month`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": process.env.FOXESS_TOKEN || "",
      },
      body: JSON.stringify({
        sn: process.env.FOXESS_SN,  // SN falownika np. "603T253021ND064"
        month,
      }),
      cache: "no-store"
    });

    if (!fox.ok) {
      return NextResponse.json({ ok:false, error:`FoxESS HTTP ${fox.status}` }, { status:502 });
    }

    const data = await fox.json();

    // normalizacja — FoxESS zwraca np. [{date:"2025-07-01", value:12.3}, ...]
    const days = (data?.result || []).map((d:any)=>({
      date: d.date,
      generation: d.value ?? 0,
    }));

    return NextResponse.json({ ok:true, days });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
