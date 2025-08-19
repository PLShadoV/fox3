import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

function daysInMonth(year: number, monthIndexZeroBased: number) {
  return new Date(year, monthIndexZeroBased + 1, 0).getDate();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ ok: false, error: "month param (YYYY-MM) required" }, { status: 200 });
    }
    const [yStr, mStr] = month.split("-");
    const year = Number(yStr);
    const mi = Number(mStr) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(mi) || mi < 0 || mi > 11) {
      return NextResponse.json({ ok: false, error: "invalid month" }, { status: 200 });
    }

    const base = originFrom(req);
    const nDays = daysInMonth(year, mi);
    const dates: string[] = Array.from({ length: nDays }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      return `${yStr}-${mStr}-${d}`;
    });

    // pobieraj równolegle; brak danych = 0
    const results = await Promise.all(
      dates.map(async (date) => {
        try {
          const res = await fetch(`${base}/api/foxess/summary/day-cached?date=${date}`, { cache: "no-store" });
          const j = await res.json();
          const kwh = Number(j?.today?.generation?.total ?? 0) || 0;
          return { date, generation: +kwh.toFixed(3) };
        } catch {
          return { date, generation: 0 };
        }
      })
    );

    const total = +results.reduce((acc, r) => acc + r.generation, 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      month,
      days: results,                       // [{ date:"YYYY-MM-DD", generation: kWh }]
      totals: { generation: total },       // suma miesiąca
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
