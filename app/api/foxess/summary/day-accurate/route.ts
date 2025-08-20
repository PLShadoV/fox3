import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date"); // YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ ok: false, error: "date (YYYY-MM-DD) required" }, { status: 200 });
    }
    const month = date.slice(0, 7);
    const base = originFrom(req);

    // 1) Godzinowa seria z Twojego backendu — do wykresu (cached dla przeszłości, no-cache dla dziś)
    const todayIso = new Date().toISOString().slice(0, 10);
    const dayEp = date === todayIso ? "/api/foxess/summary/day" : "/api/foxess/summary/day-cached";
    let series: number[] = [];
    try {
      const r = await fetch(`${base}${dayEp}?date=${date}`, { cache: "no-store" });
      const j = await r.json();
      series = Array.isArray(j?.today?.generation?.series) ? j.today.generation.series : [];
    } catch { series = []; }

    // 2) Dokładny total dnia z agregacji miesięcznej FoxESS (taki jak w ich aplikacji)
    let exactTotal = 0;
    try {
      const fox = await fetch(`${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/month`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": process.env.FOXESS_TOKEN || "",
        },
        body: JSON.stringify({
          sn: process.env.FOXESS_SN,
          month,                               // "YYYY-MM"
          timeZone: process.env.FOXESS_TZ || "Europe/Warsaw",
        }),
        cache: "no-store",
      });
      if (fox.ok) {
        const j = await fox.json();
        const rows: any[] = j?.result || j?.data || [];
        const hit = rows.find((it: any) => String(it?.date) === date);
        const v = Number(hit?.value);
        if (Number.isFinite(v)) exactTotal = v;
      }
    } catch { /* zostaw exactTotal=0 — fallback niżej */ }

    // 3) Fallback — jeśli nie udało się pobrać totalu z FoxESS (np. brak uprawnień)
    if (!Number.isFinite(exactTotal) || exactTotal <= 0) {
      const sumSeries = Array.isArray(series) ? series.reduce((a, v) => a + (Number(v) || 0), 0) : 0;
      exactTotal = +sumSeries.toFixed(2);
    }

    return NextResponse.json({
      ok: true,
      date,
      total_kwh: +Number(exactTotal || 0).toFixed(2),
      series,
      source: "foxess-month+fallback",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
