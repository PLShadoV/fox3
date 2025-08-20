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
      return NextResponse.json({ ok: false, error: "Parametr year (YYYY) jest wymagany" }, { status: 200 });
    }

    const base = originFrom(req);

    // 1) init 12 mies.
    const months = Array.from({ length: 12 }, (_, i) => ({ month: String(i + 1).padStart(2, "0"), generation: 0 }));

    // 2) FoxESS natywnie
    let nativeOk = false;
    try {
      const fox = await fetch(`${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/year`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": process.env.FOXESS_TOKEN || "",
        },
        body: JSON.stringify({
          sn: process.env.FOXESS_SN,
          year,
          timeZone: process.env.FOXESS_TZ || "Europe/Warsaw",
        }),
        cache: "no-store",
      });
      if (fox.ok) {
        const j = await fox.json();
        const rows: any[] = j?.result || j?.data || [];
        if (Array.isArray(rows)) {
          for (const it of rows) {
            const mm = String(it?.date || "").slice(-2);
            const v = Number(it?.value);
            const hit = months.find((m) => m.month === mm);
            if (hit && Number.isFinite(v)) hit.generation = Math.max(0, v);
          }
          nativeOk = true;
        }
      }
    } catch {}

    // 3) Fallback braków — na bazie naszego /month (który już ma fallbacki dzienne)
    const need = months.filter(m => !Number(m.generation));
    if (need.length) {
      await pMapLimit(need, 3, async (m) => {
        try {
          const r = await fetch(`${base}/api/foxess/summary/month?month=${year}-${m.month}`, { cache: "no-store" });
          const j = await r.json();
          const val = Number(j?.totals?.generation ?? 0) || 0;
          m.generation = +val.toFixed(2);
        } catch { /* ignore */ }
      });
    }

    const out = months.sort((a, b) => a.month.localeCompare(b.month));
    const total = +out.reduce((a, x) => a + (Number(x.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      year,
      source: nativeOk ? "foxess-native+fallback" : "fallback-only",
      months: out,
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
