import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year"); // "YYYY"
  if (!year) return NextResponse.json({ ok:false, error:"year required" }, { status:400 });

  try {
    // wywołanie FoxESS API
    const fox = await fetch(`${process.env.FOXESS_BASE}/op/v1/device/energy/year`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": process.env.FOXESS_TOKEN || "",
      },
      body: JSON.stringify({
        sn: process.env.FOXESS_SN,
        year,
      }),
      cache: "no-store"
    });

    if (!fox.ok) {
      return NextResponse.json({ ok:false, error:`FoxESS HTTP ${fox.status}` }, { status:502 });
    }

    const data = await fox.json();

    // normalizacja — FoxESS zwraca np. [{month:"2025-01", value:320.4}, ...]
    const months = (data?.result || []).map((m:any)=>({
      month: m.date?.slice(-2) || "",
      generation: m.value ?? 0,
    }));

    return NextResponse.json({ ok:true, months });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
