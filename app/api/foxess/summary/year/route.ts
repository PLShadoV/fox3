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
    const year = url.searchParams.get("year"); // YYYY
    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json({ ok: false, error: "Parametr year (YYYY) jest wymagany" }, { status: 200 });
    }

    const base = originFrom(req);
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

    const out: { month: string; generation: number }[] = [];
    for (const ym of months) {
      try {
        const j = await fetchJSONRetry(`${base}/api/foxess/summary/month?month=${ym}`, 3, 300);
        const gen = Number(j?.totals?.generation ?? 0) || 0;
        out.push({ month: ym.slice(-2), generation: +gen.toFixed(2) });
      } catch {
        out.push({ month: ym.slice(-2), generation: 0 });
      }
      await sleep(150);
    }

    const total = +out.reduce((a, m) => a + (Number(m.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      year,
      source: "sum(month:day-accurate-seq)",
      months: out.sort((a, b) => a.month.localeCompare(b.month)),
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
