import { NextRequest, NextResponse } from "next/server";

// --- utils ---
function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
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

// Limitowana równoległość (żeby nie zabić FoxESS rate-limitów)
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

    // 1) zainicjalizuj pełną listę dni z 0
    const n = daysInMonth(y, m0);
    const days = Array.from({ length: n }, (_, i) => ({
      date: toISO(y, m0, i + 1),
      generation: 0 as number,
    }));
    const byDate = new Map(days.map(d => [d.date, d]));

    // 2) spróbuj pobrać natywny miesiąc z FoxESS (jeden strzał)
    let nativeFilled = false;
    try {
      const foxRes = await fetch(`${process.env.FOXESS_BASE ?? "https://www.foxesscloud.com"}/op/v1/device/energy/month`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": process.env.FOXESS_TOKEN || "",
        },
        body: JSON.stringify({
          sn: process.env.FOXESS_SN,
          month,                       // "YYYY-MM"
          // niektóre konta wymagają TZ; jeśli masz zmienną, dodaj: timeZone: "Europe/Warsaw"
        }),
        cache: "no-store",
      });
      if (foxRes.ok) {
        const j = await foxRes.json();
        // Oczekiwane: { result: [{ date: "YYYY-MM-DD", value: number }, ...] }
        const list: any[] = j?.result || j?.data || [];
        if (Array.isArray(list) && list.length) {
          for (const it of list) {
            const d = String(it?.date || "");
            const v = Number(it?.value);
            if (byDate.has(d) && Number.isFinite(v)) {
              byDate.get(d)!.generation = Math.max(0, v);
            }
          }
          nativeFilled = true;
        }
      }
    } catch {
      /* przejdź do fallbacku */
    }

    // 3) fallback/uzupełnienie: dla dni z 0 albo brakami – dobij do day-cached (równolegle, limit 4)
    const needRefill = days.filter(d => !Number(d.generation));
    if (needRefill.length) {
      await pMapLimit(needRefill, 4, async (d) => {
        try {
          const r = await fetch(`${base}/api/foxess/summary/day-cached?date=${d.date}`, { cache: "no-store" });
          if (!r.ok) return;
          const j = await r.json();
          const kwh = Number(j?.today?.generation?.total ?? 0) || 0;
          byDate.get(d.date)!.generation = Math.max(byDate.get(d.date)!.generation, +kwh.toFixed(3));
        } catch { /* zignoruj */ }
      });
    }

    const out = days.sort((a, b) => a.date.localeCompare(b.date));
    const total = +out.reduce((acc, d) => acc + (Number(d.generation) || 0), 0).toFixed(2);

    return NextResponse.json({
      ok: true,
      month,
      source: nativeFilled ? "foxess-native+fallback" : "fallback-only",
      days: out,                                      // [{ date, generation }]
      totals: { generation: total },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
