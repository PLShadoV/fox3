import { NextRequest, NextResponse } from "next/server";

function originFrom(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

async function getJSON(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

function ym(date: string) { return date.slice(0, 7); }

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const mode = (url.searchParams.get("mode") || "rcem").toLowerCase(); // rce|rcem
    const rcemMonthParam = url.searchParams.get("rcemMonth"); // YYYY-MM (opcjonalnie dla RCEm)

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ ok: false, error: "Podaj ?from i ?to w formacie YYYY-MM-DD" }, { status: 200 });
    }

    const base = originFrom(req);

    if (mode === "rcem") {
      // 1) suma energii z pewnego źródła (range -> month aggregator)
      const r = await getJSON(`${base}/api/foxess/summary/range?from=${from}&to=${to}`);
      if (!r?.ok) return NextResponse.json({ ok: false, error: r?.error || "Błąd liczenia zakresu" }, { status: 200 });

      const total_kwh = Number(r?.total_kwh ?? 0) || 0;
      // 2) pobierz RCEm i wybierz cenę
      const rc = await getJSON(`${base}/api/rcem`);
      const rows: any[] = Array.isArray(rc?.rows) ? rc.rows : [];
      const monthKey = rcemMonthParam || ym(to);
      const [y, m] = monthKey.split("-").map(Number);
      let hit = rows.find(x => Number(x?.year) === y && Number(x?.monthIndex) === (m - 1));
      if (!hit && rows.length) hit = rows[rows.length - 1]; // ostatni znany, gdy brak miesiąca

      const price = Number(hit?.value); // PLN/MWh
      const revenue_pln = Number.isFinite(price) ? +(total_kwh * (price / 1000)).toFixed(2) : null;

      return NextResponse.json({
        ok: true,
        mode: "rcem",
        from, to,
        total_kwh,
        rcemMonth: hit ? `${hit.year}-${String((hit.monthIndex ?? 0) + 1).padStart(2, "0")}` : null,
        rcemPrice: Number.isFinite(price) ? price : null,
        revenue_pln,
        failedDates: r?.failedDates || [],
      });
    }

    // mode === "rce"  -> sumuj revenue/day dla każdego dnia z zakresu
    const range = await getJSON(`${base}/api/foxess/summary/range?from=${from}&to=${to}`);
    if (!range?.ok) return NextResponse.json({ ok: false, error: range?.error || "Błąd zakresu" }, { status: 200 });

    const days: { date: string; kwh: number }[] = Array.isArray(range?.days) ? range.days : [];
    let revenue_pln = 0;
    const failed: string[] = [];

    for (const d of days) {
      try {
        const j = await getJSON(`${base}/api/revenue/day?date=${d.date}&mode=rce`);
        const part = Number(j?.totals?.revenue_pln ?? 0) || 0;
        revenue_pln += part;
      } catch {
        failed.push(d.date);
      }
    }
    revenue_pln = +revenue_pln.toFixed(2);

    return NextResponse.json({
      ok: true,
      mode: "rce",
      from, to,
      total_kwh: Number(range?.total_kwh ?? 0) || 0,
      revenue_pln,
      failedDates: Array.from(new Set([...(range?.failedDates || []), ...failed])),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
