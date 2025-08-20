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
// limiter współbieżności
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
      return NextResponse.json(
        { ok: false, error: "Parametr month (YYYY-MM) jest wymagany" },
        { status: 200 }
      );
    }
    const [yStr, mStr] = month.split("-");
    const y = Number(yStr);
    const m0 = Number(mStr) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m0) || m0 < 0 || m0 > 11) {
      return NextResponse.json(
        { ok: false, error: "Niepoprawny month" },
        { status: 200 }
      );
    }

    const base = originFrom(req);
    const todayIso = new Date().toISOString().slice(0, 10);

    // pełna lista dat w miesiącu
    const n = daysInMonth(y, m0);
    const dates = Array.from({ length: n }, (_, i) => toISO(y, m0, i + 1));

    // pobierz każdy dzień: dziś z /day (no-cache), reszta z /day-cached
    const days = await pMapLimit(dates, 5, async (d) => {
      const isToday = d === todayIso;
      const ep = isToday
        ? "/api/foxess/summary/day"
        : "/api/foxess/summary/day-cached";
      try {
        const r = await fetch(`${base}${ep}?date=${d}`, { cache: "no-store" });
        const j = await r.json();
        const series = Array.isArray(j?.today?.generation?.series)
          ? j.today.generation.series
          : [];
        const sumSeries = series.reduce(
          (a: number, v: any) => a + (Number(v) || 0),
          0
        );
        const kwh = Number(j?.today?.generation?.total);
        const generation = Number.isFinite(kwh) ? kwh : sumSeries;
        return { date: d, generation: +Number(generation || 0).toFixed(2) };
      } catch {
        return { date: d, generation: 0 };
      }
    });

    const total = +days
      .reduce((a, d) => a + (Number(d.generation) || 0), 0)
      .toFixed(2);

    return NextResponse.json({
      ok: true,
      month,
      source: "day-cached(+today/day)",
      days: days.sort((a, b) => a.date.localeCompare(b.date)),
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 200 }
    );
  }
}
