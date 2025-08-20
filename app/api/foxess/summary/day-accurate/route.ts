import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJSONRetry(url: string, opts: RequestInit = {}, tries = 3, baseDelay = 250) {
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
    const token = process.env.FOXESS_TOKEN || "";
    const sn = process.env.FOXESS_SN;

    // 1) seria godzinowa → wykres
    let series: number[] = [];
    try {
      const j1 = await fetchJSONRetry(`${base}/api/foxess/summary/day-cached?date=${date}`, {}, 2, 200);
      series = Array.isArray(j1?.today?.generation?.series) ? j1.today.generation.series : [];
      if (!series.length) {
        const j2 = await fetchJSONRetry(`${base}/api/foxess/summary/day?date=${date}`, {}, 2, 250);
        series = Array.isArray(j2?.today?.generation?.series) ? j2.today.generation.series : [];
      }
    } catch { series = []; }

    // 2) dokładny total — 3 źródła po kolei
    let exact = 0;
    let used = "";

    // (a) DEVICE / day
    try {
      const j = await fetchJSONRetry(
        `${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/day`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ sn, date, timeZone: tz }),
        },
        3, 300
      );
      const v = Number(j?.result?.value ?? j?.data?.value ?? j?.data?.total);
      if (Number.isFinite(v) && v > 0) { exact = v; used = "device/day"; }
    } catch {}

    // (b) PLANT / day
    if (!used) {
      try {
        const j = await fetchJSONRetry(
          `${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/plant/energy/day`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({ date, timeZone: tz }),
          },
          3, 300
        );
        const rows: any[] = j?.result || j?.data || [];
        const hit = Array.isArray(rows) ? rows.find(r => String(r?.date) === date) : null;
        const v = Number(hit?.value);
        if (Number.isFinite(v) && v > 0) { exact = v; used = "plant/day"; }
      } catch {}
    }

    // (c) DEVICE / month
    if (!used) {
      try {
        const j = await fetchJSONRetry(
          `${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/month`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", token },
            body: JSON.stringify({ sn, month, timeZone: tz }),
          },
          3, 300
        );
        const rows: any[] = j?.result || j?.data || [];
        const hit = Array.isArray(rows) ? rows.find(r => String(r?.date) === date) : null;
        const v = Number(hit?.value);
        if (Number.isFinite(v) && v > 0) { exact = v; used = "device/month"; }
      } catch {}
    }

    // (d) fallback — suma z serii godzinowej
    if (!Number.isFinite(exact) || exact <= 0) {
      const sum = series.reduce((a, v) => a + (Number(v) || 0), 0);
      exact = +sum.toFixed(2);
      used = "series/sum";
    }

    return NextResponse.json({
      ok: true,
      date,
      total_kwh: +Number(exact).toFixed(2),
      series,
      source: `accurate:${used}`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
