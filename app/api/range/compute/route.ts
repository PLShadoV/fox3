// app/api/range/compute/route.ts
import { NextRequest, NextResponse } from "next/server";

type Mode = "rce" | "rcem";

function isIsoDate(s?: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}
function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function baseUrl(req: NextRequest) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fromQ = url.searchParams.get("from");
    const toQ = url.searchParams.get("to");
    const modeQ = (url.searchParams.get("mode") || "rcem") as Mode;
    const ymQ = url.searchParams.get("ym");

    if (!isIsoDate(fromQ) || !isIsoDate(toQ)) {
      return NextResponse.json(
        { ok: false, error: "Parametry 'from' i 'to' muszą być w formacie YYYY-MM-DD" },
        { status: 200 }
      );
    }
    const from = new Date(fromQ + "T00:00:00Z");
    const to = new Date(toQ + "T00:00:00Z");
    if (from.getTime() > to.getTime()) {
      return NextResponse.json({ ok: false, error: "'from' musi być ≤ 'to'" }, { status: 200 });
    }

    const base = baseUrl(req);
    let sumKWh = 0;
    const rows: Array<{ date: string; kwh: number; revenue_pln: number }> = [];
    const warnings: string[] = [];

    // zbiór dziennych danych
    for (let cur = new Date(from); cur.getTime() <= to.getTime(); cur = addDays(cur, 1)) {
      const date = toISO(cur);
      let kwh = 0;
      try {
        const r = await fetch(`${base}/api/foxess/summary/day?date=${date}`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) {
          kwh = Number(j?.today?.generation?.total ?? 0) || 0;
        } else {
          warnings.push(`Brak danych produkcji dla ${date}`);
        }
      } catch {
        warnings.push(`Błąd zapytania dla ${date}`);
      }
      rows.push({ date, kwh: +kwh.toFixed(3), revenue_pln: 0 });
      sumKWh += kwh;
    }

    if (modeQ === "rcem") {
      // pobierz RCEm
      const rcemRes = await fetch(`${base}/api/rcem`, { next: { revalidate: 3600 } });
      if (!rcemRes.ok) {
        return NextResponse.json({ ok: false, error: "Nie mogę pobrać /api/rcem" }, { status: 200 });
      }
      const rcemJson = await rcemRes.json();

      // defensywnie znajdź tablicę rekordów
      const candidateArrays = [
        rcemJson?.rows,
        rcemJson?.data?.rows,
        rcemJson?.prices,
        rcemJson?.data?.prices,
      ].filter(Array.isArray) as Array<Array<any>>;

      if (!candidateArrays.length) {
        return NextResponse.json(
          { ok: false, error: "RCEm endpoint zwrócił nieoczekiwany kształt odpowiedzi" },
          { status: 200 }
        );
      }
      const rcemRows = candidateArrays[0];

      // zmapuj do YYYY-MM -> number
      const priceMap: Record<string, number> = {};
      for (const it of rcemRows) {
        const y = Number(it.year);
        const mi = Number(it.monthIndex);
        const v = Number(it.value);
        if (Number.isFinite(y) && Number.isFinite(mi) && Number.isFinite(v)) {
          const ym = `${y}-${String(mi + 1).padStart(2, "0")}`;
          priceMap[ym] = v;
        }
      }

      const chosenYM = ymQ && /^\d{4}-\d{2}$/.test(ymQ) ? ymQ : fromQ.slice(0, 7);
      const price = priceMap[chosenYM];
      if (!Number.isFinite(price)) {
        return NextResponse.json(
          { ok: false, error: `Brak ceny RCEm dla ${chosenYM}` },
          { status: 200 }
        );
      }

      const priceUsed = Math.max(price, 0); // ujemne obcięte do 0
      const revenue = +(sumKWh * priceUsed / 1000).toFixed(2);

      return NextResponse.json(
        {
          ok: true,
          mode: modeQ,
          from: fromQ,
          to: toQ,
          ym: chosenYM,
          sum: { kwh: +sumKWh.toFixed(2), revenue_pln: revenue, rcem_price_pln_mwh: price },
          rows,
          warnings,
        },
        { status: 200 }
      );
    }

    // tryb RCE (placeholder)
    return NextResponse.json(
      {
        ok: true,
        mode: modeQ,
        from: fromQ,
        to: toQ,
        sum: { kwh: +sumKWh.toFixed(2), revenue_pln: 0 },
        rows,
        warnings,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
  }
}
