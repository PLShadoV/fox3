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
    const modeQ = (url.searchParams.get("mode") || "rcem") as Mode; // domyślnie RCEm
    const ymQ = url.searchParams.get("ym"); // opcjonalne YYYY-MM (miesiąc „wybrany”)

    if (!isIsoDate(fromQ) || !isIsoDate(toQ)) {
      return NextResponse.json(
        { ok: false, error: "Parametry 'from' i 'to' muszą być w formacie YYYY-MM-DD" },
        { status: 200 }
      );
    }

    const from = new Date(fromQ + "T00:00:00Z");
    const to = new Date(toQ + "T00:00:00Z");
    if (!(from.getTime() <= to.getTime())) {
      return NextResponse.json({ ok: false, error: "'from' musi być ≤ 'to'" }, { status: 200 });
    }

    const base = baseUrl(req);

    let sumKWh = 0;
    const rows: Array<{ date: string; kwh: number; revenue_pln: number }> = [];
    const warnings: string[] = [];

    // Iteracja po dniach zakresu i pobór dziennych sum z /api/foxess/summary/day
    for (let cur = new Date(from); cur.getTime() <= to.getTime(); cur = addDays(cur, 1)) {
      const date = toISO(cur);
      let kwh = 0;

      try {
        const r = await fetch(`${base}/api/foxess/summary/day?date=${date}`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) {
          // dostosuj, jeśli Twój endpoint zwraca inną ścieżkę do sumy dnia
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
      // Pobierz tabelę miesięcznych RCEm
      const rcemRes = await fetch(`${base}/api/rcem`, { next: { revalidate: 3600 } });
      const rcemJson = await rcemRes.json();
      if (!rcemJson?.ok || !Array.isArray(rcemJson.rows)) {
        return NextResponse.json({ ok: false, error: "RCEm endpoint zwrócił błąd" }, { status: 200 });
      }

      // Zmapuj na YYYY-MM -> cena (PLN/MWh)
      const priceMap: Record<string, number> = {};
      for (const it of rcemJson.rows) {
        const ym = `${it.year}-${String((it.monthIndex as number) + 1).padStart(2, "0")}`;
        if (typeof it.value === "number") priceMap[ym] = it.value;
      }

      // Wybór miesiąca:
      // - jeśli przekazano ym=YYYY-MM -> użyj,
      // - w przeciwnym razie weź miesiąc z 'from'
      const chosenYM = ymQ && /^\d{4}-\d{2}$/.test(ymQ) ? ymQ : fromQ.slice(0, 7);
      const price = priceMap[chosenYM];
      if (typeof price !== "number" || Number.isNaN(price)) {
        return NextResponse.json({ ok: false, error: `Brak ceny RCEm dla ${chosenYM}` }, { status: 200 });
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

    // Tryb RCE (placeholder) — jeśli używasz, dopiszę dokładne liczenie godzinowe
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
