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
async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await mapper(items[idx], idx);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, worker));
  return out;
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
    const tz = process.env.FOXESS_TZ || "Europe/Warsaw";
    const todayIso = new Date().toISOString().slice(0, 10);

    const n = daysInMonth(y, m0);
    const dates = Array.from({ length: n }, (_, i) => toISO(y, m0, i + 1));
    const byDate = new Map<string, { date: string; generation: number }>(
      dates.map((d) => [d, { date: d, generation: 0 }])
    );

    let nativeOk = false;

    // 1) próbuj natywną agregację FoxESS (z TZ) z retry
    try {
      const fox = await fetchJSONRetry(
        `${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/month`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: process.env.FOXESS_TOKEN || "",
          },
          body: JSON.stringify({ sn: process.env.FOXESS_SN, month, timeZone: tz }),
        },
        3,
        300
      );
      const rows: any[] = fox?.result || fox?.data || [];
      if (Array.isArray(rows) && rows.length) {
        for (const it of rows) {
          const d = String(it?.date || "");
          const v = Number(it?.value);
          if (byDate.has(d) && Number.isFinite(v)) {
            byDate.get(d)!.generation = Math.max(0, v);
          }
        }
        nativeOk = true;
      }
    } catch {
      // przejdź do fallbacków
    }

    // 2) fallback: dla dni z 0 spróbuj /day-cached (retry), a jeśli nadal 0 → /day (retry)
    const failed: string[] = [];
    const need = Array.from(byDate.values()).filter((d) => !Number(d.generation));
    if (need.length) {
      await pMapLimit(need, 3, async ({ date }) => {
        const isToday = date === todayIso;
        let got = 0;

        // a) day-cached
        try {
          const j1 = await fetchJSONRetry(`${base}/api/foxess/summary/day-cached?date=${date}`, {}, 3, 200);
          const t = Number(j1?.today?.generation?.total);
          const series: number[] = Array.isArray(j1?.today?.generation?.series) ? j1.today.generation.series : [];
          const sum = series.reduce((a, v) => a + (Number(v) || 0), 0);
          got = Number.isFinite(t) && t > 0 ? t : sum;
        } catch {}

        // b) jeśli dalej 0 → day (nawet dla dni historycznych)
        if (!Number(got)) {
          try {
            const j2 = await fetchJSONRetry(`${base}/api/foxess/summary/day?date=${date}`, {}, 3, 300);
            const t2 = Number(j2?.today?.generation?.total);
            const series2: number[] = Array.isArray(j2?.today?.generation?.series) ? j2.today.generation.series : [];
            const sum2 = series2.reduce((a, v) => a + (Number(v) || 0), 0);
            got = Number.isFinite(t2) && t2 > 0 ? t2 : sum2;
          } catch {}
        }

        if (Number(got)) {
          byDate.get(date)!.generation = +Number(got).toFixed(2);
        } else {
          failed.push(date);
        }
      });
    }

    const out = dates.map((d) => byDate.get(d)!);
    const total = +out.reduce((a, x) => a + (Number(x.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      month,
      source: nativeOk ? "foxess-native+fallback" : "fallback-only",
      failedDates: failed, // <<— zobaczysz, które dni nie dały się pobrać
      days: out,
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
