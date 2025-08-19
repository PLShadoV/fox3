import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year"); // "YYYY"
    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json({ ok: false, error: "year param (YYYY) required" }, { status: 200 });
    }

    const base = originFrom(req);

    // 12 miesięcy: YYYY-01 .. YYYY-12
    const monthsYM = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

    const monthResults = await Promise.all(
      monthsYM.map(async (ym) => {
        try {
          const res = await fetch(`${base}/api/foxess/summary/month?month=${ym}`, { cache: "no-store" });
          const j = await res.json();
          const gen = Number(j?.totals?.generation ?? 0) || 0;
          return { month: ym.slice(-2), generation: +gen.toFixed(2) };
        } catch {
          return { month: ym.slice(-2), generation: 0 };
        }
      })
    );

    const total = +monthResults.reduce((acc, r) => acc + r.generation, 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      year,
      months: monthResults,                // [{ month:"MM", generation: kWh }]
      totals: { generation: total },       // suma roku
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
