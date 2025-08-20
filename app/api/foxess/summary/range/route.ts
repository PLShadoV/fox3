import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatYMDUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function eachDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = parseYMD(from);
  const end = parseYMD(to);
  while (cur.getTime() <= end.getTime()) {
    out.push(formatYMDUTC(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
async function fetchJSONRetry(url: string, tries = 3, baseDelay = 250) {
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
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ ok: false, error: "Podaj from i to w formacie YYYY-MM-DD" }, { status: 200 });
    }
    if (parseYMD(from) > parseYMD(to)) {
      return NextResponse.json({ ok: false, error: "`from` nie może być po `to`" }, { status: 200 });
    }

    const base = originFrom(req);
    const dates = eachDateInclusive(from, to);
    const days: { date: string; kwh: number }[] = [];

    // sekwencyjnie, żeby nie gubić dni (rate-limit FoxESS)
    for (const d of dates) {
      let kwh = 0;
      try {
        // preferujemy „dokładny dzień” (zawiera wszystko jak w apce)
        const j = await fetchJSONRetry(`${base}/api/foxess/summary/day-accurate?date=${d}`, 3, 300);
        const t = Number(j?.total_kwh ?? 0);
        if (Number.isFinite(t) && t > 0) {
          kwh = +t.toFixed(2);
        } else {
          // fallback do /day
          const j2 = await fetchJSONRetry(`${base}/api/foxess/summary/day?date=${d}`, 2, 250);
          const total = Number(j2?.today?.generation?.total);
          const series: number[] = Array.isArray(j2?.today?.generation?.series) ? j2.today.generation.series : [];
          const sum = series.reduce((a, v) => a + (Number(v) || 0), 0);
          kwh = +Number(Number.isFinite(total) && total > 0 ? total : sum).toFixed(2);
        }
      } catch {
        kwh = 0;
      }
      days.push({ date: d, kwh });
      await sleep(150); // grzeczne tempo dla API
    }

    const total_kwh = +days.reduce((a, x) => a + (Number(x.kwh) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      from, to,
      days,
      total_kwh,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
