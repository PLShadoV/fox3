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
    const todayIso = new Date().toISOString().slice(0, 10);

    const n = daysInMonth(y, m0);
    const dates = Array.from({ length: n }, (_, i) => toISO(y, m0, i + 1));
    const byDate = new Map<string, { date: string; generation: number }>(
      dates.map(d => [d, { date: d, generation: 0 }])
    );

    // 1) Natywna agregacja z FoxESS (z określoną TZ)
    let nativeOk = false;
    try {
      const fox = await fetch(`${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/month`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": process.env.FOXESS_TOKEN || "",
        },
        body: JSON.stringify({
          sn: process.env.FOXESS_SN,
          month,
          timeZone: process.env.FOXESS_TZ || "Europe/Warsaw",
        }),
        cache: "no-store",
      });
      if (fox.ok) {
        const j = await fox.json();
        const rows: any[] = j?.result || j?.data || [];
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
      }
    } catch {}

    // 2) Fallback – uzupełnij dni, które nadal mają 0, z /day(na dziś)/day-cached
    const need = Array.from(byDate.values()).filter(x => !Number(x.generation));
    if (need.length) {
      await pMapLimit(need, 5, async ({ date }) => {
        const isToday = date === todayIso;
        const ep = isToday ? "/api/foxess/summary/day" : "/api/foxess/summary/day-cached";
        try {
          const r = await fetch(`${base}${ep}?date=${date}`, { cache: "no-store" });
          const j = await r.json();
          const total = Number(j?.today?.generation?.total);
          const series: number[] = Array.isArray(j?.today?.generation?.series) ? j.today.generation.series : [];
          const sumSeries = series.reduce((a, v) => a + (Number(v) || 0), 0);
          const val = Number.isFinite(total) ? total : sumSeries;
          byDate.get(date)!.generation = +Number(val || 0).toFixed(2);
        } catch { /* ignore */ }
      });
    }

    const out = dates.map(d => byDate.get(d)!);
    const total = +out.reduce((a, x) => a + (Number(x.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      month,
      source: nativeOk ? "foxess-native+fallback" : "fallback-only",
      days: out,
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
