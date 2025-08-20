import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchJSONRetry(url: string, opts: RequestInit, tries = 3, baseDelay = 250) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { cache: "no-store", ...opts });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      await sleep(baseDelay * (i + 1));
    }
  }
  throw lastErr;
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
    const tz = process.env.FOXESS_TZ || "Europe/Warsaw";

    // 1) godzinna seria do wykresu (spróbuj cached, potem no-cache)
    let series: number[] = [];
    try {
      const j1 = await fetchJSONRetry(`${base}/api/foxess/summary/day-cached?date=${date}`, {}, 2, 200);
      series = Array.isArray(j1?.today?.generation?.series) ? j1.today.generation.series : [];
      if (!series.length) {
        const j2 = await fetchJSONRetry(`${base}/api/foxess/summary/day?date=${date}`, {}, 2, 250);
        series = Array.isArray(j2?.today?.generation?.series) ? j2.today.generation.series : [];
      }
    } catch { series = []; }

    // 2) „dokładny” total jak w apce FoxESS:
    //    najpierw device/energy/day (lokalny dzień z TZ), potem month, na końcu suma z serii
    let exactTotal = 0;
    let sourcePath = "device/day";

    try {
      const day = await fetchJSONRetry(
        `${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/day`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: process.env.FOXESS_TOKEN || "",
          },
          body: JSON.stringify({
            sn: process.env.FOXESS_SN,
            date,                     // "YYYY-MM-DD"
            timeZone: tz,
          }),
        },
        3,
        300
      );
      // spotykane formy odpowiedzi:
      // { result: { value: 171.6 } }  lub  { data: { total: 171.6 } }
      const v1 = Number(day?.result?.value ?? day?.data?.value ?? day?.data?.total);
      if (Number.isFinite(v1) && v1 > 0) {
        exactTotal = v1;
      } else {
        throw new Error("day endpoint empty");
      }
    } catch {
      // fallback do month
      sourcePath = "device/month";
      try {
        const monthJ = await fetchJSONRetry(
          `${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/month`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: process.env.FOXESS_TOKEN || "",
            },
            body: JSON.stringify({
              sn: process.env.FOXESS_SN,
              month,
              timeZone: tz,
            }),
          },
          3,
          300
        );
        const rows: any[] = monthJ?.result || monthJ?.data || [];
        const hit = Array.isArray(rows) ? rows.find((it) => String(it?.date) === date) : null;
        const v2 = Number(hit?.value);
        if (Number.isFinite(v2) && v2 > 0) {
          exactTotal = v2;
        }
      } catch {
        // zostanie policzone z serii
      }
    }

    if (!Number.isFinite(exactTotal) || exactTotal <= 0) {
      sourcePath = "series/sum";
      const sumSeries = series.reduce((a, v) => a + (Number(v) || 0), 0);
      exactTotal = +sumSeries.toFixed(2);
    }

    return NextResponse.json({
      ok: true,
      date,
      total_kwh: +Number(exactTotal || 0).toFixed(2),
      series,
      source: `accurate:${sourcePath}`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
