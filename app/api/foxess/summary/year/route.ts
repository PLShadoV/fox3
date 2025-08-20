import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

// Limituj równoległość
async function pMapLimit<T, R>(items: T[], limit: number, mapper: (it: T) => Promise<R>): Promise<R[]> {
  const ret: R[] = [];
  let i = 0;
  async function next(): Promise<void> {
    const idx = i++;
    if (idx >= items.length) return;
    ret[idx] = await mapper(items[idx]);
    await next();
  }
  const starters = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(starters);
  return ret;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year"); // "YYYY"

    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json({ ok: false, error: "Parametr year (YYYY) jest wymagany" }, { status: 200 });
    }

    const base = originFrom(req);

    // 1) zainicjalizuj 12 miesięcy = 0
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: String(i + 1).padStart(2, "0"),
      generation: 0 as number,
    }));
    const byMonth = new Map(months.map(m => [m.month, m]));

    // 2) spróbuj natywny rok z FoxESS
    let nativeFilled = false;
    try {
      const foxRes = await fetch(`${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/year`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": process.env.FOXESS_TOKEN || "",
        },
        body: JSON.stringify({
          sn: process.env.FOXESS_SN,
          year,                         // "YYYY"
          // timeZone: "Europe/Warsaw"
        }),
        cache: "no-store",
      });
      if (foxRes.ok) {
        const j = await foxRes.json();
        // Oczekiwane: { result: [{ date: "YYYY-MM", value: number }, ...] }
        const list: any[] = j?.result || j?.data || [];
        if (Array.isArray(list) && list.length) {
          for (const it of list) {
            const ym = String(it?.date || ""); // "YYYY-MM"
            const mm = ym.slice(-2);
            const v = Number(it?.value);
            if (byMonth.has(mm) && Number.isFinite(v)) {
              byMonth.get(mm)!.generation = Math.max(0, v);
            }
          }
          nativeFilled = true;
        }
      }
    } catch { /* przejdź do fallbacku */ }

    // 3) fallback/uzupełnienie: dla miesięcy = 0 dociągnij z naszego endpointu month (który sam ma fallback do dni)
    const toFill = months.filter(m => !Number(m.generation));
    if (toFill.length) {
      await pMapLimit(toFill, 3, async (m) => {
        try {
          const ym = `${year}-${m.month}`;
          const r = await fetch(`${base}/api/foxess/summary/month?month=${ym}`, { cache: "no-store" });
          if (!r.ok) return;
          const j = await r.json();
          const gen = Number(j?.totals?.generation ?? 0) || 0;
          byMonth.get(m.month)!.generation = Math.max(byMonth.get(m.month)!.generation, +gen.toFixed(2));
        } catch { /* zignoruj */ }
      });
    }

    const out = months.sort((a, b) => a.month.localeCompare(b.month));
    const total = +out.reduce((acc, m) => acc + (Number(m.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      year,
      source: nativeFilled ? "foxess-native+fallback" : "fallback-only",
      months: out,                                    // [{ month:"MM", generation }]
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
