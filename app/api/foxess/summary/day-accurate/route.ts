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

    // 1) Godzinowa seria do wykresu — spróbuj cached, jak nie wyjdzie, użyj /day
    let series: number[] = [];
    try {
      const j1 = await fetchJSONRetry(`${base}/api/foxess/summary/day-cached?date=${date}`, {});
      series = Array.isArray(j1?.today?.generation?.series) ? j1.today.generation.series : [];
      if (!series.length) {
        const j2 = await fetchJSONRetry(`${base}/api/foxess/summary/day?date=${date}`, {});
        series = Array.isArray(j2?.today?.generation?.series) ? j2.today.generation.series : [];
      }
    } catch {
      // ostatecznie bez serii
      series = [];
    }

    // 2) Dokładny total dnia z agregacji miesięcznej FoxESS (z podaną TZ) — jak w oficjalnej apce
    let exactTotal = 0;
    try {
      const fox = await fetchJSONRetry(
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
        }
      );
      const rows: any[] = fox?.result || fox?.data || [];
      const hit = Array.isArray(rows) ? rows.find((it) => String(it?.date) === date) : null;
      const v = Number(hit?.value);
      if (Number.isFinite(v)) exactTotal = v;
    } catch {
      // brak natywnej agregacji — fallback poniżej
    }

    // 3) Fallback — jeśli nie udało się pobrać totalu z FoxESS, policz z serii (albo pobierz /day jako backup)
    if (!Number.isFinite(exactTotal) || exactTotal <= 0) {
      if (!series.length) {
        try {
          const j2 = await fetchJSONRetry(`${base}/api/foxess/summary/day?date=${date}`, {});
          series = Array.isArray(j2?.today?.generation?.series) ? j2.today.generation.series : [];
        } catch {}
      }
      const sumSeries = series.reduce((a, v) => a + (Number(v) || 0), 0);
      exactTotal = +sumSeries.toFixed(2);
    }

    return NextResponse.json({
      ok: true,
      date,
      total_kwh: +Number(exactTotal || 0).toFixed(2),
      series,
      source: "foxess-month+retry+fallback",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
