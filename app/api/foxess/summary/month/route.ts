import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}
function daysInMonth(y: number, m0: number) {
  return new Date(y, m0 + 1, 0).getDate();
}
function toISO(y: number, m0: number, d: number) {
  const mm = String(m0 + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSONRetry(url: string, tries = 3, baseDelay = 300) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { cache: "no-store" });
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
    const month = url.searchParams.get("month"); // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ ok: false, error: "Parametr month (YYYY-MM) jest wymagany" }, { status: 200 });
    }
    const [yStr, mStr] = month.split("-");
    const y = Number(yStr);
    const m0 = Number(mStr) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m0) || m0 < 0 || m0 > 11) {
      return NextResponse.json({ ok: false, error: "Niepoprawny month" }, { status: 200 });
    }

    const base = originFrom(req);
    const n = daysInMonth(y, m0);
    const dates = Array.from({ length: n }, (_, i) => toISO(y, m0, i + 1));

    const days: { date: string; generation: number }[] = [];
    const failedDates: string[] = [];

    // SEKWENCYJNIE, z małym opóźnieniem między żądaniami, żeby nie wpaść w rate-limit
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      try {
        // 1) preferuj nasz endpoint „dokładny”
        const j = await fetchJSONRetry(`${base}/api/foxess/summary/day-accurate?date=${d}`, 3, 300);
        let gen = Number(j?.total_kwh ?? 0);
        if (!Number.isFinite(gen) || gen <= 0) {
          // 2) fallback do /day (no-cache)
          const j2 = await fetchJSONRetry(`${base}/api/foxess/summary/day?date=${d}`, 2, 250);
          const t2 = Number(j2?.today?.generation?.total);
          const s2: number[] = Array.isArray(j2?.today?.generation?.series) ? j2.today.generation.series : [];
          const sum2 = s2.reduce((a, v) => a + (Number(v) || 0), 0);
          gen = Number.isFinite(t2) && t2 > 0 ? t2 : sum2;
        }
        days.push({ date: d, generation: +Number(gen || 0).toFixed(2) });
      } catch {
        failedDates.push(d);
        days.push({ date: d, generation: 0 });
      }
      // „grzeczność” dla API
      await sleep(200);
    }

    const total = +days.reduce((a, x) => a + (Number(x.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      month,
      source: "day-accurate-seq",
      failedDates,
      days,
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
