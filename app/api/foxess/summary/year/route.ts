import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
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
    const year = url.searchParams.get("year"); // YYYY
    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { ok: false, error: "Parametr year (YYYY) jest wymagany" },
        { status: 200 }
      );
    }

    const base = originFrom(req);
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

    const out = await pMapLimit(months, 3, async (ym) => {
      try {
        const r = await fetch(`${base}/api/foxess/summary/month?month=${ym}`, {
          cache: "no-store",
        });
        const j = await r.json();
        const gen = Number(j?.totals?.generation ?? 0) || 0;
        return { month: ym.slice(-2), generation: +gen.toFixed(2) };
      } catch {
        return { month: ym.slice(-2), generation: 0 };
      }
    });

    const total = +out
      .reduce((a, m) => a + (Number(m.generation) || 0), 0)
      .toFixed(2);

    return NextResponse.json({
      ok: true,
      year,
      source: "sum(month)",
      months: out.sort((a, b) => a.month.localeCompare(b.month)),
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 200 }
    );
  }
}
